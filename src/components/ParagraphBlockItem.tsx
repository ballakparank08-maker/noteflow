import React, { useRef, useEffect } from 'react';
import { ParagraphBlock, BlockType, WordSize } from '../types';
import { createDefaultTableData } from '../utils/helpers';
import { TableBlockItem } from './TableBlockItem';
import {
  CheckSquare,
  Square,
  MoreVertical,
  ArrowUp,
  ArrowDown,
  Trash2,
  Layers,
  Heading1,
  Heading2,
  AlignLeft,
  Sparkles,
  GripVertical,
  Table as TableIcon,
} from 'lucide-react';

interface ParagraphBlockItemProps {
  block: ParagraphBlock;
  index: number;
  totalBlocks: number;
  autoFocus?: boolean;
  isReadMode?: boolean;
  wordSize?: WordSize;
  fontFamily?: string;
  fontSize?: number;
  isDragging?: boolean;
  dropPosition?: 'top' | 'bottom' | null;
  onDragStartBlock?: (id: string) => void;
  onDragOverBlock?: (e: React.DragEvent, id: string) => void;
  onDragLeaveBlock?: (id: string) => void;
  onDropBlock?: (id: string) => void;
  onDragEndBlock?: () => void;
  onTouchStartDragBlock?: (id: string, clientX: number, clientY: number) => void;
  onUpdate: (id: string, updates: Partial<ParagraphBlock>) => void;
  onDelete: (id: string) => void;
  onSplit: (id: string, cursorIndex: number, currentText: string) => void;
  onFocusPrev: (index: number) => void;
  onFocusNext: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onSendToFloatingNote?: (block: ParagraphBlock) => void;
}

export const ParagraphBlockItemComponent: React.FC<ParagraphBlockItemProps> = ({
  block,
  index,
  totalBlocks,
  autoFocus = false,
  isReadMode = false,
  wordSize = 'base',
  fontFamily,
  fontSize,
  isDragging = false,
  dropPosition = null,
  onDragStartBlock,
  onDragOverBlock,
  onDragLeaveBlock,
  onDropBlock,
  onDragEndBlock,
  onTouchStartDragBlock,
  onUpdate,
  onDelete,
  onSplit,
  onFocusPrev,
  onFocusNext,
  onMoveUp,
  onMoveDown,
  onSendToFloatingNote,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showMenu, setShowMenu] = React.useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const hasFocusedRef = useRef(false);

  // Auto-resize textarea to fit text content
  const resizeTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(28, textareaRef.current.scrollHeight)}px`;
    }
  };

  useEffect(() => {
    if (!isReadMode) {
      resizeTextarea();
    }
  }, [block.text, block.type, block.isChecklist, isReadMode, wordSize]);

  // Only auto-focus once on initial mount if requested, never during continuous editing
  useEffect(() => {
    if (!isReadMode && autoFocus && textareaRef.current && !hasFocusedRef.current) {
      hasFocusedRef.current = true;
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [autoFocus, isReadMode]);

  // Click outside to close options menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.max(28, el.scrollHeight)}px`;
    onUpdate(block.id, { text: el.value });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd/Ctrl + Shift + C: Toggle checklist on this paragraph
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
      e.preventDefault();
      onUpdate(block.id, { isChecklist: !block.isChecklist, checked: false });
      return;
    }

    // Cmd/Ctrl + Enter: Toggle completed checkbox
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (block.isChecklist) {
        onUpdate(block.id, { checked: !block.checked });
      } else {
        onUpdate(block.id, { isChecklist: true, checked: false });
      }
      return;
    }

    // Enter: split or create next paragraph (ignore IME composition Enter)
    if (e.key === 'Enter' && !e.shiftKey) {
      if (e.nativeEvent.isComposing) return;
      e.preventDefault();
      const target = e.currentTarget;
      const cursorIndex = target.selectionStart || 0;
      onSplit(block.id, cursorIndex, target.value);
      return;
    }

    // Backspace: if line is empty, delete block or remove checklist
    if (e.key === 'Backspace') {
      const target = e.currentTarget;
      if (target.selectionStart === 0 && target.selectionEnd === 0) {
        if (block.isChecklist && target.value.trim() === '') {
          e.preventDefault();
          onUpdate(block.id, { isChecklist: false });
          return;
        }
        if (target.value === '' && totalBlocks > 1) {
          e.preventDefault();
          onDelete(block.id);
          onFocusPrev(index);
          return;
        }
      }
    }

    // Arrow keys navigation
    if (e.key === 'ArrowUp') {
      const target = e.currentTarget;
      if (target.selectionStart === 0) {
        e.preventDefault();
        onFocusPrev(index);
      }
    }
    if (e.key === 'ArrowDown') {
      const target = e.currentTarget;
      if (target.selectionStart === target.value.length) {
        e.preventDefault();
        onFocusNext(index);
      }
    }
  };

  const getTypographyStyles = (type: BlockType, checked: boolean) => {
    let base = 'transition-all duration-150 ';

    if (wordSize === 'sm') {
      if (type === 'h1') base += 'text-xl font-bold tracking-tight text-white leading-snug ';
      else if (type === 'h2') base += 'text-lg font-semibold tracking-tight text-zinc-100 leading-snug ';
      else if (type === 'callout') base += 'text-xs text-zinc-300 bg-zinc-900/90 p-2.5 rounded-lg border border-zinc-800 ';
      else if (type === 'quote') base += 'text-sm italic text-zinc-300 pl-2.5 border-l-2 border-zinc-700 ';
      else base += 'text-sm text-zinc-200 leading-relaxed ';
    } else if (wordSize === 'lg') {
      if (type === 'h1') base += 'text-3xl font-bold tracking-tight text-white leading-snug ';
      else if (type === 'h2') base += 'text-2xl font-semibold tracking-tight text-zinc-100 leading-snug ';
      else if (type === 'callout') base += 'text-base text-zinc-300 bg-zinc-900/90 p-3.5 rounded-lg border border-zinc-800 ';
      else if (type === 'quote') base += 'text-lg italic text-zinc-300 pl-3.5 border-l-2 border-zinc-700 ';
      else base += 'text-lg text-zinc-200 leading-relaxed ';
    } else if (wordSize === 'xl') {
      if (type === 'h1') base += 'text-4xl font-bold tracking-tight text-white leading-snug ';
      else if (type === 'h2') base += 'text-3xl font-semibold tracking-tight text-zinc-100 leading-snug ';
      else if (type === 'callout') base += 'text-lg text-zinc-300 bg-zinc-900/90 p-4 rounded-lg border border-zinc-800 ';
      else if (type === 'quote') base += 'text-xl italic text-zinc-300 pl-4 border-l-2 border-zinc-700 ';
      else base += 'text-xl text-zinc-200 leading-relaxed ';
    } else {
      // 'base' (default)
      if (type === 'h1') base += 'text-2xl font-bold tracking-tight text-white leading-snug ';
      else if (type === 'h2') base += 'text-xl font-semibold tracking-tight text-zinc-100 leading-snug ';
      else if (type === 'callout') base += 'text-sm text-zinc-300 bg-zinc-900/90 p-3 rounded-lg border border-zinc-800 ';
      else if (type === 'quote') base += 'text-base italic text-zinc-300 pl-3 border-l-2 border-zinc-700 ';
      else base += 'text-base text-zinc-200 leading-relaxed ';
    }

    if (checked) {
      base += 'line-through text-zinc-500 decoration-zinc-600 decoration-1 ';
    }
    return base;
  };

  // If this block is a Checklist Table, render the specialized table component
  if (block.type === 'table') {
    return (
      <div
        data-block-id={block.id}
        onDragOver={(e) => onDragOverBlock?.(e, block.id)}
        onDragLeave={() => onDragLeaveBlock?.(block.id)}
        onDrop={() => onDropBlock?.(block.id)}
        className={`relative w-full ${
          isDragging ? 'opacity-30 border-2 border-dashed border-zinc-600 bg-zinc-900/60 rounded-xl' : ''
        }`}
      >
        {dropPosition === 'top' && (
          <div className="absolute -top-1 left-1 right-1 h-0.5 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)] z-20 pointer-events-none" />
        )}
        {dropPosition === 'bottom' && (
          <div className="absolute -bottom-1 left-1 right-1 h-0.5 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)] z-20 pointer-events-none" />
        )}

        <TableBlockItem
          block={block}
          onUpdate={onUpdate}
          onDelete={onDelete}
          isReadMode={isReadMode}
          wordSize={wordSize}
        />
      </div>
    );
  }

  // If in Read Mode, render distraction-free reading typography
  if (isReadMode) {
    if (!block.text && !block.isChecklist) {
      return null;
    }

    const isDone = Boolean(block.isChecklist && block.checked);

    return (
      <div
        data-block-id={block.id}
        onDragOver={(e) => onDragOverBlock?.(e, block.id)}
        onDragLeave={() => onDragLeaveBlock?.(block.id)}
        onDrop={() => onDropBlock?.(block.id)}
        className={`group relative flex items-start gap-2.5 py-1.5 px-1 rounded-lg transition-all ${
          block.type === 'h1' ? 'pt-4 pb-2' : block.type === 'h2' ? 'pt-3 pb-1' : ''
        } ${block.isChecklist ? 'hover:bg-zinc-900/40' : ''} ${
          isDragging ? 'opacity-30 border-2 border-dashed border-zinc-600 bg-zinc-900/60 scale-[0.99]' : ''
        }`}
      >
        {/* Drop indicator lines */}
        {dropPosition === 'top' && (
          <div className="absolute -top-1 left-1 right-1 h-0.5 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)] z-20 pointer-events-none" />
        )}
        {dropPosition === 'bottom' && (
          <div className="absolute -bottom-1 left-1 right-1 h-0.5 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)] z-20 pointer-events-none" />
        )}

        {/* Drag handle in reading view - visible on hover or touch */}
        {onDragStartBlock && (
          <div
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', block.id);
              e.dataTransfer.effectAllowed = 'move';
              onDragStartBlock(block.id);
            }}
            onDragEnd={onDragEndBlock}
            onTouchStart={(e) => {
              const touch = e.touches[0];
              onTouchStartDragBlock?.(block.id, touch.clientX, touch.clientY);
            }}
            className="pt-1 shrink-0 select-none flex items-center justify-center w-5 h-5 rounded text-zinc-600 opacity-20 sm:opacity-0 group-hover:opacity-100 hover:text-zinc-200 hover:bg-zinc-800 cursor-grab active:cursor-grabbing transition-all touch-none"
            title="Drag and hold to move paragraph"
            aria-label="Drag and hold to move paragraph"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>
        )}

        {block.isChecklist && (
          <div className="pt-1 shrink-0 select-none">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUpdate(block.id, { checked: !block.checked });
              }}
              className="flex items-center justify-center w-5 h-5 rounded border transition-all cursor-pointer group active:scale-95"
              title={block.checked ? 'Mark as pending' : 'Mark as completed'}
              aria-label={block.checked ? 'Completed task' : 'Pending task'}
            >
              <span
                className={`flex items-center justify-center w-full h-full rounded transition-all ${
                  block.checked
                    ? 'bg-zinc-100 border-zinc-100 text-zinc-950 group-hover:bg-zinc-300'
                    : 'border-zinc-600 bg-zinc-900/80 text-transparent group-hover:border-zinc-400'
                }`}
              >
                <CheckSquare
                  className={`w-3.5 h-3.5 stroke-[2.5] ${block.checked ? 'opacity-100' : 'opacity-0'}`}
                />
              </span>
            </button>
          </div>
        )}

        <div
          className={`flex-1 min-w-0 ${block.isChecklist ? 'cursor-pointer select-none' : ''}`}
          onClick={
            block.isChecklist
              ? () => onUpdate(block.id, { checked: !block.checked })
              : undefined
          }
        >
          {block.type === 'h1' ? (
            <h1 className={getTypographyStyles(block.type, isDone)}>
              {block.text}
            </h1>
          ) : block.type === 'h2' ? (
            <h2 className={getTypographyStyles(block.type, isDone)}>
              {block.text}
            </h2>
          ) : block.type === 'callout' ? (
            <div className={getTypographyStyles(block.type, isDone)}>
              {block.text}
            </div>
          ) : block.type === 'quote' ? (
            <blockquote className={getTypographyStyles(block.type, isDone)}>
              {block.text}
            </blockquote>
          ) : (
            <p className={getTypographyStyles(block.type, isDone)}>
              {block.text}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      data-block-id={block.id}
      onDragOver={(e) => onDragOverBlock?.(e, block.id)}
      onDragLeave={() => onDragLeaveBlock?.(block.id)}
      onDrop={() => onDropBlock?.(block.id)}
      className={`group relative flex items-start gap-1.5 sm:gap-2 py-1.5 px-1 sm:px-2 rounded-lg transition-all w-full max-w-full min-w-0 ${
        isDragging ? 'opacity-30 border-2 border-dashed border-zinc-600 bg-zinc-900/60 scale-[0.99]' : ''
      } ${showMenu ? 'bg-zinc-900/80' : 'hover:bg-zinc-900/40'}`}
    >
      {/* Drop indicator lines */}
      {dropPosition === 'top' && (
        <div className="absolute -top-1 left-2 right-2 h-0.5 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)] z-20 pointer-events-none" />
      )}
      {dropPosition === 'bottom' && (
        <div className="absolute -bottom-1 left-2 right-2 h-0.5 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)] z-20 pointer-events-none" />
      )}

      {/* Gutter Controls: Drag Handle, Checkbox & Quick Actions */}
      <div className="flex items-center gap-1 pt-1 shrink-0 select-none">
        {/* Drag and Hold Handle */}
        <div
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('text/plain', block.id);
            e.dataTransfer.effectAllowed = 'move';
            onDragStartBlock?.(block.id);
          }}
          onDragEnd={onDragEndBlock}
          onTouchStart={(e) => {
            const touch = e.touches[0];
            onTouchStartDragBlock?.(block.id, touch.clientX, touch.clientY);
          }}
          className="flex items-center justify-center w-5 h-5 rounded text-zinc-500 opacity-40 hover:opacity-100 group-hover:opacity-100 hover:text-zinc-200 hover:bg-zinc-800 transition-all cursor-grab active:cursor-grabbing touch-none"
          title="Drag and hold to move paragraph"
          aria-label="Drag and hold to move paragraph"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>

        {/* Paragraph Checklist Toggle / Checkbox */}
        {block.isChecklist ? (
          <button
            type="button"
            onClick={() => onUpdate(block.id, { checked: !block.checked })}
            className={`flex items-center justify-center w-5 h-5 rounded border transition-all ${
              block.checked
                ? 'bg-zinc-100 border-zinc-100 text-zinc-950'
                : 'border-zinc-600 bg-zinc-900 hover:border-zinc-400 text-transparent hover:text-zinc-500'
            }`}
            title={block.checked ? 'Mark uncompleted' : 'Mark completed'}
            aria-label={block.checked ? 'Mark task uncompleted' : 'Mark task completed'}
          >
            <CheckSquare className={`w-3.5 h-3.5 stroke-[2.5] ${block.checked ? 'opacity-100' : 'opacity-0'}`} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onUpdate(block.id, { isChecklist: true, checked: false })}
            className="flex items-center justify-center w-5 h-5 rounded text-zinc-500 opacity-60 sm:opacity-0 group-hover:opacity-100 hover:text-zinc-200 hover:bg-zinc-800 transition-all"
            title="Convert this paragraph to a checklist item"
            aria-label="Convert paragraph to checklist"
          >
            <Square className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Options Dropdown Trigger */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center justify-center w-5 h-5 rounded text-zinc-500 opacity-60 sm:opacity-0 group-hover:opacity-100 hover:text-zinc-200 hover:bg-zinc-800 transition-all"
            title="Block options & styling"
            aria-label="Block options"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>

          {showMenu && (
            <div className="absolute left-0 top-6 z-30 w-52 bg-zinc-900 rounded-xl border border-zinc-800 shadow-2xl py-1.5 text-xs text-zinc-300 divide-y divide-zinc-800">
              {/* Checklist Toggle in Menu */}
              <div className="px-1 py-1">
                <button
                  type="button"
                  onClick={() => {
                    onUpdate(block.id, { isChecklist: !block.isChecklist, checked: false });
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-zinc-800 text-left font-medium text-white transition-colors"
                >
                  <CheckSquare className="w-4 h-4 text-zinc-400" />
                  <span>{block.isChecklist ? 'Remove Checklist' : 'Turn into Checklist'}</span>
                </button>
              </div>

              {/* Block Types */}
              <div className="px-1 py-1">
                <div className="px-2.5 py-1 text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
                  Text Style
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onUpdate(block.id, { type: 'p' });
                    setShowMenu(false);
                  }}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-zinc-800 text-left transition-colors ${
                    block.type === 'p' ? 'bg-zinc-800/80 font-medium text-white' : ''
                  }`}
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                  <span>Paragraph Text</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdate(block.id, { type: 'h1' });
                    setShowMenu(false);
                  }}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-zinc-800 text-left transition-colors ${
                    block.type === 'h1' ? 'bg-zinc-800/80 font-medium text-white' : ''
                  }`}
                >
                  <Heading1 className="w-3.5 h-3.5" />
                  <span>Large Heading (H1)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdate(block.id, { type: 'h2' });
                    setShowMenu(false);
                  }}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-zinc-800 text-left transition-colors ${
                    block.type === 'h2' ? 'bg-zinc-800/80 font-medium text-white' : ''
                  }`}
                >
                  <Heading2 className="w-3.5 h-3.5" />
                  <span>Subheading (H2)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdate(block.id, { type: 'callout' });
                    setShowMenu(false);
                  }}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-zinc-800 text-left transition-colors ${
                    block.type === 'callout' ? 'bg-zinc-800/80 font-medium text-white' : ''
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Callout Box</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdate(block.id, {
                      type: 'table',
                      tableData: block.tableData || createDefaultTableData(),
                    });
                    setShowMenu(false);
                  }}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-zinc-800 text-left transition-colors ${
                    (block.type as string) === 'table' ? 'bg-zinc-800/80 font-medium text-white' : ''
                  }`}
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>Checklist Table</span>
                </button>
              </div>

              {/* Actions: Send to floating notes, Move, Delete */}
              <div className="px-1 py-1">
                {onSendToFloatingNote && (
                  <button
                    type="button"
                    onClick={() => {
                      onSendToFloatingNote(block);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-zinc-800 text-left text-zinc-300 transition-colors"
                  >
                    <Layers className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Clip to Floating Notes</span>
                  </button>
                )}

                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => {
                    onMoveUp(index);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-zinc-800 text-left disabled:opacity-40 transition-colors"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                  <span>Move Up</span>
                </button>
                <button
                  type="button"
                  disabled={index === totalBlocks - 1}
                  onClick={() => {
                    onMoveDown(index);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-zinc-800 text-left disabled:opacity-40 transition-colors"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                  <span>Move Down</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDelete(block.id);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-red-950/40 text-left text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Paragraph</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Paragraph Textarea */}
      <div className="flex-1 min-w-0">
        <textarea
          ref={textareaRef}
          value={block.text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={
            block.isChecklist
              ? 'Checklist item (type and press Enter)...'
              : block.type === 'h1'
              ? 'Large heading...'
              : block.type === 'h2'
              ? 'Subheading...'
              : 'Type paragraph here... (click [] to make checklist)'
          }
          rows={1}
          className={`w-full bg-transparent resize-none border-none outline-none p-0 focus:ring-0 ${getTypographyStyles(
            block.type,
            block.isChecklist && block.checked
          )}`}
        />
      </div>

      {/* Checklist quick indicator when isChecklist */}
      {block.isChecklist && (
        <button
          type="button"
          onClick={() => onUpdate(block.id, { isChecklist: false })}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] text-zinc-500 hover:text-zinc-300 self-center shrink-0 hidden sm:inline"
          title="Remove checklist from this paragraph"
        >
          uncheck
        </button>
      )}
    </div>
  );
};

function areParagraphPropsEqual(prev: ParagraphBlockItemProps, next: ParagraphBlockItemProps) {
  return (
    prev.block.id === next.block.id &&
    prev.block.text === next.block.text &&
    prev.block.isChecklist === next.block.isChecklist &&
    prev.block.checked === next.block.checked &&
    prev.block.type === next.block.type &&
    prev.block.tableData === next.block.tableData &&
    prev.index === next.index &&
    prev.totalBlocks === next.totalBlocks &&
    prev.isReadMode === next.isReadMode &&
    prev.wordSize === next.wordSize &&
    prev.isDragging === next.isDragging &&
    prev.dropPosition === next.dropPosition
  );
}

export const ParagraphBlockItem = React.memo(ParagraphBlockItemComponent, areParagraphPropsEqual);
