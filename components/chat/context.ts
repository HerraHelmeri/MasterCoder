import { truncateText } from './textUtils';

const MAX_FILE_LIST = 200;
const MAX_CONTENT_CHARS = 4000;
const MAX_CONTEXT_FILES = 6;
const MAX_CONTEXT_CHARS = 14000;

const isListFilesRequest = (message: string) => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('list files') ||
    normalized.includes('show files') ||
    normalized.includes('files in') ||
    normalized.includes('project files')
  );
};

const getFileName = (filePath: string) => {
  const parts = filePath.split(/[\\/]/);
  return parts[parts.length - 1] || filePath;
};

const findMatchingFile = (message: string, fileIndex: string[]) => {
  const normalized = message.toLowerCase();
  const direct = fileIndex.find(path => normalized.includes(path.toLowerCase()));
  if (direct) return direct;
  return fileIndex.find(path => normalized.includes(getFileName(path).toLowerCase()));
};

export const buildContextBundle = async ({
  prompt,
  fileIndex,
  selectedFilePaths,
  getFileContent
}: {
  prompt: string;
  fileIndex: string[];
  selectedFilePaths: string[];
  getFileContent: (path: string) => Promise<string>;
}) => {
  if (fileIndex.length === 0) {
    return {
      context: 'Project file index is still loading.',
      matchedPath: null
    };
  }

  if (isListFilesRequest(prompt)) {
    const list = fileIndex.slice(0, MAX_FILE_LIST);
    const remaining = fileIndex.length - list.length;
    return {
      context: [
        'Project files:',
        list.map(path => `- ${path}`).join('\n'),
        remaining > 0 ? `...and ${remaining} more` : null
      ]
        .filter(Boolean)
        .join('\n'),
      matchedPath: null
    };
  }

  const matchedPath = findMatchingFile(prompt, fileIndex);
  const fallbackToAll = !matchedPath && selectedFilePaths.length === 0;
  const focusFiles = fallbackToAll
    ? fileIndex
    : matchedPath
      ? [matchedPath, ...selectedFilePaths.filter(path => path !== matchedPath)]
      : selectedFilePaths;
  const uniqueFocus = fallbackToAll
    ? Array.from(new Set(focusFiles))
    : Array.from(new Set(focusFiles)).slice(0, MAX_CONTEXT_FILES);

  let usedChars = 0;
  const fileSnippets: string[] = [];

  for (const path of uniqueFocus) {
    try {
      const content = await getFileContent(path);
      const clipped = truncateText(content, MAX_CONTENT_CHARS);
      const nextBlock = `\n\n[File: ${path}]\n${clipped}`;
      if (usedChars + nextBlock.length > MAX_CONTEXT_CHARS) break;
      fileSnippets.push(nextBlock);
      usedChars += nextBlock.length;
    } catch {
      fileSnippets.push(`\n\n[File: ${path}]\n<Unable to read file>`);
    }
  }

  const listPreview = fileIndex.slice(0, 60).map(path => `- ${path}`).join('\n');
  const moreCount = Math.max(0, fileIndex.length - 60);
  const fileListSection = [
    'Project file index (partial):',
    listPreview,
    moreCount > 0 ? `...and ${moreCount} more` : null
  ]
    .filter(Boolean)
    .join('\n');

  return {
    context: `${fileListSection}${fileSnippets.join('')}`,
    matchedPath
  };
};
