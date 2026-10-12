export type BlockType = 'p' | 'h1' | 'h2' | 'callout' | 'quote' | 'table';

export type WordSize = 'sm' | 'base' | 'lg' | 'xl';

export type AutoSaveStatus = 'saved' | 'saving' | 'error';

export type { FontFamilyId, FontOption } from './utils/fontConstants';

export interface TableCell {
  id: string;
  text: string;
  isChecklist: boolean;
  checked: boolean;
}

export interface TableColumn {
  id: string;
  title: string;
  isChecklist?: boolean;
}

export interface TableRow {
  id: string;
  cells: TableCell[];
}

export interface TableData {
  columns: TableColumn[];
  rows: TableRow[];
}

export interface ParagraphBlock {
  id: string;
  text: string;
  isChecklist: boolean;
  checked: boolean;
  type: BlockType;
  tableData?: TableData;
}

export interface FloatingSubNote {
  id: string;
  title: string;
  paragraphs: ParagraphBlock[];
  updatedAt: number;
}

export interface Note {
  id: string;
  title: string;
  paragraphs: ParagraphBlock[];
  floatingNotes?: FloatingSubNote[]; // Small side-notes belonging to this main document
  isPinned?: boolean;
  category?: string;
  createdAt: number;
  updatedAt: number;
}

export interface FloatingPadConfig {
  isOpen: boolean;
  isMinimized: boolean;
  activeNoteId: string;
  position: { x: number; y: number };
  isGlass: boolean;
  isExpanded: boolean;
}
