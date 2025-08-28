import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { useTheme } from '../context/ThemeContext';

const HeaderContainer = styled.header`
  background-color: var(--bg-secondary-light);
  border-bottom: 1px solid var(--border-light);
  padding: 1rem 2rem;
  position: sticky;
  top: 0;
  z-index: 100;
  transition: all 0.3s ease;
  
  .theme-dark & {
    background-color: var(--bg-secondary-dark);
    border-bottom-color: var(--border-dark);
  }
  
  .theme-sepia & {
    background-color: var(--bg-secondary-sepia);
    border-bottom-color: var(--border-sepia);
  }
`;

const Nav = styled.nav`
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
`;

const Logo = styled(Link)`
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--accent-light);
  text-decoration: none;
  transition: color 0.3s ease;
  
  &:hover {
    color: var(--accent-dark);
  }
  
  .theme-dark & {
    color: var(--accent-dark);
  }
  
  .theme-sepia & {
    color: var(--accent-sepia);
  }
`;

const NavLinks = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
`;

const NavLink = styled(Link)`
  color: var(--text-primary-light);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.3s ease;
  
  &:hover {
    color: var(--accent-light);
  }
  
  .theme-dark & {
    color: var(--text-primary-dark);
    
    &:hover {
      color: var(--accent-dark);
    }
  }
  
  .theme-sepia & {
    color: var(--text-primary-sepia);
    
    &:hover {
      color: var(--accent-sepia);
    }
  }
`;

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const ThemeButton = styled.button`
  background: none;
  border: 1px solid var(--border-light);
  border-radius: 4px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  color: var(--text-primary-light);
  
  &:hover {
    background-color: var(--accent-light);
    color: white;
    border-color: var(--accent-light);
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
`;

const SettingsButton = styled.button`
  background: none;
  border: 1px solid var(--border-light);
  border-radius: 4px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  color: var(--text-primary-light);
  
  &:hover {
    background-color: var(--accent-light);
    color: white;
    border-color: var(--accent-light);
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
`;

const SettingsPanel = styled.div`
  position: absolute;
  top: 100%;
  right: 2rem;
  background-color: var(--bg-secondary-light);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  min-width: 250px;
  z-index: 1000;
  
  .theme-dark & {
    background-color: var(--bg-secondary-dark);
    border-color: var(--border-dark);
  }
  
  .theme-sepia & {
    background-color: var(--bg-secondary-sepia);
    border-color: var(--border-sepia);
  }
`;

const SettingGroup = styled.div`
  margin-bottom: 1rem;
  
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }
  
  select, input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid var(--border-light);
    border-radius: 4px;
    background-color: var(--bg-primary-light);
    color: var(--text-primary-light);
    
    .theme-dark & {
      border-color: var(--border-dark);
      background-color: var(--bg-primary-dark);
      color: var(--text-primary-dark);
    }
    
    .theme-sepia & {
      border-color: var(--border-sepia);
      background-color: var(--bg-primary-sepia);
      color: var(--text-primary-sepia);
    }
  }
`;

const Header = () => {
  const { currentTheme, changeTheme, fontSize, changeFontSize, fontFamily, changeFontFamily } = useTheme();
  const [showSettings, setShowSettings] = useState(false);
  const location = useLocation();

  const themes = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'sepia', label: 'Sepia' }
  ];

  const fonts = [
    { value: 'serif', label: 'Serif' },
    { value: 'sans-serif', label: 'Sans Serif' },
    { value: 'monospace', label: 'Monospace' }
  ];

  return (
    <HeaderContainer>
      <Nav>
        <Logo to="/">📚 Reading App</Logo>
        <NavLinks>
          <NavLink to="/">Search</NavLink>
          <NavLink to="/library">My Library</NavLink>
        </NavLinks>
        <Controls>
          <ThemeButton onClick={() => setShowSettings(!showSettings)}>
            ⚙️ Settings
          </ThemeButton>
          {showSettings && (
            <SettingsPanel>
              <SettingGroup>
                <label>Theme:</label>
                <select 
                  value={currentTheme} 
                  onChange={(e) => changeTheme(e.target.value)}
                >
                  {themes.map(theme => (
                    <option key={theme.value} value={theme.value}>
                      {theme.label}
                    </option>
                  ))}
                </select>
              </SettingGroup>
              
              <SettingGroup>
                <label>Font Size: {fontSize}px</label>
                <input
                  type="range"
                  min="12"
                  max="24"
                  value={fontSize}
                  onChange={(e) => changeFontSize(parseInt(e.target.value))}
                />
              </SettingGroup>
              
              <SettingGroup>
                <label>Font Family:</label>
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
        </Controls>
      </Nav>
    </HeaderContainer>
  );
};

export default Header;
