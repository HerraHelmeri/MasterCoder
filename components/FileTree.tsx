import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  FileCode,
  Folder,
  FolderOpen,
  FileJson,
  Hash,
  FileText,
  Code
} from 'lucide-react';
import { FileSystemItem, FileType } from '../types';

const INDENT_SIZE = 14;
const ROW_HEIGHT = 'h-[22px]';

interface FileTreeProps {
  items: FileSystemItem[];
  activeFileId: string | null;
  onFileClick: (file: FileSystemItem) => void;
  onRenameItem: (item: FileSystemItem) => void;
  onCopyItem: (item: FileSystemItem) => void;
  onDeleteItem: (item: FileSystemItem) => void;
}

const getFileIcon = (name: string) => {
   if (name.endsWith('.html') || name.endsWith('.ts'))
    return <Code size={16} className="text-amber-500" />;
  if (name.endsWith('.tsx') || name.endsWith('.ts'))
    return <FileCode size={16} className="text-blue-400" />;
  if (name.endsWith('.css'))
    return <Hash size={16} className="text-blue-300" />;
  if (name.endsWith('.json'))
    return <FileJson size={16} className="text-yellow-400" />;
  return <FileText size={16} className="text-neutral-400" />;
};

interface FileTreeNodeProps {
  item: FileSystemItem;
  activeFileId: string | null;
  onFileClick: (file: FileSystemItem) => void;
  onContextMenu: (event: React.MouseEvent, item: FileSystemItem) => void;
}

const FileTreeNode: React.FC<FileTreeNodeProps> = ({
  item,
  activeFileId,
  onFileClick,
  onContextMenu
}) => {
  const [isOpen, setIsOpen] = useState(item.depth === 0);
  const isSelected = activeFileId === item.id;

  const paddingLeft = useMemo(
    () => `${item.depth * INDENT_SIZE + 8}px`,
    [item.depth]
  );

  const handleRowClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.type === FileType.FOLDER) {
      setIsOpen((prev) => !prev);
    } else {
      onFileClick(item);
    }
  };

  return (
    <div>
      <div
        className={`group flex items-center ${ROW_HEIGHT} px-1 text-[13px] cursor-pointer select-none
          ${
            isSelected
              ? 'bg-neutral-800 text-white'
              : 'text-neutral-300 hover:bg-neutral-800'
          }`}
        style={{ paddingLeft }}
        onClick={handleRowClick}
        onContextMenu={(e) => onContextMenu(e, item)}
      >
        {/* Chevron */}
        <div className="w-4 flex items-center justify-center mr-1">
          {item.type === FileType.FOLDER &&
            (isOpen ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            ))}
        </div>

        {/* Icon */}
        <div className="w-4 mr-2 flex items-center justify-center">
          {item.type === FileType.FOLDER ? (
            isOpen ? (
              <FolderOpen size={16} className="text-amber-300" />
            ) : (
              <Folder size={16} className="text-amber-300" />
            )
          ) : (
            getFileIcon(item.name)
          )}
        </div>

        {/* Name */}
        <span className="truncate flex-1">{item.name}</span>
      </div>

      {/* Children */}
      {item.type === FileType.FOLDER && isOpen && item.children && (
        <div className="border-l border-neutral-800 ml-[10px]">
          {item.children.map((child) => (
            <FileTreeNode
              key={child.id}
              item={child}
              activeFileId={activeFileId}
              onFileClick={onFileClick}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const FileTree: React.FC<FileTreeProps> = ({
  items,
  activeFileId,
  onFileClick,
  onRenameItem,
  onCopyItem,
  onDeleteItem
}) => {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    item: FileSystemItem;
  } | null>(null);

  useEffect(() => {
    if (!contextMenu) return;

    const close = () => setContextMenu(null);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && close();

    window.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('keydown', esc);

    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('keydown', esc);
    };
  }, [contextMenu]);

  const handleContextMenu = (
    event: React.MouseEvent,
    item: FileSystemItem
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const x = Math.min(event.clientX, window.innerWidth - 180);
    const y = Math.min(event.clientY, window.innerHeight - 120);

    setContextMenu({ x, y, item });
  };

  return (
    <div className="w-full text-sm">
      {items.map((item) => (
        <FileTreeNode
          key={item.id}
          item={item}
          activeFileId={activeFileId}
          onFileClick={onFileClick}
          onContextMenu={handleContextMenu}
        />
      ))}

      {contextMenu && (
        <div
          className="fixed z-50 min-w-[160px] rounded-lg border border-neutral-800 bg-neutral-900 shadow-md backdrop-blur overflow-hidden"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <MenuItem onClick={() => onRenameItem(contextMenu.item)}>
            Rename
          </MenuItem>
          <MenuItem onClick={() => onCopyItem(contextMenu.item)}>
            Copy
          </MenuItem>
          <MenuItem danger onClick={() => onDeleteItem(contextMenu.item)}>
            Delete
          </MenuItem>
        </div>
      )}
    </div>
  );
};

const MenuItem: React.FC<{
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}> = ({ children, onClick, danger }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full text-left px-3 py-2 text-xs transition-colors
      ${
        danger
          ? 'text-red-300 hover:bg-neutral-800'
          : 'text-neutral-200 hover:bg-neutral-800'
      }`}
  >
    {children}
  </button>
);
