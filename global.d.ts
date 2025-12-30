interface TerminalDataPayload {
  id: string;
  data: string;
}

interface SearchMatch {
  line: number;
  text: string;
}

interface SearchResult {
  path: string;
  matches: SearchMatch[];
}

interface GitStatusEntry {
  status: string;
  path: string;fsefs
}

interface FileSystemItemApi {
  id: string;
  path: string;
  name: string;
  type: 'FILE' | 'FOLDER';
  depth: number;
  children?: FileSystemItemApi[];
}

interface WindowApi {
  readTree: () => Promise<FileSystemItemApi>;
  selectWorkspace: () => Promise<FileSystemItemApi | null>;
  readFile: (relativePath: string) => Promise<string>;
  writeFile: (relativePath: string, content: string) => Promise<boolean>;
  createFolder: (relativePath: string) => Promise<boolean>;
  renamePath: (fromPath: string, toPath: string) => Promise<boolean>;
  copyPath: (fromPath: string, toPath: string) => Promise<boolean>;
  deletePath: (relativePath: string) => Promise<boolean>;
  searchInFiles: (query: string) => Promise<SearchResult[]>;
  gitStatus: () => Promise<GitStatusEntry[]>;
  tsserver: {
    start: () => Promise<boolean>;
    readTsConfig: () => Promise<{
      configPath: string | null;
      compilerOptions: Record<string, unknown>;
    }>;
    getTypings: () => Promise<Array<{ uri: string; content: string }>>;
    updateOpen: (payload: {
      openFiles?: Array<{
        file: string;
        content: string;
        scriptKindName?: string;
      }>;
      changedFiles?: Array<{
        file: string;
        content: string;
      }>;
      closedFiles?: string[];
    }) => Promise<void>;
    requestDiagnostics: (files: string[]) => Promise<void>;
    onDiagnostics: (callback: (payload: {
      file: string;
      kind: string;
      diagnostics: Array<{
        start?: number | { line: number; offset: number };
        end?: { line: number; offset: number };
        length?: number;
        text?: string;
        messageText?: string;
        code?: number;
        category?: string;
      }>;
    }) => void) => () => void;
  };
  terminal: {
    create: () => Promise<string>;
    write: (id: string, data: string) => Promise<void>;
    resize: (id: string, cols: number, rows: number) => Promise<void>;
    kill: (id: string) => Promise<void>;
    onData: (callback: (payload: TerminalDataPayload) => void) => () => void;
  };
}

interface Window {
  api: WindowApi;
}
