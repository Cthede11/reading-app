import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import styled from 'styled-components';
import Header from './components/Header';
import SearchPage from './components/SearchPage';
import BookPage from './components/BookPage';
import Reader from './components/Reader';
import LibraryPage from './components/LibraryPage';
import Dashboard from './components/Dashboard';
import { ThemeProvider } from './context/ThemeContext';
import { LibraryProvider } from './context/LibraryContext';

const AppContainer = styled.div`
  min-height: 100vh;
  background-color: var(--bg-primary-light);
  color: var(--text-primary-light);
  transition: background-color 0.3s ease, color 0.3s ease;
  font-size: ${props => props.fontSize}px;
  font-family: ${props => props.fontFamily};
  
  &.theme-dark {
    background-color: var(--bg-primary-dark);
    color: var(--text-primary-dark);
  }
  
  &.theme-sepia {
    background-color: var(--bg-primary-sepia);
    color: var(--text-primary-sepia);
  }
`;

const GlobalStyles = styled.div`
  /* Custom scrollbar */
  * {
    scrollbar-width: thin;
    scrollbar-color: var(--accent-light) var(--bg-secondary-light);
  }

  *::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  *::-webkit-scrollbar-track {
    background: var(--bg-secondary-light);
    border-radius: 4px;
  }

  *::-webkit-scrollbar-thumb {
    background: var(--accent-light);
    border-radius: 4px;
    
    &:hover {
      background: var(--accent-dark);
    }
  }

  &.theme-dark {
    *::-webkit-scrollbar-track {
      background: var(--bg-secondary-dark);
    }
    
    *::-webkit-scrollbar-thumb {
      background: var(--accent-dark);
    }
    
    * {
      scrollbar-color: var(--accent-dark) var(--bg-secondary-dark);
    }
  }

  &.theme-sepia {
    *::-webkit-scrollbar-track {
      background: var(--bg-secondary-sepia);
    }
    
    *::-webkit-scrollbar-thumb {
      background: var(--accent-sepia);
    }
    
    * {
      scrollbar-color: var(--accent-sepia) var(--bg-secondary-sepia);
    }
  }

  /* Selection styling */
  ::selection {
    background: var(--accent-light);
    color: white;
  }

  &.theme-dark ::selection {
    background: var(--accent-dark);
  }

  &.theme-sepia ::selection {
    background: var(--accent-sepia);
  }

  /* Focus styles */
  *:focus {
    outline: 2px solid var(--accent-light);
    outline-offset: 2px;
  }

  &.theme-dark *:focus {
    outline-color: var(--accent-dark);
  }

  &.theme-sepia *:focus {
    outline-color: var(--accent-sepia);
  }
`;

function App() {
  const [currentTheme, setCurrentTheme] = useState('light');
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState('serif');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUserPreferences = () => {
      try {
        const savedTheme = localStorage.getItem('readingApp_theme') || 'light';
        const savedFontSize = parseInt(localStorage.getItem('readingApp_fontSize')) || 16;
        const savedFontFamily = localStorage.getItem('readingApp_fontFamily') || 'serif';
        
        setCurrentTheme(savedTheme);
        setFontSize(savedFontSize);
        setFontFamily(savedFontFamily);
        
        document.body.className = `theme-${savedTheme}`;
        document.body.style.fontSize = `${savedFontSize}px`;
        document.body.style.fontFamily = getFontFamilyValue(savedFontFamily);
      } catch (error) {
        console.error('Error loading user preferences:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserPreferences();
  }, []);

  const getFontFamilyValue = (family) => {
    const fonts = {
      'serif': 'Georgia, "Times New Roman", Times, serif',
      'sans-serif': '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", sans-serif',
      'monospace': '"SF Mono", "Monaco", "Inconsolata", "Roboto Mono", "Source Code Pro", monospace'
    };
    return fonts[family] || fonts.serif;
  };

  const changeTheme = (theme) => {
    setCurrentTheme(theme);
    localStorage.setItem('readingApp_theme', theme);
    document.body.className = `theme-${theme}`;
  };

  const changeFontSize = (size) => {
    const newSize = Math.min(Math.max(size, 12), 24); // Clamp between 12-24px
    setFontSize(newSize);
    localStorage.setItem('readingApp_fontSize', newSize);
    document.body.style.fontSize = `${newSize}px`;
  };

  const changeFontFamily = (font) => {
    setFontFamily(font);
    localStorage.setItem('readingApp_fontFamily', font);
    document.body.style.fontFamily = getFontFamilyValue(font);
  };

  const themeValue = {
    currentTheme,
    changeTheme,
    fontSize,
    changeFontSize,
    fontFamily,
    changeFontFamily
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '1.2rem'
      }}>
        Loading Reading App...
      </div>
    );
  }

  return (
    <ThemeProvider value={themeValue}>
      <LibraryProvider>
        <Router>
          <GlobalStyles className={`theme-${currentTheme}`}>
            <AppContainer 
              className={`theme-${currentTheme}`} 
              fontSize={fontSize}
              fontFamily={getFontFamilyValue(fontFamily)}
            >
              <Header />
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/library" element={<LibraryPage />} />
                <Route path="/book/:source" element={<BookPage />} />
                <Route path="/reader/:source" element={<Reader />} />
              </Routes>
            </AppContainer>
          </GlobalStyles>
        </Router>
      </LibraryProvider>
    </ThemeProvider>
  );
}

export default App;