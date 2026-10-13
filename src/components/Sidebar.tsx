import React, { useRef } from 'react';
import { Note } from '../types';
import { formatTimeAgo, getChecklistStats } from '../utils/helpers';
import { Search, Pin, Trash2, Copy, FileText, CheckSquare, X, Lock, FolderOpen } from 'lucide-react';

interface SidebarProps {
  notes: Note[];
  activeNoteId: string;
  onSelectNote: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onDuplicateNote: (note: Note) => void;
  onTogglePin: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onLockApp?: () => void;
  onLoadFile?: (file: File) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  notes,
  activeNoteId,
  onSelectNote,
  onDeleteNote,
  onDuplicateNote,
  onTogglePin,
  searchQuery,
  onSearchChange,
  isOpenMobile,
  onCloseMobile,
  onLockApp,
  onLoadFile,
}) => {
  const sidebarFileInputRef = useRef<HTMLInputElement>(null);
  const filteredNotes = notes.filter((n) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const titleMatch = n.title.toLowerCase().includes(q);
    const paraMatch = n.paragraphs.some((p) => p.text.toLowerCase().includes(q));
    return titleMatch || paraMatch;
  });

  // Sort pinned first, then by updatedAt
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.updatedAt - a.updatedAt;
  });

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 md:hidden transition-opacity"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`w-72 sm:w-80 max-w-[85vw] bg-zinc-950 border-r border-zinc-850 flex flex-col shrink-0 h-[calc(100vh-53px)] md:h-[calc(100vh-53px)] fixed md:static top-[53px] md:top-0 left-0 z-40 transition-transform duration-200 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Mobile Header with Close button */}
        <div className="flex md:hidden items-center justify-between px-4 py-3 border-b border-zinc-800">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Documents ({sortedNotes.length})
          </span>
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-900"
            aria-label="Close sidebar drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar + Quick Load */}
        <div className="p-3 border-b border-zinc-850 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search documents or tasks..."
              className="w-full bg-zinc-900/90 text-zinc-100 pl-9 pr-7 py-2 text-xs rounded-lg border border-zinc-800 outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 placeholder:text-zinc-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-2.5 text-xs text-zinc-500 hover:text-zinc-300"
              >
                ✕
              </button>
            )}
          </div>
          {onLoadFile && (
            <>
              <input
                type="file"
                ref={sidebarFileInputRef}
                className="hidden"
                accept=".md,.markdown,.txt,.json,.csv,.tsv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onLoadFile(file);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => sidebarFileInputRef.current?.click()}
                className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
                title="Load file into Noteflow (.md, .txt, .json, .csv)"
              >
                <FolderOpen className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sortedNotes.length === 0 ? (
            <div className="text-center py-12 px-4">
              <FileText className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
              <p className="text-xs text-zinc-400 font-medium">No documents found</p>
              <p className="text-[11px] text-zinc-600 mt-1">
                {searchQuery ? 'Try another search query' : 'Create a new document to start'}
              </p>
            </div>
          ) : (
            sortedNotes.map((note) => {
              const isActive = note.id === activeNoteId;
              const stats = getChecklistStats(note.paragraphs);
              const previewText =
                note.paragraphs.find((p) => p.text.trim())?.text || 'Empty document';

              return (
                <div
                  key={note.id}
                  onClick={() => {
                    onSelectNote(note.id);
                    onCloseMobile();
                  }}
                  className={`group relative p-3 rounded-xl cursor-pointer transition-all border ${
                    isActive
                      ? 'bg-zinc-900/90 border-zinc-750 text-white shadow-xs'
                      : 'border-transparent hover:bg-zinc-900/50 hover:border-zinc-800/60 text-zinc-300'
                  }`}
                >
                  {/* Title and Pin */}
                  <div className="flex items-start justify-between gap-2">
                    <h3
                      className={`text-xs font-semibold truncate flex-1 ${
                        isActive ? 'text-zinc-100' : 'text-zinc-300 group-hover:text-zinc-100'
                      }`}
                    >
                      {note.title || 'Untitled Document'}
                    </h3>

                    <div className="flex items-center gap-1 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTogglePin(note.id);
                        }}
                        className={`p-1 rounded text-zinc-500 hover:text-zinc-200 ${
                          note.isPinned ? '!opacity-100 text-amber-400 font-bold' : ''
                        }`}
                        title={note.isPinned ? 'Unpin note' : 'Pin note to top'}
                      >
                        <Pin className="w-3 h-3" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicateNote(note);
                        }}
                        className="p-1 rounded text-zinc-500 hover:text-zinc-200"
                        title="Duplicate document"
                      >
                        <Copy className="w-3 h-3" />
                      </button>

                      {notes.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteNote(note.id);
                          }}
                          className="p-1 rounded text-zinc-500 hover:text-red-400"
                          title="Delete document"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Snippet preview */}
                  <p className="text-[11px] text-zinc-400 line-clamp-1 mt-1 leading-relaxed">
                    {previewText}
                  </p>

                  {/* Clean unboxed metadata with dot separators */}
                  <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-2 font-mono tabular-nums">
                    <span>{formatTimeAgo(note.updatedAt)}</span>
                    {stats.total > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="flex items-center gap-1 text-zinc-400">
                          <CheckSquare className="w-3 h-3 text-zinc-400" />
                          <span>
                            {stats.completed}/{stats.total}
                          </span>
                        </span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span>{note.paragraphs.length} blocks</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-zinc-850 bg-zinc-950 flex items-center justify-between text-[11px] text-zinc-500 font-mono tabular-nums">
          <div className="flex items-center gap-2">
            <span>{notes.length} docs</span>
            <span>·</span>
            <span>
              {notes.reduce((acc, n) => acc + n.paragraphs.filter((p) => p.isChecklist).length, 0)} tasks
            </span>
          </div>

          {onLockApp && (
            <button
              type="button"
              onClick={onLockApp}
              className="flex items-center gap-1 px-2 py-1 rounded hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Lock app with passcode"
            >
              <Lock className="w-3 h-3" />
              <span>Lock</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
