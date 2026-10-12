import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ onClose }) => {
  const shortcuts = [
    { key: 'Enter', action: 'Create a new paragraph below (inherits checklist format)' },
    { key: 'Ctrl + S / Cmd + S', action: 'Instant save document (auto-save also continuously saves)' },
    { key: 'Ctrl + Shift + C', action: 'Toggle checklist on current paragraph' },
    { key: 'Ctrl + Enter', action: 'Toggle checkbox checked / unchecked' },
    { key: 'Backspace', action: 'On empty line, removes checklist or deletes block' },
    { key: 'Arrow Up / Down', action: 'Navigate between paragraphs seamlessly' },
    { key: 'Grip Drag & Hold', action: 'Drag and hold the vertical grip handle to reorder paragraphs' },
    { key: 'Gutter Hover / Tap', action: '1-click checklist toggle and block styling menu' },
    { key: 'Header Drag', action: 'Move the Floating Notes pad anywhere on desktop screen' },
  ];

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-800 max-w-md w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-zinc-100">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-zinc-400" />
            <h3 className="text-sm font-semibold text-white">Keyboard Shortcuts</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 divide-y divide-zinc-800 max-h-96 overflow-y-auto">
          {shortcuts.map((sc, i) => (
            <div key={i} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 text-xs">
              <span className="text-zinc-300">{sc.action}</span>
              <kbd className="px-2 py-1 bg-zinc-950 border border-zinc-800 rounded font-mono text-[11px] text-zinc-200 shrink-0 ml-3">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="flex justify-end p-4 bg-zinc-950 border-t border-zinc-850">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-zinc-950 bg-white hover:bg-zinc-200 rounded-lg transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
