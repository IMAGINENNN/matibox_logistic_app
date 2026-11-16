import React, { createContext, useContext, useEffect, useState } from 'react';

type GlassTheme = 'light' | 'dark';

interface ThemeContextValue {
  theme: GlassTheme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggleTheme: () => {}
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<GlassTheme>(() => {
    const saved = localStorage.getItem('matibox_glass_theme_v2');
    return saved === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    localStorage.setItem('matibox_glass_theme_v2', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div className={`liquid-canvas ${theme === 'dark' ? 'theme-dark dark' : 'theme-light'}`}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

export const useGlassTheme = () => useContext(ThemeContext);
