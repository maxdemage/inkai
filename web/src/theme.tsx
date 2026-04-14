import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export const THEME_STORAGE_KEY = 'inkai-ui-theme';

export type ThemeDefinition = {
  id: string;
  name: string;
  description: string;
  swatches: [string, string, string];
};

export const THEMES: ThemeDefinition[] = [
  { id: 'midnight-ink', name: 'Classic Inkai', description: 'The original Inkai look: deep indigo surfaces with electric violet accents.', swatches: ['#7c6af7', '#191933', '#0a0a14'] },
  { id: 'graphite-noir', name: 'Graphite Noir', description: 'A restrained monochrome dark theme with steel-gray editorial contrast.', swatches: ['#d1d5db', '#262b33', '#090b0f'] },
  { id: 'oled-black', name: 'OLED Black', description: 'True black surfaces with sharp monochrome contrast and no atmospheric glow.', swatches: ['#f5f5f5', '#101214', '#000000'] },
  { id: 'phosphor', name: 'Phosphor', description: 'CRT phosphor green on near-black, tuned to feel terminal-sharp instead of organic.', swatches: ['#7cff9b', '#0d1b12', '#020503'] },
  { id: 'ocean-glyph', name: 'Ocean Glyph', description: 'Cold blue depths with crisp cyan highlights.', swatches: ['#38bdf8', '#14324a', '#07131d'] },
  { id: 'ember-codex', name: 'Ember Codex', description: 'Charcoal workspace lit by ember orange and rose.', swatches: ['#f97316', '#7c2d12', '#140b09'] },
  { id: 'forest-atelier', name: 'Forest Atelier', description: 'Deep moss greens with softer studio warmth for long sessions.', swatches: ['#34d399', '#18352b', '#091510'] },
  { id: 'rose-editorial', name: 'Rose Editorial', description: 'Editorial burgundy and warm slate contrast.', swatches: ['#fb7185', '#4c1d2f', '#170b12'] },
  { id: 'golden-hour', name: 'Golden Hour', description: 'Honeyed gold glow over brown-black surfaces.', swatches: ['#fbbf24', '#4b3207', '#171005'] },
  { id: 'aurora-mint', name: 'Aurora Mint', description: 'Mint glass accents with cool evergreen shadows.', swatches: ['#2dd4bf', '#173d3b', '#061514'] },
  { id: 'amethyst-draft', name: 'Amethyst Draft', description: 'Royal purple palette with softer editorial contrast.', swatches: ['#a78bfa', '#34245e', '#100b1e'] },
  { id: 'crimson-night', name: 'Crimson Night', description: 'Dark garnet theme tuned for dramatic writing sessions.', swatches: ['#f43f5e', '#4c1021', '#17070c'] },
  { id: 'monochrome-paper', name: 'Monochrome Paper', description: 'A crisp grayscale light theme with neutral whites and graphite ink.', swatches: ['#3f3f46', '#ececec', '#fafafa'] },
  { id: 'glacier-paper', name: 'Glacier Paper', description: 'Light reading-room theme with ink-blue accents.', swatches: ['#2563eb', '#dbeafe', '#f7fbff'] },
  { id: 'sage-paper', name: 'Sage Paper', description: 'A bright studio-paper theme with eucalyptus accents instead of blue.', swatches: ['#0f766e', '#d9f3ec', '#fbfefc'] },
  { id: 'warm-paper', name: 'Warm Paper', description: 'Soft cream paper tones with charcoal ink and a gentle editorial warmth.', swatches: ['#44403c', '#f3f0ea', '#fffdf8'] },
];

type ThemeContextValue = {
  themeId: string;
  setThemeId: (id: string) => void;
  themes: ThemeDefinition[];
  currentTheme: ThemeDefinition;
};

const fallbackTheme = THEMES[0];

const ThemeContext = createContext<ThemeContextValue>({
  themeId: fallbackTheme.id,
  setThemeId: () => undefined,
  themes: THEMES,
  currentTheme: fallbackTheme,
});

function getInitialTheme(): string {
  if (typeof window === 'undefined') return fallbackTheme.id;
  return window.localStorage.getItem(THEME_STORAGE_KEY) ?? fallbackTheme.id;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState(getInitialTheme);

  const currentTheme = useMemo(
    () => THEMES.find(theme => theme.id === themeId) ?? fallbackTheme,
    [themeId],
  );

  useEffect(() => {
    document.documentElement.dataset.theme = currentTheme.id;
    window.localStorage.setItem(THEME_STORAGE_KEY, currentTheme.id);
  }, [currentTheme]);

  const value = useMemo(
    () => ({ themeId: currentTheme.id, setThemeId, themes: THEMES, currentTheme }),
    [currentTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
