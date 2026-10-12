import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FloatingSubNote, ParagraphBlock, FloatingPadConfig, WordSize } from '../types';
import { generateId, getChecklistStats, reorderParagraphs } from '../utils/helpers';
import { ParagraphBlockItem } from './ParagraphBlockItem';
import {
  Layers,
  Plus,
  X,
  Minimize2,
  Maximize2,
  Move,
  FileDown,
  Trash2,
  CheckSquare,
  Check,
} from 'lucide-react';

interface FloatingNotesPadProps {
  notes?: FloatingSubNote[];
  mainNoteTitle?: string;
  config: FloatingPadConfig;
  isReadMode?: boolean;
  wordSize?: WordSize;
  fontFamily?: string;
  fontSize?: number;
  onUpdateConfig: (updates: Partial<FloatingPadConfig>) => void;
  onUpdateNotes: (notes: FloatingSubNote[]) => void;
  onAppendToMainDoc: (note: FloatingSubNote) => void;
}

export const FloatingNotesPad: React.FC<FloatingNotesPadProps> = ({
  notes = [],
  mainNoteTitle,
  config,
  isReadMode = false,
  wordSize = 'base',
  fontFamily,
  fontSize,
  onUpdateConfig,
  onUpdateNotes,
  onAppendToMainDoc,
}) => {
  const padRef = useRef<HTMLDivElement>(null);

  // Safe list of floating sub-notes with default fallback
  const safeNotesList: FloatingSubNote[] = React.useMemo(() => {
    if (Array.isArray(notes) && notes.length > 0) {
      return notes.map((n, idx) => ({
        id: n?.id || `fn-item-${idx}`,
        title: n?.title || `Side Note ${idx + 1}`,
        updatedAt: typeof n?.updatedAt === 'number' ? n.updatedAt : Date.now(),
        paragraphs: Array.isArray(n?.paragraphs) && n.paragraphs.length > 0
          ? n.paragraphs
          : [
              {
                id: `fp-${n?.id || idx}-1`,
                text: '',
                isChecklist: false,
                checked: false,
                type: 'p' as const,
              },
            ],
      }));
    }
    return [
      {
        id: 'fn-default-1',
        title: 'Side Note 1',
        updatedAt: Date.now(),
        paragraphs: [
          {
            id: 'fp-default-1',
            text: '',
            isChecklist: false,
            checked: false,
            type: 'p' as const,
          },
        ],
      },
    ];
  }, [notes]);

  const [activeNoteId, setActiveNoteId] = useState<string>(() => {
    return config.activeNoteId || safeNotesList[0]?.id || '';
  });

  const [isDraggingWindow, setIsDraggingWindow] = useState(false);
  const [justInjected, setJustInjected] = useState(false);

  // Window viewport dimensions tracking
  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  }));

  useEffect(() => {
    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobileScreen = viewport.width < 768;
  const padWidth = config.isExpanded ? 520 : 380;

  // Position bounds safety calculation (always returns valid numbers, zero NaNs)
  const defaultX = viewport.width > 1024 ? Math.max(20, viewport.width - 440) : 20;
  const defaultY = 100;

  const rawX = typeof config.position?.x === 'number' && Number.isFinite(config.position.x)
    ? config.position.x
    : defaultX;
  const rawY = typeof config.position?.y === 'number' && Number.isFinite(config.position.y)
    ? config.position.y
    : defaultY;

  const safeX = Math.max(12, Math.min(Math.max(12, viewport.width - padWidth - 12), rawX));
  const safeY = Math.max(56, Math.min(Math.max(56, viewport.height - 180), rawY));

  const windowDragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number }>({
    startX: 0,
    startY: 0,
    initX: safeX,
    initY: safeY,
  });

  // Keep active note synchronized with safeNotesList
  useEffect(() => {
    const found = safeNotesList.find((n) => n.id === activeNoteId);
    if (!found && safeNotesList.length > 0) {
      setActiveNoteId(safeNotesList[0].id);
    }
  }, [safeNotesList, activeNoteId]);

  const activeNote = safeNotesList.find((n) => n.id === activeNoteId) || safeNotesList[0];
  const activeParagraphs: ParagraphBlock[] = Array.isArray(activeNote?.paragraphs)
    ? activeNote.paragraphs
    : [];

  // Dragging the Floating Window (Mouse)
  const handleMouseDownHeader = (e: React.MouseEvent) => {
    if (isMobileScreen) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) return;

    setIsDraggingWindow(true);
    windowDragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: safeX,
      initY: safeY,
    };
  };

  // Dragging the Floating Window (Touch)
  const handleTouchStartHeader = (e: React.TouchEvent) => {
    if (isMobileScreen) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) return;

    const touch = e.touches[0];
    if (!touch) return;
    setIsDraggingWindow(true);
    windowDragStartRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      initX: safeX,
      initY: safeY,
    };
  };

  useEffect(() => {
    if (isMobileScreen || !isDraggingWindow) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - windowDragStartRef.current.startX;
      const dy = e.clientY - windowDragStartRef.current.startY;
      const curPadW = config.isExpanded ? 520 : 380;
      const maxX = Math.max(12, window.innerWidth - curPadW - 12);
      const maxY = Math.max(56, window.innerHeight - 180);
      const newX = Math.max(12, Math.min(maxX, windowDragStartRef.current.initX + dx));
      const newY = Math.max(56, Math.min(maxY, windowDragStartRef.current.initY + dy));
      if (Number.isFinite(newX) && Number.isFinite(newY)) {
        onUpdateConfig({ position: { x: newX, y: newY } });
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      const dx = touch.clientX - windowDragStartRef.current.startX;
      const dy = touch.clientY - windowDragStartRef.current.startY;
      const curPadW = config.isExpanded ? 520 : 380;
      const maxX = Math.max(12, window.innerWidth - curPadW - 12);
      const maxY = Math.max(56, window.innerHeight - 180);
      const newX = Math.max(12, Math.min(maxX, windowDragStartRef.current.initX + dx));
      const newY = Math.max(56, Math.min(maxY, windowDragStartRef.current.initY + dy));
      if (Number.isFinite(newX) && Number.isFinite(newY)) {
        onUpdateConfig({ position: { x: newX, y: newY } });
      }
    };

    const handleMouseUp = () => {
      setIsDraggingWindow(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDraggingWindow, config.isExpanded, isMobileScreen, onUpdateConfig]);

  // Sub-note operations
  const handleCreateSubNote = () => {
    const newSubNote: FloatingSubNote = {
      id: generateId('float'),
      title: `Quick Note ${safeNotesList.length + 1}`,
      updatedAt: Date.now(),
      paragraphs: [
        {
          id: generateId('fp'),
          text: '',
          isChecklist: true,
          checked: false,
          type: 'p',
        },
      ],
    };
    onUpdateNotes([...safeNotesList, newSubNote]);
    setActiveNoteId(newSubNote.id);
    onUpdateConfig({ activeNoteId: newSubNote.id });
  };

  const handleDeleteSubNote = (id: string) => {
    if (safeNotesList.length <= 1) return;
    const filtered = safeNotesList.filter((n) => n.id !== id);
    onUpdateNotes(filtered);
    if (activeNoteId === id) {
      const nextId = filtered[0]?.id || '';
      setActiveNoteId(nextId);
      onUpdateConfig({ activeNoteId: nextId });
    }
  };

  const handleUpdateActiveNote = (updates: Partial<FloatingSubNote>) => {
    if (!activeNote) return;
    const updatedNotes = safeNotesList.map((n) =>
      n.id === activeNote.id ? { ...n, ...updates, updatedAt: Date.now() } : n
    );
    onUpdateNotes(updatedNotes);
  };

  const handleUpdateParagraph = (blockId: string, updates: Partial<ParagraphBlock>) => {
    if (!activeNote) return;
    const updatedBlocks = activeParagraphs.map((p) =>
      p.id === blockId ? { ...p, ...updates } : p
    );
    handleUpdateActiveNote({ paragraphs: updatedBlocks });
  };

  const handleDeleteParagraph = (blockId: string) => {
    if (!activeNote) return;
    if (activeParagraphs.length <= 1) {
      handleUpdateParagraph(blockId, { text: '', isChecklist: false, checked: false });
      return;
    }
    const filtered = activeParagraphs.filter((p) => p.id !== blockId);
    handleUpdateActiveNote({ paragraphs: filtered });
  };

  const handleSplitParagraph = (blockId: string, cursorIndex: number, currentText: string) => {
    if (!activeNote) return;
    const blockIndex = activeParagraphs.findIndex((p) => p.id === blockId);
    if (blockIndex === -1) return;

    const currentBlock = activeParagraphs[blockIndex];
    const textBefore = currentText.slice(0, cursorIndex);
    const textAfter = currentText.slice(cursorIndex);

    const updatedCurrent: ParagraphBlock = {
      ...currentBlock,
      text: textBefore,
    };

    const newBlock: ParagraphBlock = {
      id: generateId('fp'),
      text: textAfter,
      isChecklist: currentBlock.isChecklist,
      checked: false,
      type: currentBlock.type === 'h1' || currentBlock.type === 'h2' ? 'p' : currentBlock.type,
    };

    const newParagraphs = [...activeParagraphs];
    newParagraphs.splice(blockIndex, 1, updatedCurrent, newBlock);
    handleUpdateActiveNote({ paragraphs: newParagraphs });

    setTimeout(() => {
      const el = padRef.current?.querySelector(`[data-block-id="${newBlock.id}"] textarea`) as HTMLTextAreaElement;
      if (el) {
        el.focus();
        el.setSelectionRange(0, 0);
      }
    }, 20);
  };

  const handleAddParagraph = (isChecklist = false) => {
    if (!activeNote) return;
    const newBlock: ParagraphBlock = {
      id: generateId('fp'),
      text: '',
      isChecklist,
      checked: false,
      type: 'p',
    };
    handleUpdateActiveNote({ paragraphs: [...activeParagraphs, newBlock] });

    setTimeout(() => {
      const el = padRef.current?.querySelector(`[data-block-id="${newBlock.id}"] textarea`) as HTMLTextAreaElement;
      if (el) {
        el.focus();
      }
    }, 20);
  };

  const handleFocusPrev = (currentIndex: number) => {
    if (!activeNote || currentIndex <= 0) return;
    const prevBlock = activeParagraphs[currentIndex - 1];
    if (prevBlock) {
      const el = padRef.current?.querySelector(`[data-block-id="${prevBlock.id}"] textarea`) as HTMLTextAreaElement;
      if (el) {
        el.focus();
        const len = el.value.length;
        el.setSelectionRange(len, len);
      }
    }
  };

  const handleFocusNext = (currentIndex: number) => {
    if (!activeNote || currentIndex >= activeParagraphs.length - 1) return;
    const nextBlock = activeParagraphs[currentIndex + 1];
    if (nextBlock) {
      const el = padRef.current?.querySelector(`[data-block-id="${nextBlock.id}"] textarea`) as HTMLTextAreaElement;
      if (el) {
        el.focus();
        el.setSelectionRange(0, 0);
      }
    }
  };

  const handleToggleAllChecklists = () => {
    if (!activeNote) return;
    const hasAnyChecklist = activeParagraphs.some((p) => p.isChecklist);
    const updated = activeParagraphs.map((p) => ({
      ...p,
      isChecklist: !hasAnyChecklist,
      checked: false,
    }));
    handleUpdateActiveNote({ paragraphs: updated });
  };

  const handleInjectDoc = () => {
    if (!activeNote) return;
    onAppendToMainDoc(activeNote);
    setJustInjected(true);
    setTimeout(() => setJustInjected(false), 2000);
  };

  const stats = getChecklistStats(activeParagraphs);

  // Drag and hold reordering for floating sub-notes
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
    if (!activeNote || !draggedBlockId || draggedBlockId === targetId || !dropTarget) {
      setDraggedBlockId(null);
      setDropTarget(null);
      return;
    }

    const reordered = reorderParagraphs(activeParagraphs, draggedBlockId, targetId, dropTarget.position);
    handleUpdateActiveNote({ paragraphs: reordered });
    setDraggedBlockId(null);
    setDropTarget(null);
  };

  const handleDragEndBlock = () => {
    setDraggedBlockId(null);
    setDropTarget(null);
  };

  const handleTouchStartDragBlock = (id: string) => {
    setDraggedBlockId(id);
  };

  // Window touch event listeners for mobile / touch drag-and-hold reordering inside floating pad
  useEffect(() => {
    if (!draggedBlockId) return;

    const handleWindowTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      const elem = document.elementFromPoint(touch.clientX, touch.clientY);
      const blockContainer = elem?.closest('[data-block-id]') as HTMLElement;
      if (!blockContainer || !padRef.current?.contains(blockContainer)) return;

      const targetId = blockContainer.getAttribute('data-block-id');
      if (!targetId || targetId === draggedBlockId) return;

      const rect = blockContainer.getBoundingClientRect();
      const position = touch.clientY < rect.top + rect.height / 2 ? 'top' : 'bottom';
      setDropTarget({ id: targetId, position });
    };

    const handleWindowTouchEnd = () => {
      if (activeNote && draggedBlockId && dropTarget) {
        const reordered = reorderParagraphs(
          activeParagraphs,
          draggedBlockId,
          dropTarget.id,
          dropTarget.position
        );
        handleUpdateActiveNote({ paragraphs: reordered });
      }
      setDraggedBlockId(null);
      setDropTarget(null);
    };

    window.addEventListener('touchmove', handleWindowTouchMove, { passive: false });
    window.addEventListener('touchend', handleWindowTouchEnd);

    return () => {
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', handleWindowTouchEnd);
    };
  }, [draggedBlockId, dropTarget, activeNote, activeParagraphs]);

  // Position styles: on mobile, dock to bottom with margin
  const positionStyles: React.CSSProperties = isMobileScreen
    ? {
        left: '12px',
        right: '12px',
        bottom: '12px',
        width: 'auto',
        maxHeight: '75vh',
      }
    : {
        left: `${safeX}px`,
        top: `${safeY}px`,
        width: config.isExpanded ? '520px' : '380px',
        maxHeight: '80vh',
      };

  // When closed, render launcher if in read mode
  if (!config.isOpen) {
    if (isReadMode) {
      return (
        <div className="fixed bottom-5 right-5 z-40">
          <button
            type="button"
            onClick={() => onUpdateConfig({ isOpen: true, isMinimized: false })}
            className="flex items-center gap-2.5 px-3.5 py-2.5 bg-zinc-900 text-white rounded-xl shadow-2xl hover:bg-zinc-800 transition-all text-xs font-medium cursor-pointer border border-zinc-700 hover:scale-[1.02] active:scale-95"
            title="Open floating notes in reading view"
          >
            <Layers className="w-4 h-4 text-zinc-300" />
            <span>Floating Notes</span>
            <span className="text-[11px] font-mono tabular-nums bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300 border border-zinc-700">
              {safeNotesList.length}
            </span>
          </button>
        </div>
      );
    }
    return null;
  }

  // Minimized state - compact bottom floating widget
  if (config.isMinimized) {
    return (
      <div className="fixed bottom-5 right-5 z-40">
        <button
          type="button"
          onClick={() => onUpdateConfig({ isMinimized: false })}
          className="flex items-center gap-2.5 px-3.5 py-2.5 bg-zinc-900 text-white rounded-xl shadow-2xl hover:bg-zinc-800 transition-all text-xs font-medium cursor-pointer border border-zinc-700 hover:scale-[1.02] active:scale-95"
          title="Restore floating notes pad"
        >
          <Layers className="w-4 h-4 text-zinc-300" />
          <span>Floating Notes</span>
          <span className="text-[11px] font-mono tabular-nums bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300 border border-zinc-700">
            {safeNotesList.length}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div
      ref={padRef}
      style={positionStyles}
      className={`fixed z-40 bg-zinc-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-zinc-800 text-zinc-100 flex flex-col transition-all overflow-hidden ${
        isDraggingWindow ? 'select-none ring-2 ring-zinc-500' : ''
      }`}
    >
      {/* Draggable Window Header */}
      <div
        onMouseDown={handleMouseDownHeader}
        onTouchStart={handleTouchStartHeader}
        className="flex items-center justify-between px-3.5 py-2.5 bg-zinc-950 border-b border-zinc-800 cursor-grab active:cursor-grabbing select-none shrink-0"
      >
        <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200 min-w-0 pr-2">
          {!isMobileScreen && <Move className="w-3.5 h-3.5 text-zinc-500 shrink-0" />}
          <span className="truncate">
            Floating Notes {mainNoteTitle ? `· ${mainNoteTitle}` : ''}
          </span>
          <span className="text-[11px] font-mono tabular-nums text-zinc-500 font-normal shrink-0">
            ({safeNotesList.length})
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Expand width (desktop only) */}
          {!isMobileScreen && !isReadMode && (
            <button
              type="button"
              onClick={() => onUpdateConfig({ isExpanded: !config.isExpanded })}
              className="w-6 h-6 flex items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              title={config.isExpanded ? 'Compact width' : 'Expand width'}
            >
              {config.isExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
            </button>
          )}

          {/* Minimize to dock */}
          <button
            type="button"
            onClick={() => onUpdateConfig({ isMinimized: true })}
            className="w-6 h-6 flex items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Minimize to floating bubble"
          >
            <span className="text-sm leading-none font-bold">−</span>
          </button>

          {/* Close window */}
          <button
            type="button"
            onClick={() => onUpdateConfig({ isOpen: false })}
            className="w-6 h-6 flex items-center justify-center rounded text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Close floating notes"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Multi-Note Tabs Row */}
      <div className="flex items-center gap-1 px-2.5 py-1.5 bg-zinc-950/80 border-b border-zinc-800 overflow-x-auto shrink-0">
        <div className="flex items-center gap-1 flex-1 min-w-0">
          {safeNotesList.map((note) => {
            const isActive = note.id === (activeNote?.id || '');
            return (
              <button
                key={note.id}
                type="button"
                onClick={() => {
                  setActiveNoteId(note.id);
                  onUpdateConfig({ activeNoteId: note.id });
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors shrink-0 max-w-[130px] truncate cursor-pointer ${
                  isActive
                    ? 'bg-zinc-800 text-white shadow-xs border border-zinc-700 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
                title={note.title}
              >
                <span className="truncate">{note.title || 'Untitled'}</span>
              </button>
            );
          })}
        </div>

        {/* New Note inside Floating Pad (hidden in read mode) */}
        {!isReadMode && (
          <button
            type="button"
            onClick={handleCreateSubNote}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors shrink-0 cursor-pointer"
            title="Add another quick note in floating pad"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
        )}
      </div>

      {/* Active Floating Note Body */}
      {activeNote ? (
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-[180px]">
          {/* Note Title & Sub Actions */}
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-zinc-800">
            {isReadMode ? (
              <h3 className="text-sm font-semibold text-white truncate flex-1">
                {activeNote.title || 'Untitled Note'}
              </h3>
            ) : (
              <input
                type="text"
                value={activeNote.title || ''}
                onChange={(e) => handleUpdateActiveNote({ title: e.target.value })}
                placeholder="Note title..."
                className="text-sm font-semibold text-white bg-transparent border-none outline-none focus:ring-0 p-0 flex-1 placeholder:text-zinc-600"
              />
            )}

            {!isReadMode && (
              <div className="flex items-center gap-1 shrink-0">
                {/* Append to main document */}
                <button
                  type="button"
                  onClick={handleInjectDoc}
                  className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer ${
                    justInjected
                      ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700'
                      : 'text-zinc-300 hover:text-white hover:bg-zinc-800 border border-transparent'
                  }`}
                  title="Inject this note's paragraphs into the active document"
                >
                  {justInjected ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Injected!</span>
                    </>
                  ) : (
                    <>
                      <FileDown className="w-3 h-3 text-zinc-400" />
                      <span>Inject</span>
                    </>
                  )}
                </button>

                {/* Delete this floating note */}
                {safeNotesList.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteSubNote(activeNote.id)}
                    className="p-1 text-zinc-500 hover:text-red-400 rounded transition-colors cursor-pointer"
                    title="Delete this note"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Checklist progress in floating note if any items */}
          {stats.total > 0 && (
            <div className="flex items-center justify-between text-[11px] text-zinc-400 py-0.5">
              <div className="flex items-center gap-1.5 font-mono tabular-nums">
                <span className="font-medium text-zinc-200">
                  {stats.completed}/{stats.total}
                </span>
                <span>completed</span>
                <span>·</span>
                <span>{stats.percent}%</span>
              </div>
              {!isReadMode && (
                <button
                  type="button"
                  onClick={handleToggleAllChecklists}
                  className="text-[11px] text-zinc-400 hover:text-zinc-200 underline underline-offset-2 cursor-pointer"
                >
                  Toggle checklists
                </button>
              )}
            </div>
          )}

          {/* Paragraph Blocks in Floating Note */}
          <div className="flex flex-col gap-0.5">
            {activeParagraphs.map((p, idx) => (
              <ParagraphBlockItem
                key={p.id || `fp-item-${idx}`}
                block={p}
                index={idx}
                totalBlocks={activeParagraphs.length}
                isReadMode={isReadMode}
                wordSize={wordSize}
                fontFamily={fontFamily}
                fontSize={fontSize}
                isDragging={draggedBlockId === p.id}
                dropPosition={dropTarget?.id === p.id ? dropTarget.position : null}
                onDragStartBlock={handleDragStartBlock}
                onDragOverBlock={handleDragOverBlock}
                onDragLeaveBlock={handleDragLeaveBlock}
                onDropBlock={handleDropBlock}
                onDragEndBlock={handleDragEndBlock}
                onTouchStartDragBlock={handleTouchStartDragBlock}
                onUpdate={handleUpdateParagraph}
                onDelete={handleDeleteParagraph}
                onSplit={handleSplitParagraph}
                onFocusPrev={() => handleFocusPrev(idx)}
                onFocusNext={() => handleFocusNext(idx)}
                onMoveUp={(i) => {
                  if (i <= 0) return;
                  const copy = [...activeParagraphs];
                  const temp = copy[i];
                  copy[i] = copy[i - 1];
                  copy[i - 1] = temp;
                  handleUpdateActiveNote({ paragraphs: copy });
                }}
                onMoveDown={(i) => {
                  if (i >= activeParagraphs.length - 1) return;
                  const copy = [...activeParagraphs];
                  const temp = copy[i];
                  copy[i] = copy[i + 1];
                  copy[i + 1] = temp;
                  handleUpdateActiveNote({ paragraphs: copy });
                }}
              />
            ))}
          </div>

          {/* Quick add actions at bottom of floating note (hidden in read mode) */}
          {!isReadMode && (
            <div className="flex items-center gap-2 pt-2 border-t border-zinc-800 text-xs">
              <button
                type="button"
                onClick={() => handleAddParagraph(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-zinc-200 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors font-medium border border-zinc-700 bg-zinc-800 cursor-pointer"
              >
                <CheckSquare className="w-3.5 h-3.5 text-zinc-300" />
                <span>+ Checklist</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddParagraph(false)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors border border-zinc-800 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Paragraph</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="p-8 text-center text-xs text-zinc-500">No notes in floating stack.</div>
      )}
    </div>
  );
};
