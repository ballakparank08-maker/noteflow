import React, { useState } from 'react';
import { Note } from '../types';
import { exportNoteToMarkdown } from '../utils/helpers';
import { X, Copy, Check, Download } from 'lucide-react';

interface ExportModalProps {
  note: Note;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ note, onClose }) => {
  const [copied, setCopied] = useState(false);
  const markdownContent = exportNoteToMarkdown(note);

  const handleCopy = () => {
    navigator.clipboard.writeText(markdownContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(note.title || 'untitled').toLowerCase().replace(/\s+/g, '-')}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-800 max-w-lg w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-zinc-100">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
          <h3 className="text-sm font-semibold text-white">Export Document</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-3">
          <p className="text-xs text-zinc-400">
            Preview of your document formatted as standard GitHub Markdown with task checkboxes:
          </p>

          <pre className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-300 max-h-60 overflow-y-auto whitespace-pre-wrap break-words break-all max-w-full selection:bg-zinc-800">
            {markdownContent}
          </pre>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 bg-zinc-950 border-t border-zinc-850">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors border border-zinc-700 bg-zinc-900"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied to Clipboard</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-zinc-400" />
                <span>Copy Markdown</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-zinc-950 bg-white hover:bg-zinc-200 rounded-lg transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .md</span>
          </button>
        </div>
      </div>
    </div>
  );
};
