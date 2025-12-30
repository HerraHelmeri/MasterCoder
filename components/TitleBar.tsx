import React, { useMemo, useState } from 'react';

type TitleBarProps = {
  height?: number;
  onCommand: (command: string) => void;
};

const MENU_ITEMS = ['File', 'Edit', 'Selection', 'View', 'Go', 'Help'];

const MENU_ACTIONS: Record<string, { label: string; command: string }[]> = {
  File: [
    { label: 'Open Folder', command: 'file:openFolder' },
    { label: 'New File', command: 'file:new' },
    { label: 'Save', command: 'file:save' },
    { label: 'Save All', command: 'file:saveAll' }
  ],
  Edit: [
    { label: 'Undo', command: 'edit:undo' },
    { label: 'Redo', command: 'edit:redo' },
    { label: 'Find', command: 'edit:find' }
  ],
  Selection: [
    { label: 'Select All', command: 'selection:all' }
  ],
  View: [
    { label: 'Toggle Sidebar', command: 'view:sidebar' }
  ],
  Go: [
    { label: 'Go to File', command: 'go:file' }
  ],
  Help: [
    { label: 'Open README', command: 'help:readme' }
  ]
};

export function TitleBar({ height = 32, onCommand }: TitleBarProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuActions = useMemo(() => (activeMenu ? MENU_ACTIONS[activeMenu] ?? [] : []), [activeMenu]);

  const handleMenuClick = (menu: string) => {
    setActiveMenu(prev => (prev === menu ? null : menu));
  };

  const handleCommand = (command: string) => {
    onCommand(command);
    setActiveMenu(null);
  };

  return (
    <div
      className="flex-shrink-0 bg-neutral-900 border-b border-neutral-800 flex items-center px-2 gap-1"
      style={{ height, WebkitAppRegion: 'drag' }}
    >
      <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' }}>
        {MENU_ITEMS.map(item => (
          <div key={item} className="relative">
            <button
              type="button"
              className={`px-2 py-0.5 text-xs rounded ${
                activeMenu === item ? 'bg-neutral-800 text-white' : 'text-neutral-300 hover:bg-neutral-800'
              }`}
              onClick={() => handleMenuClick(item)}
            >
              {item}
            </button>
            {activeMenu === item && menuActions.length > 0 && (
              <div className="absolute left-0 top-full mt-1 bg-neutral-900 border border-neutral-700 rounded shadow-lg z-50 min-w-[160px]">
                {menuActions.map(action => (
                  <button
                    key={action.command}
                    type="button"
                    className="w-full text-left px-3 py-2 text-xs text-neutral-200 hover:bg-neutral-800"
                    onClick={() => handleCommand(action.command)}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex-1" />
    </div>
  );
}
