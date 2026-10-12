export type FontFamilyId =
  | 'sans'
  | 'inter'
  | 'roboto'
  | 'poppins'
  | 'lora'
  | 'merriweather'
  | 'mono'
  | 'caveat';

export interface FontOption {
  id: FontFamilyId;
  name: string;
  category: 'Sans-Serif' | 'Serif' | 'Monospace' | 'Handwriting';
  fontFamily: string;
  previewText: string;
  sample: string;
}

export const FONT_OPTIONS: FontOption[] = [
  {
    id: 'sans',
    name: 'Plus Jakarta Sans',
    category: 'Sans-Serif',
    fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    previewText: 'Modern & Clean',
    sample: 'Aa Bb Gg 123',
  },
  {
    id: 'inter',
    name: 'Inter',
    category: 'Sans-Serif',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    previewText: 'Crisp & Highly Legible',
    sample: 'Aa Bb Gg 123',
  },
  {
    id: 'roboto',
    name: 'Roboto',
    category: 'Sans-Serif',
    fontFamily: "'Roboto', sans-serif",
    previewText: 'Geometric & Friendly',
    sample: 'Aa Bb Gg 123',
  },
  {
    id: 'poppins',
    name: 'Poppins',
    category: 'Sans-Serif',
    fontFamily: "'Poppins', sans-serif",
    previewText: 'Modern & Geometric',
    sample: 'Aa Bb Gg 123',
  },
  {
    id: 'lora',
    name: 'Lora',
    category: 'Serif',
    fontFamily: "'Lora', Georgia, serif",
    previewText: 'Literary & Elegant',
    sample: 'Aa Bb Gg 123',
  },
  {
    id: 'merriweather',
    name: 'Merriweather',
    category: 'Serif',
    fontFamily: "'Merriweather', Georgia, serif",
    previewText: 'Warm Editorial Serif',
    sample: 'Aa Bb Gg 123',
  },
  {
    id: 'mono',
    name: 'JetBrains Mono',
    category: 'Monospace',
    fontFamily: "'JetBrains Mono', monospace",
    previewText: 'Technical Code & Notes',
    sample: 'Aa Bb Gg 123',
  },
  {
    id: 'caveat',
    name: 'Caveat',
    category: 'Handwriting',
    fontFamily: "'Caveat', cursive",
    previewText: 'Casual Handwriting',
    sample: 'Aa Bb Gg 123',
  },
];

export interface FontSizePreset {
  value: number;
  label: string;
  shortLabel: string;
}

export const FONT_SIZE_PRESETS: FontSizePreset[] = [
  { value: 14, label: 'Small', shortLabel: '14px' },
  { value: 16, label: 'Medium (Default)', shortLabel: '16px' },
  { value: 18, label: 'Large', shortLabel: '18px' },
  { value: 22, label: 'Extra Large', shortLabel: '22px' },
  { value: 26, label: 'Huge', shortLabel: '26px' },
];

export const MIN_FONT_SIZE = 12;
export const MAX_FONT_SIZE = 36;
export const DEFAULT_FONT_SIZE = 16;
export const DEFAULT_FONT_FAMILY: FontFamilyId = 'sans';

export const STORAGE_KEY_DEFAULT_FONT_FAMILY = 'noteflow_default_font_family';
export const STORAGE_KEY_DEFAULT_FONT_SIZE = 'noteflow_default_font_size';

export function clampFontSize(size: number): number {
  if (!Number.isFinite(size)) return DEFAULT_FONT_SIZE;
  return Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, Math.round(size)));
}

export function getFontFamilyCss(fontId?: string): string {
  const found = FONT_OPTIONS.find((f) => f.id === fontId);
  return found ? found.fontFamily : FONT_OPTIONS[0].fontFamily;
}

export function getFontOption(fontId?: string): FontOption {
  return FONT_OPTIONS.find((f) => f.id === fontId) || FONT_OPTIONS[0];
}
