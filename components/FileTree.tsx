import React, { useState } from 'react';
import { ChevronRight, ChevronDown, FileCode, Folder, FolderOpen, FileJson, FileType2, FileText } from 'lucide-react';
import { FileSystemItem, FileType } from '../types';

interface FileTreeProps {
  items: FileSystemItem[];
  activeFileId: string | null;
  onFileClick: (file: FileSystemItem) => void;
  onRenameItem: (item: FileSystemItem) => void;
  onCopyItem: (item: FileSystemItem) => void;
  onDeleteItem: (item: FileSystemItem) => void;
}

const getFileIcon = (name: string) => {
  if (name.endsWith('.tsx') || name.endsWith('.ts')) return <FileCode size={16} className="text-blue-400" />;
  if (name.endsWith('.css')) return <FileType2 size={16} className="text-blue-300" />;
  if (name.endsWith('.json')) return <FileJson size={16} className="text-yellow-400" />;
  if (name.endsWith('.md')) return <FileText size={16} className="text-gray-400" />;
  return <FileText size={16} className="text-gray-400" />;
};

const FileTreeNode: React.FC<{
  item: FileSystemItem;
  activeFileId: string | null;
  onFileClick: (file: FileSystemItem) => void;
  onContextMenu: (event: React.MouseEvent, item: FileSystemItem) => void;
}> = ({ item, activeFileId, onFileClick, onContextMenu }) => {
  const [isOpen, setIsOpen] = useState(item.depth === 0);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.type === FileType.FOLDER) {
      setIsOpen(!isOpen);
    } else {
      onFileClick(item);
    }
  };

  const isSelected = activeFileId === item.id;
  const paddingLeft = `${(item.depth || 0) * 12 + 10}px`;

  return (
    <div>
      <div
        className={`flex items-center py-[3px] cursor-pointer select-none hover:bg-neutral-800 transition-colors ${
          isSelected ? 'bg-neutral-800 text-white' : 'text-neutral-300'
        }`}
        style={{ paddingLeft }}
        onClick={handleClick}
        onContextMenu={(event) => onContextMenu(event, item)}
      >
        <span className="mr-1 shrink-0 flex items-center justify-center w-4">
          {item.type === FileType.FOLDER && (
            isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          )}
        </span>
        <span className="mr-1.5 shrink-0">
          {item.type === FileType.FOLDER ? (
            isOpen ? <FolderOpen size={16} className="text-amber-300" /> : <Folder size={16} className="text-amber-300" />
          ) : (
            getFileIcon(item.name)
          )}
        </span>
        <span className="truncate text-[13px] flex-1">{item.name}</span>
      </div>
      
      {item.type === FileType.FOLDER && isOpen && item.children && (
        <div>
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

  React.useEffect(() => {
    if (!contextMenu) return;
    const handleClose = () => setContextMenu(null);
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setContextMenu(null);
    };
    window.addEventListener('click', handleClose);
    window.addEventListener('scroll', handleClose, true);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('click', handleClose);
      window.removeEventListener('scroll', handleClose, true);
      window.removeEventListener('keydown', handleKey);
    };
  }, [contextMenu]);

  const handleContextMenu = (event: React.MouseEvent, item: FileSystemItem) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ x: event.clientX, y: event.clientY, item });
  };

  const handleRename = () => {
    if (!contextMenu) return;
    onRenameItem(contextMenu.item);
    setContextMenu(null);
  };

  const handleCopy = () => {
    if (!contextMenu) return;
    onCopyItem(contextMenu.item);
    setContextMenu(null);
  };

  const handleDelete = () => {
    if (!contextMenu) return;
    onDeleteItem(contextMenu.item);
    setContextMenu(null);
  };

  return (
    <div className="w-full">
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
          className="fixed z-50 min-w-[160px] rounded-md border border-neutral-700 bg-neutral-900 shadow-xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            type="button"
            onClick={handleRename}
            className="w-full text-left text-xs px-3 py-2 text-neutral-200 hover:bg-neutral-800"
          >
            Rename
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="w-full text-left text-xs px-3 py-2 text-neutral-200 hover:bg-neutral-800"
          >
            Copy
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="w-full text-left text-xs px-3 py-2 text-red-300 hover:bg-neutral-800"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
};
