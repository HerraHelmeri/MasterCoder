import hljs from 'highlight.js/lib/common';
import 'highlight.js/styles/github-dark.css';

export type MessageSegment =
  | { type: 'text'; value: string }
  | { type: 'code'; value: string; language?: string };

export const normalizeFencedBlocks = (content: string) => {
  const lines = content.split('\n');
  const output: string[] = [];
  let isOpen = false;

  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) {
      output.push(line);
      isOpen = !isOpen;
      return;
    }
    if (trimmed.startsWith('``') && !trimmed.startsWith('```')) {
      const normalized = line.replace(/``(?!`)/, '```');
      output.push(normalized);
      isOpen = !isOpen;
      return;
    }
    output.push(line);
  });

  if (isOpen) output.push('```');
  return output.join('\n');
};

export const parseMessageContent = (content: string): MessageSegment[] => {
  const segments: MessageSegment[] = [];
  const fence = '```';
  let index = 0;

  while (index < content.length) {
    const start = content.indexOf(fence, index);
    if (start === -1) {
      segments.push({ type: 'text', value: content.slice(index) });
      break;
    }

    if (start > index) {
      segments.push({ type: 'text', value: content.slice(index, start) });
    }

    const langStart = start + fence.length;
    const lineEnd = content.indexOf('\n', langStart);
    const lang =
      lineEnd !== -1 ? content.slice(langStart, lineEnd).trim() : '';
    const codeStart = lineEnd === -1 ? langStart : lineEnd + 1;
    const end = content.indexOf(fence, codeStart);
    if (end === -1) {
      segments.push({ type: 'text', value: content.slice(start) });
      break;
    }

    segments.push({
      type: 'code',
      value: content.slice(codeStart, end).replace(/\n$/, ''),
      language: lang || undefined
    });
    index = end + fence.length;
  }

  return segments;
};

export const splitTextSegments = (text: string): MessageSegment[] => {
  const lines = text.split('\n');
  const segments: MessageSegment[] = [];
  const codeRegex = /^(diff\b|---\s|\+\+\+\s|@@\s|[+-]\s|<\/?\w|import\s|export\s|const\s|let\s|function\s|class\s|\{|\}|.*;)$/;
  const cssRegex = /^[\w-]+\s*:\s*[^;]+;?$/;
  let buffer: string[] = [];
  let mode: 'text' | 'code' = 'text';
  let nonCodeStreak = 0;

  const isCodeLike = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (codeRegex.test(trimmed)) return true;
    if (cssRegex.test(trimmed)) return true;
    if (trimmed.includes('<') && trimmed.includes('>')) return true;
    return false;
  };

  const flush = () => {
    if (buffer.length === 0) return;
    const value = buffer.join('\n');
    segments.push({ type: mode, value });
    buffer = [];
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const codeLike = isCodeLike(line);

    if (mode === 'text') {
      if (codeLike) {
        flush();
        mode = 'code';
        nonCodeStreak = 0;
        buffer.push(line);
      } else {
        buffer.push(line);
      }
      continue;
    }

    if (codeLike) {
      nonCodeStreak = 0;
      buffer.push(line);
      continue;
    }

    if (!line.trim()) {
      buffer.push(line);
      continue;
    }

    nonCodeStreak += 1;
    if (nonCodeStreak >= 2) {
      flush();
      mode = 'text';
      nonCodeStreak = 0;
      buffer.push(line);
    } else {
      buffer.push(line);
    }
  }

  flush();
  return segments;
};

export const highlightCode = (code: string, language?: string) => {
  if (language) {
    try {
      return hljs.highlight(code, { language }).value;
    } catch {
      return hljs.highlightAuto(code).value;
    }
  }
  return hljs.highlightAuto(code).value;
};
