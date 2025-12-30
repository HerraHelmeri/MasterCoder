import React from 'react';
import Editor from '@monaco-editor/react';
import logo from '../../assets/Logo.svg';

type CodeModalState = {
  isOpen: boolean;
  filePath: string | null;
  fileName: string;
  language: string;
  content: string;
  isDirty: boolean;
  isLoading: boolean;
};

const toMonacoPath = (filePath: string) =>
  `file:///${filePath.replace(/\\/g, '/')}`;

const getMonacoLanguage = (lang: string) => {
  switch (lang) {
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'html':
      return 'html';
    case 'css':
      return 'css';
    case 'json':
      return 'json';
    case 'md':
      return 'markdown';
    default:
      return 'plaintext';
  }
};

export const CodeModal: React.FC<{
  codeModal: CodeModalState;
  onClose: () => void;
  onChange: (value: string | undefined) => void;
  onSave: () => void;
  onEditorMount: (editor: unknown, monaco: unknown) => void;
}> = ({ codeModal, onClose, onChange, onSave, onEditorMount }) => {
  if (!codeModal.isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-6 md:px-10">
      <div className="w-[min(1100px,92vw)] h-[min(80vh,900px)] bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-950">
          <div className="text-sm text-neutral-200">
            View Code: {codeModal.fileName || 'Untitled'}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSave}
              disabled={codeModal.isLoading || !codeModal.isDirty}
              className="px-3 py-1.5 text-xs rounded-md bg-neutral-800 text-neutral-200 hover:bg-neutral-700 disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs rounded-md bg-neutral-700 text-neutral-100 hover:bg-neutral-600"
            >
              Close
            </button>
          </div>
        </div>
        <div className="flex-1 bg-neutral-900">
          {codeModal.isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-neutral-500 text-sm">
              <div className="mb-3 opacity-40">
                <img src={logo} alt="Logo" className="w-20 h-20" />
              </div>
              Loading file...
            </div>
          ) : (
            <Editor
              height="100%"
              theme="vs-dark"
              language={getMonacoLanguage(codeModal.language)}
              path={codeModal.filePath ? toMonacoPath(codeModal.filePath) : undefined}
              value={codeModal.content}
              onChange={onChange}
              onMount={(editor, monaco) => onEditorMount(editor, monaco)}
              options={{
                minimap: { enabled: true },
                fontSize: 14,
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 16 },
                fontFamily: "'Fira Code', 'Consolas', monospace"
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
