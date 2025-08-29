import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import axios from 'axios';
import { useTheme } from '../context/ThemeContext';
import { useLibrary } from '../context/LibraryContext';

const ReaderContainer = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
  min-height: 100vh;
  
  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const ReaderHeader = styled.div`
  background-color: var(--bg-secondary-light);
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
  border: 1px solid var(--border-light);
  position: sticky;
  top: 1rem;
  z-index: 50;
  backdrop-filter: blur(10px);
  
  .theme-dark & {
    background-color: var(--bg-secondary-dark);
    border-color: var(--border-dark);
  }
  
  .theme-sepia & {
    background-color: var(--bg-secondary-sepia);
    border-color: var(--border-sepia);
  }
  
  @media (max-width: 768px) {
    padding: 1.5rem;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    margin: 0;
    border-radius: 0;
    border-left: none;
    border-right: none;
    z-index: 100;
  }
`;

const BookInfo = styled.div`
  text-align: center;
  margin-bottom: 1.5rem;
`;

const BookTitle = styled.h1`
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
  color: var(--text-primary-light);
  
  .theme-dark & {
    color: var(--text-primary-dark);
  }
  
  .theme-sepia & {
    color: var(--text-primary-sepia);
  }
  
  @media (max-width: 768px) {
    font-size: 1.3rem;
  }
`;

const ChapterTitle = styled.h2`
  font-size: 1.2rem;
  color: var(--text-secondary-light);
  margin-bottom: 1rem;
  
  .theme-dark & {
    color: var(--text-secondary-dark);
  }
  
  .theme-sepia & {
    color: var(--text-secondary-sepia);
  }
  
  @media (max-width: 768px) {
    font-size: 1.1rem;
  }
`;

const NavigationControls = styled.div`
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 1rem;
  align-items: center;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
`;

const NavButton = styled.button`
  background-color: var(--accent-light);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-weight: 600;
  
  &:hover:not(:disabled) {
    background-color: var(--accent-dark);
    transform: translateY(-1px);
  }
  
  &:disabled {
    background-color: var(--text-secondary-light);
    cursor: not-allowed;
    transform: none;
  }
  
  .theme-dark & {
    background-color: var(--accent-dark);
    
    &:hover:not(:disabled) {
      background-color: var(--accent-light);
    }
  }
  
  .theme-sepia & {
    background-color: var(--accent-sepia);
    
    &:hover:not(:disabled) {
      background-color: var(--accent-light);
    }
  }
  
  @media (max-width: 768px) {
    padding: 0.75rem 1rem;
    font-size: 0.9rem;
  }
`;

const ChapterSelector = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  
  select {
    flex: 1;
    padding: 0.75rem;
    border: 1px solid var(--border-light);
    border-radius: 8px;
    background-color: var(--bg-primary-light);
    color: var(--text-primary-light);
    cursor: pointer;
    max-width: 300px;
    
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
  
  @media (max-width: 768px) {
    order: -1;
    
    select {
      max-width: 100%;
    }
  }
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 6px;
  background-color: var(--border-light);
  border-radius: 3px;
  overflow: hidden;
  margin: 1rem 0;
  
  .theme-dark & {
    background-color: var(--border-dark);
  }
  
  .theme-sepia & {
    background-color: var(--border-sepia);
  }
`;

const ProgressFill = styled.div`
  height: 100%;
  background-color: var(--accent-light);
  width: ${props => props.progress}%;
  transition: width 0.3s ease;
  
  .theme-dark & {
    background-color: var(--accent-dark);
  }
  
  .theme-sepia & {
    background-color: var(--accent-sepia);
  }
`;

const ReaderContent = styled.div`
  background-color: var(--bg-primary-light);
  border-radius: 16px;
  padding: 3rem;
  margin-bottom: 2rem;
  border: 1px solid var(--border-light);
  line-height: 1.8;
  font-size: ${props => props.fontSize}px;
  font-family: ${props => props.fontFamily};
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
  
  .theme-dark & {
    background-color: var(--bg-primary-dark);
    border-color: var(--border-dark);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  }
  
  .theme-sepia & {
    background-color: var(--bg-primary-sepia);
    border-color: var(--border-sepia);
    box-shadow: 0 4px 15px rgba(92, 75, 55, 0.05);
  }
  
  @media (max-width: 768px) {
    padding: 2rem;
    margin-top: 200px; /* Account for fixed header */
  }
  
  p {
    margin-bottom: 1.5rem;
    color: var(--text-primary-light);
    
    .theme-dark & {
      color: var(--text-primary-dark);
    }
    
    .theme-sepia & {
      color: var(--text-primary-sepia);
    }
  }
  
  /* Highlight selected text */
  ::selection {
    background-color: var(--accent-light);
    color: white;
    
    .theme-dark & {
      background-color: var(--accent-dark);
    }
    
    .theme-sepia & {
      background-color: var(--accent-sepia);
    }
  }
`;

const LoadingSpinner = styled.div`
  text-align: center;
  padding: 4rem;
  font-size: 1.2rem;
  color: var(--text-secondary-light);
  
  .spinner {
    display: inline-block;
    width: 24px;
    height: 24px;
    border: 3px solid var(--border-light);
    border-radius: 50%;
    border-top-color: var(--accent-light);
    animation: spin 1s ease-in-out infinite;
    margin-bottom: 1rem;
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  }
  
  .theme-dark & {
    color: var(--text-secondary-dark);
    
    .spinner {
      border-color: var(--border-dark);
      border-top-color: var(--accent-dark);
    }
  }
  
  .theme-sepia & {
    color: var(--text-secondary-sepia);
    
    .spinner {
      border-color: var(--border-sepia);
      border-top-color: var(--accent-sepia);
    }
  }
`;

const ErrorMessage = styled.div`
  text-align: center;
  padding: 2rem;
  color: #dc3545;
  font-size: 1.1rem;
  background-color: rgba(220, 53, 69, 0.1);
  border: 1px solid rgba(220, 53, 69, 0.3);
  border-radius: 8px;
  margin: 2rem 0;
`;

const BackButton = styled.button`
  background-color: var(--bg-primary-light);
  color: var(--text-primary-light);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &:hover {
    background-color: var(--accent-light);
    color: white;
    border-color: var(--accent-light);
  }
  
  .theme-dark & {
    background-color: var(--bg-primary-dark);
    color: var(--text-primary-dark);
    border-color: var(--border-dark);
    
    &:hover {
      background-color: var(--accent-dark);
      border-color: var(--accent-dark);
    }
  }
  
  .theme-sepia & {
    background-color: var(--bg-primary-sepia);
    color: var(--text-primary-sepia);
    border-color: var(--border-sepia);
    
    &:hover {
      background-color: var(--accent-sepia);
      border-color: var(--accent-sepia);
    }
  }
`;

const ReaderTools = styled.div`
  position: fixed;
  right: 2rem;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  z-index: 60;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const ToolButton = styled.button`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 1px solid var(--border-light);
  background-color: var(--bg-secondary-light);
  color: var(--text-primary-light);
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  
  &:hover {
    background-color: var(--accent-light);
    color: white;
    border-color: var(--accent-light);
    transform: scale(1.1);
  }
  
  .theme-dark & {
    border-color: var(--border-dark);
    background-color: var(--bg-secondary-dark);
    color: var(--text-primary-dark);
    
    &:hover {
      background-color: var(--accent-dark);
      border-color: var(--accent-dark);
    }
  }
  
  .theme-sepia & {
    border-color: var(--border-sepia);
    background-color: var(--bg-secondary-sepia);
    color: var(--text-primary-sepia);
    
    &:hover {
      background-color: var(--accent-sepia);
      border-color: var(--accent-sepia);
    }
  }
`;

const BookmarkTooltip = styled.div`
  position: absolute;
  right: 60px;
  top: 50%;
  transform: translateY(-50%);
  background-color: var(--bg-secondary-light);
  border: 1px solid var(--border-light);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  white-space: nowrap;
  font-size: 0.9rem;
  color: var(--text-primary-light);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  opacity: ${props => props.show ? 1 : 0};
  pointer-events: ${props => props.show ? 'auto' : 'none'};
  transition: opacity 0.3s ease;
  
  .theme-dark & {
    background-color: var(--bg-secondary-dark);
    border-color: var(--border-dark);
    color: var(--text-primary-dark);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  }
  
  .theme-sepia & {
    background-color: var(--bg-secondary-sepia);
    border-color: var(--border-sepia);
    color: var(--text-primary-sepia);
    box-shadow: 0 4px 15px rgba(92, 75, 55, 0.1);
  }
`;

const MobileNavigation = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: var(--bg-secondary-light);
  border-top: 1px solid var(--border-light);
  padding: 1rem;
  display: none;
  z-index: 100;
  
  @media (max-width: 768px) {
    display: flex;
    gap: 1rem;
    justify-content: space-between;
  }
  
  .theme-dark & {
    background-color: var(--bg-secondary-dark);
    border-top-color: var(--border-dark);
  }
  
  .theme-sepia & {
    background-color: var(--bg-secondary-sepia);
    border-top-color: var(--border-sepia);
  }
`;

const Reader = () => {
  const { source } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { fontSize, fontFamily } = useTheme();
  const { updateReadingProgress, addBookmark, getBookmarks } = useLibrary();
  
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [showBookmarkTooltip, setShowBookmarkTooltip] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  
  const book = location.state?.book;
  const chapter = location.state?.chapter;
  const bookUrl = location.state?.bookUrl;
  const chapters = location.state?.chapters || [];
  const contentRef = useRef(null);

  useEffect(() => {
    if (!chapter || !bookUrl) {
      setError('Chapter information not found');
      setLoading(false);
      return;
    }

    // Find current chapter index
    const index = chapters.findIndex(ch => ch.link === chapter.link);
    setCurrentChapterIndex(index >= 0 ? index : 0);
    
    // Update reading progress
    if (book && book.id) {
      updateReadingProgress(book.id, index >= 0 ? index : 0, chapters.length, chapter.title);
    }

    // Check if chapter is bookmarked
    if (book && book.id) {
      const bookmarks = getBookmarks(book.id);
      setIsBookmarked(bookmarks.some(b => b.chapterIndex === index));
    }

    fetchChapterContent();
  }, [chapter, bookUrl, source, chapters, book]);

  const fetchChapterContent = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await axios.get(`/api/chapter/${source}?url=${encodeURIComponent(chapter.link)}`);
      setContent(response.data.content);
      
      // Scroll to top when new content loads
      if (contentRef.current) {
        contentRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (err) {
      setError('Failed to load chapter content. Please try again.');
      console.error('Chapter content error:', err);
    } finally {
      setLoading(false);
    }
  };

  const goToChapter = (index) => {
    if (index >= 0 && index < chapters.length) {
      const newChapter = chapters[index];
      
      // Update reading progress when changing chapters
      if (book && book.id) {
        updateReadingProgress(book.id, index, chapters.length, newChapter.title);
      }
      
      navigate(`/reader/${source}`, {
        state: { book, chapter: newChapter, bookUrl, chapters }
      });
    }
  };

  const goToPreviousChapter = () => {
    if (currentChapterIndex > 0) {
      goToChapter(currentChapterIndex - 1);
    }
  };

  const goToNextChapter = () => {
    if (currentChapterIndex < chapters.length - 1) {
      goToChapter(currentChapterIndex + 1);
    }
  };

  const handleChapterSelect = (e) => {
    const index = parseInt(e.target.value);
    goToChapter(index);
  };

  const handleBackClick = () => {
    navigate(`/book/${source}`, { 
      state: { book, url: bookUrl } 
    });
  };

  const handleBookmark = () => {
    if (book && book.id) {
      if (isBookmarked) {
        // Remove bookmark logic would go here
        setShowBookmarkTooltip(false);
      } else {
        addBookmark(book.id, currentChapterIndex, chapter.title);
        setIsBookmarked(true);
        setShowBookmarkTooltip(true);
        setTimeout(() => setShowBookmarkTooltip(false), 2000);
      }
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  // Format content into paragraphs
  const formatContent = (text) => {
    if (!text) return '';
    
    return text
      .split('\n\n')
      .filter(paragraph => paragraph.trim())
      .map((paragraph, index) => (
        <p key={index}>{paragraph.trim()}</p>
      ));
  };

  const getFontFamilyValue = (family) => {
    const fonts = {
      'serif': 'Georgia, "Times New Roman", Times, serif',
      'sans-serif': '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", sans-serif',
      'monospace': '"SF Mono", "Monaco", "Inconsolata", "Roboto Mono", "Source Code Pro", monospace'
    };
    return fonts[family] || fonts.serif;
  };

  if (!book || !chapter) {
    return (
      <ReaderContainer>
        <ErrorMessage>Chapter information not found.</ErrorMessage>
      </ReaderContainer>
    );
  }

  const progress = chapters.length > 0 ? ((currentChapterIndex + 1) / chapters.length) * 100 : 0;

  return (
    <ReaderContainer ref={contentRef}>
      <BackButton onClick={handleBackClick}>
        ← Back to Book
      </BackButton>

      <ReaderHeader>
        <BookInfo>
          <BookTitle>{book.title}</BookTitle>
          <ChapterTitle>{chapter.title}</ChapterTitle>
        </BookInfo>

        <ProgressBar>
          <ProgressFill progress={progress} />
        </ProgressBar>

        <NavigationControls>
          <NavButton 
            onClick={goToPreviousChapter} 
            disabled={currentChapterIndex <= 0}
          >
            ← Previous
          </NavButton>

          <ChapterSelector>
            <select 
              value={currentChapterIndex}
              onChange={handleChapterSelect}
            >
              {chapters.map((ch, index) => (
                <option key={index} value={index}>
                  {ch.title}
                </option>
              ))}
            </select>
          </ChapterSelector>

          <NavButton 
            onClick={goToNextChapter} 
            disabled={currentChapterIndex >= chapters.length - 1}
          >
            Next →
          </NavButton>
        </NavigationControls>
      </ReaderHeader>

      <ReaderTools>
        <div style={{ position: 'relative' }}>
          <ToolButton onClick={handleBookmark} title="Bookmark Chapter">
            {isBookmarked ? '🔖' : '📑'}
          </ToolButton>
          <BookmarkTooltip show={showBookmarkTooltip}>
            Chapter bookmarked!
          </BookmarkTooltip>
        </div>
        <ToolButton onClick={scrollToTop} title="Scroll to Top">
          ⬆️
        </ToolButton>
        <ToolButton onClick={scrollToBottom} title="Scroll to Bottom">
          ⬇️
        </ToolButton>
      </ReaderTools>

      {loading ? (
        <LoadingSpinner>
          <div className="spinner"></div>
          Loading chapter content...
        </LoadingSpinner>
      ) : error ? (
        <ErrorMessage>{error}</ErrorMessage>
      ) : (
        <ReaderContent 
          fontSize={fontSize} 
          fontFamily={getFontFamilyValue(fontFamily)}
        >
          {formatContent(content)}
        </ReaderContent>
      )}

      <MobileNavigation>
        <NavButton 
          onClick={goToPreviousChapter} 
          disabled={currentChapterIndex <= 0}
          style={{ flex: 1 }}
        >
          ← Prev
        </NavButton>
        <NavButton onClick={handleBookmark} style={{ padding: '0.75rem' }}>
          {isBookmarked ? '🔖' : '📑'}
        </NavButton>
        <NavButton 
          onClick={goToNextChapter} 
          disabled={currentChapterIndex >= chapters.length - 1}
          style={{ flex: 1 }}
        >
          Next →
        </NavButton>
      </MobileNavigation>
    </ReaderContainer>
  );
};

export default Reader;