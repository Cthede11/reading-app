import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useTheme } from '../context/ThemeContext';
import { useLibrary } from '../context/LibraryContext';

const HeaderContainer = styled.header`
  background-color: var(--bg-secondary-light);
  border-bottom: 1px solid var(--border-light);
  padding: 1rem 2rem;
  position: sticky;
  top: 0;
  z-index: 100;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  
  .theme-dark & {
    background-color: var(--bg-secondary-dark);
    border-bottom-color: var(--border-dark);
  }
  
  .theme-sepia & {
    background-color: var(--bg-secondary-sepia);
    border-bottom-color: var(--border-sepia);
  }

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const Nav = styled.nav`
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1400px;
  margin: 0 auto;
  gap: 2rem;

  @media (max-width: 768px) {
    flex-wrap: wrap;
    gap: 1rem;
  }
`;

const LogoSection = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const Logo = styled(Link)`
  font-size: 1.8rem;
  font-weight: bold;
  color: var(--accent-light);
  text-decoration: none;
  transition: color 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &:hover {
    color: var(--accent-dark);
  }
  
  .theme-dark & {
    color: var(--accent-dark);
    
    &:hover {
      color: var(--accent-light);
    }
  }
  
  .theme-sepia & {
    color: var(--accent-sepia);
    
    &:hover {
      color: var(--accent-light);
    }
  }

  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const QuickSearch = styled.div`
  position: relative;
  flex: 1;
  max-width: 400px;
  
  @media (max-width: 768px) {
    max-width: 100%;
    order: 3;
    flex-basis: 100%;
  }
`;

const QuickSearchInput = styled.input`
  width: 100%;
  padding: 0.75rem 1rem;
  padding-right: 3rem;
  border: 2px solid var(--border-light);
  border-radius: 8px;
  background-color: var(--bg-primary-light);
  color: var(--text-primary-light);
  font-size: 0.9rem;
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: var(--accent-light);
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
  }
  
  &::placeholder {
    color: var(--text-secondary-light);
  }
  
  .theme-dark & {
    border-color: var(--border-dark);
    background-color: var(--bg-primary-dark);
    color: var(--text-primary-dark);
    
    &:focus {
      border-color: var(--accent-dark);
      box-shadow: 0 0 0 3px rgba(77, 171, 247, 0.1);
    }
    
    &::placeholder {
      color: var(--text-secondary-dark);
    }
  }
  
  .theme-sepia & {
    border-color: var(--border-sepia);
    background-color: var(--bg-primary-sepia);
    color: var(--text-primary-sepia);
    
    &:focus {
      border-color: var(--accent-sepia);
      box-shadow: 0 0 0 3px rgba(210, 105, 30, 0.1);
    }
    
    &::placeholder {
      color: var(--text-secondary-sepia);
    }
  }
`;

const QuickSearchButton = styled.button`
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--text-secondary-light);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.3s ease;
  
  &:hover {
    color: var(--accent-light);
    background-color: var(--bg-secondary-light);
  }
  
  .theme-dark & {
    color: var(--text-secondary-dark);
    
    &:hover {
      color: var(--accent-dark);
      background-color: var(--bg-secondary-dark);
    }
  }
  
  .theme-sepia & {
    color: var(--text-secondary-sepia);
    
    &:hover {
      color: var(--accent-sepia);
      background-color: var(--bg-secondary-sepia);
    }
  }
`;

const NavLinks = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;

  @media (max-width: 768px) {
    gap: 1rem;
  }
`;

const NavLink = styled(Link)`
  color: var(--text-primary-light);
  text-decoration: none;
  font-weight: 500;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  transition: all 0.3s ease;
  position: relative;
  
  &:hover, &.active {
    color: var(--accent-light);
    background-color: var(--bg-primary-light);
  }
  
  .theme-dark & {
    color: var(--text-primary-dark);
    
    &:hover, &.active {
      color: var(--accent-dark);
      background-color: var(--bg-primary-dark);
    }
  }
  
  .theme-sepia & {
    color: var(--text-primary-sepia);
    
    &:hover, &.active {
      color: var(--accent-sepia);
      background-color: var(--bg-primary-sepia);
    }
  }

  @media (max-width: 768px) {
    padding: 0.5rem 0.75rem;
    font-size: 0.9rem;
  }
`;

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  position: relative;

  @media (max-width: 768px) {
    gap: 0.5rem;
  }
`;

const ReadingStats = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--text-secondary-light);
  
  .theme-dark & {
    color: var(--text-secondary-dark);
  }
  
  .theme-sepia & {
    color: var(--text-secondary-sepia);
  }

  @media (max-width: 768px) {
    display: none;
  }
`;

const ControlButton = styled.button`
  background: none;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  padding: 0.75rem;
  cursor: pointer;
  transition: all 0.3s ease;
  color: var(--text-primary-light);
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &:hover {
    background-color: var(--accent-light);
    color: white;
    border-color: var(--accent-light);
    transform: translateY(-1px);
  }
  
  .theme-dark & {
    border-color: var(--border-dark);
    color: var(--text-primary-dark);
    
    &:hover {
      background-color: var(--accent-dark);
      border-color: var(--accent-dark);
    }
  }
  
  .theme-sepia & {
    border-color: var(--border-sepia);
    color: var(--text-primary-sepia);
    
    &:hover {
      background-color: var(--accent-sepia);
      border-color: var(--accent-sepia);
    }
  }

  @media (max-width: 768px) {
    padding: 0.5rem;
    font-size: 1rem;
    
    span {
      display: none;
    }
  }
`;

const SettingsPanel = styled.div`
  position: absolute;
  top: 100%;
  right: 0;
  background-color: var(--bg-secondary-light);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  min-width: 280px;
  z-index: 1000;
  backdrop-filter: blur(10px);
  
  .theme-dark & {
    background-color: var(--bg-secondary-dark);
    border-color: var(--border-dark);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
  }
  
  .theme-sepia & {
    background-color: var(--bg-secondary-sepia);
    border-color: var(--border-sepia);
    box-shadow: 0 8px 25px rgba(92, 75, 55, 0.15);
  }
`;

const SettingGroup = styled.div`
  margin-bottom: 1.5rem;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  label {
    display: block;
    margin-bottom: 0.75rem;
    font-weight: 600;
    color: var(--text-primary-light);
    
    .theme-dark & {
      color: var(--text-primary-dark);
    }
    
    .theme-sepia & {
      color: var(--text-primary-sepia);
    }
  }
  
  select, input[type="range"] {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--border-light);
    border-radius: 6px;
    background-color: var(--bg-primary-light);
    color: var(--text-primary-light);
    font-size: 0.9rem;
    transition: all 0.3s ease;
    
    &:focus {
      outline: none;
      border-color: var(--accent-light);
    }
    
    .theme-dark & {
      border-color: var(--border-dark);
      background-color: var(--bg-primary-dark);
      color: var(--text-primary-dark);
      
      &:focus {
        border-color: var(--accent-dark);
      }
    }
    
    .theme-sepia & {
      border-color: var(--border-sepia);
      background-color: var(--bg-primary-sepia);
      color: var(--text-primary-sepia);
      
      &:focus {
        border-color: var(--accent-sepia);
      }
    }
  }
`;

const FontSizeDisplay = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  
  span {
    font-size: 0.9rem;
    color: var(--text-secondary-light);
    
    .theme-dark & {
      color: var(--text-secondary-dark);
    }
    
    .theme-sepia & {
      color: var(--text-secondary-sepia);
    }
  }
`;

const ThemeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
`;

const ThemeOption = styled.button`
  padding: 0.75rem;
  border: 2px solid ${props => props.isActive ? 'var(--accent-light)' : 'var(--border-light)'};
  border-radius: 8px;
  background-color: var(--bg-primary-light);
  color: var(--text-primary-light);
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.8rem;
  font-weight: 500;
  
  &:hover {
    border-color: var(--accent-light);
  }
  
  .theme-dark & {
    border-color: ${props => props.isActive ? 'var(--accent-dark)' : 'var(--border-dark)'};
    background-color: var(--bg-primary-dark);
    color: var(--text-primary-dark);
    
    &:hover {
      border-color: var(--accent-dark);
    }
  }
  
  .theme-sepia & {
    border-color: ${props => props.isActive ? 'var(--accent-sepia)' : 'var(--border-sepia)'};
    background-color: var(--bg-primary-sepia);
    color: var(--text-primary-sepia);
    
    &:hover {
      border-color: var(--accent-sepia);
    }
  }
`;

const Header = () => {
  const { currentTheme, changeTheme, fontSize, changeFontSize, fontFamily, changeFontFamily } = useTheme();
  const { savedBooks, readingProgress, getReadingStats } = useLibrary();
  const [showSettings, setShowSettings] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const settingsRef = useRef(null);

  const stats = getReadingStats();

  const themes = [
    { value: 'light', label: '☀️ Light', emoji: '☀️' },
    { value: 'dark', label: '🌙 Dark', emoji: '🌙' },
    { value: 'sepia', label: '📜 Sepia', emoji: '📜' }
  ];

  const fonts = [
    { value: 'serif', label: 'Serif' },
    { value: 'sans-serif', label: 'Sans Serif' },
    { value: 'monospace', label: 'Monospace' }
  ];

  // Close settings panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setShowSettings(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleQuickSearch = (e) => {
    e.preventDefault();
    if (quickSearch.trim()) {
      navigate(`/search?q=${encodeURIComponent(quickSearch.trim())}`);
      setQuickSearch('');
    }
  };

  const isActiveRoute = (path) => {
    return location.pathname === path;
  };

  return (
    <HeaderContainer>
      <Nav>
        <LogoSection>
          <Logo to="/">
            📚 <span>ReadingApp</span>
          </Logo>
        </LogoSection>

        <QuickSearch>
          <form onSubmit={handleQuickSearch}>
            <QuickSearchInput
              type="text"
              placeholder="Quick search books..."
              value={quickSearch}
              onChange={(e) => setQuickSearch(e.target.value)}
            />
            <QuickSearchButton type="submit">
              🔍
            </QuickSearchButton>
          </form>
        </QuickSearch>

        <NavLinks>
          <NavLink to="/" className={isActiveRoute('/') ? 'active' : ''}>
            🏠 <span>Dashboard</span>
          </NavLink>
          <NavLink to="/search" className={isActiveRoute('/search') ? 'active' : ''}>
            🔍 <span>Search</span>
          </NavLink>
          <NavLink to="/library" className={isActiveRoute('/library') ? 'active' : ''}>
            📚 <span>Library</span>
          </NavLink>
        </NavLinks>

        <Controls>
          <ReadingStats>
            📖 {stats.currentlyReading} reading
          </ReadingStats>
          
          <div style={{ position: 'relative' }} ref={settingsRef}>
            <ControlButton onClick={() => setShowSettings(!showSettings)}>
              ⚙️ <span>Settings</span>
            </ControlButton>
            
            {showSettings && (
              <SettingsPanel>
                <SettingGroup>
                  <label>Theme</label>
                  <ThemeGrid>
                    {themes.map(theme => (
                      <ThemeOption
                        key={theme.value}
                        isActive={currentTheme === theme.value}
                        onClick={() => changeTheme(theme.value)}
                      >
                        {theme.emoji}<br/>{theme.label.replace(theme.emoji + ' ', '')}
                      </ThemeOption>
                    ))}
                  </ThemeGrid>
                </SettingGroup>
                
                <SettingGroup>
                  <FontSizeDisplay>
                    <label>Font Size</label>
                    <span>{fontSize}px</span>
                  </FontSizeDisplay>
                  <input
                    type="range"
                    min="12"
                    max="24"
                    value={fontSize}
                    onChange={(e) => changeFontSize(parseInt(e.target.value))}
                  />
                </SettingGroup>
                
                <SettingGroup>
                  <label>Font Family</label>
                  <select 
                    value={fontFamily} 
                    onChange={(e) => changeFontFamily(e.target.value)}
                  >
                    {fonts.map(font => (
                      <option key={font.value} value={font.value}>
                        {font.label}
                      </option>
                    ))}
                  </select>
                </SettingGroup>
              </SettingsPanel>
            )}
          </div>
        </Controls>
      </Nav>
    </HeaderContainer>
  );
};

export default Header;