import { Note, ParagraphBlock, FloatingSubNote, TableData } from '../types';

export function generateId(prefix: string = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
}

export function createDefaultTableData(): TableData {
  const col1 = generateId('col');
  const col2 = generateId('col');
  const col3 = generateId('col');

  return {
    columns: [
      { id: col1, title: 'Item / Task', isChecklist: true },
      { id: col2, title: 'Review Status', isChecklist: true },
      { id: col3, title: 'Sign-off', isChecklist: true },
    ],
    rows: [
      {
        id: generateId('row'),
        cells: [
          { id: generateId('cell'), text: 'Define project scope & goals', isChecklist: true, checked: true },
          { id: generateId('cell'), text: 'Peer reviewed', isChecklist: true, checked: true },
          { id: generateId('cell'), text: 'Approved', isChecklist: true, checked: false },
        ],
      },
      {
        id: generateId('row'),
        cells: [
          { id: generateId('cell'), text: 'Prepare documentation & checklist', isChecklist: true, checked: true },
          { id: generateId('cell'), text: 'In progress', isChecklist: true, checked: false },
          { id: generateId('cell'), text: 'Pending', isChecklist: true, checked: false },
        ],
      },
      {
        id: generateId('row'),
        cells: [
          { id: generateId('cell'), text: 'Final client QA walkthrough', isChecklist: true, checked: false },
          { id: generateId('cell'), text: 'Scheduled', isChecklist: true, checked: false },
          { id: generateId('cell'), text: 'Pending', isChecklist: true, checked: false },
        ],
      },
    ],
  };
}

export function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function getChecklistStats(paragraphs?: ParagraphBlock[]) {
  if (!Array.isArray(paragraphs)) {
    return { total: 0, completed: 0, percent: 0 };
  }
  let total = 0;
  let completed = 0;

  paragraphs.forEach((p) => {
    if (!p) return;
    if (p.type === 'table' && p.tableData?.rows) {
      p.tableData.rows.forEach((row) => {
        row.cells?.forEach((cell) => {
          if (cell && cell.isChecklist) {
            total += 1;
            if (cell.checked) completed += 1;
          }
        });
      });
    } else if (p.isChecklist) {
      total += 1;
      if (p.checked) completed += 1;
    }
  });

  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { total, completed, percent };
}

export function reorderParagraphs(
  paragraphs?: ParagraphBlock[],
  sourceId?: string,
  targetId?: string,
  position?: 'top' | 'bottom'
): ParagraphBlock[] {
  if (!Array.isArray(paragraphs)) return [];
  if (!sourceId || !targetId || sourceId === targetId) return paragraphs;
  const list = [...paragraphs];
  const fromIndex = list.findIndex((p) => p && p.id === sourceId);
  const toIndex = list.findIndex((p) => p && p.id === targetId);
  if (fromIndex === -1 || toIndex === -1) return paragraphs;

  const [item] = list.splice(fromIndex, 1);
  let insertIndex: number;
  if (fromIndex < toIndex) {
    insertIndex = position === 'bottom' ? toIndex : toIndex - 1;
  } else {
    insertIndex = position === 'bottom' ? toIndex + 1 : toIndex;
  }
  insertIndex = Math.max(0, Math.min(insertIndex, list.length));
  list.splice(insertIndex, 0, item);
  return list;
}

export function exportNoteToMarkdown(note: Note | FloatingSubNote): string {
  if (!note) return '';
  const lines: string[] = [];
  lines.push(`# ${note.title || 'Untitled Note'}`);
  lines.push('');

  const pList = Array.isArray(note.paragraphs) ? note.paragraphs : [];
  pList.forEach((p) => {
    if (!p) return;

    if (p.type === 'table' && p.tableData?.columns?.length) {
      const cols = p.tableData.columns;
      const headerRow = `| ${cols.map((c) => c.title || 'Column').join(' | ')} |`;
      const sepRow = `| ${cols.map(() => '---').join(' | ')} |`;
      lines.push(headerRow);
      lines.push(sepRow);

      (p.tableData.rows || []).forEach((row) => {
        const rowCells = cols.map((_, idx) => {
          const cell = row.cells?.[idx];
          if (!cell) return '';
          const prefix = cell.isChecklist ? (cell.checked ? '[x] ' : '[ ] ') : '';
          return `${prefix}${cell.text || ''}`;
        });
        lines.push(`| ${rowCells.join(' | ')} |`);
      });
      lines.push('');
      return;
    }

    let prefix = '';
    if (p.isChecklist) {
      prefix = p.checked ? '- [x] ' : '- [ ] ';
    } else if (p.type === 'h1') {
      prefix = '# ';
    } else if (p.type === 'h2') {
      prefix = '## ';
    } else if (p.type === 'callout') {
      prefix = '> 💡 ';
    } else if (p.type === 'quote') {
      prefix = '> ';
    }

    lines.push(`${prefix}${p.text || ''}`);
  });

  return lines.join('\n');
}

export function parseMarkdownToParagraphs(markdown: string): { title: string; paragraphs: ParagraphBlock[] } {
  const lines = markdown.split(/\r?\n/);
  let title = 'Imported Note';
  const paragraphs: ParagraphBlock[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    if (i === 0 && rawLine.startsWith('# ')) {
      title = rawLine.replace(/^#\s+/, '').trim();
      continue;
    }

    if (rawLine.startsWith('- [x] ') || rawLine.startsWith('* [x] ')) {
      paragraphs.push({
        id: generateId('p'),
        text: rawLine.replace(/^[-*]\s+\[x\]\s+/, '').trim(),
        isChecklist: true,
        checked: true,
        type: 'p',
      });
    } else if (rawLine.startsWith('- [ ] ') || rawLine.startsWith('* [ ] ')) {
      paragraphs.push({
        id: generateId('p'),
        text: rawLine.replace(/^[-*]\s+\[\s*\]\s+/, '').trim(),
        isChecklist: true,
        checked: false,
        type: 'p',
      });
    } else if (rawLine.startsWith('## ')) {
      paragraphs.push({
        id: generateId('p'),
        text: rawLine.replace(/^##\s+/, '').trim(),
        isChecklist: false,
        checked: false,
        type: 'h2',
      });
    } else if (rawLine.startsWith('# ')) {
      paragraphs.push({
        id: generateId('p'),
        text: rawLine.replace(/^#\s+/, '').trim(),
        isChecklist: false,
        checked: false,
        type: 'h1',
      });
    } else if (rawLine.startsWith('> ')) {
      paragraphs.push({
        id: generateId('p'),
        text: rawLine.replace(/^>\s+/, '').trim(),
        isChecklist: false,
        checked: false,
        type: 'callout',
      });
    } else {
      paragraphs.push({
        id: generateId('p'),
        text: rawLine,
        isChecklist: false,
        checked: false,
        type: 'p',
      });
    }
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
