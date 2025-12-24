import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Theme } from '../types';
import { useAuth } from './AuthContext';
import { execute } from '../lib/tidbClient';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('nebula');
  const { user, profile } = useAuth();

  // Load theme from profile when it loads
  useEffect(() => {
    if (profile?.theme) {
      setTheme(profile.theme as Theme);
    }
  }, [profile]);

  // Apply theme to body
  useEffect(() => {
    document.body.className = ''; // Reset
    document.body.classList.add(`theme-${theme}`);

    // Persist to DB if user is logged in and theme changed
    if (user && profile && profile.theme !== theme) {
      const saveTheme = async () => {
        try {
          await execute('UPDATE profiles SET theme = ? WHERE id = ?', [theme, user.uid]);
        } catch (e) {
          console.error("Failed to save theme", e);
        }
      };
      // Debounce or just fire? Fire is fine for now, user doesn't switch theme 100x/sec
      saveTheme();
    }
  }, [theme, user, profile]); // Dependency logic needs care to avoid loops if profile updates trigger this

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
