import React from 'react';
import { Plus, SendHorizontal, Check } from 'lucide-react';

interface ChatInputAreaProps {
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  files: string[];
  recommendedFiles: string[];
  selectedFiles: string[];
  onApplySelection: (paths: string[]) => void;
  isSending: boolean;
  hasProject: boolean;
}

export const ChatInputArea: React.FC<ChatInputAreaProps> = ({
  input,
  onInputChange,
  onSend,
  files,
  recommendedFiles,
  selectedFiles,
  onApplySelection,
  isSending,
  hasProject
}) => {
  const [isPickerOpen, setIsPickerOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [pendingSelection, setPendingSelection] = React.useState<string[]>([]);
  const MAX_VISIBLE_FILES = 200;

  const togglePicker = () => {
    if (!hasProject) return;
    setPendingSelection(selectedFiles);
    setIsPickerOpen(prev => !prev);
  };

  const filteredFiles = React.useMemo(() => {
    if (!isPickerOpen) return [];
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return recommendedFiles;
    return files.filter(path => path.toLowerCase().includes(normalizedQuery));
  }, [files, isPickerOpen, query, recommendedFiles]);

  const visibleFiles = filteredFiles.slice(0, MAX_VISIBLE_FILES);
  const remainingCount = Math.max(0, filteredFiles.length - visibleFiles.length);

  const updatePending = (path: string) => {
    setPendingSelection(prev => (
      prev.includes(path) ? prev.filter(item => item !== path) : [...prev, path]
    ));
  };

  const applySelection = () => {
    onApplySelection(pendingSelection);
    setIsPickerOpen(false);
  };

  const clearSelection = () => {
    setPendingSelection([]);
  };

  return (
    <div className="sticky bottom-4 z-20 px-5 pb-4">
      <div className="mx-auto w-full max-w-3xl">
        <div className="relative">
          {isPickerOpen && (
            <div className="absolute inset-x-3 bottom-full mb-3 z-50 rounded-2xl border border-neutral-700 bg-neutral-900 p-3 shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Filter files..."
                  className="w-full bg-neutral-800 border border-neutral-700 text-neutral-100 placeholder-neutral-500 text-sm px-2 py-1 rounded-lg outline-none focus:border-neutral-500"
                />
              </div>
              <div className="max-h-48 overflow-y-auto text-sm text-neutral-200 space-y-1 pr-1">
                {filteredFiles.length === 0 ? (
                  <div className="text-neutral-500">No matches.</div>
                ) : (
                  visibleFiles.map(path => (
                    <label key={path} className="flex items-center gap-2 cursor-pointer hover:text-white">
                      <input
                        type="checkbox"
                        checked={pendingSelection.includes(path)}
                        onChange={() => updatePending(path)}
                        className="sr-only peer"
                      />
                      <span className="h-4 w-4 rounded border border-neutral-600 bg-neutral-800 flex items-center justify-center peer-checked:border-sky-400 peer-checked:bg-sky-600">
                        <Check size={12} className="text-sky-300 opacity-0 peer-checked:opacity-100" />
                      </span>
                      <span className="truncate">{path}</span>
                    </label>
                  ))
                )}
                {remainingCount > 0 && (
                  <div className="text-neutral-500 pt-1">
                    ...and {remainingCount} more
                  </div>
                )}
              </div>
              <div className="mt-2 text-[11px] text-neutral-500">
                Showing recommended files. Type to search all indexed files.
              </div>
              <div className="flex items-center justify-between mt-3">
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-sm text-neutral-400 hover:text-neutral-200"
                >
                  Clear
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPickerOpen(false)}
                    className="text-sm text-neutral-400 hover:text-neutral-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={applySelection}
                    className="px-2 py-1 text-sm rounded-md bg-neutral-700 text-neutral-100 hover:bg-neutral-600"
                  >
                    Add context
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 rounded-3xl border border-neutral-700 bg-neutral-800 px-4 py-3 shadow-md backdrop-blur-md">
            <button
              type="button"
              onClick={togglePicker}
              disabled={!hasProject}
              className="h-9 w-9 rounded-full flex items-center justify-center text-neutral-300 hover:text-white hover:bg-neutral-700 disabled:opacity-40 disabled:hover:bg-transparent"
              aria-label="Add context files"
              title={hasProject ? 'Add context files' : 'Open a project to add context'}
            >
              <Plus size={18} />
            </button>

            <input
              type="text"
              value={input}
              onChange={e => onInputChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
              placeholder="Ask about your code..."
              className="flex-1 bg-transparent text-base text-neutral-100 placeholder-neutral-400 outline-none"
            />

            <button
              type="button"
              onClick={onSend}
              disabled={isSending || input.trim().length === 0}
              className="h-9 w-9 rounded-full flex items-center justify-center text-neutral-200 hover:text-white hover:bg-neutral-700 disabled:opacity-40 disabled:hover:bg-transparent"
              aria-label="Send message"
              title="Send"
            >
              <SendHorizontal size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
