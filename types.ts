export enum FileType {
  FILE = 'FILE',
  FOLDER = 'FOLDER'
}

export interface FileSystemItem {
  id: string;
  path?: string;
  name: string;
  type: FileType;
  content?: string;
  language?: string;
  isOpen?: boolean;
  children?: FileSystemItem[];
  parentId?: string | null;
  depth?: number;
}

export interface EditorTab {
  id: string;
  path: string;
  name: string;
  language: string;
  content: string;
  savedContent: string;
  isDirty: boolean;
}

export interface FileTab {
  id: string;
  path: string;
  name: string;
  language: string;
}

export enum ActivityView {
  EXPLORER = 'EXPLORER',
  SEARCH = 'SEARCH',
  SOURCE_CONTROL = 'SOURCE_CONTROL',
  EXTENSIONS = 'EXTENSIONS'
}

export interface SearchMatch {
  line: number;
  text: string;
}

export interface SearchResult {
  path: string;
  matches: SearchMatch[];
}

export interface GitStatusEntry {
  status: string;
  path: string;
}
