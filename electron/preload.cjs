const { contextBridge, ipcRenderer } = require('electron');

// Expose a narrow IPC surface to the renderer.
contextBridge.exposeInMainWorld('api', {
  readTree: () => ipcRenderer.invoke('fs:readTree'),
  selectWorkspace: () => ipcRenderer.invoke('fs:selectWorkspace'),
  readFile: (relativePath) => ipcRenderer.invoke('fs:readFile', relativePath),
  writeFile: (relativePath, content) => ipcRenderer.invoke('fs:writeFile', relativePath, content),
  createFolder: (relativePath) => ipcRenderer.invoke('fs:mkdir', relativePath),
  renamePath: (fromPath, toPath) => ipcRenderer.invoke('fs:rename', fromPath, toPath),
  copyPath: (fromPath, toPath) => ipcRenderer.invoke('fs:copy', fromPath, toPath),
  deletePath: (relativePath) => ipcRenderer.invoke('fs:delete', relativePath),
  searchInFiles: (query) => ipcRenderer.invoke('fs:search', query),
  gitStatus: () => ipcRenderer.invoke('git:status'),
  tsserver: {
    start: () => ipcRenderer.invoke('tsserver:start'),
    readTsConfig: () => ipcRenderer.invoke('tsserver:readTsConfig'),
    getTypings: () => ipcRenderer.invoke('tsserver:getTypings'),
    updateOpen: (payload) => ipcRenderer.invoke('tsserver:updateOpen', payload),
    requestDiagnostics: (files) => ipcRenderer.invoke('tsserver:requestDiagnostics', files),
    onDiagnostics: (callback) => {
      const listener = (_event, payload) => callback(payload);
      ipcRenderer.on('tsserver:diagnostics', listener);
      return () => ipcRenderer.removeListener('tsserver:diagnostics', listener);
    }
  },
  terminal: {
    create: () => ipcRenderer.invoke('terminal:create'),
    write: (id, data) => ipcRenderer.invoke('terminal:write', id, data),
    resize: (id, cols, rows) => ipcRenderer.invoke('terminal:resize', id, cols, rows),
    kill: (id) => ipcRenderer.invoke('terminal:kill', id),
    onData: (callback) => {
      const listener = (_event, payload) => callback(payload);
      ipcRenderer.on('terminal:data', listener);
      return () => ipcRenderer.removeListener('terminal:data', listener);
    }
  }
});
