import React, { useState, useRef, useEffect } from 'react';
import { FontFamilyId } from '../types';
import {
  FONT_OPTIONS,
  FONT_SIZE_PRESETS,
  MIN_FONT_SIZE,
  MAX_FONT_SIZE,
  DEFAULT_FONT_SIZE,
  DEFAULT_FONT_FAMILY,
  clampFontSize,
  getFontOption,
} from '../utils/fontConstants';
import {
  Type,
  ChevronDown,
  Check,
  Minus,
  Plus,
  RotateCcw,
  Sparkles,
  Sliders,
} from 'lucide-react';

interface TypographyToolbarProps {
  fontFamily?: FontFamilyId;
  fontSize?: number;
  onFontFamilyChange: (font: FontFamilyId) => void;
  onFontSizeChange: (size: number) => void;
  onResetTypography?: () => void;
  onSetAsDefault?: () => void;
  isReadMode?: boolean;
}

export const TypographyToolbar: React.FC<TypographyToolbarProps> = ({
  fontFamily = DEFAULT_FONT_FAMILY,
  fontSize = DEFAULT_FONT_SIZE,
  onFontFamilyChange,
  onFontSizeChange,
  onResetTypography,
  onSetAsDefault,
  isReadMode = false,
}) => {
  const [isFontDropdownOpen, setIsFontDropdownOpen] = useState(false);
  const [isSizeDropdownOpen, setIsSizeDropdownOpen] = useState(false);
  const [defaultSavedToast, setDefaultSavedToast] = useState(false);

  const fontDropdownRef = useRef<HTMLDivElement>(null);
  const sizeDropdownRef = useRef<HTMLDivElement>(null);

  const currentFont = getFontOption(fontFamily);
  const safeFontSize = clampFontSize(fontSize);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (fontDropdownRef.current && !fontDropdownRef.current.contains(target)) {
        setIsFontDropdownOpen(false);
      }
      if (sizeDropdownRef.current && !sizeDropdownRef.current.contains(target)) {
        setIsSizeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDecreaseSize = () => {
    onFontSizeChange(clampFontSize(safeFontSize - 1));
  };

  const handleIncreaseSize = () => {
    onFontSizeChange(clampFontSize(safeFontSize + 1));
  };

  const handleCustomSizeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) {
      onFontSizeChange(clampFontSize(val));
    }
  };

  const handleSaveDefault = () => {
    if (onSetAsDefault) {
      onSetAsDefault();
      setDefaultSavedToast(true);
      setTimeout(() => setDefaultSavedToast(false), 2000);
    }
  };

  // Group fonts by category
  const categories = ['Sans-Serif', 'Serif', 'Monospace', 'Handwriting'] as const;

  return (
    <div className="w-full flex items-center justify-between gap-2 py-2 px-3 bg-zinc-900/70 border border-zinc-800/80 rounded-xl backdrop-blur-sm transition-all text-xs">
      <div className="flex items-center gap-2 flex-wrap min-w-0">
        {/* Label indicator */}
        <div className="flex items-center gap-1.5 text-zinc-400 font-medium shrink-0">
          <Type className="w-3.5 h-3.5 text-zinc-400" />
          <span className="hidden sm:inline text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
            Typography
          </span>
        </div>

        {/* 1. Font Family Dropdown */}
        <div className="relative" ref={fontDropdownRef}>
          <button
            type="button"
            onClick={() => {
              setIsFontDropdownOpen(!isFontDropdownOpen);
              setIsSizeDropdownOpen(false);
            }}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-200 transition-all cursor-pointer ${
              isFontDropdownOpen ? 'ring-1 ring-zinc-500 border-zinc-600' : ''
            }`}
            title="Change font style / alphabet"
            aria-expanded={isFontDropdownOpen}
          >
            <span
              className="text-xs truncate max-w-[120px] sm:max-w-[150px] font-medium"
              style={{ fontFamily: currentFont.fontFamily }}
            >
              {currentFont.name}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${
                isFontDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Font Selection Dropdown Menu */}
          {isFontDropdownOpen && (
            <div className="absolute left-0 top-full mt-1.5 z-50 w-72 sm:w-80 max-h-[380px] overflow-y-auto bg-zinc-900 rounded-xl border border-zinc-800 shadow-2xl p-1.5 text-zinc-200 divide-y divide-zinc-800/80 animate-in fade-in zoom-in-95 duration-100">
              {categories.map((category) => {
                const fontsInCat = FONT_OPTIONS.filter((f) => f.category === category);
                if (fontsInCat.length === 0) return null;

                return (
                  <div key={category} className="py-1.5 first:pt-0.5 last:pb-0.5">
                    <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">
                      {category}
                    </div>
                    <div className="space-y-0.5">
                      {fontsInCat.map((font) => {
                        const isSelected = font.id === fontFamily;
                        return (
                          <button
                            key={font.id}
                            type="button"
                            onClick={() => {
                              onFontFamilyChange(font.id);
                              setIsFontDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-zinc-800 text-white font-medium ring-1 ring-zinc-700'
                                : 'hover:bg-zinc-800/60 text-zinc-300'
                            }`}
                          >
                            <div className="flex flex-col min-w-0 pr-2">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="text-sm font-semibold truncate"
                                  style={{ fontFamily: font.fontFamily }}
                                >
                                  {font.name}
                                </span>
                                {isSelected && (
                                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                )}
                              </div>
                              <span
                                className="text-[11px] text-zinc-400 truncate mt-0.5"
                                style={{ fontFamily: font.fontFamily }}
                              >
                                {font.previewText} · {font.sample}
                              </span>
                            </div>

                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-950 text-zinc-400 border border-zinc-800 shrink-0">
                              {font.category}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. Font Size Stepper & Selector */}
        <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-lg p-0.5">
          <button
            type="button"
            onClick={handleDecreaseSize}
            disabled={safeFontSize <= MIN_FONT_SIZE}
            className="w-6 h-6 flex items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
            title="Decrease font size (-1px)"
            aria-label="Decrease font size"
          >
            <Minus className="w-3 h-3" />
          </button>

          {/* Size Dropdown Trigger & Input */}
          <div className="relative" ref={sizeDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setIsSizeDropdownOpen(!isSizeDropdownOpen);
                setIsFontDropdownOpen(false);
              }}
              className="flex items-center gap-1 px-1.5 py-0.5 text-xs font-mono font-medium text-zinc-200 hover:text-white rounded hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Select preset font size or choose custom"
            >
              <span className="tabular-nums">{safeFontSize}px</span>
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>

            {/* Presets & Custom Stepper Menu */}
            {isSizeDropdownOpen && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 z-50 w-44 bg-zinc-900 rounded-xl border border-zinc-800 shadow-2xl p-2 text-zinc-200 space-y-2 animate-in fade-in zoom-in-95 duration-100">
                <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold px-1">
                  Preset Sizes
                </div>
                <div className="space-y-1">
                  {FONT_SIZE_PRESETS.map((preset) => {
                    const isSelected = preset.value === safeFontSize;
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => {
                          onFontSizeChange(preset.value);
                          setIsSizeDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-zinc-800 text-white font-medium ring-1 ring-zinc-700'
                            : 'hover:bg-zinc-800/60 text-zinc-300'
                        }`}
                      >
                        <span>{preset.label}</span>
                        <span className="font-mono text-[11px] text-zinc-400">
                          {preset.shortLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="border-t border-zinc-800 pt-2 px-1">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold mb-1">
                    Custom Pixel Size
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="range"
                      min={MIN_FONT_SIZE}
                      max={MAX_FONT_SIZE}
                      value={safeFontSize}
                      onChange={handleCustomSizeInput}
                      className="w-full accent-white h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                    />
                    <span className="font-mono text-[11px] tabular-nums text-zinc-300 shrink-0 w-8 text-right">
                      {safeFontSize}px
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleIncreaseSize}
            disabled={safeFontSize >= MAX_FONT_SIZE}
            className="w-6 h-6 flex items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
            title="Increase font size (+1px)"
            aria-label="Increase font size"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Right side utility actions: Set as Default & Reset */}
      <div className="flex items-center gap-1.5 shrink-0">
        {onSetAsDefault && !isReadMode && (
          <button
            type="button"
            onClick={handleSaveDefault}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-transparent hover:border-zinc-700 transition-all cursor-pointer"
            title="Set this font and size as default for all new notes"
          >
            {defaultSavedToast ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Default Saved</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span className="hidden sm:inline">Set Default</span>
              </>
            )}
          </button>
        )}

        {onResetTypography && (
          <button
            type="button"
            onClick={onResetTypography}
            disabled={fontFamily === DEFAULT_FONT_FAMILY && fontSize === DEFAULT_FONT_SIZE}
            className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 disabled:opacity-20 transition-all cursor-pointer"
            title="Reset to default typography (Plus Jakarta Sans, 16px)"
            aria-label="Reset typography"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
