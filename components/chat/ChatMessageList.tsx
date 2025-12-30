import React, { memo, useMemo } from 'react';
import {
  highlightCode,
  normalizeFencedBlocks,
  parseMessageContent,
  splitTextSegments
} from './codeBlocks';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

type Props = {
  messages: ChatMessage[];
  isThinking?: boolean;
};

export const ChatMessageList: React.FC<Props> = memo(({ messages, isThinking }) => {
  const lastAssistantId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === 'assistant') return messages[i].id;
    }
    return null;
  }, [messages]);

  return (
    <div className="space-y-4">
      {messages.map(message => (
        <ChatMessageItem
          key={message.id}
          message={message}
          shouldAnimate={message.role === 'assistant' && message.id === lastAssistantId}
        />
      ))}
      {isThinking && (
        <div className="flex w-full text-base leading-relaxed text-neutral-100">
          <div className="mr-auto w-fit max-w-full rounded-2xl px-4 py-3 text-left">
            <div className="thinking-dots">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

type ItemProps = {
  message: ChatMessage;
  shouldAnimate: boolean;
};

const ChatMessageItem: React.FC<ItemProps> = ({ message, shouldAnimate }) => {
  const isUser = message.role === 'user';
  const [visibleContent, setVisibleContent] = React.useState(message.content);
  const hasAnimatedRef = React.useRef(false);

  React.useEffect(() => {
    hasAnimatedRef.current = false;
  }, [message.id]);

  React.useEffect(() => {
    if (!shouldAnimate) {
      setVisibleContent(message.content);
      return;
    }
    if (hasAnimatedRef.current) {
      setVisibleContent(message.content);
      return;
    }

    hasAnimatedRef.current = true;
    setVisibleContent('');

    const total = message.content.length;
    const charsPerTick =
      total > 2000 ? 6 : total > 1200 ? 5 : total > 600 ? 4 : total > 250 ? 3 : 2;
    let index = 0;

    const interval = window.setInterval(() => {
      index = Math.min(total, index + charsPerTick);
      setVisibleContent(message.content.slice(0, index));
      if (index >= total) {
        window.clearInterval(interval);
      }
    }, 16);

    return () => window.clearInterval(interval);
  }, [message.content, shouldAnimate]);

  const segments = useMemo(() => {
    return parseMessageContent(normalizeFencedBlocks(visibleContent)).flatMap(
      segment =>
        segment.type === 'text'
          ? splitTextSegments(segment.value)
          : [segment]
    );
  }, [visibleContent]);

  return (
    <div className="flex w-full text-base leading-relaxed text-neutral-100">
      <div
        className={`rounded-3xl px-4 py-3 text-left ${
          isUser
            ? 'ml-auto bg-neutral-800 w-fit max-w-full'
            : 'mr-auto w-fit max-w-full'
        }`}
      >
        {segments.map((segment, index) => {
          if (segment.type === 'code') {
            return (
              <CodeBlock
                key={`${message.id}-code-${index}`}
                language={segment.language}
                value={segment.value}
              />
            );
          }

          return segment.value.split('\n').map((line, lineIndex) => (
            <div key={`${message.id}-text-${index}-${lineIndex}`}>
              {line}
            </div>
          ));
        })}
      </div>
    </div>
  );
};

type CodeBlockProps = {
  value: string;
  language?: string;
};

const CodeBlock: React.FC<CodeBlockProps> = ({ value, language }) => {
  const highlighted = useMemo(
    () => highlightCode(value, language),
    [value, language]
  );

  return (
    <div className="mt-2">
      {language && (
        <div className="text-[11px] uppercase tracking-wide text-neutral-400 mb-1">
          {language}
        </div>
      )}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
        <pre className="p-3 text-sm text-neutral-100 overflow-x-auto pill-scrollbar">
          <code
            className="font-mono whitespace-pre"
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        </pre>
      </div>
    </div>
  );
};
