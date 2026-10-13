import React, { useState } from 'react';
import { ParagraphBlock, TableData, TableRow, TableCell, TableColumn, WordSize, CellAttachment } from '../types';
import { generateId } from '../utils/helpers';
import { FilePreviewModal } from './FilePreviewModal';
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Table as TableIcon,
  Check,
  MoreHorizontal,
  ChevronDown,
  Paperclip,
  FileText,
  X,
  Download,
  Eye,
} from 'lucide-react';

interface TableBlockItemProps {
  block: ParagraphBlock;
  onUpdate: (id: string, updates: Partial<ParagraphBlock>) => void;
  onDelete: (id: string) => void;
  isReadMode?: boolean;
  wordSize?: WordSize;
}

export const TableBlockItem: React.FC<TableBlockItemProps> = ({
  block,
  onUpdate,
  onDelete,
  isReadMode = false,
  wordSize = 'base',
}) => {
  // Ensure default structure if tableData is undefined or corrupted
  const tableData: TableData = React.useMemo(() => {
    if (block.tableData && Array.isArray(block.tableData.columns) && block.tableData.columns.length > 0) {
      return block.tableData;
    }
    const c1 = generateId('col');
    const c2 = generateId('col');
    const c3 = generateId('col');
    return {
      columns: [
        { id: c1, title: 'Item / Task', isChecklist: true },
        { id: c2, title: 'Review Status', isChecklist: true },
        { id: c3, title: 'Sign-off', isChecklist: true },
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
      ],
    };
  }, [block.tableData]);

  const [activeCellAction, setActiveCellAction] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<CellAttachment | null>(null);

  const updateTableData = (newTableData: TableData) => {
    onUpdate(block.id, {
      tableData: newTableData,
    });
  };

  // Text size classes
  const textSizeClass =
    wordSize === 'sm'
      ? 'text-xs'
      : wordSize === 'lg'
      ? 'text-base'
      : wordSize === 'xl'
      ? 'text-lg'
      : 'text-sm';

  // Table checklist stats
  const tableStats = React.useMemo(() => {
    let total = 0;
    let completed = 0;
    tableData.rows.forEach((r) => {
      r.cells.forEach((c) => {
        if (c.isChecklist) {
          total += 1;
          if (c.checked) completed += 1;
        }
      });
    });
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percent };
  }, [tableData]);

  // Toggle cell checkbox
  const handleToggleCellCheckbox = (rowIndex: number, colIndex: number) => {
    const updatedRows = tableData.rows.map((row, rIdx) => {
      if (rIdx !== rowIndex) return row;
      const updatedCells = row.cells.map((cell, cIdx) => {
        if (cIdx !== colIndex) return cell;
        return {
          ...cell,
          checked: !cell.checked,
        };
      });
      return { ...row, cells: updatedCells };
    });

    updateTableData({
      ...tableData,
      rows: updatedRows,
    });
  };

  // Toggle checklist capability for a specific cell
  const handleToggleCellChecklistMode = (rowIndex: number, colIndex: number) => {
    const updatedRows = tableData.rows.map((row, rIdx) => {
      if (rIdx !== rowIndex) return row;
      const updatedCells = row.cells.map((cell, cIdx) => {
        if (cIdx !== colIndex) return cell;
        return {
          ...cell,
          isChecklist: !cell.isChecklist,
          checked: false,
        };
      });
      return { ...row, cells: updatedCells };
    });

    updateTableData({
      ...tableData,
      rows: updatedRows,
    });
    setActiveCellAction(null);
  };

  // Edit cell text
  const handleCellTextChange = (rowIndex: number, colIndex: number, text: string) => {
    const updatedRows = tableData.rows.map((row, rIdx) => {
      if (rIdx !== rowIndex) return row;
      const updatedCells = row.cells.map((cell, cIdx) => {
        if (cIdx !== colIndex) return cell;
        return { ...cell, text };
      });
      return { ...row, cells: updatedCells };
    });

    updateTableData({
      ...tableData,
      rows: updatedRows,
    });
  };

  // Attach a file to a cell in a column
  const handleAttachFile = (rowIndex: number, colIndex: number, fileObj: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const updatedRows = tableData.rows.map((row, rIdx) => {
        if (rIdx !== rowIndex) return row;
        const updatedCells = row.cells.map((cell, cIdx) => {
          if (cIdx !== colIndex) return cell;
          return {
            ...cell,
            file: {
              name: fileObj.name,
              size: fileObj.size,
              type: fileObj.type,
              dataUrl,
            },
          };
        });
        return { ...row, cells: updatedCells };
      });

      updateTableData({
        ...tableData,
        rows: updatedRows,
      });
    };
    reader.readAsDataURL(fileObj);
  };

  // Remove attached file from a cell
  const handleRemoveFile = (rowIndex: number, colIndex: number) => {
    const updatedRows = tableData.rows.map((row, rIdx) => {
      if (rIdx !== rowIndex) return row;
      const updatedCells = row.cells.map((cell, cIdx) => {
        if (cIdx !== colIndex) return cell;
        const copy = { ...cell };
        delete copy.file;
        return copy;
      });
      return { ...row, cells: updatedCells };
    });

    updateTableData({
      ...tableData,
      rows: updatedRows,
    });
  };

  // Edit column header title
  const handleColumnTitleChange = (colIndex: number, title: string) => {
    const updatedCols = tableData.columns.map((col, idx) =>
      idx === colIndex ? { ...col, title } : col
    );
    updateTableData({
      ...tableData,
      columns: updatedCols,
    });
  };

  // Toggle checklist for ENTIRE column
  const handleToggleColumnChecklist = (colIndex: number) => {
    const col = tableData.columns[colIndex];
    const willBeChecklist = !col.isChecklist;

    const updatedCols = tableData.columns.map((c, idx) =>
      idx === colIndex ? { ...c, isChecklist: willBeChecklist } : c
    );

    const updatedRows = tableData.rows.map((row) => {
      const updatedCells = row.cells.map((cell, cIdx) => {
        if (cIdx !== colIndex) return cell;
        return {
          ...cell,
          isChecklist: willBeChecklist,
          checked: willBeChecklist ? cell.checked : false,
        };
      });
      return { ...row, cells: updatedCells };
    });

    updateTableData({
      columns: updatedCols,
      rows: updatedRows,
    });
  };

  // Add new column
  const handleAddColumn = () => {
    const newColId = generateId('col');
    const newCol: TableColumn = {
      id: newColId,
      title: `Column ${tableData.columns.length + 1}`,
      isChecklist: true,
    };

    const updatedCols = [...tableData.columns, newCol];
    const updatedRows = tableData.rows.map((row) => ({
      ...row,
      cells: [
        ...row.cells,
        {
          id: generateId('cell'),
          text: '',
          isChecklist: true,
          checked: false,
        },
      ],
    }));

    updateTableData({
      columns: updatedCols,
      rows: updatedRows,
    });
  };

  // Delete column
  const handleDeleteColumn = (colIndex: number) => {
    if (tableData.columns.length <= 1) return;
    const updatedCols = tableData.columns.filter((_, idx) => idx !== colIndex);
    const updatedRows = tableData.rows.map((row) => ({
      ...row,
      cells: row.cells.filter((_, idx) => idx !== colIndex),
    }));

    updateTableData({
      columns: updatedCols,
      rows: updatedRows,
    });
  };

  // Add new row
  const handleAddRow = () => {
    const newRow: TableRow = {
      id: generateId('row'),
      cells: tableData.columns.map((col) => ({
        id: generateId('cell'),
        text: '',
        isChecklist: Boolean(col.isChecklist),
        checked: false,
      })),
    };

    updateTableData({
      ...tableData,
      rows: [...tableData.rows, newRow],
    });
  };

  // Delete row
  const handleDeleteRow = (rowIndex: number) => {
    if (tableData.rows.length <= 1) return;
    const updatedRows = tableData.rows.filter((_, idx) => idx !== rowIndex);
    updateTableData({
      ...tableData,
      rows: updatedRows,
    });
  };

  // Toggle all checkboxes in table (check all or uncheck all)
  const handleToggleAllTableCheckboxes = () => {
    const allChecked = tableData.rows.every((row) =>
      row.cells.every((c) => !c.isChecklist || c.checked)
    );

    const updatedRows = tableData.rows.map((row) => ({
      ...row,
      cells: row.cells.map((cell) => ({
        ...cell,
        checked: cell.isChecklist ? !allChecked : cell.checked,
      })),
    }));

    updateTableData({
      ...tableData,
      rows: updatedRows,
    });
  };

  return (
    <div className="w-full max-w-full min-w-0 overflow-hidden my-3 p-2.5 sm:p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-100 shadow-md">
      {/* Table Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
            <TableIcon className="w-4 h-4 text-zinc-400" />
            <span>Checklist Table</span>
          </div>

          {tableStats.total > 0 && (
            <div className="flex items-center gap-2 ml-1 text-xs">
              <span className="text-[11px] font-mono text-zinc-400 tabular-nums">
                {tableStats.completed}/{tableStats.total} checked
              </span>
              <div className="w-16 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                  style={{ width: `${tableStats.percent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {!isReadMode && (
          <div className="flex items-center gap-1.5">
            {tableStats.total > 0 && (
              <button
                type="button"
                onClick={handleToggleAllTableCheckboxes}
                className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                title="Toggle all checklists in this table"
              >
                <CheckSquare className="w-3 h-3 text-zinc-400" />
                <span>Toggle All</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleAddColumn}
              className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-750 border border-zinc-700/60 rounded transition-colors cursor-pointer"
              title="Add a new column"
            >
              <Plus className="w-3 h-3" />
              <span>Col</span>
            </button>

            <button
              type="button"
              onClick={handleAddRow}
              className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-750 border border-zinc-700/60 rounded transition-colors cursor-pointer"
              title="Add a new row"
            >
              <Plus className="w-3 h-3" />
              <span>Row</span>
            </button>

            <button
              type="button"
              onClick={() => onDelete(block.id)}
              className="p-1 text-zinc-500 hover:text-rose-400 rounded transition-colors cursor-pointer ml-1"
              title="Delete table"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Responsive Table Scroll Container */}
      <div className="overflow-x-auto max-w-full rounded-lg border border-zinc-800 bg-zinc-950/60 touch-pan-x">
        <table className="w-full border-collapse text-left">
          {/* Column Headers */}
          <thead>
            <tr className="bg-zinc-900/90 border-b border-zinc-800 text-xs font-medium text-zinc-400">
              <th className="w-10 px-2 py-2 text-center text-zinc-600 font-mono text-[10px]">#</th>
              {tableData.columns.map((col, colIdx) => (
                <th key={col.id} className="px-3 py-2 min-w-[170px] border-r border-zinc-800/60 last:border-r-0">
                  <div className="flex items-center justify-between gap-1.5">
                    {isReadMode ? (
                      <span className="font-semibold text-zinc-200">{col.title}</span>
                    ) : (
                      <input
                        type="text"
                        value={col.title}
                        onChange={(e) => handleColumnTitleChange(colIdx, e.target.value)}
                        placeholder="Column name..."
                        className="bg-transparent text-xs font-semibold text-zinc-200 focus:outline-none focus:text-white w-full"
                      />
                    )}

                    {!isReadMode && (
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Column checklist toggle button */}
                        <button
                          type="button"
                          onClick={() => handleToggleColumnChecklist(colIdx)}
                          className={`p-1 rounded text-[10px] transition-colors cursor-pointer ${
                            col.isChecklist
                              ? 'text-emerald-400 hover:bg-emerald-500/10'
                              : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                          }`}
                          title={
                            col.isChecklist
                              ? 'Checklist enabled in this column. Click to convert to plain text.'
                              : 'Enable checklists in this column'
                          }
                        >
                          <CheckSquare className="w-3 h-3" />
                        </button>

                        {/* Delete column if > 1 */}
                        {tableData.columns.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteColumn(colIdx)}
                            className="p-1 rounded text-zinc-600 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Delete this column"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </th>
              ))}
              {!isReadMode && <th className="w-10 px-2 py-2 text-center"></th>}
            </tr>
          </thead>

          {/* Table Body Rows */}
          <tbody className="divide-y divide-zinc-850">
            {tableData.rows.map((row, rowIdx) => (
              <tr
                key={row.id}
                className="hover:bg-zinc-900/40 transition-colors group"
              >
                {/* Row number */}
                <td className="px-2 py-2 text-center text-zinc-600 font-mono text-[10px]">
                  {rowIdx + 1}
                </td>

                {/* Cells in each column */}
                {row.cells.map((cell, colIdx) => {
                  const cellKey = `${row.id}-${cell.id}`;
                  const isMenuOpen = activeCellAction === cellKey;

                  return (
                    <td
                      key={cell.id}
                      className="px-2.5 py-2 border-r border-zinc-800/60 last:border-r-0 align-top relative group/cell"
                    >
                      <div className="flex flex-col gap-1.5 min-w-0">
                        <div className="flex items-start gap-2">
                          {/* Checkbox if this cell is a checklist item */}
                          {cell.isChecklist ? (
                            <button
                              type="button"
                              onClick={() => handleToggleCellCheckbox(rowIdx, colIdx)}
                              className="mt-0.5 shrink-0 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                              title={cell.checked ? 'Mark uncompleted' : 'Mark completed'}
                            >
                              {cell.checked ? (
                                <CheckSquare className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Square className="w-4 h-4 text-zinc-500 hover:text-zinc-300" />
                              )}
                            </button>
                          ) : (
                            !isReadMode && (
                              <button
                                type="button"
                                onClick={() => handleToggleCellChecklistMode(rowIdx, colIdx)}
                                className="mt-0.5 shrink-0 opacity-0 group-hover/cell:opacity-100 text-zinc-600 hover:text-zinc-400 transition-opacity cursor-pointer"
                                title="Turn this cell into a checklist"
                              >
                                <Square className="w-3.5 h-3.5 border-dashed" />
                              </button>
                            )
                          )}

                          {/* Cell text */}
                          {isReadMode ? (
                            <span
                              className={`flex-1 break-words ${textSizeClass} ${
                                cell.isChecklist && cell.checked
                                  ? 'line-through text-zinc-400/80 decoration-zinc-500'
                                  : 'text-zinc-100'
                              }`}
                            >
                              {cell.text || <span className="text-zinc-600 italic">—</span>}
                            </span>
                          ) : (
                            <div className="flex-1 flex items-start gap-1">
                              <textarea
                                rows={1}
                                value={cell.text}
                                onChange={(e) => handleCellTextChange(rowIdx, colIdx, e.target.value)}
                                placeholder={cell.isChecklist ? 'Checklist item...' : 'Cell note...'}
                                className={`w-full bg-transparent resize-none leading-relaxed focus:outline-none focus:text-white transition-colors ${textSizeClass} ${
                                  cell.isChecklist && cell.checked
                                    ? 'line-through text-zinc-400/80 decoration-zinc-500'
                                    : 'text-zinc-100'
                                }`}
                                style={{ minHeight: '24px' }}
                              />

                              {/* Attach file button */}
                              <label
                                className="opacity-0 group-hover/cell:opacity-100 text-zinc-500 hover:text-indigo-400 p-0.5 transition-opacity cursor-pointer shrink-0"
                                title="Attach a file to this cell"
                              >
                                <Paperclip className="w-3.5 h-3.5" />
                                <input
                                  type="file"
                                  className="hidden"
                                  onChange={(e) => {
                                    const selected = e.target.files?.[0];
                                    if (selected) {
                                      handleAttachFile(rowIdx, colIdx, selected);
                                    }
                                    e.target.value = '';
                                  }}
                                />
                              </label>

                              {/* Cell checklist toggle option on hover */}
                              <button
                                type="button"
                                onClick={() => handleToggleCellChecklistMode(rowIdx, colIdx)}
                                className="opacity-0 group-hover/cell:opacity-100 text-zinc-600 hover:text-zinc-300 p-0.5 transition-opacity cursor-pointer shrink-0"
                                title={
                                  cell.isChecklist
                                    ? 'Remove checklist from this cell'
                                    : 'Put checklist in this cell'
                                }
                              >
                                {cell.isChecklist ? (
                                  <CheckSquare className="w-3 h-3 text-emerald-400/80" />
                                ) : (
                                  <Square className="w-3 h-3 text-zinc-500" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Attached File Pill Badge */}
                        {cell.file && (
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-900 border border-zinc-700/70 text-xs max-w-full">
                            <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span
                              className="truncate text-zinc-200 hover:text-indigo-300 cursor-pointer select-none font-medium flex-1 text-[11px]"
                              title={`${cell.file.name} (${Math.round((cell.file.size || 0) / 1024)} KB) - Click to load & preview`}
                              onClick={() => setPreviewFile(cell.file || null)}
                            >
                              {cell.file.name}
                            </span>
                            <span className="text-[10px] text-zinc-500 shrink-0">
                              {Math.round((cell.file.size || 0) / 1024)}KB
                            </span>
                            {cell.file.dataUrl && (
                              <button
                                type="button"
                                onClick={() => setPreviewFile(cell.file || null)}
                                className="text-zinc-400 hover:text-indigo-300 p-0.5 cursor-pointer shrink-0"
                                title="Load and preview file"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {cell.file.dataUrl && (
                              <button
                                type="button"
                                onClick={() => {
                                  const a = document.createElement('a');
                                  a.href = cell.file!.dataUrl!;
                                  a.download = cell.file!.name;
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                }}
                                className="text-zinc-400 hover:text-zinc-100 p-0.5 cursor-pointer shrink-0"
                                title="Download file"
                              >
                                <Download className="w-3 h-3" />
                              </button>
                            )}
                            {!isReadMode && (
                              <button
                                type="button"
                                onClick={() => handleRemoveFile(rowIdx, colIdx)}
                                className="text-zinc-500 hover:text-rose-400 p-0.5 rounded transition-colors cursor-pointer shrink-0"
                                title="Remove file"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}

                {/* Delete row button */}
                {!isReadMode && (
                  <td className="w-10 px-2 py-2 text-center align-middle">
                    {tableData.rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(rowIdx)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-rose-400 rounded transition-opacity cursor-pointer"
                        title="Delete this row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Table Footer with quick row/column add */}
      {!isReadMode && (
        <div className="flex items-center justify-between pt-2.5 mt-1 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddRow}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Row</span>
            </button>
            <button
              type="button"
              onClick={handleAddColumn}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Column</span>
            </button>
          </div>

          <span className="text-[11px] text-zinc-500 font-mono">
            {tableData.rows.length} rows × {tableData.columns.length} columns · Checklists in every column
          </span>
        </div>
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
};
