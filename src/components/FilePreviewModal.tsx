/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { CellAttachment } from '../types';
import { X, Download, ExternalLink, FileText, Image as ImageIcon } from 'lucide-react';

interface FilePreviewModalProps {
  file: CellAttachment;
  onClose: () => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ file, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const isImage =
    file.type?.startsWith('image/') ||
    /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i.test(file.name);

  const isPdf =
    file.type === 'application/pdf' ||
    /\.pdf$/i.test(file.name);

  const isText =
    file.type?.startsWith('text/') ||
    /\.(txt|md|json|csv|tsv|js|ts|tsx|jsx|html|css|py|xml|log)$/i.test(file.name);

  const handleDownload = () => {
    if (!file.dataUrl) return;
    const a = document.createElement('a');
    a.href = file.dataUrl;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpenNewTab = () => {
    if (!file.dataUrl) return;
    const win = window.open();
    if (win) {
      win.document.write(
        `<iframe src="${file.dataUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
      );
    }
  };

  // Decode data URL for text preview if text-based
  const textContent = React.useMemo(() => {
    if (!isText || !file.dataUrl) return null;
    try {
      const base64Part = file.dataUrl.split(',')[1];
      if (base64Part) {
        return decodeURIComponent(escape(atob(base64Part)));
      }
    } catch {
      // Base64 decode fallback
    }
    return null;
  }, [file.dataUrl, isText]);

  return (
    <div
      className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden text-zinc-100 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-zinc-950/80">
          <div className="flex items-center gap-2.5 min-w-0">
            {isImage ? (
              <ImageIcon className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-white truncate max-w-[320px] sm:max-w-md" title={file.name}>
                {file.name}
              </span>
              <span className="text-[11px] font-mono text-zinc-400">
                {Math.round((file.size || 0) / 1024)} KB · {file.type || 'Document file'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {file.dataUrl && (
              <>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-750 border border-zinc-700/60 rounded-lg transition-colors cursor-pointer"
                  title="Download this file"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenNewTab}
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                  title="Open in new window"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer ml-1"
              title="Close (ESC)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Preview Container */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center bg-zinc-950/50 min-h-[300px] max-h-[calc(90vh-120px)]">
          {isImage && file.dataUrl ? (
            <div className="max-w-full max-h-full flex items-center justify-center">
              <img
                src={file.dataUrl}
                alt={file.name}
                className="max-h-[70vh] max-w-full rounded-lg object-contain shadow-md"
              />
            </div>
          ) : isPdf && file.dataUrl ? (
            <iframe
              src={file.dataUrl}
              title={file.name}
              className="w-full h-[70vh] rounded-lg border border-zinc-800 bg-white"
            />
          ) : textContent !== null ? (
            <div className="w-full h-full flex flex-col">
              <pre className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl font-mono text-xs text-zinc-200 overflow-auto whitespace-pre-wrap max-h-[65vh] leading-relaxed selection:bg-zinc-800">
                {textContent}
              </pre>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center text-zinc-400 max-w-md">
              <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-indigo-400" />
              </div>
              <p className="text-sm font-semibold text-zinc-200 mb-1">{file.name}</p>
              <p className="text-xs text-zinc-400 mb-6">
                This file format ({file.type || 'binary'}) cannot be directly previewed in the browser. You can download or open it in your system.
              </p>
              {file.dataUrl && (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-zinc-950 rounded-xl text-xs font-semibold hover:bg-zinc-200 transition-colors cursor-pointer shadow-md"
                >
                  <Download className="w-4 h-4" />
                  <span>Download File ({Math.round((file.size || 0) / 1024)} KB)</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
