import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityBar } from './components/ActivityBar';
import { Sidebar } from './components/Sidebar';
import { EditorArea } from './components/EditorArea';
import { TitleBar } from './components/TitleBar';
import { FileSystemItem, FileTab, ActivityView, FileType } from './types';

// HOIHOI

const getLanguageFromName = (name: string) => {
  const extension = name.split('.').pop()?.toLowerCase() ?? 'txt';
  return extension;
};

const getFileName = (filePath: string) => {
  const parts = filePath.split(/[\\/]/);
  return parts[parts.length - 1] || filePath;
};

const getDirName = (filePath: string) => {
  const parts = filePath.split(/[\\/]/);
  parts.pop();
  return parts.join('/');
};

const buildPathFromName = (currentPath: string, nextName: string) => {
  const trimmed = nextName.trim();
  if (!trimmed) return currentPath;
  if (trimmed.includes('/') || trimmed.includes('\\')) return trimmed;
  const dir = getDirName(currentPath);
  return dir ? `${dir}/${trimmed}` : trimmed;
};

const getCopyName = (name: string) => {
  const dotIndex = name.lastIndexOf('.');
  if (dotIndex > 0) {
    const base = name.slice(0, dotIndex);
    const ext = name.slice(dotIndex);
    return `${base}-copy${ext}`;
  }
  return `${name}-copy`;
};

const isPathWithin = (pathValue: string, folderPath: string) => {
  if (!folderPath) return false;
  const normalizedPath = pathValue.replace(/\\/g, '/');
  const normalizedFolder = folderPath.replace(/\\/g, '/').replace(/\/$/, '');
  return normalizedPath === normalizedFolder || normalizedPath.startsWith(`${normalizedFolder}/`);
};

const EXCLUDED_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  '.out',
  '.next',
  '.cache',
  '.vite',
  'coverage',
  '.tmp'
]);

const EXCLUDED_EXTENSIONS = [
  '.lock',
  '.map',
  '.log',
  '.min.js',
  '.d.ts'
];

const shouldIndexPath = (filePath: string) => {
  const parts = filePath.split(/[\\/]/);
  if (parts.some(part => EXCLUDED_DIRS.has(part))) return false;
  const lower = filePath.toLowerCase();
  return !EXCLUDED_EXTENSIONS.some(ext => lower.endsWith(ext));
};

const collectFilePaths = (items: FileSystemItem[], acc: string[] = []) => {
  items.forEach(item => {
    if (item.type === FileType.FILE && item.path && shouldIndexPath(item.path)) {
      acc.push(item.path);
    }
    if (item.children && item.children.length > 0) {
      collectFilePaths(item.children, acc);
    }
  });
  return acc;
};

const ENTRY_FILES = new Set([
  'main.ts',
  'main.tsx',
  'index.ts',
  'index.tsx',
  'app.tsx',
  'app.ts'
]);

const CONFIG_FILES = new Set([
  'package.json',
  'tsconfig.json',
  'vite.config.ts',
  'vite.config.js',
  'vite.config.mts',
  'vite.config.cjs'
]);

const scorePath = (filePath: string, openPaths: Set<string>, activePath: string | null) => {
  const name = getFileName(filePath).toLowerCase();
  let score = 0;

  if (ENTRY_FILES.has(name)) score += 50;
  if (CONFIG_FILES.has(name)) score += 40;
  if (openPaths.has(filePath)) score += 30;
  if (activePath === filePath) score += 20;
  if (filePath.includes('/test/') || filePath.includes('\\test\\')) score -= 10;
  if (filePath.includes('/__tests__/') || filePath.includes('\\__tests__\\')) score -= 10;

  return score;
};

const normalizeEnumKey = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, '');

const mapEnumValue = (value: unknown, mapping: Record<string, number>) => {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return undefined;
  return mapping[normalizeEnumKey(value)];
};

const getBooleanOption = (value: unknown, fallback: boolean) =>
  typeof value === 'boolean' ? value : fallback;

const getStringOption = (value: unknown) =>
  typeof value === 'string' ? value : undefined;

const getStringArrayOption = (value: unknown) =>
  Array.isArray(value) ? value.filter(item => typeof item === 'string') : undefined;

const getPathsOption = (value: unknown) =>
  value && typeof value === 'object' && !Array.isArray(value) ? value : undefined;

const buildCompilerOptions = (monaco: any, rawOptions: Record<string, unknown>) => {
  const moduleMapping: Record<string, number> = {
    commonjs: monaco.languages.typescript.ModuleKind.CommonJS,
    es2015: monaco.languages.typescript.ModuleKind.ES2015,
    es2020: monaco.languages.typescript.ModuleKind.ES2020,
    es2022: monaco.languages.typescript.ModuleKind.ES2022,
    esnext: monaco.languages.typescript.ModuleKind.ESNext,
    amd: monaco.languages.typescript.ModuleKind.AMD,
    umd: monaco.languages.typescript.ModuleKind.UMD,
    system: monaco.languages.typescript.ModuleKind.System,
    none: monaco.languages.typescript.ModuleKind.None
  };

  const moduleResolutionMapping: Record<string, number> = {
    classic: monaco.languages.typescript.ModuleResolutionKind.Classic,
    node: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    node16: monaco.languages.typescript.ModuleResolutionKind.Node16,
    nodenext: monaco.languages.typescript.ModuleResolutionKind.NodeNext,
    bundler: monaco.languages.typescript.ModuleResolutionKind.Bundler
  };

  const targetMapping: Record<string, number> = {
    es3: monaco.languages.typescript.ScriptTarget.ES3,
    es5: monaco.languages.typescript.ScriptTarget.ES5,
    es2015: monaco.languages.typescript.ScriptTarget.ES2015,
    es2016: monaco.languages.typescript.ScriptTarget.ES2016,
    es2017: monaco.languages.typescript.ScriptTarget.ES2017,
    es2018: monaco.languages.typescript.ScriptTarget.ES2018,
    es2019: monaco.languages.typescript.ScriptTarget.ES2019,
    es2020: monaco.languages.typescript.ScriptTarget.ES2020,
    es2021: monaco.languages.typescript.ScriptTarget.ES2021,
    es2022: monaco.languages.typescript.ScriptTarget.ES2022,
    esnext: monaco.languages.typescript.ScriptTarget.ESNext
  };

  const jsxMapping: Record<string, number> = {
    preserve: monaco.languages.typescript.JsxEmit.Preserve,
    react: monaco.languages.typescript.JsxEmit.React,
    reactnative: monaco.languages.typescript.JsxEmit.ReactNative,
    reactjsx: monaco.languages.typescript.JsxEmit.ReactJSX,
    reactjsxdev: monaco.languages.typescript.JsxEmit.ReactJSXDev
  };

  const moduleDetectionKind = monaco.languages.typescript.ModuleDetectionKind;
  const moduleDetectionMapping: Record<string, number> | undefined = moduleDetectionKind
    ? {
        legacy: moduleDetectionKind.Legacy,
        auto: moduleDetectionKind.Auto,
        force: moduleDetectionKind.Force
      }
    : undefined;

  const compilerOptions: Record<string, unknown> = {
    allowNonTsExtensions: true,
    allowJs: getBooleanOption(rawOptions.allowJs, true),
    checkJs: getBooleanOption(rawOptions.checkJs, false),
    allowImportingTsExtensions: getBooleanOption(rawOptions.allowImportingTsExtensions, false),
    isolatedModules: getBooleanOption(rawOptions.isolatedModules, false),
    module: mapEnumValue(rawOptions.module, moduleMapping) ?? moduleMapping.esnext,
    moduleResolution:
      mapEnumValue(rawOptions.moduleResolution, moduleResolutionMapping) ??
      monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    target: mapEnumValue(rawOptions.target, targetMapping) ?? targetMapping.es2022,
    jsx: mapEnumValue(rawOptions.jsx, jsxMapping) ?? jsxMapping.reactjsx,
    moduleDetection: moduleDetectionMapping
      ? mapEnumValue(rawOptions.moduleDetection, moduleDetectionMapping)
      : undefined,
    baseUrl: getStringOption(rawOptions.baseUrl),
    paths: getPathsOption(rawOptions.paths),
    types: getStringArrayOption(rawOptions.types),
    lib: getStringArrayOption(rawOptions.lib),
    useDefineForClassFields: getBooleanOption(rawOptions.useDefineForClassFields, false),
    noEmit: getBooleanOption(rawOptions.noEmit, true)
  };

  Object.keys(compilerOptions).forEach(key => {
    if (compilerOptions[key] === undefined) {
      delete compilerOptions[key];
    }
  });

  return compilerOptions;
};

const applyMonacoConfig = async (monaco: any, typingsLoadedRef: React.MutableRefObject<boolean>) => {
  const tsDefaults = monaco.languages.typescript.typescriptDefaults;
  const jsDefaults = monaco.languages.typescript.javascriptDefaults;

  tsDefaults.setDiagnosticsOptions({ noSemanticValidation: false, noSyntaxValidation: false });
  jsDefaults.setDiagnosticsOptions({ noSemanticValidation: false, noSyntaxValidation: false });
  tsDefaults.setEagerModelSync(true);
  jsDefaults.setEagerModelSync(true);

  const tsconfig = await window.api.tsserver.readTsConfig();
  const compilerOptions = buildCompilerOptions(monaco, tsconfig?.compilerOptions ?? {});
  tsDefaults.setCompilerOptions(compilerOptions);
  jsDefaults.setCompilerOptions({
    ...compilerOptions,
    allowJs: true,
    checkJs: false
  });

  if (!typingsLoadedRef.current) {
    const typings = await window.api.tsserver.getTypings();
    typings.forEach(entry => {
      tsDefaults.addExtraLib(entry.content, entry.uri);
      jsDefaults.addExtraLib(entry.content, entry.uri);
    });
    typingsLoadedRef.current = true;
  }
};

export default function App() {
  const [activeView, setActiveView] = useState<ActivityView>(ActivityView.EXPLORER);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [files, setFiles] = useState<FileSystemItem[]>([]);
  const [rootName, setRootName] = useState('PROJECT');
  const [tabs, setTabs] = useState<FileTab[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [fileIndex, setFileIndex] = useState<string[]>([]);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [codeModalPath, setCodeModalPath] = useState<string | null>(null);
  const [codeModalName, setCodeModalName] = useState('');
  const [codeModalLanguage, setCodeModalLanguage] = useState('txt');
  const [codeModalContent, setCodeModalContent] = useState('');
  const [codeModalDirty, setCodeModalDirty] = useState(false);
  const [codeModalLoading, setCodeModalLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FileSystemItem | null>(null);
  const [createDraft, setCreateDraft] = useState<{
    kind: 'file' | 'folder';
    name: string;
    error: string;
  } | null>(null);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const typingsLoadedRef = useRef(false);
  const codeModalInitialContentRef = useRef('');
  const fileCacheRef = useRef<Map<string, string>>(new Map());

  const toggleSidebar = () => setIsSidebarVisible(!isSidebarVisible);

  // Pull a fresh file tree from the main process.
  const applyTree = (tree: FileSystemItemApi) => {
    setRootName(tree.name);
    const children = tree.children ?? [];
    setFiles(children);
    setFileIndex(collectFilePaths(children, []));
  };

  const refreshTree = async () => {
    const tree = await window.api.readTree();
    applyTree(tree);
    if (monacoRef.current) {
      void applyMonacoConfig(monacoRef.current, typingsLoadedRef);
    }
  };

  // Select a file for context without opening it in the main editor area.
  const selectFileByPath = (relativePath: string) => {
    if (!relativePath) return;
    const existingTab = tabs.find(tab => tab.path === relativePath);
    if (!existingTab) {
      const name = getFileName(relativePath);
      const language = getLanguageFromName(name);
      const newTab: FileTab = {
        id: relativePath,
        path: relativePath,
        name,
        language
      };
      setTabs(prev => [...prev, newTab]);
    }
    setActiveFileId(relativePath);
  };

  const openCreateDraft = (kind: 'file' | 'folder') => {
    setCreateDraft({ kind, name: '', error: '' });
  };

  const createFile = async () => {
    openCreateDraft('file');
  };

  const createFolder = async () => {
    openCreateDraft('folder');
  };

  const updateCreateName = (name: string) => {
    setCreateDraft(prev => (prev ? { ...prev, name, error: '' } : prev));
  };

  const cancelCreate = () => {
    setCreateDraft(null);
  };

  const submitCreate = async () => {
    if (!createDraft) return;
    const trimmed = createDraft.name.trim();
    if (!trimmed) {
      setCreateDraft(prev => (prev ? { ...prev, error: 'Name is required.' } : prev));
      return;
    }
    if (/[\\/]/.test(trimmed)) {
      setCreateDraft(prev => (prev ? { ...prev, error: 'Use a name only (no folders).' } : prev));
      return;
    }
    if (fileIndex.includes(trimmed)) {
      setCreateDraft(prev => (prev ? { ...prev, error: 'An item with that name already exists.' } : prev));
      return;
    }

    if (createDraft.kind === 'file') {
      await window.api.writeFile(trimmed, '');
      await refreshTree();
      selectFileByPath(trimmed);
    } else {
      await window.api.createFolder(trimmed);
      await refreshTree();
    }
    setCreateDraft(null);
  };

  const applyContextFiles = (paths: string[]) => {
    const uniquePaths = Array.from(new Set(paths));
    setTabs(prev => {
      const prevMap = new Map(prev.map(tab => [tab.path, tab]));
      return uniquePaths.map(path => {
        const existing = prevMap.get(path);
        if (existing) return existing;
        return {
          id: path,
          path,
          name: getFileName(path),
          language: getLanguageFromName(path)
        };
      });
    });
    setActiveFileId(prev => {
      if (prev && uniquePaths.includes(prev)) return prev;
      return uniquePaths[0] ?? null;
    });
  };

  useEffect(() => {
    if (!deleteTarget) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDeleteTarget(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteTarget]);

  const renameItem = async (item: FileSystemItem) => {
    if (!item.path) return;
    const currentName = getFileName(item.path);
    const nextName = window.prompt(`Rename ${item.type === FileType.FOLDER ? 'folder' : 'file'}:`, currentName);
    if (!nextName || nextName.trim() === currentName) return;
    const nextPath = buildPathFromName(item.path, nextName);
    if (nextPath === item.path) return;
    await window.api.renamePath(item.path, nextPath);

    setTabs(prev => prev.map(tab => {
      if (item.type === FileType.FILE && tab.path === item.path) {
        const name = getFileName(nextPath);
        return { ...tab, path: nextPath, id: nextPath, name, language: getLanguageFromName(name) };
      }
      if (item.type === FileType.FOLDER && isPathWithin(tab.path, item.path)) {
        const suffix = tab.path.slice(item.path.length).replace(/^[/\\]/, '');
        const updatedPath = suffix ? `${nextPath}/${suffix}` : nextPath;
        const name = getFileName(updatedPath);
        return { ...tab, path: updatedPath, id: updatedPath, name, language: getLanguageFromName(name) };
      }
      return tab;
    }));

    setActiveFileId(prev => {
      if (!prev) return prev;
      if (item.type === FileType.FILE && prev === item.path) return nextPath;
      if (item.type === FileType.FOLDER && isPathWithin(prev, item.path)) {
        const suffix = prev.slice(item.path.length).replace(/^[/\\]/, '');
        return suffix ? `${nextPath}/${suffix}` : nextPath;
      }
      return prev;
    });

    const cache = fileCacheRef.current;
    if (item.type === FileType.FILE) {
      const cached = cache.get(item.path);
      if (cached !== undefined) {
        cache.delete(item.path);
        cache.set(nextPath, cached);
      }
    } else {
      Array.from(cache.entries()).forEach(([key, value]) => {
        if (isPathWithin(key, item.path)) {
          const suffix = key.slice(item.path.length).replace(/^[/\\]/, '');
          const updatedPath = suffix ? `${nextPath}/${suffix}` : nextPath;
          cache.delete(key);
          cache.set(updatedPath, value);
        }
      });
    }

    await refreshTree();
  };

  const copyItem = async (item: FileSystemItem) => {
    if (!item.path) return;
    const currentName = getFileName(item.path);
    const defaultName = getCopyName(currentName);
    const nextName = window.prompt(`Copy ${item.type === FileType.FOLDER ? 'folder' : 'file'} as:`, defaultName);
    if (!nextName) return;
    const nextPath = buildPathFromName(item.path, nextName);
    if (nextPath === item.path) return;
    await window.api.copyPath(item.path, nextPath);
    await refreshTree();
  };

  const performDelete = async (item: FileSystemItem) => {
    if (!item.path) return;
    await window.api.deletePath(item.path);
    setTabs(prev => prev.filter(tab => !isPathWithin(tab.path, item.path)));
    setActiveFileId(prev => {
      if (!prev) return prev;
      return isPathWithin(prev, item.path) ? null : prev;
    });
    const cache = fileCacheRef.current;
    Array.from(cache.keys()).forEach(key => {
      if (isPathWithin(key, item.path)) {
        cache.delete(key);
      }
    });

    await refreshTree();
  };

  const deleteItem = async (item: FileSystemItem) => {
    if (!item.path) return;
    setDeleteTarget(item);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    await performDelete(target);
  };

  const contextMenuFiles = useMemo(() => {
    const openPaths = new Set(tabs.map(tab => tab.path));
    const scored = fileIndex
      .map(path => ({
        path,
        score: scorePath(path, openPaths, activeFileId)
      }))
      .sort((a, b) => b.score - a.score);
    const topScored = scored.filter(entry => entry.score > 0).slice(0, 20).map(entry => entry.path);
    const defaults = Array.from(
      new Set([
        ...tabs.map(tab => tab.path),
        ...topScored
      ])
    );
    return {
      recommended: defaults,
      all: fileIndex
    };
  }, [activeFileId, fileIndex, tabs]);

  const handleFileClick = (file: FileSystemItem) => {
    if (file.type === FileType.FOLDER) return;
    if (!file.path) return;
    selectFileByPath(file.path);
  };

  const getFileContent = async (relativePath: string) => {
    const cached = fileCacheRef.current.get(relativePath);
    if (cached != null) return cached;
    const content = await window.api.readFile(relativePath);
    fileCacheRef.current.set(relativePath, content);
    return content;
  };

  const openCodeModal = async (tabId: string) => {
    const tab = tabs.find(entry => entry.id === tabId);
    if (!tab) return;
    setIsCodeModalOpen(true);
    setCodeModalLoading(true);
    setCodeModalPath(tab.path);
    setCodeModalName(tab.name);
    setCodeModalLanguage(tab.language);
    try {
      const content = await getFileContent(tab.path);
      setCodeModalContent(content);
      codeModalInitialContentRef.current = content;
      setCodeModalDirty(false);
    } catch {
      setCodeModalContent('');
      codeModalInitialContentRef.current = '';
      setCodeModalDirty(false);
    } finally {
      setCodeModalLoading(false);
    }
  };

  const closeCodeModal = () => {
    setIsCodeModalOpen(false);
    setCodeModalPath(null);
  };

  const handleCodeModalChange = (value: string | undefined) => {
    if (value === undefined) return;
    setCodeModalContent(value);
    setCodeModalDirty(value !== codeModalInitialContentRef.current);
  };

  const saveCodeModal = async () => {
    if (!codeModalPath) return;
    await window.api.writeFile(codeModalPath, codeModalContent);
    fileCacheRef.current.set(codeModalPath, codeModalContent);
    codeModalInitialContentRef.current = codeModalContent;
    setCodeModalDirty(false);
  };

  const runEditorAction = (actionId: string) => {
    if (!isCodeModalOpen) return;
    editorRef.current?.getAction?.(actionId)?.run?.();
  };

  const handleMenuCommand = async (command: string) => {
    switch (command) {
      case 'file:new': {
        await createFile();
        return;
      }
      case 'file:openFolder': {
        const tree = await window.api.selectWorkspace();
        if (!tree) return;
        setTabs([]);
        setActiveFileId(null);
        setIsCodeModalOpen(false);
        fileCacheRef.current = new Map();
        applyTree(tree);
        return;
      }
      case 'file:save':
        saveCodeModal();
        return;
      case 'file:saveAll':
        saveCodeModal();
        return;
      case 'edit:undo':
        editorRef.current?.trigger?.('keyboard', 'undo', null);
        return;
      case 'edit:redo':
        editorRef.current?.trigger?.('keyboard', 'redo', null);
        return;
      case 'edit:find':
        runEditorAction('actions.find');
        return;
      case 'selection:all':
        runEditorAction('editor.action.selectAll');
        return;
      case 'view:sidebar':
        toggleSidebar();
        return;
      case 'go:file': {
        const path = window.prompt('Go to file (relative path):');
        if (!path) return;
        selectFileByPath(path);
        return;
      }
      case 'help:readme':
        selectFileByPath('README.md');
        return;
      default:
        return;
    }
  };

  useEffect(() => {
    refreshTree();
  }, []);

  useEffect(() => {
    window.api.tsserver.start();
  }, []);

  // Setup keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (isCodeModalOpen) {
          saveCodeModal();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handleMenuCommand('go:file');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSidebarVisible, activeFileId, isCodeModalOpen]);

  return (
    <div className="h-screen w-screen flex flex-col bg-neutral-900 text-neutral-300 overflow-hidden">
      <TitleBar
        height={33}
        onCommand={handleMenuCommand}
      />
      <div className="flex-1 flex overflow-hidden">
        <ActivityBar
          activeView={activeView}
          setActiveView={setActiveView}
          toggleSidebar={toggleSidebar}
          isSidebarVisible={isSidebarVisible}
          onOpenSettings={() => selectFileByPath('settings.json')}
          onOpenProfile={() => selectFileByPath('README.md')}
        />

        <Sidebar
          isVisible={isSidebarVisible}
          activeView={activeView}
          files={files}
          rootName={rootName}
          activeFileId={activeFileId}
          onFileClick={handleFileClick}
          onOpenPath={selectFileByPath}
          onCreateFile={createFile}
          onCreateFolder={createFolder}
          onRenameItem={renameItem}
          onCopyItem={copyItem}
          onDeleteItem={deleteItem}
          createDraft={createDraft}
          onCreateNameChange={updateCreateName}
          onCreateSubmit={submitCreate}
          onCreateCancel={cancelCreate}
        />

        <div className="flex-1 flex min-w-0 bg-neutral-900">
          <div className="flex-1 flex flex-col min-w-0">
            <EditorArea
              activeTabId={activeFileId}
              onViewCode={openCodeModal}
              fileIndex={fileIndex}
              selectedFilePaths={tabs.map(tab => tab.path)}
              onApplyContextFiles={applyContextFiles}
              contextMenuFiles={contextMenuFiles}
              getFileContent={getFileContent}
              codeModal={{
                isOpen: isCodeModalOpen,
                filePath: codeModalPath,
                fileName: codeModalName,
                language: codeModalLanguage,
                content: codeModalContent,
                isDirty: codeModalDirty,
                isLoading: codeModalLoading
              }}
              onCodeModalClose={closeCodeModal}
              onCodeModalChange={handleCodeModalChange}
              onCodeModalSave={saveCodeModal}
              onEditorMount={(editor, monaco) => {
                editorRef.current = editor;
                monacoRef.current = monaco;
                void applyMonacoConfig(monaco, typingsLoadedRef);
              }}
            />
          </div>
        </div>
      </div>

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black backdrop-blur-sm px-6"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-neutral-800 bg-neutral-900 shadow-lg"
            onClick={event => event.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-neutral-800 bg-neutral-950">
              <h2 className="text-sm font-semibold text-neutral-100">Delete {deleteTarget.type === FileType.FOLDER ? 'folder' : 'file'}</h2>
              <p className="mt-1 text-xs text-neutral-400">
                This will permanently remove "{deleteTarget.name}".
              </p>
            </div>
            <div className="px-5 py-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-1.5 text-xs rounded-md text-neutral-300 hover:text-white hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-3 py-1.5 text-xs rounded-md bg-rose-600 text-rose-50 hover:bg-rose-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
