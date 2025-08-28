import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import styled from 'styled-components';
import Header from './components/Header';
import SearchPage from './components/SearchPage';
import BookPage from './components/BookPage';
import Reader from './components/Reader';
import LibraryPage from './components/LibraryPage';
import { ThemeProvider } from './context/ThemeContext';
import { LibraryProvider } from './context/LibraryContext';

const AppContainer = styled.div`
  min-height: 100vh;
  background-color: var(--bg-primary-light);
  color: var(--text-primary-light);
  transition: background-color 0.3s ease, color 0.3s ease;
  
  &.theme-dark {
    background-color: var(--bg-primary-dark);
    color: var(--text-primary-dark);
  }
  
  &.theme-sepia {
    background-color: var(--bg-primary-sepia);
    color: var(--text-primary-sepia);
  }
`;

function App() {
  const [currentTheme, setCurrentTheme] = useState('light');
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState('serif');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    const savedFontSize = localStorage.getItem('fontSize') || 16;
    const savedFontFamily = localStorage.getItem('fontFamily') || 'serif';
    
    setCurrentTheme(savedTheme);
    setFontSize(parseInt(savedFontSize));
    setFontFamily(savedFontFamily);
    
    document.body.className = `theme-${savedTheme}`;
  }, []);

  const changeTheme = (theme) => {
    setCurrentTheme(theme);
    localStorage.setItem('theme', theme);
    document.body.className = `theme-${theme}`;
  };

  const changeFontSize = (size) => {
    setFontSize(size);
    localStorage.setItem('fontSize', size);
  };

  const changeFontFamily = (font) => {
    setFontFamily(font);
    localStorage.setItem('fontFamily', font);
  };

  return (
    <ThemeProvider value={{ currentTheme, changeTheme, fontSize, changeFontSize, fontFamily, changeFontFamily }}>
      <LibraryProvider>
        <Router>
          <AppContainer className={`theme-${currentTheme}`}>
            <Header />
            <Routes>
              <Route path="/" element={<SearchPage />} />
              <Route path="/library" element={<LibraryPage />} />
              <Route path="/book/:source" element={<BookPage />} />
              <Route path="/reader/:source" element={<Reader />} />
            </Routes>
          </AppContainer>
        </Router>
      </LibraryProvider>
    </ThemeProvider>
  );
}

export default App;
