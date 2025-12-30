import React, { useEffect, useRef, useState } from 'react';
import { FilePlus, FolderPlus, MoreHorizontal, PlusSquare } from 'lucide-react';
import { FileTree } from './FileTree';
import { FileSystemItem, ActivityView, SearchResult, GitStatusEntry } from '../types';

interface SidebarProps {
  isVisible: boolean;
  activeView: ActivityView;
  files: FileSystemItem[];
  rootName: string;
  activeFileId: string | null;
  onFileClick: (file: FileSystemItem) => void;
  onOpenPath: (relativePath: string) => void;
  onCreateFile: () => void;
  onCreateFolder: () => void;
  onRenameItem: (item: FileSystemItem) => void;
  onCopyItem: (item: FileSystemItem) => void;
  onDeleteItem: (item: FileSystemItem) => void;
  createDraft: {
    kind: 'file' | 'folder';
    name: string;
    error: string;
  } | null;
  onCreateNameChange: (name: string) => void;
  onCreateSubmit: () => void;
  onCreateCancel: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isVisible,
  activeView,
  files,
  rootName,
  activeFileId,
  onFileClick,
  onOpenPath,
  onCreateFile,
  onCreateFolder,
  onRenameItem,
  onCopyItem,
  onDeleteItem,
  createDraft,
  onCreateNameChange,
  onCreateSubmit,
  onCreateCancel
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const didFocusRef = useRef(false);

  useEffect(() => {
    if (!createDraft) {
      didFocusRef.current = false;
      return;
    }
    if (didFocusRef.current || !inputRef.current) return;
    inputRef.current.focus();
    inputRef.current.select();
    didFocusRef.current = true;
  }, [createDraft]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [gitStatus, setGitStatus] = useState<GitStatusEntry[]>([]);
  const [extensions, setExtensions] = useState<string[]>([]);

  useEffect(() => {
    if (activeView !== ActivityView.SEARCH) return;
    const timeout = setTimeout(async () => {
      const results = await window.api.searchInFiles(searchQuery);
      setSearchResults(results);
    }, 250);
    return () => clearTimeout(timeout);
  }, [activeView, searchQuery]);

  useEffect(() => {
    if (activeView !== ActivityView.SOURCE_CONTROL) return;
    window.api.gitStatus().then(setGitStatus);
  }, [activeView]);

  useEffect(() => {
    if (activeView !== ActivityView.EXTENSIONS) return;
    window.api.readFile('package.json').then(content => {
      try {
        const parsed = JSON.parse(content);
        const deps = Object.keys(parsed.dependencies ?? {});
        const devDeps = Object.keys(parsed.devDependencies ?? {});
        setExtensions([...deps, ...devDeps].sort());
      } catch {
        setExtensions([]);
      }
    });
  }, [activeView]);

  if (!isVisible) return null;

  return (
    <div className="w-64 bg-neutral-900 h-full flex flex-col border-r border-neutral-800 select-none">
      <div className="h-9 px-4 flex items-center justify-between text-[11px] font-bold text-neutral-400 tracking-wide uppercase">
        <span>{activeView}</span>
        <div className="flex items-center gap-2 text-neutral-500">
          {activeView === ActivityView.EXPLORER && (
            <>
              <button
                type="button"
                onClick={onCreateFile}
                className="hover:text-white"
                title="New File"
                aria-label="New file"
              >
                <PlusSquare size={16} />
              </button>
              <button
                type="button"
                onClick={onCreateFolder}
                className="hover:text-white"
                title="New Folder"
                aria-label="New folder"
              >
                <FolderPlus size={16} />
              </button>
            </>
          )}
          <MoreHorizontal size={16} className="cursor-pointer hover:text-white" />
        </div>
      </div>

      {activeView === ActivityView.EXPLORER && (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="px-4 py-1 text-[11px] font-semibold text-neutral-200 flex items-center bg-neutral-900 border-b border-neutral-800 shadow-sm mb-1 cursor-pointer">
            {rootName}
          </div>
          {createDraft && (
            <div className="px-4 py-2 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                {createDraft.kind === 'file' ? (
                  <FilePlus size={16} className="text-neutral-400" />
                ) : (
                  <FolderPlus size={16} className="text-neutral-400" />
                )}
                <input
                  ref={inputRef}
                  type="text"
                  value={createDraft.name}
                  onChange={e => onCreateNameChange(e.target.value)}
                  onBlur={() => onCreateCancel()}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      onCreateSubmit();
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      onCreateCancel();
                    }
                  }}
                  placeholder={`New ${createDraft.kind} name`}
                  className="flex-1 bg-neutral-900 border border-neutral-700 text-neutral-100 placeholder-neutral-500 text-xs px-2 py-1 rounded outline-none focus:border-neutral-500"
                />
              </div>
              {createDraft.error && (
                <div className="mt-1 text-[11px] text-red-400">{createDraft.error}</div>
              )}
            </div>
          )}
          <FileTree
            items={files}
            activeFileId={activeFileId}
            onFileClick={onFileClick}
            onRenameItem={onRenameItem}
            onCopyItem={onCopyItem}
            onDeleteItem={onDeleteItem}
          />
        </div>
      )}

      {activeView === ActivityView.SEARCH && (
        <div className="p-4 text-neutral-300 text-sm">
          <input
            type="text"
            placeholder="Search"
            className="w-full bg-neutral-800 border border-neutral-700 focus:border-sky-400 text-white px-2 py-1 outline-none text-xs mb-2"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchResults.length === 0 ? (
            <p className="mt-4 text-xs text-neutral-500">No results found.</p>
          ) : (
            <div className="space-y-3 mt-2 text-xs">
              {searchResults.map(result => (
                <div key={result.path}>
                  <button
                    type="button"
                    className="text-left text-sky-400 hover:underline"
                    onClick={() => onOpenPath(result.path)}
                  >
                    {result.path}
                  </button>
                  <div className="mt-1 space-y-1">
                    {result.matches.slice(0, 5).map(match => (
                      <div key={`${result.path}-${match.line}`} className="text-neutral-300">
                        <span className="text-emerald-400 mr-2">{match.line}</span>
                        <span className="truncate inline-block max-w-full">{match.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeView === ActivityView.SOURCE_CONTROL && (
        <div className="p-4 text-neutral-300 text-sm">
          <button
            type="button"
            className="text-xs text-sky-400 hover:underline mb-3"
            onClick={() => window.api.gitStatus().then(setGitStatus)}
          >
            Refresh
          </button>
          {gitStatus.length === 0 ? (
            <p className="text-xs text-neutral-500">Working tree clean.</p>
          ) : (
            <div className="space-y-2 text-xs">
              {gitStatus.map(entry => (
                <button
                  key={`${entry.status}-${entry.path}`}
                  type="button"
                  className="w-full text-left hover:text-white"
                  onClick={() => onOpenPath(entry.path)}
                >
                  <span className="inline-block w-6 text-fuchsia-300">{entry.status}</span>
                  {entry.path}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {activeView === ActivityView.EXTENSIONS && (
        <div className="p-4 text-neutral-300 text-sm">
          <p className="text-xs text-neutral-500 mb-2">Dependencies in package.json</p>
          {extensions.length === 0 ? (
            <p className="text-xs text-neutral-500">No dependencies found.</p>
          ) : (
            <div className="space-y-1 text-xs">
              {extensions.map(extension => (
                <div key={extension}>{extension}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
