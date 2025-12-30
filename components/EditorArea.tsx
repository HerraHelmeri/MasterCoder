import React, { useRef, useState } from 'react';
import { FileCode } from 'lucide-react';
import logo from '../assets/Logo.svg';
import { ChatInputArea } from './ChatInputArea';
import { ChatMessageList } from './chat/ChatMessageList';
import { CodeModal } from './chat/CodeModal';
import { requestGeminiReply } from './chat/gemini';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

type CodeModalState = {
  isOpen: boolean;
  filePath: string | null;
  fileName: string;
  language: string;
  content: string;
  isDirty: boolean;
  isLoading: boolean;
};

interface EditorAreaProps {
  activeTabId: string | null;
  onViewCode: (id: string) => void;
  fileIndex: string[];
  selectedFilePaths: string[];
  onApplyContextFiles: (paths: string[]) => void;
  contextMenuFiles: {
    recommended: string[];
    all: string[];
  };
  getFileContent: (path: string) => Promise<string>;
  codeModal: CodeModalState;
  onCodeModalClose: () => void;
  onCodeModalChange: (value: string | undefined) => void;
  onCodeModalSave: () => void;
  onEditorMount: (editor: unknown, monaco: unknown) => void;
}

export const EditorArea: React.FC<EditorAreaProps> = ({
  activeTabId,
  onViewCode,
  fileIndex,
  selectedFilePaths,
  onApplyContextFiles,
  contextMenuFiles,
  getFileContent,
  codeModal,
  onCodeModalClose,
  onCodeModalChange,
  onCodeModalSave,
  onEditorMount
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsSending(true);
    try {
      const reply = await requestGeminiReply({
        prompt: trimmed,
        fileIndex,
        selectedFilePaths,
        getFileContent,
        history: messages
      });
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: reply
      };
      setMessages(prev => [...prev, assistantMessage]);
    } finally {
      setIsSending(false);
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }));
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-neutral-900 overflow-hidden min-w-0 relative">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-0">
        <div
          className="w-[240px] h-[240px] opacity-70 bg-neutral-950/20"
          style={{
            WebkitMaskImage: `url(${logo})`,
            maskImage: `url(${logo})`,
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
            maskPosition: 'center',
            WebkitMaskSize: 'contain',
            maskSize: 'contain'
          }}
        />
      </div>

      {/* Tabs Header */}
      <div className="relative z-10 flex items-center justify-end h-9 shrink-0 px-2">
        <button
          type="button"
          onClick={() => {
            if (activeTabId) onViewCode(activeTabId);
          }}
          disabled={!activeTabId}
          className="h-7 w-8 rounded-md flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-40 disabled:hover:bg-transparent"
          aria-label="View code for selected file"
          title={activeTabId ? 'View code' : 'Select a file to view'}
        >
          <FileCode size={16} />
        </button>
      </div>

      {/* AI Chat Area */}
      <div className="relative z-10 flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto px-5 py-6 pb-28 pill-scrollbar">
          <div className="mx-auto w-full max-w-3xl">
            <ChatMessageList messages={messages} isThinking={isSending} />
            <div ref={bottomRef} />
          </div>
        </div>

        <ChatInputArea
          input={input}
          onInputChange={setInput}
          onSend={handleSend}
          files={contextMenuFiles.all}
          recommendedFiles={contextMenuFiles.recommended}
          selectedFiles={selectedFilePaths}
          onApplySelection={onApplyContextFiles}
          isSending={isSending}
          hasProject={fileIndex.length > 0}
        />
      </div>

      <CodeModal
        codeModal={codeModal}
        onClose={onCodeModalClose}
        onChange={onCodeModalChange}
        onSave={onCodeModalSave}
        onEditorMount={onEditorMount}
      />
    </div>
  );
};
