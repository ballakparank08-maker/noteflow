import React, { useState, useRef, useEffect } from 'react';
import { Note, ParagraphBlock, WordSize } from '../types';
import { generateId, getChecklistStats, formatTimeAgo, reorderParagraphs, createDefaultTableData } from '../utils/helpers';
import { ParagraphBlockItem } from './ParagraphBlockItem';
import {
  CheckSquare,
  Plus,
  Copy,
  Layers,
  Check,
  Download,
  FolderOpen,
  Table as TableIcon,
  Trash2,
  Save,
  Loader2,
} from 'lucide-react';

interface NoteEditorProps {
  note: Note;
  isReadMode?: boolean;
  isFullscreen?: boolean;
  wordSize?: WordSize;
  onToggleReadMode?: () => void;
  onUpdateNote: (updates: Partial<Note>) => void;
  onSendToFloatingPad: (block: ParagraphBlock) => void;
  onSendWholeNoteToFloating: (note: Note) => void;
  onOpenExportModal: () => void;
  onLoadFile?: (file: File) => void;
  onDeleteNote?: (id: string) => void;
  saveStatus?: 'saved' | 'unsaved' | 'saving';
  onManualSave?: () => void;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  isReadMode = false,
  isFullscreen = false,
  wordSize = 'base',
  onUpdateNote,
  onSendToFloatingPad,
  onSendWholeNoteToFloating,
  onOpenExportModal,
  onLoadFile,
  onDeleteNote,
  saveStatus = 'saved',
  onManualSave,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'completed'>('all');
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [allowScriptEditInFullscreen, setAllowScriptEditInFullscreen] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const editorFileInputRef = useRef<HTMLInputElement>(null);

  // In Read Mode or Fullscreen (unless explicitly unlocked), script editing is locked,
  // while checklists remain 100% interactive and operable!
  const isScriptLocked = isReadMode || (isFullscreen && !allowScriptEditInFullscreen);

  const stats = getChecklistStats(note.paragraphs);

  // Drag and hold reordering state
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; position: 'top' | 'bottom' } | null>(null);

  const handleDragStartBlock = (id: string) => {
    setDraggedBlockId(id);
  };

  const handleDragOverBlock = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedBlockId || draggedBlockId === targetId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const position = e.clientY < rect.top + rect.height / 2 ? 'top' : 'bottom';
    setDropTarget({ id: targetId, position });
  };

  const handleDragLeaveBlock = (targetId: string) => {
    if (dropTarget?.id === targetId) {
      setDropTarget(null);
    }
  };

  const handleDropBlock = (targetId: string) => {
    if (!draggedBlockId || draggedBlockId === targetId || !dropTarget) {
      setDraggedBlockId(null);
      setDropTarget(null);
      return;
    }

    const reordered = reorderParagraphs(note.paragraphs, draggedBlockId, targetId, dropTarget.position);
    onUpdateNote({ paragraphs: reordered, updatedAt: Date.now() });
    setDraggedBlockId(null);
    setDropTarget(null);
  };

  const handleDragEndBlock = () => {
    setDraggedBlockId(null);
    setDropTarget(null);
  };

  // Touch drag-and-hold for mobile & tablet devices
  const handleTouchStartDragBlock = (id: string) => {
    setDraggedBlockId(id);
  };

  useEffect(() => {
    if (!draggedBlockId) return;

    const handleWindowTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      const elem = document.elementFromPoint(touch.clientX, touch.clientY);
      const blockContainer = elem?.closest('[data-block-id]') as HTMLElement;
      if (blockContainer) {
        const targetId = blockContainer.getAttribute('data-block-id');
        if (targetId && targetId !== draggedBlockId) {
          const rect = blockContainer.getBoundingClientRect();
          const position = touch.clientY < rect.top + rect.height / 2 ? 'top' : 'bottom';
          setDropTarget({ id: targetId, position });
        }
      }
    };

    const handleWindowTouchEnd = () => {
      if (draggedBlockId && dropTarget) {
        const reordered = reorderParagraphs(note.paragraphs, draggedBlockId, dropTarget.id, dropTarget.position);
        onUpdateNote({ paragraphs: reordered, updatedAt: Date.now() });
      }
      setDraggedBlockId(null);
      setDropTarget(null);
    };

    window.addEventListener('touchmove', handleWindowTouchMove, { passive: false });
    window.addEventListener('touchend', handleWindowTouchEnd);
    window.addEventListener('touchcancel', handleWindowTouchEnd);

    return () => {
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', handleWindowTouchEnd);
      window.removeEventListener('touchcancel', handleWindowTouchEnd);
    };
  }, [draggedBlockId, dropTarget, note.paragraphs, onUpdateNote]);

  // Update a specific paragraph block
  const handleUpdateBlock = (blockId: string, updates: Partial<ParagraphBlock>) => {
    const updated = note.paragraphs.map((p) =>
      p.id === blockId ? { ...p, ...updates } : p
    );
    onUpdateNote({ paragraphs: updated, updatedAt: Date.now() });
  };

  // Delete a paragraph block
  const handleDeleteBlock = (blockId: string) => {
    if (note.paragraphs.length <= 1) {
      handleUpdateBlock(blockId, { text: '', isChecklist: false, checked: false });
      return;
    }
    const filtered = note.paragraphs.filter((p) => p.id !== blockId);
    onUpdateNote({ paragraphs: filtered, updatedAt: Date.now() });
  };

  // Split or add new paragraph when pressing Enter
  const handleSplitBlock = (blockId: string, cursorIndex: number, currentText: string) => {
    const blockIndex = note.paragraphs.findIndex((p) => p.id === blockId);
    if (blockIndex === -1) return;

    const currentBlock = note.paragraphs[blockIndex];
    const textBefore = currentText.slice(0, cursorIndex);
    const textAfter = currentText.slice(cursorIndex);

    const updatedCurrent: ParagraphBlock = {
      ...currentBlock,
      text: textBefore,
    };

    const newBlock: ParagraphBlock = {
      id: generateId('p'),
      text: textAfter,
      isChecklist: currentBlock.isChecklist,
      checked: false,
      type: currentBlock.type === 'h1' || currentBlock.type === 'h2' ? 'p' : currentBlock.type,
    };

    const newParagraphs = [...note.paragraphs];
    newParagraphs.splice(blockIndex, 1, updatedCurrent, newBlock);
    onUpdateNote({ paragraphs: newParagraphs, updatedAt: Date.now() });

    setTimeout(() => {
      const el = document.querySelector(`[data-block-id="${newBlock.id}"] textarea`) as HTMLTextAreaElement;
      if (el) {
        el.focus();
        el.setSelectionRange(0, 0);
      }
    }, 10);
  };

  const handleFocusPrev = (currentIndex: number) => {
    if (currentIndex <= 0) {
      if (titleInputRef.current) {
        titleInputRef.current.focus();
      }
      return;
    }
    const prevBlock = note.paragraphs[currentIndex - 1];
    if (prevBlock) {
      const el = document.querySelector(`[data-block-id="${prevBlock.id}"] textarea`) as HTMLTextAreaElement;
      if (el) {
        el.focus();
        const len = el.value.length;
        el.setSelectionRange(len, len);
      }
    }
  };

  const handleFocusNext = (currentIndex: number) => {
    if (currentIndex >= note.paragraphs.length - 1) return;
    const nextBlock = note.paragraphs[currentIndex + 1];
    if (nextBlock) {
      const el = document.querySelector(`[data-block-id="${nextBlock.id}"] textarea`) as HTMLTextAreaElement;
      if (el) {
        el.focus();
        el.setSelectionRange(0, 0);
      }
    }
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const copy = [...note.paragraphs];
    const temp = copy[index];
    copy[index] = copy[index - 1];
    copy[index - 1] = temp;
    onUpdateNote({ paragraphs: copy, updatedAt: Date.now() });
  };

  const handleMoveDown = (index: number) => {
    if (index >= note.paragraphs.length - 1) return;
    const copy = [...note.paragraphs];
    const temp = copy[index];
    copy[index] = copy[index + 1];
    copy[index + 1] = temp;
    onUpdateNote({ paragraphs: copy, updatedAt: Date.now() });
  };

  const handleAddBlock = (isChecklist = false) => {
    const newBlock: ParagraphBlock = {
      id: generateId('p'),
      text: '',
      isChecklist,
      checked: false,
      type: 'p',
    };
    onUpdateNote({ paragraphs: [...note.paragraphs, newBlock], updatedAt: Date.now() });

    setTimeout(() => {
      const el = document.querySelector(`[data-block-id="${newBlock.id}"] textarea`) as HTMLTextAreaElement;
      if (el) {
        el.focus();
      }
    }, 10);
  };

  const handleAddTableBlock = () => {
    const newBlock: ParagraphBlock = {
      id: generateId('tbl'),
      text: '',
      isChecklist: false,
      checked: false,
      type: 'table',
      tableData: createDefaultTableData(),
    };
    onUpdateNote({ paragraphs: [...note.paragraphs, newBlock], updatedAt: Date.now() });
  };

  const handleToggleAllChecklists = () => {
    const allAreChecklists = note.paragraphs.every((p) => p.isChecklist);
    const updated = note.paragraphs.map((p) => ({
      ...p,
      isChecklist: !allAreChecklists,
      checked: false,
    }));
    onUpdateNote({ paragraphs: updated, updatedAt: Date.now() });
  };

  const handleCheckAll = (checked: boolean) => {
    const updated = note.paragraphs.map((p) =>
      p.isChecklist ? { ...p, checked } : p
    );
    onUpdateNote({ paragraphs: updated, updatedAt: Date.now() });
  };

  const handleQuickCopyText = () => {
    const text = `${note.title}\n\n` + note.paragraphs.map((p) => {
      if (p.isChecklist) return `${p.checked ? '[x] ' : '[ ] '}${p.text}`;
      return p.text;
    }).join('\n\n');

    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  const visibleParagraphs = note.paragraphs.filter((p) => {
    if (isReadMode) return true;
    if (filterMode === 'all') return true;
    if (filterMode === 'pending') return p.isChecklist && !p.checked;
    if (filterMode === 'completed') return p.isChecklist && p.checked;
    return true;
  });

  // Calculate document word and character count
  const allDocText = [note.title, ...note.paragraphs.map((p) => p.text)].join(' ').trim();
  const wordCount = allDocText ? allDocText.split(/\s+/).filter(Boolean).length : 0;
  const charCount = allDocText.length;

  return (
    <main className="flex-1 w-full max-w-full overflow-y-auto overflow-x-hidden bg-zinc-950 text-zinc-100 flex flex-col items-center">
      <div className="w-full max-w-3xl px-3 sm:px-10 py-5 sm:py-8 flex flex-col min-h-full min-w-0">
        {/* Document Header Metadata */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-zinc-850">
          {/* Metadata unboxed text with dots */}
          <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono tabular-nums flex-wrap">
            <span>Edited {formatTimeAgo(note.updatedAt)}</span>
            <span aria-hidden="true">·</span>
            <span>{note.paragraphs.length} paragraphs</span>
            {stats.total > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-zinc-300 font-medium">
                  {stats.completed}/{stats.total} checked
                </span>
              </>
            )}

            {isReadMode && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-zinc-400">Reading View</span>
              </>
            )}
            {isFullscreen && !isReadMode && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-zinc-400">Full Screen</span>
                <span aria-hidden="true">·</span>
                <span className="text-amber-400/90 font-medium">
                  {allowScriptEditInFullscreen ? 'Script Editing' : 'Checklist Active (Script Locked)'}
                </span>
                <button
                  type="button"
                  onClick={() => setAllowScriptEditInFullscreen((prev) => !prev)}
                  className="ml-1 text-[10px] text-zinc-400 hover:text-white underline underline-offset-2 cursor-pointer"
                >
                  {allowScriptEditInFullscreen ? 'Lock Script' : 'Unlock Script'}
                </button>
              </>
            )}
          </div>

          {/* Action buttons (ONLY rendered in edit mode; zero buttons rendered in read mode) */}
          {!isReadMode && (
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              {/* Primary Save Button */}
              {onManualSave && (
                <button
                  type="button"
                  onClick={onManualSave}
                  disabled={saveStatus === 'saving'}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer shadow-xs ${
                    saveStatus === 'unsaved'
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold shadow-emerald-500/20'
                      : saveStatus === 'saving'
                      ? 'bg-zinc-800 text-zinc-400 cursor-wait'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-zinc-800'
                  }`}
                  title="Save document changes (Ctrl+S / Cmd+S)"
                >
                  {saveStatus === 'saving' ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
                      <span>Saving...</span>
                    </>
                  ) : saveStatus === 'unsaved' ? (
                    <>
                      <Save className="w-3.5 h-3.5 text-zinc-950 stroke-[2.5]" />
                      <span>Save</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
                      <span>Saved</span>
                    </>
                  )}
                </button>
              )}

              {!isScriptLocked && (
                <>
                  <button
                    type="button"
                    onClick={handleToggleAllChecklists}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-md transition-colors"
                    title="Toggle checklist status on all paragraphs"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-zinc-400" />
                    <span>
                      {note.paragraphs.every((p) => p.isChecklist)
                        ? 'Revert'
                        : 'All Checklist'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAddTableBlock}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-md transition-colors cursor-pointer"
                    title="Insert a table with checklists in every column"
                  >
                    <TableIcon className="w-3.5 h-3.5 text-zinc-400" />
                    <span>+ Table</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => onSendWholeNoteToFloating(note)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-md transition-colors"
                title="Pin this note into the floating pad for side-by-side editing"
              >
                <Layers className="w-3.5 h-3.5 text-zinc-400" />
                <span>To Floating</span>
              </button>

              <button
                type="button"
                onClick={onOpenExportModal}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-md transition-colors cursor-pointer"
                title="Export as Markdown or plain text"
              >
                <Download className="w-3.5 h-3.5 text-zinc-400" />
                <span>Export</span>
              </button>

              {onLoadFile && (
                <>
                  <input
                    type="file"
                    ref={editorFileInputRef}
                    className="hidden"
                    accept=".md,.markdown,.txt,.json,.csv,.tsv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        onLoadFile(file);
                      }
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => editorFileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-md transition-colors cursor-pointer"
                    title="Load file from computer (.md, .txt, .json, .csv)"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Load File</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={handleQuickCopyText}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-md transition-colors"
                title="Copy plain text to clipboard"
              >
                {copiedNotification ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-medium">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Copy</span>
                  </>
                )}
              </button>

              {onDeleteNote && (
                <button
                  type="button"
                  onClick={() => onDeleteNote(note.id)}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-zinc-500 hover:text-red-400 hover:bg-zinc-900 rounded-md transition-colors cursor-pointer"
                  title="Delete this document"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Checklist Progress Bar Strip */}
        {stats.total > 0 && (
          <div className="py-3.5 my-2 border-b border-zinc-800">
            <div className="flex items-center justify-between text-xs mb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">Checklist Progress</span>
                <span className="text-zinc-400 font-mono tabular-nums">
                  {stats.completed}/{stats.total} ({stats.percent}%)
                </span>
              </div>

              {!isReadMode && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCheckAll(true)}
                    disabled={stats.completed === stats.total}
                    className="text-[11px] font-medium text-zinc-400 hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
                  >
                    Check all
                  </button>
                  <span className="text-zinc-600">·</span>
                  <button
                    type="button"
                    onClick={() => handleCheckAll(false)}
                    disabled={stats.completed === 0}
                    className="text-[11px] font-medium text-zinc-400 hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-300"
                style={{ width: `${stats.percent}%` }}
              />
            </div>

            {/* Filter segmented tabs */}
            {!isReadMode && (
              <div className="flex items-center gap-1 mt-3 overflow-x-auto pb-0.5">
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    filterMode === 'all'
                      ? 'bg-zinc-800 text-white font-semibold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  All Blocks ({note.paragraphs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('pending')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    filterMode === 'pending'
                      ? 'bg-zinc-800 text-white font-semibold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Pending ({stats.total - stats.completed})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('completed')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    filterMode === 'completed'
                      ? 'bg-zinc-800 text-white font-semibold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Completed ({stats.completed})
                </button>
              </div>
            )}
          </div>
        )}

        {/* Note Title Input / Read Heading */}
        <div className="pt-4 pb-2">
          {isScriptLocked ? (
            <h1
              className={`w-full font-bold tracking-tight text-white py-1 ${
                wordSize === 'sm'
                  ? 'text-xl sm:text-2xl'
                  : wordSize === 'lg'
                  ? 'text-3xl sm:text-4xl'
                  : wordSize === 'xl'
                  ? 'text-4xl sm:text-5xl'
                  : 'text-2xl sm:text-3xl'
              }`}
            >
              {note.title || 'Untitled Document'}
            </h1>
          ) : (
            <input
              ref={titleInputRef}
              type="text"
              value={note.title}
              onChange={(e) => onUpdateNote({ title: e.target.value, updatedAt: Date.now() })}
              placeholder="Untitled Document"
              className={`w-full font-bold tracking-tight text-white placeholder:text-zinc-700 bg-transparent border-none outline-none focus:ring-0 p-0 ${
                wordSize === 'sm'
                  ? 'text-xl sm:text-2xl'
                  : wordSize === 'lg'
                  ? 'text-3xl sm:text-4xl'
                  : wordSize === 'xl'
                  ? 'text-4xl sm:text-5xl'
                  : 'text-2xl sm:text-3xl'
              }`}
            />
          )}
        </div>

        {/* Paragraph Blocks List */}
        <div className="flex-1 flex flex-col gap-1 py-4">
          {visibleParagraphs.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500">
              No paragraphs to display.
            </div>
          ) : (
            visibleParagraphs.map((block) => {
              const originalIndex = note.paragraphs.findIndex((p) => p.id === block.id);
              return (
                <ParagraphBlockItem
                  key={block.id}
                  block={block}
                  index={originalIndex}
                  totalBlocks={note.paragraphs.length}
                  isReadMode={isScriptLocked}
                  wordSize={wordSize}
                  isDragging={draggedBlockId === block.id}
                  dropPosition={dropTarget?.id === block.id ? dropTarget.position : null}
                  onDragStartBlock={handleDragStartBlock}
                  onDragOverBlock={handleDragOverBlock}
                  onDragLeaveBlock={handleDragLeaveBlock}
                  onDropBlock={handleDropBlock}
                  onDragEndBlock={handleDragEndBlock}
                  onTouchStartDragBlock={handleTouchStartDragBlock}
                  onUpdate={handleUpdateBlock}
                  onDelete={handleDeleteBlock}
                  onSplit={handleSplitBlock}
                  onFocusPrev={handleFocusPrev}
                  onFocusNext={handleFocusNext}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                  onSendToFloatingNote={onSendToFloatingPad}
                />
              );
            })
          )}
        </div>

        {/* Bottom Append Bar & Word Count Footer */}
        <div className="mt-8 pt-4 border-t border-zinc-800 flex flex-col gap-3">
          {!isScriptLocked && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAddBlock(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors border border-zinc-800"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Paragraph</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddBlock(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 rounded-lg transition-colors border border-zinc-700 bg-zinc-900"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-zinc-300" />
                  <span>Add Checklist Item</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddTableBlock}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors border border-zinc-800 cursor-pointer"
                  title="Insert a table with checklists in every column"
                >
                  <TableIcon className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Add Checklist Table</span>
                </button>
              </div>

              <div className="text-[11px] text-zinc-500 hidden sm:flex items-center gap-2">
                <span>Shortcut:</span>
                <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-[10px] text-zinc-400 font-mono">
                  Ctrl+Shift+C
                </kbd>
                <span>toggles checklist</span>
              </div>
            </div>
          )}

          {/* Small, non-intrusive document length footer (pure text, zero buttons) */}
          <div className="flex items-center justify-between pt-2 text-[11px] text-zinc-500 font-mono tabular-nums border-t border-zinc-900">
            <div className="flex items-center gap-2">
              <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
              <span aria-hidden="true">·</span>
              <span>{charCount} characters</span>
            </div>
            <span>{note.paragraphs.length} blocks</span>
          </div>
        </div>
      </div>
    </main>
  );
};
