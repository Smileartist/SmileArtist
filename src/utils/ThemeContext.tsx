import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";

export interface ThemeConfig {
  // Colors
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  
  // Fonts
  fontFamily: string;
  fontSize: string;
  
  // UI Elements
  borderRadius: string;
  cardStyle: "glass" | "solid" | "minimal";
  
  // Chat
  chatBubbleStyle: "rounded" | "square" | "bubble";
  chatMyMessageBg: string;
  chatOtherMessageBg: string;
}

const defaultTheme: ThemeConfig = {
  primaryColor: "#d4756f",
  secondaryColor: "#c9a28f",
  accentColor: "#fce4da",
  backgroundColor: "#fef9f5",
  textColor: "#2d2424",
  fontFamily: "system-ui",
  fontSize: "16px",
  borderRadius: "1rem",
  cardStyle: "glass",
  chatBubbleStyle: "rounded",
  chatMyMessageBg: "#d4756f",
  chatOtherMessageBg: "#ffffff",
};

interface ThemeContextType {
  theme: ThemeConfig;
  updateTheme: (updates: Partial<ThemeConfig>) => void;
  resetTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const darkModeInitialized = useRef(false);

  // Initialize dark mode synchronously before any rendering (only once)
  if (typeof window !== 'undefined' && !darkModeInitialized.current) {
    const darkMode = localStorage.getItem("app_darkMode") === "true";
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    darkModeInitialized.current = true;
  }

  const [theme, setTheme] = useState<ThemeConfig>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("smileArtistTheme");
      const savedTheme = saved ? JSON.parse(saved) : defaultTheme;
      
      // If dark mode is enabled and theme matches default light, apply dark colors
      const darkMode = localStorage.getItem("app_darkMode") === "true";
      if (darkMode) {
        const isDefaultLight = 
          savedTheme.backgroundColor === defaultTheme.backgroundColor &&
          savedTheme.textColor === defaultTheme.textColor &&
          savedTheme.accentColor === defaultTheme.accentColor &&
          savedTheme.chatOtherMessageBg === defaultTheme.chatOtherMessageBg;
        
        if (isDefaultLight) {
          return {
            ...savedTheme,
            backgroundColor: "#1a1515",
            textColor: "#f5e8e0",
            accentColor: "#3d2f2f",
            chatOtherMessageBg: "#2d2424",
          };
        }
      }
      return savedTheme;
    }
    return defaultTheme;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem("smileArtistTheme", JSON.stringify(theme));
      applyThemeToDocument(theme);
    }
  }, [theme]);

  const updateTheme = (updates: Partial<ThemeConfig>) => {
    setTheme((prev) => ({ ...prev, ...updates }));
  };

  const resetTheme = () => {
    setTheme(defaultTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, updateTheme, resetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

function applyThemeToDocument(theme: ThemeConfig) {
  if (typeof document === 'undefined') return;
  
  const root = document.documentElement;
  
  // Check dark mode state first
  const isDark = root.classList.contains('dark');
  
  // Apply CSS variables
  root.style.setProperty("--theme-primary", theme.primaryColor);
  root.style.setProperty("--theme-secondary", theme.secondaryColor);
  root.style.setProperty("--theme-accent", theme.accentColor);
  root.style.setProperty("--theme-background", theme.backgroundColor);
  root.style.setProperty("--theme-text", theme.textColor);
  root.style.setProperty("--theme-font-family", theme.fontFamily);
  root.style.setProperty("--theme-font-size", theme.fontSize);
  root.style.setProperty("--theme-border-radius", theme.borderRadius);
  root.style.setProperty("--theme-chat-my-bg", theme.chatMyMessageBg);
  root.style.setProperty("--theme-chat-other-bg", theme.chatOtherMessageBg);
  
  // Set card background based on whether we're in dark mode
  root.style.setProperty("--theme-card-bg", isDark ? "#2d2424" : "#ffffff");
}