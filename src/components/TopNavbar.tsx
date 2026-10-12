import React, { useState } from 'react';
import {
  Plus,
  Layers,
  Keyboard,
  Menu,
  BookOpen,
  Maximize2,
  Minimize2,
  Cloud,
  CloudCheck,
  Loader2,
  LogOut,
  Lock,
  Check,
  AlertCircle,
  MoreHorizontal,
  X,
} from 'lucide-react';
import { WordSize, AutoSaveStatus } from '../types';
import type { User } from '../firebase';

interface TopNavbarProps {
  currentFilter: 'all' | 'checklists' | 'pinned';
  onFilterChange: (filter: 'all' | 'checklists' | 'pinned') => void;
  onCreateNewNote: () => void;
  isFloatingOpen: boolean;
  floatingNotesCount: number;
  onToggleFloating: () => void;
  onOpenShortcuts: () => void;
  onToggleMobileSidebar?: () => void;
  isReadMode: boolean;
  onToggleReadMode: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  wordSize: WordSize;
  onWordSizeChange: (size: WordSize) => void;
  user: User | null;
  isSyncing: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  onLockApp?: () => void;
  autoSaveStatus: AutoSaveStatus;
  isAutoSaveEnabled: boolean;
  onForceSave: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  currentFilter,
  onFilterChange,
  onCreateNewNote,
  isFloatingOpen,
  floatingNotesCount,
  onToggleFloating,
  onOpenShortcuts,
  onToggleMobileSidebar,
  isReadMode,
  onToggleReadMode,
  isFullscreen,
  onToggleFullscreen,
  wordSize,
  onWordSizeChange,
  user,
  isSyncing,
  onSignIn,
  onSignOut,
  onLockApp,
  autoSaveStatus,
  isAutoSaveEnabled,
  onForceSave,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // In Reading View: strictly show only the brand and EXACTLY 1 button: 'Exit'
  if (isReadMode) {
    return (
      <header className="w-full max-w-full overflow-hidden flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 bg-zinc-950 border-b border-zinc-800 sticky top-0 z-30">
        <span className="text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap">
          iClick4free
        </span>

        {/* The single exit button */}
        <button
          type="button"
          onClick={onToggleReadMode}
          className="px-4 py-1.5 text-xs font-semibold text-zinc-950 bg-white hover:bg-zinc-200 rounded-lg transition-colors shadow-sm cursor-pointer whitespace-nowrap"
        >
          Exit
        </button>
      </header>
    );
  }

  return (
    <header className="w-full max-w-full overflow-hidden flex items-center justify-between gap-1 sm:gap-4 md:gap-8 px-2.5 sm:px-6 py-2 sm:py-2.5 bg-zinc-950 border-b border-zinc-800/80 sticky top-0 z-30">
      {/* Zone 1: Brand wordmark & mobile drawer trigger */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {onToggleMobileSidebar && (
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
            title="Open documents drawer"
            aria-label="Toggle document drawer"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}
        <span className="text-sm sm:text-lg font-bold tracking-tight text-white whitespace-nowrap">
          iClick4free
        </span>
      </div>

      {/* Zone 2: Navigation Links & Segmented Views (Desktop) */}
      <nav className="hidden lg:flex items-center gap-6 text-xs text-zinc-400 font-medium overflow-x-auto">
        <button
          type="button"
          onClick={() => onFilterChange('all')}
          className={`hover:text-zinc-100 transition-colors whitespace-nowrap shrink-0 pb-0.5 border-b-2 ${
            currentFilter === 'all'
              ? 'text-white border-zinc-200 font-semibold'
              : 'border-transparent text-zinc-400'
          }`}
        >
          All Documents
        </button>

        <button
          type="button"
          onClick={() => onFilterChange('checklists')}
          className={`hover:text-zinc-100 transition-colors whitespace-nowrap shrink-0 pb-0.5 border-b-2 ${
            currentFilter === 'checklists'
              ? 'text-white border-zinc-200 font-semibold'
              : 'border-transparent text-zinc-400'
          }`}
        >
          Checklists View
        </button>

        <button
          type="button"
          onClick={() => onFilterChange('pinned')}
          className={`hover:text-zinc-100 transition-colors whitespace-nowrap shrink-0 pb-0.5 border-b-2 ${
            currentFilter === 'pinned'
              ? 'text-white border-zinc-200 font-semibold'
              : 'border-transparent text-zinc-400'
          }`}
        >
          Pinned Notes
        </button>

        <button
          type="button"
          onClick={onOpenShortcuts}
          className="hover:text-zinc-100 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 text-zinc-400 border-b-2 border-transparent"
        >
          <Keyboard className="w-3.5 h-3.5 text-zinc-500" />
          <span>Shortcuts</span>
        </button>
      </nav>

      {/* Zone 3: Primary actions */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Real-time Auto-Save Status & Trigger */}
        <button
          type="button"
          onClick={onForceSave}
          className={`flex items-center gap-1 px-1.5 sm:px-2.5 py-1 text-xs rounded-lg border transition-all cursor-pointer ${
            autoSaveStatus === 'saving'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              : autoSaveStatus === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20'
              : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700'
          }`}
          title={
            isAutoSaveEnabled
              ? 'Auto-save is active. Changes are continuously saved to your device and database. Click or press Ctrl+S to save immediately.'
              : 'Auto-save is paused. Click to save now.'
          }
        >
          {autoSaveStatus === 'saving' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400 shrink-0" />
          ) : autoSaveStatus === 'error' ? (
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          ) : (
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          )}
          <span className="hidden md:inline font-mono text-[11px]">
            {autoSaveStatus === 'saving'
              ? 'Auto-saving...'
              : autoSaveStatus === 'error'
              ? 'Save Error'
              : 'Auto-saved'}
          </span>
        </button>

        {/* Database Cloud Sync / User Profile */}
        {user ? (
          <div className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
            {isSyncing ? (
              <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0" />
            ) : (
              <CloudCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            )}
            <span className="hidden xl:inline text-[11px] font-mono text-zinc-300 truncate max-w-[110px]">
              {user.displayName || user.email || 'Cloud DB'}
            </span>
            <button
              type="button"
              onClick={onSignOut}
              className="p-0.5 sm:p-1 rounded text-zinc-500 hover:text-white transition-colors cursor-pointer"
              title="Disconnect cloud database"
            >
              <LogOut className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onSignIn}
            className="flex items-center gap-1 px-1.5 sm:px-2.5 py-1 text-xs font-medium rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="Connect database to save & sync notes"
          >
            <Cloud className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">Connect DB</span>
          </button>
        )}

        {/* Word Size Controls (S / M / L / XL) - Visible on medium+ screens */}
        <div className="hidden md:flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-[11px] text-zinc-400 font-mono">
          {(['sm', 'base', 'lg', 'xl'] as WordSize[]).map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => onWordSizeChange(size)}
              className={`px-1.5 sm:px-2 py-0.5 rounded transition-colors uppercase cursor-pointer ${
                wordSize === size
                  ? 'bg-zinc-800 text-white font-semibold'
                  : 'hover:text-zinc-200'
              }`}
              title={`Word size: ${size === 'sm' ? 'Small' : size === 'base' ? 'Medium' : size === 'lg' ? 'Large' : 'Extra Large'}`}
            >
              {size === 'sm' ? 'S' : size === 'base' ? 'M' : size === 'lg' ? 'L' : 'XL'}
            </button>
          ))}
        </div>

        {/* Read Mode Toggle - Visible on medium+ screens */}
        <button
          type="button"
          onClick={onToggleReadMode}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all whitespace-nowrap shrink-0 bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700 hover:text-white hover:bg-zinc-800 cursor-pointer"
          title="Enter Read Mode (distraction-free)"
          aria-label="Toggle Read Mode"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Read Mode</span>
        </button>

        {/* Lock App with Passcode - Visible on desktop */}
        {onLockApp && (
          <button
            type="button"
            onClick={onLockApp}
            className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-700 hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
            title="Lock workspace with passcode"
            aria-label="Lock workspace"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Fullscreen Toggle - Visible on desktop */}
        <button
          type="button"
          onClick={onToggleFullscreen}
          className={`hidden md:flex items-center justify-center w-8 h-8 rounded-lg border transition-all shrink-0 cursor-pointer ${
            isFullscreen
              ? 'bg-zinc-800 text-white border-zinc-700 shadow-xs'
              : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700 hover:text-white hover:bg-zinc-800'
          }`}
          title={isFullscreen ? 'Exit Full Screen' : 'Full Screen View'}
          aria-label="Toggle Full Screen"
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>

        {/* Floating notes launcher */}
        <button
          type="button"
          onClick={onToggleFloating}
          className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
            isFloatingOpen
              ? 'bg-zinc-800 text-white border-zinc-700 shadow-sm'
              : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800'
          }`}
          title="Toggle floating side-notes"
        >
          <Layers className="w-3.5 h-3.5 text-zinc-400" />
          <span className="hidden md:inline">Side Notes</span>
          <span
            className={`text-[10px] font-mono tabular-nums px-1 sm:px-1.5 py-0.5 rounded ${
              isFloatingOpen ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            {floatingNotesCount}
          </span>
        </button>

        {/* Mobile Quick Options Menu Trigger */}
        <div className="relative md:hidden">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className={`flex items-center justify-center w-7 h-7 rounded-lg border transition-colors cursor-pointer ${
              isMobileMenuOpen
                ? 'bg-zinc-800 text-white border-zinc-700'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:bg-zinc-850'
            }`}
            title="More workspace tools"
            aria-label="Toggle more controls"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>

          {/* Mobile Popover Menu */}
          {isMobileMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-2xs md:hidden"
                onClick={() => setIsMobileMenuOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute right-0 top-9 z-50 w-64 bg-zinc-900 rounded-xl border border-zinc-800 shadow-2xl p-3 flex flex-col gap-3 text-xs text-zinc-100 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                  <span className="font-semibold text-white">Quick Tools</span>
                  <button
                    type="button"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-1 rounded text-zinc-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Word Size in Mobile Popover */}
                <div>
                  <span className="text-[11px] text-zinc-400 block mb-1.5 font-mono">Word Size</span>
                  <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-lg p-1 text-[11px] font-mono">
                    {(['sm', 'base', 'lg', 'xl'] as WordSize[]).map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => {
                          onWordSizeChange(size);
                        }}
                        className={`flex-1 py-1 rounded transition-colors uppercase text-center cursor-pointer ${
                          wordSize === size
                            ? 'bg-zinc-800 text-white font-semibold'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {size === 'sm' ? 'S' : size === 'base' ? 'M' : size === 'lg' ? 'L' : 'XL'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Document Views Filter */}
                <div className="flex flex-col gap-1 pt-1 border-t border-zinc-800/80">
                  <span className="text-[11px] text-zinc-400 font-mono mb-0.5">Filter</span>
                  <button
                    type="button"
                    onClick={() => {
                      onFilterChange('all');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                      currentFilter === 'all' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-300 hover:bg-zinc-800/50'
                    }`}
                  >
                    All Documents
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onFilterChange('checklists');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                      currentFilter === 'checklists' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-300 hover:bg-zinc-800/50'
                    }`}
                  >
                    Checklists View
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onFilterChange('pinned');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                      currentFilter === 'pinned' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-300 hover:bg-zinc-800/50'
                    }`}
                  >
                    Pinned Notes
                  </button>
                </div>

                {/* Mode toggles */}
                <div className="flex flex-col gap-1 pt-1 border-t border-zinc-800/80">
                  <button
                    type="button"
                    onClick={() => {
                      onToggleReadMode();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 text-left transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Enter Reading View</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onToggleFullscreen();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 text-left transition-colors"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{isFullscreen ? 'Exit Full Screen' : 'Full Screen View'}</span>
                  </button>

                  {onLockApp && (
                    <button
                      type="button"
                      onClick={() => {
                        onLockApp();
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 text-left transition-colors"
                    >
                      <Lock className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Lock with Passcode</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      onOpenShortcuts();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 text-left transition-colors"
                  >
                    <Keyboard className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Shortcuts Reference</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* New Note CTA */}
        <button
          type="button"
          onClick={onCreateNewNote}
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3.5 py-1.5 text-xs font-semibold text-zinc-950 bg-white rounded-lg hover:bg-zinc-200 transition-colors shadow-sm whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Document</span>
          <span className="sm:hidden text-[11px]">New</span>
        </button>
      </div>
    </header>
  );
};

