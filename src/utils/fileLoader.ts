/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Note, ParagraphBlock, TableData, TableColumn, TableRow, TableCell } from '../types';
import { generateId } from './helpers';

/**
 * Parse CSV or TSV content into a TableData structure
 */
export function parseDelimitedTextToTableData(text: string, delimiter = ','): TableData {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    const colId = generateId('col');
    return {
      columns: [{ id: colId, title: 'Column 1', isChecklist: true }],
      rows: [
        {
          id: generateId('row'),
          cells: [{ id: generateId('cell'), text: '', isChecklist: true, checked: false }],
        },
      ],
    };
  }

  // Detect delimiter if not forced
  let delim = delimiter;
  if (lines[0].includes('\t') && !lines[0].includes(',')) {
    delim = '\t';
  }

  const parseRow = (line: string): string[] => {
    // Simple split respecting basic quotes
    const items: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delim && !inQuotes) {
        items.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    items.push(current.trim());
    return items;
  };

  const headerValues = parseRow(lines[0]);
  const columns: TableColumn[] = headerValues.map((title, idx) => ({
    id: generateId('col'),
    title: title || `Column ${idx + 1}`,
    isChecklist: true,
  }));

  const rows: TableRow[] = [];
  for (let r = 1; r < lines.length; r++) {
    const rowValues = parseRow(lines[r]);
    const cells: TableCell[] = columns.map((col, cIdx) => {
      const val = rowValues[cIdx] || '';
      const isChecked = /^(true|yes|1|done|completed|\[x\])$/i.test(val);
      const cleanText = isChecked && val.toLowerCase() === '[x]' ? '' : val;
      return {
        id: generateId('cell'),
        text: cleanText,
        isChecklist: true,
        checked: isChecked,
      };
    });
    rows.push({
      id: generateId('row'),
      cells,
    });
  }

  return { columns, rows };
}

/**
 * Parse Markdown text with headings, checklists, callouts, and markdown tables into blocks
 */
export function parseMarkdownToNoteBlocks(markdown: string, fallbackTitle = 'Imported Document'): {
  title: string;
  paragraphs: ParagraphBlock[];
} {
  const lines = markdown.split(/\r?\n/);
  let title = fallbackTitle;
  const paragraphs: ParagraphBlock[] = [];

  let inTable = false;
  let tableLines: string[] = [];

  const flushTable = () => {
    if (tableLines.length >= 2) {
      // Parse markdown table
      const headerLine = tableLines[0].trim().replace(/^\||\|$/g, '');
      const headers = headerLine.split('|').map((h) => h.trim());
      const columns: TableColumn[] = headers.map((h, idx) => ({
        id: generateId('col'),
        title: h || `Column ${idx + 1}`,
        isChecklist: true,
      }));

      const rows: TableRow[] = [];
      // Skip row 1 (separator |---|---|)
      for (let rIdx = 2; rIdx < tableLines.length; rIdx++) {
        const rowLine = tableLines[rIdx].trim().replace(/^\||\|$/g, '');
        const cellVals = rowLine.split('|').map((c) => c.trim());
        const cells: TableCell[] = columns.map((col, cIdx) => {
          const raw = cellVals[cIdx] || '';
          const isChecklist = raw.includes('[ ]') || raw.includes('[x]') || raw.includes('[X]');
          const checked = raw.includes('[x]') || raw.includes('[X]');
          const text = raw.replace(/\[\s*[xX]?\s*\]/, '').trim();
          return {
            id: generateId('cell'),
            text,
            isChecklist: isChecklist || true,
            checked,
          };
        });
        rows.push({ id: generateId('row'), cells });
      }

      paragraphs.push({
        id: generateId('p'),
        text: 'Table',
        isChecklist: false,
        checked: false,
        type: 'table',
        tableData: { columns, rows },
      });
    }
    tableLines = [];
    inTable = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Markdown table detection: lines with pipes
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.includes('|')) {
      inTable = true;
      tableLines.push(trimmed);
      continue;
    } else if (inTable) {
      flushTable();
    }

    if (!trimmed) continue;

    // Check for title (# Title)
    if (i === 0 && trimmed.startsWith('# ')) {
      title = trimmed.replace(/^#\s+/, '').trim();
      continue;
    }

    // Checklists: - [ ] or - [x] or * [ ] or * [x]
    if (trimmed.startsWith('- [x] ') || trimmed.startsWith('* [x] ') || trimmed.startsWith('- [X] ')) {
      paragraphs.push({
        id: generateId('p'),
        text: trimmed.replace(/^[-*]\s+\[[xX]\]\s+/, '').trim(),
        isChecklist: true,
        checked: true,
        type: 'p',
      });
    } else if (trimmed.startsWith('- [ ] ') || trimmed.startsWith('* [ ] ')) {
      paragraphs.push({
        id: generateId('p'),
        text: trimmed.replace(/^[-*]\s+\[\s*\]\s+/, '').trim(),
        isChecklist: true,
        checked: false,
        type: 'p',
      });
    } else if (trimmed.startsWith('## ')) {
      paragraphs.push({
        id: generateId('p'),
        text: trimmed.replace(/^##\s+/, '').trim(),
        isChecklist: false,
        checked: false,
        type: 'h2',
      });
    } else if (trimmed.startsWith('# ')) {
      paragraphs.push({
        id: generateId('p'),
        text: trimmed.replace(/^#\s+/, '').trim(),
        isChecklist: false,
        checked: false,
        type: 'h1',
      });
    } else if (trimmed.startsWith('> 💡 ') || trimmed.startsWith('> ')) {
      paragraphs.push({
        id: generateId('p'),
        text: trimmed.replace(/^>\s*(💡\s*)?/, '').trim(),
        isChecklist: false,
        checked: false,
        type: 'callout',
      });
    } else {
      paragraphs.push({
        id: generateId('p'),
        text: trimmed,
        isChecklist: false,
        checked: false,
        type: 'p',
      });
    }
  }

  if (inTable) {
    flushTable();
  }

  if (paragraphs.length === 0) {
    paragraphs.push({
      id: generateId('p'),
      text: '',
      isChecklist: false,
      checked: false,
      type: 'p',
    });
  }

  return { title, paragraphs };
}

/**
 * Load any File object (.md, .txt, .json, .csv, .tsv) into a structured Note
 */
export async function loadFileToNote(file: File): Promise<Note> {
  const content = await file.text();
  const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  // 1. JSON file handling
  if (ext === 'json') {
    try {
      const parsed = JSON.parse(content);
      // If it's a full Note object
      if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.paragraphs)) {
          return {
            id: generateId('note'),
            title: parsed.title || fileNameWithoutExt,
            createdAt: typeof parsed.createdAt === 'number' ? parsed.createdAt : Date.now(),
            updatedAt: Date.now(),
            paragraphs: parsed.paragraphs.map((p: any) => ({
              id: p?.id || generateId('p'),
              text: p?.text ?? '',
              isChecklist: Boolean(p?.isChecklist),
              checked: Boolean(p?.checked),
              type: p?.type || 'p',
              tableData: p?.tableData,
            })),
            floatingNotes: Array.isArray(parsed.floatingNotes) ? parsed.floatingNotes : undefined,
          };
        }
      }
    } catch {
      // Fallback to text parsing
    }
  }

  // 2. CSV / TSV file handling
  if (ext === 'csv' || ext === 'tsv') {
    const tableData = parseDelimitedTextToTableData(content, ext === 'tsv' ? '\t' : ',');
    return {
      id: generateId('note'),
      title: fileNameWithoutExt || 'Imported Spreadsheet',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      paragraphs: [
        {
          id: generateId('p'),
          text: `Imported table from ${file.name}`,
          isChecklist: false,
          checked: false,
          type: 'h2',
        },
        {
          id: generateId('p'),
          text: '',
          isChecklist: false,
          checked: false,
          type: 'table',
          tableData,
        },
      ],
      floatingNotes: [
        {
          id: generateId('fn'),
          title: 'Side Note 1',
          updatedAt: Date.now(),
          paragraphs: [
            {
              id: generateId('fnp'),
              text: `Loaded spreadsheet "${file.name}" with ${tableData.rows.length} rows and ${tableData.columns.length} columns.`,
              isChecklist: false,
              checked: false,
              type: 'p',
            },
          ],
        },
      ],
    };
  }

  // 3. Markdown or plain text
  const { title, paragraphs } = parseMarkdownToNoteBlocks(
    content,
    fileNameWithoutExt || 'Imported Document'
  );

  return {
    id: generateId('note'),
    title: title || fileNameWithoutExt || 'Untitled Document',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    paragraphs,
    floatingNotes: [
      {
        id: generateId('fn'),
        title: 'Side Note 1',
        updatedAt: Date.now(),
        paragraphs: [
          {
            id: generateId('fnp'),
            text: `Loaded file "${file.name}" into Noteflow.`,
            isChecklist: false,
            checked: false,
            type: 'p',
          },
        ],
      },
    ],
  };
}
