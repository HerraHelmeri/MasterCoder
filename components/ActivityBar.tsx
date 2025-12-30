import React from 'react';
import { Files, Search, GitGraph, Box, Settings, UserCircle } from 'lucide-react';
import { ActivityView } from '../types';

interface ActivityBarProps {
  activeView: ActivityView;
  setActiveView: (view: ActivityView) => void;
  toggleSidebar: () => void;
  isSidebarVisible: boolean;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
}

export const ActivityBar: React.FC<ActivityBarProps> = ({ 
  activeView, 
  setActiveView, 
  toggleSidebar, 
  isSidebarVisible,
  onOpenSettings,
  onOpenProfile
}) => {
  
  const handleViewClick = (view: ActivityView) => {
    if (activeView === view && isSidebarVisible) {
      toggleSidebar(); // Toggle off if clicking active
    } else {
      setActiveView(view);
      if (!isSidebarVisible) toggleSidebar();
    }
  };

  const getIconClass = (view: ActivityView) => {
    const isActive = activeView === view && isSidebarVisible;
    return `p-3 cursor-pointer transition-colors duration-100 relative ${
      isActive 
        ? 'text-white border-l-2 border-sky-400' 
        : 'text-neutral-400 hover:text-white'
    }`;
  };

  return (
    <div className="w-12 bg-neutral-900 flex flex-col justify-between h-full z-10 shrink-0 border-r border-neutral-800">
      <div className="flex flex-col">
        <div 
          className={getIconClass(ActivityView.EXPLORER)}
          onClick={() => handleViewClick(ActivityView.EXPLORER)}
          title="Explorer"
        >
          <Files size={24} strokeWidth={1.5} />
        </div>
        <div 
          className={getIconClass(ActivityView.SEARCH)}
          onClick={() => handleViewClick(ActivityView.SEARCH)}
          title="Search"
        >
          <Search size={24} strokeWidth={1.5} />
        </div>
        <div 
          className={getIconClass(ActivityView.SOURCE_CONTROL)}
          onClick={() => handleViewClick(ActivityView.SOURCE_CONTROL)}
          title="Source Control"
        >
          <GitGraph size={24} strokeWidth={1.5} />
        </div>
        <div 
          className={getIconClass(ActivityView.EXTENSIONS)}
          onClick={() => handleViewClick(ActivityView.EXTENSIONS)}
          title="Extensions"
        >
          <Box size={24} strokeWidth={1.5} />
        </div>
      </div>
      
      <div className="flex flex-col pb-2">
         <div
          className="p-3 cursor-pointer text-neutral-400 hover:text-white transition-colors"
          onClick={onOpenProfile}
         >
          <UserCircle size={24} strokeWidth={1.5} />
        </div>
        <div
          className="p-3 cursor-pointer text-neutral-400 hover:text-white transition-colors"
          onClick={onOpenSettings}
        >
          <Settings size={24} strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );
};
