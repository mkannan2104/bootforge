import React from 'react';
import { Home, Disc, RotateCcw, Activity, Settings, HardDrive } from 'lucide-react';

export type NavTab = 'home' | 'create' | 'restore' | 'activity' | 'settings';

export interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isElevated: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isElevated,
}) => {
  const navItems = [
    { id: 'home' as NavTab, label: 'Home', icon: <Home className="w-4 h-4" /> },
    { id: 'create' as NavTab, label: 'Make Bootable USB', icon: <Disc className="w-4 h-4" /> },
    { id: 'restore' as NavTab, label: 'Format / Clean USB', icon: <RotateCcw className="w-4 h-4" /> },
    { id: 'activity' as NavTab, label: 'History', icon: <Activity className="w-4 h-4" /> },
    { id: 'settings' as NavTab, label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-56 border-r border-slate-200 bg-white flex flex-col justify-between shrink-0 select-none font-normal">
      <div>
        {/* Brand Header */}
        <div className="px-4 py-3.5 flex items-center gap-2.5 border-b border-slate-200 bg-slate-50">
          <div className="w-7 h-7 rounded-none bg-slate-800 flex items-center justify-center text-white">
            <HardDrive className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm text-slate-800 tracking-tight leading-none">
              BootForge
            </h1>
            <span className="text-[11px] text-slate-500">USB Tool</span>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="p-2 space-y-0.5">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs rounded-none transition-colors ${
                  isActive
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span className={isActive ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Safety & Status Footer */}
      <div className="p-3 m-2 rounded-none bg-slate-50 border border-slate-200 text-xs">
        <div className="text-slate-700 text-xs mb-0.5">
          Administrator: <span className={isElevated ? 'text-emerald-700' : 'text-amber-700'}>{isElevated ? 'Yes' : 'No'}</span>
        </div>
        <p className="text-[11px] text-slate-500 leading-tight">
          Your main Windows disk (C:) is protected and cannot be erased.
        </p>
      </div>
    </aside>
  );
};
