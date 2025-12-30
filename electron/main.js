import path from 'node:path';
import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
import * as pty from 'node-pty';
import * as ts from 'typescript';
const isMac = process.platform === 'darwin';

const createWindow = () => {
  const window = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#171717',
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    titleBarOverlay: !isMac
      ? { color: '#171717', symbolColor: '#cccccc', height: 32 }
      : undefined,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(app.getAppPath(), 'electron', 'preload.cjs')
    }
  });
  window.webContents.setWindowOpenHandler(({ url }) => {
    const isSafe = url.startsWith('http://') || url.startsWith('https://');
    return isSafe ? { action: 'allow' } : { action: 'deny' };
  });

  const devServerUrl = process.env.ELECTRON_START_URL ?? (!app.isPackaged ? 'http://localhost:5173' : null);
  if (devServerUrl) {
    window.loadURL(devServerUrl);
    window.webContents.openDevTools({ mode: 'detach' });
  } else {
    window.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'));
    window.webContents.openDevTools({ mode: 'detach' });
  }
};

// Limit filesystem access to the workspace root so renderer cannot escape.
let workspaceRoot = app.getAppPath();
const projectRoot = () => workspaceRoot;

const resolveSafePath = (relativePath) => {
  const root = projectRoot();
  const resolved = path.resolve(root, relativePath || '.');
  const relative = path.relative(root, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Access outside project root is not allowed.');
  }
  return resolved;
};

const toPosixPath = (value) => value.replace(/\\/g, '/');

let tsserverProcess = null;
let tsserverSeq = 0;
let tsserverBuffer = '';
let tsserverContentLength = null;

const broadcast = (channel, payload) => {
  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send(channel, payload);
  });
};

const readTsConfig = () => {
  const configPath = ts.findConfigFile(projectRoot(), ts.sys.fileExists, 'tsconfig.json');
  if (!configPath) {
    return { configPath: null, compilerOptions: {} };
  }
  const readResult = ts.readConfigFile(configPath, ts.sys.readFile);
  const compilerOptions = readResult.config?.compilerOptions ?? {};
  return {
    configPath: path.relative(projectRoot(), configPath),
    compilerOptions
  };
};

const readParsedCompilerOptions = () => {
  const configPath = ts.findConfigFile(projectRoot(), ts.sys.fileExists, 'tsconfig.json');
  if (!configPath) return {};
  const readResult = ts.readConfigFile(configPath, ts.sys.readFile);
  if (readResult.error || !readResult.config) return {};
  const parsed = ts.parseJsonConfigFileContent(readResult.config, ts.sys, path.dirname(configPath));
  return parsed.options ?? {};
};

const handleTsServerMessage = (message) => {
  if (message?.type !== 'event') return;
  const kind = message.event;
  if (!message.body || !message.body.file) return;
  if (!['syntaxDiag', 'semanticDiag', 'suggestionDiag', 'configFileDiag'].includes(kind)) {
    return;
  }
  const file = path.relative(projectRoot(), message.body.file);
  broadcast('tsserver:diagnostics', {
    file: toPosixPath(file),
    kind,
    diagnostics: message.body.diagnostics ?? []
  });
};

const handleTsServerData = (chunk) => {
  tsserverBuffer += chunk.toString();
  while (true) {
    if (tsserverContentLength == null) {
      const headerEnd = tsserverBuffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) return;
      const header = tsserverBuffer.slice(0, headerEnd);
      const match = /Content-Length: (\d+)/i.exec(header);
      tsserverBuffer = tsserverBuffer.slice(headerEnd + 4);
      if (!match) continue;
      tsserverContentLength = Number(match[1]);
    }

    if (tsserverBuffer.length < tsserverContentLength) return;
    const message = tsserverBuffer.slice(0, tsserverContentLength);
    tsserverBuffer = tsserverBuffer.slice(tsserverContentLength);
    tsserverContentLength = null;
    try {
      handleTsServerMessage(JSON.parse(message));
    } catch {
      continue;
    }
  }
};

const sendTsServerRequest = (command, args = {}) => {
  if (!tsserverProcess) return;
  const payload = JSON.stringify({
    seq: ++tsserverSeq,
    type: 'request',
    command,
    arguments: args
  });
  const header = `Content-Length: ${Buffer.byteLength(payload, 'utf8')}\r\n\r\n`;
  tsserverProcess.stdin.write(header + payload);
};

const startTsServer = () => {
  if (tsserverProcess) return;
  const tsserverPath = path.join(app.getAppPath(), 'node_modules', 'typescript', 'lib', 'tsserver.js');
  tsserverProcess = spawn(process.execPath, [tsserverPath], {
    cwd: projectRoot(),
    stdio: 'pipe'
  });
  tsserverProcess.stdout.on('data', handleTsServerData);
  tsserverProcess.on('exit', () => {
    tsserverProcess = null;
    tsserverBuffer = '';
    tsserverContentLength = null;
  });

  sendTsServerRequest('configure', {
    hostInfo: 'vscode',
    preferences: {},
    compilerOptionsForInferredProjects: readParsedCompilerOptions()
  });
};

const stopTsServer = () => {
  if (!tsserverProcess) return;
  tsserverProcess.kill();
  tsserverProcess = null;
};

const normalizeUpdateOpenPayload = (payload) => {
  if (!payload) return {};
  const mapOpenFile = (entry) => ({
    file: resolveSafePath(entry.file),
    content: entry.content,
    projectRootPath: projectRoot(),
    scriptKindName: entry.scriptKindName
  });
  const mapChangedFile = (entry) => ({
    file: resolveSafePath(entry.file),
    content: entry.content
  });
  return {
    openFiles: payload.openFiles?.map(mapOpenFile),
    changedFiles: payload.changedFiles?.map(mapChangedFile),
    closedFiles: payload.closedFiles?.map(file => resolveSafePath(file))
  };
};

const collectTypings = async (relativeDir) => {
  try {
    const absoluteDir = resolveSafePath(relativeDir);
    const entries = await fs.readdir(absoluteDir, { withFileTypes: true });
    const results = [];
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const childRel = path.join(relativeDir, entry.name);
      if (entry.isDirectory()) {
        results.push(...(await collectTypings(childRel)));
      } else if (entry.isFile() && entry.name.endsWith('.d.ts')) {
        const content = await fs.readFile(resolveSafePath(childRel), 'utf8');
        results.push({
          uri: `file:///${toPosixPath(childRel)}`,
          content
        });
      }
    }
    return results;
  } catch {
    return [];
  }
};

// Build a directory tree for the Explorer sidebar.
const buildTree = async (relativePath = '', depth = 0) => {
  const absolutePath = resolveSafePath(relativePath);
  const stat = await fs.stat(absolutePath);
  const name = relativePath ? path.basename(relativePath) : path.basename(projectRoot());
  if (stat.isDirectory()) {
    const entries = await fs.readdir(absolutePath, { withFileTypes: true });
    const children = await Promise.all(
      entries
        .filter(entry => !entry.name.startsWith('.'))
        .map(async entry => {
          const childPath = path.join(relativePath, entry.name);
          return buildTree(childPath, depth + 1);
        })
    );
    return {
      id: relativePath || 'root',
      path: relativePath,
      name,
      type: 'FOLDER',
      depth,
      children: children.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'FOLDER' ? -1 : 1;
      })
    };
  }

  return {
    id: relativePath,
    path: relativePath,
    name,
    type: 'FILE',
    depth
  };
};

// Skip binaries and large files during search to keep things responsive.
const isTextFile = (buffer) => {
  const sample = buffer.subarray(0, 8000);
  return !sample.includes(0);
};

const searchInFiles = async (query) => {
  if (!query.trim()) return [];
  const root = projectRoot();
  const results = [];
  const queue = [''];

  while (queue.length) {
    const relativePath = queue.pop();
    const absolutePath = resolveSafePath(relativePath);
    const stat = await fs.stat(absolutePath);
    if (stat.isDirectory()) {
      const entries = await fs.readdir(absolutePath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;
        queue.push(path.join(relativePath, entry.name));
      }
    } else {
      if (stat.size > 1024 * 1024) continue;
      const buffer = await fs.readFile(absolutePath);
      if (!isTextFile(buffer)) continue;
      const content = buffer.toString('utf8');
      const lines = content.split(/\r?\n/);
      const matches = [];
      for (let i = 0; i < lines.length; i += 1) {
        if (lines[i].toLowerCase().includes(query.toLowerCase())) {
          matches.push({ line: i + 1, text: lines[i] });
        }
      }
      if (matches.length) {
        results.push({ path: path.relative(root, absolutePath), matches });
      }
    }
  }

  return results;
};

const parseGitStatus = (output) =>
  output
    .split(/\r?\n/)
    .filter(Boolean)
    .map(line => ({
      status: line.slice(0, 2).trim(),
      path: line.slice(3).trim()
    }));

// Track terminal sessions so renderer can attach and write.
const terminals = new Map();

const createTerminal = () => {
  const id = `term-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const shell = 'powershell.exe';
  const term = pty.spawn(shell, [], {
    name: 'xterm-color',
    cwd: projectRoot(),
    env: { ...process.env, TERM: 'xterm-256color' }
  });
  terminals.set(id, term);
  term.onData(data => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('terminal:data', { id, data });
    });
  });
  return id;
};

const resetTerminals = () => {
  terminals.forEach(term => term.kill());
  terminals.clear();
};

const setupIpc = () => {
  ipcMain.handle('fs:readTree', async () => buildTree());
  ipcMain.handle('fs:selectWorkspace', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    workspaceRoot = result.filePaths[0];
    stopTsServer();
    startTsServer();
    resetTerminals();
    return buildTree();
  });
  ipcMain.handle('fs:readFile', async (_event, relativePath) => {
    const absolutePath = resolveSafePath(relativePath);
    return fs.readFile(absolutePath, 'utf8');
  });
  ipcMain.handle('fs:writeFile', async (_event, relativePath, content) => {
    const absolutePath = resolveSafePath(relativePath);
    await fs.writeFile(absolutePath, content, 'utf8');
    return true;
  });
  ipcMain.handle('fs:mkdir', async (_event, relativePath) => {
    const absolutePath = resolveSafePath(relativePath);
    await fs.mkdir(absolutePath, { recursive: true });
    return true;
  });
  ipcMain.handle('fs:rename', async (_event, fromPath, toPath) => {
    const fromAbsolute = resolveSafePath(fromPath);
    const toAbsolute = resolveSafePath(toPath);
    await fs.rename(fromAbsolute, toAbsolute);
    return true;
  });
  ipcMain.handle('fs:copy', async (_event, fromPath, toPath) => {
    const fromAbsolute = resolveSafePath(fromPath);
    const toAbsolute = resolveSafePath(toPath);
    const stat = await fs.stat(fromAbsolute);
    if (stat.isDirectory()) {
      await fs.cp(fromAbsolute, toAbsolute, { recursive: true });
    } else {
      await fs.copyFile(fromAbsolute, toAbsolute);
    }
    return true;
  });
  ipcMain.handle('fs:delete', async (_event, relativePath) => {
    const absolutePath = resolveSafePath(relativePath);
    await fs.rm(absolutePath, { recursive: true, force: true });
    return true;
  });
  ipcMain.handle('fs:search', async (_event, query) => searchInFiles(query));
  ipcMain.handle('git:status', async () => {
    return await new Promise(resolve => {
      const git = spawn('git', ['status', '--porcelain'], { cwd: projectRoot() });
      let output = '';
      git.stdout.on('data', chunk => (output += chunk.toString()));
      git.stderr.on('data', chunk => (output += chunk.toString()));
      git.on('close', () => resolve(parseGitStatus(output)));
      git.on('error', () => resolve([]));
    });
  });

  ipcMain.handle('terminal:create', () => createTerminal());
  ipcMain.handle('terminal:write', (_event, id, data) => {
    const term = terminals.get(id);
    if (term) term.write(data);
  });
  ipcMain.handle('terminal:resize', (_event, id, cols, rows) => {
    const term = terminals.get(id);
    if (term) term.resize(cols, rows);
  });
  ipcMain.handle('terminal:kill', (_event, id) => {
    const term = terminals.get(id);
    if (term) {
      term.kill();
      terminals.delete(id);
    }
  });

  ipcMain.handle('tsserver:start', async () => {
    startTsServer();
    return true;
  });
  ipcMain.handle('tsserver:readTsConfig', async () => readTsConfig());
  ipcMain.handle('tsserver:getTypings', async () => {
    const libDom = await fs.readFile(
      resolveSafePath(path.join('node_modules', 'typescript', 'lib', 'lib.dom.d.ts')),
      'utf8'
    );
    const typings = [
      { uri: 'file:///node_modules/typescript/lib/lib.dom.d.ts', content: libDom }
    ];
    const reactTypes = await collectTypings(path.join('node_modules', '@types', 'react'));
    const nodeTypes = await collectTypings(path.join('node_modules', '@types', 'node'));
    return typings.concat(reactTypes, nodeTypes);
  });
  ipcMain.handle('tsserver:updateOpen', async (_event, payload) => {
    startTsServer();
    sendTsServerRequest('updateOpen', normalizeUpdateOpenPayload(payload));
  });
  ipcMain.handle('tsserver:requestDiagnostics', async (_event, files) => {
    startTsServer();
    sendTsServerRequest('geterr', {
      files: files.map(file => resolveSafePath(file)),
      delay: 0
    });
  });
};

app.whenReady().then(() => {
  setupIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopTsServer();
  terminals.forEach(term => term.kill());
  terminals.clear();
});
