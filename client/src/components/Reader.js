import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import axios from 'axios';
import { useTheme } from '../context/ThemeContext';
import { useLibrary } from '../context/LibraryContext';

// Styled Components
const ReaderContainer = styled.div`
  min-height: 100vh;
  background-color: var(--bg-primary-light);
  color: var(--text-primary-light);
  transition: all 0.3s ease;
  
  .theme-dark & {
    background-color: var(--bg-primary-dark);
    color: var(--text-primary-dark);
  }
  
  .theme-sepia & {
    background-color: var(--bg-primary-sepia);
    color: var(--text-primary-sepia);
  }
`;

const ReaderHeader = styled.header`
  position: sticky;
  top: 0;
  background-color: var(--bg-secondary-light);
  border-bottom: 1px solid var(--border-light);
  padding: 1rem;
  z-index: 100;
  backdrop-filter: blur(10px);
  background-color: rgba(255, 255, 255, 0.95);
  
  .theme-dark & {
    background-color: rgba(30, 30, 30, 0.95);
    border-bottom-color: var(--border-dark);
  }
  
  .theme-sepia & {
    background-color: rgba(245, 235, 220, 0.95);
    border-bottom-color: var(--border-sepia);
  }
`;

const HeaderContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const NavigationGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Button = styled.button`
  background-color: var(--accent-light);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  white-space: nowrap;
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .theme-dark & {
    background-color: var(--accent-dark);
  }
  
  .theme-sepia & {
    background-color: var(--accent-sepia);
  }
`;

const IconButton = styled(Button)`
  padding: 0.5rem;
  background-color: transparent;
  color: var(--text-primary-light);
  border: 1px solid var(--border-light);
  
  &:hover:not(:disabled) {
    background-color: var(--bg-tertiary-light);
  }
  
  .theme-dark & {
    color: var(--text-primary-dark);
    border-color: var(--border-dark);
    
    &:hover:not(:disabled) {
      background-color: var(--bg-tertiary-dark);
    }
  }
  
  .theme-sepia & {
    color: var(--text-primary-sepia);
    border-color: var(--border-sepia);
    
    &:hover:not(:disabled) {
      background-color: var(--bg-tertiary-sepia);
    }
  }
`;

const ChapterSelector = styled.select`
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: 1px solid var(--border-light);
  background-color: var(--bg-primary-light);
  color: var(--text-primary-light);
  font-size: 0.9rem;
  cursor: pointer;
  max-width: 300px;
  
  .theme-dark & {
    background-color: var(--bg-primary-dark);
    color: var(--text-primary-dark);
    border-color: var(--border-dark);
  }
  
  .theme-sepia & {
    background-color: var(--bg-primary-sepia);
    color: var(--text-primary-sepia);
    border-color: var(--border-sepia);
  }
`;

const ContentArea = styled.main`
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem 1rem 4rem;
  min-height: calc(100vh - 200px);
`;

const ChapterTitle = styled.h1`
  font-size: 1.8rem;
  margin-bottom: 2rem;
  text-align: center;
  color: var(--text-primary-light);
  
  .theme-dark & {
    color: var(--text-primary-dark);
  }
  
  .theme-sepia & {
    color: var(--text-primary-sepia);
  }
`;

const ChapterContent = styled.div`
  font-size: ${props => props.fontSize || '1.1rem'};
  line-height: 1.8;
  font-family: ${props => props.fontFamily || 'Georgia, serif'};
  
  p {
    margin-bottom: 1.5rem;
    text-align: justify;
    text-indent: 2rem;
  }
  
  p:first-of-type {
    text-indent: 0;
  }
  
  p:first-of-type::first-letter {
    font-size: 3rem;
    font-weight: bold;
    float: left;
    line-height: 1;
    margin-right: 0.1rem;
    margin-top: -0.1rem;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 1rem;
`;

const LoadingSpinner = styled.div`
  width: 48px;
  height: 48px;
  border: 3px solid var(--border-light);
  border-top-color: var(--accent-light);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .theme-dark & {
    border-color: var(--border-dark);
    border-top-color: var(--accent-dark);
  }
  
  .theme-sepia & {
    border-color: var(--border-sepia);
    border-top-color: var(--accent-sepia);
  }
`;

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 1rem;
  color: #dc3545;
  text-align: center;
  padding: 2rem;
`;

const ProgressBar = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background-color: var(--border-light);
  z-index: 101;
  
  .theme-dark & {
    background-color: var(--border-dark);
  }
  
  .theme-sepia & {
    background-color: var(--border-sepia);
  }
`;

const ProgressFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, var(--accent-light), var(--accent-light-hover));
  width: ${props => props.progress}%;
  transition: width 0.3s ease;
  
  .theme-dark & {
    background: linear-gradient(90deg, var(--accent-dark), var(--accent-dark-hover));
  }
  
  .theme-sepia & {
    background: linear-gradient(90deg, var(--accent-sepia), var(--accent-sepia-hover));
  }
`;

const FloatingActions = styled.div`
  position: fixed;
  right: 2rem;
  bottom: 2rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  z-index: 99;
  
  @media (max-width: 768px) {
    right: 1rem;
    bottom: 5rem;
  }
`;

const FloatingButton = styled(IconButton)`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  background-color: var(--bg-secondary-light);
  
  .theme-dark & {
    background-color: var(--bg-secondary-dark);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }
  
  .theme-sepia & {
    background-color: var(--bg-secondary-sepia);
  }
`;

const Toast = styled.div`
  position: fixed;
  top: 80px;
  right: 20px;
  background-color: var(--bg-secondary-light);
  color: var(--text-primary-light);
  padding: 1rem 1.5rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  z-index: 1000;
  animation: slideIn 0.3s ease;
  
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  .theme-dark & {
    background-color: var(--bg-secondary-dark);
    color: var(--text-primary-dark);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
  
  .theme-sepia & {
    background-color: var(--bg-secondary-sepia);
    color: var(--text-primary-sepia);
  }
`;

const ChapterInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.9rem;
  color: var(--text-secondary-light);
  
  .theme-dark & {
    color: var(--text-secondary-dark);
  }
  
  .theme-sepia & {
    color: var(--text-secondary-sepia);
  }
`;

// Icon components (since lucide-react is not installed)
const ChevronLeft = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
);

const ChevronRight = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

const Home = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
  </svg>
);

const Bookmark = ({ fill }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="2">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
  </svg>
);

const ArrowUp = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="19" x2="12" y2="5"></line>
    <polyline points="5 12 12 5 19 12"></polyline>
  </svg>
);

const ArrowDown = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <polyline points="19 12 12 19 5 12"></polyline>
  </svg>
);

const AlertCircle = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg>
);

const Check = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

// Main Component
const Reader = () => {
  const { source } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { fontSize, fontFamily } = useTheme();
  const { updateReadingProgress, addBookmark, getBookmarks, removeBookmark } = useLibrary();
  
  // State
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [estimatedReadTime, setEstimatedReadTime] = useState(0);
  
  // Refs
  const contentRef = useRef(null);
  const toastTimeoutRef = useRef(null);
  const requestInProgress = useRef(false);
  const abortController = useRef(null);
  
  // Extract data from location state
  const book = location.state?.book;
  const chapter = location.state?.chapter;
  const bookUrl = location.state?.bookUrl;
  const chapters = location.state?.chapters || [];
  
  // Calculate reading progress
  const readingProgress = chapters.length > 0 
    ? Math.round(((currentChapterIndex + 1) / chapters.length) * 100)
    : 0;
  
  // Show toast notification
  const showToastNotification = useCallback((message) => {
    setToastMessage(message);
    setShowToast(true);
    
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    
    toastTimeoutRef.current = setTimeout(() => {
      setShowToast(false);
    }, 3000);
  }, []);
  
  // Cleanup effect to abort pending requests
  useEffect(() => {
    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, []);

  // Fetch chapter content
  const fetchChapterContent = useCallback(async (retryCount = 0) => {
    // Prevent multiple concurrent requests
    if (requestInProgress.current) {
      console.log('Chapter request already in progress, skipping...');
      return;
    }
    
    try {
      requestInProgress.current = true;
      setLoading(true);
      setError('');
      
      // Create abort controller for this request
      abortController.current = new AbortController();
      
      // Add cache-busting parameter
      const cacheBuster = `&_t=${Date.now()}`;
      const response = await axios.get(`http://localhost:5000/api/chapter/${source}?url=${encodeURIComponent(chapter.link)}${cacheBuster}`, {
        timeout: 15000, // 15 second timeout (reduced from 30s)
        signal: abortController.current.signal,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (response.data.content) {
        setContent(response.data.content);
        setWordCount(response.data.wordCount || 0);
        
        // Calculate estimated read time (200 words per minute)
        const readTime = Math.ceil((response.data.wordCount || 0) / 200);
        setEstimatedReadTime(readTime);
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        throw new Error('No content received');
      }
    } catch (err) {
      // Don't handle errors if request was aborted
      if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
        console.log('Chapter request was aborted');
        return;
      }
      
      console.error('Chapter fetch error:', err);
      
      // Retry logic for 500 errors
      if (err.response?.status === 500 && retryCount < 2) {
        console.log(`Retrying chapter request (attempt ${retryCount + 1}/3)...`);
        setTimeout(() => {
          requestInProgress.current = false; // Reset flag before retry
          fetchChapterContent(retryCount + 1);
        }, 2000 * (retryCount + 1)); // Exponential backoff: 2s, 4s
        return;
      }
      
      // Check if it's a rate limiting error
      if (err.response?.data?.details?.includes('Failed to fetch') && err.response?.data?.details?.includes('after 3 attempts')) {
        setError('The website is temporarily blocking requests. Please try again in a few minutes.');
      } else {
        setError(err.response?.data?.message || 'Failed to load chapter content. Please try again.');
      }
    } finally {
      setLoading(false);
      requestInProgress.current = false;
      abortController.current = null;
    }
  }, [chapter?.link, source]);
  
  // Initialize chapter
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
    
    // Check bookmark status
    if (book && book.id) {
      const bookmarks = getBookmarks(book.id);
      setIsBookmarked(bookmarks.some(b => b.chapterIndex === index));
    }
    
    fetchChapterContent();
  }, [chapter?.link, bookUrl, source]); // Only depend on the actual values that should trigger re-fetch
  
  // Navigate to chapter
  const goToChapter = useCallback((index) => {
    if (index >= 0 && index < chapters.length) {
      const newChapter = chapters[index];
      
      // Update reading progress
      if (book && book.id) {
        updateReadingProgress(book.id, index, chapters.length, newChapter.title);
      }
      
      // Navigate with state
      navigate(`/reader/${source}`, {
        state: { book, chapter: newChapter, bookUrl, chapters }
      });
    }
  }, [chapters, book, updateReadingProgress, navigate, source, bookUrl]);
  
  // Navigation handlers
  const goToPreviousChapter = useCallback(() => {
    if (currentChapterIndex > 0) {
      goToChapter(currentChapterIndex - 1);
    } else {
      showToastNotification('This is the first chapter');
    }
  }, [currentChapterIndex, goToChapter, showToastNotification]);
  
  const goToNextChapter = useCallback(() => {
    if (currentChapterIndex < chapters.length - 1) {
      goToChapter(currentChapterIndex + 1);
    } else {
      showToastNotification('This is the last chapter');
    }
  }, [currentChapterIndex, chapters.length, goToChapter, showToastNotification]);
  
  const handleChapterSelect = (e) => {
    const index = parseInt(e.target.value);
    goToChapter(index);
  };
  
  // Bookmark handler
  const handleBookmark = useCallback(() => {
    if (book && book.id) {
      if (isBookmarked) {
        removeBookmark(book.id, currentChapterIndex);
        setIsBookmarked(false);
        showToastNotification('Bookmark removed');
      } else {
        addBookmark(book.id, currentChapterIndex, chapter.title);
        setIsBookmarked(true);
        showToastNotification('Chapter bookmarked');
      }
    }
  }, [book, isBookmarked, currentChapterIndex, chapter, removeBookmark, addBookmark, showToastNotification]);
  
  // Navigation handlers
  const handleBackToBook = useCallback(() => {
    navigate(`/book/${source}`, { 
      state: { book, url: bookUrl } 
    });
  }, [navigate, source, book, bookUrl]);
  
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const scrollToBottom = () => {
    window.scrollTo({ 
      top: document.documentElement.scrollHeight, 
      behavior: 'smooth' 
    });
  };
  
  // Format content into paragraphs
  const formatContent = (text) => {
    if (!text) return null;
    
    // Split by double newlines or single newlines
    const paragraphs = text.split(/\n\n|\n/)
      .filter(para => para.trim())
      .map((paragraph, index) => (
        <p key={index}>{paragraph.trim()}</p>
      ));
    
    return paragraphs;
  };
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Don't trigger if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      switch(e.key) {
        case 'ArrowLeft':
          goToPreviousChapter();
          break;
        case 'ArrowRight':
          goToNextChapter();
          break;
        case 'b':
        case 'B':
          handleBookmark();
          break;
        case 'Escape':
          handleBackToBook();
          break;
        default:
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [goToPreviousChapter, goToNextChapter, handleBookmark, handleBackToBook]);
  
  // Clean up toast timeout on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);
  
  // Get font settings
  const getFontFamily = () => {
    const fonts = {
      'serif': 'Georgia, "Times New Roman", Times, serif',
      'sans-serif': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      'monospace': '"Courier New", Courier, monospace'
    };
    return fonts[fontFamily] || fonts.serif;
  };
  
  // Render error state
  if (!book || !chapter) {
    return (
      <ReaderContainer>
        <ErrorContainer>
          <AlertCircle />
          <h2>Chapter Not Found</h2>
          <p>Unable to load chapter information.</p>
          <Button onClick={() => navigate('/')}>
            <Home />
            Return Home
          </Button>
        </ErrorContainer>
      </ReaderContainer>
    );
  }
  
  return (
    <ReaderContainer>
      {/* Progress bar */}
      <ProgressBar>
        <ProgressFill progress={readingProgress} />
      </ProgressBar>
      
      {/* Header */}
      <ReaderHeader>
        <HeaderContent>
          <NavigationGroup>
            <IconButton onClick={handleBackToBook} title="Back to book">
              <Home />
            </IconButton>
            <Button 
              onClick={goToPreviousChapter} 
              disabled={currentChapterIndex === 0}
              title="Previous chapter (←)"
            >
              <ChevronLeft />
              Previous
            </Button>
            <Button 
              onClick={goToNextChapter} 
              disabled={currentChapterIndex === chapters.length - 1}
              title="Next chapter (→)"
            >
              Next
              <ChevronRight />
            </Button>
          </NavigationGroup>
          
          <ChapterSelector 
            value={currentChapterIndex} 
            onChange={handleChapterSelect}
            title="Jump to chapter"
          >
            {chapters.map((ch, index) => (
              <option key={index} value={index}>
                {ch.title}
              </option>
            ))}
          </ChapterSelector>
          
          <ChapterInfo>
            <span>Chapter {currentChapterIndex + 1} of {chapters.length}</span>
            {wordCount > 0 && (
              <>
                <span>•</span>
                <span>{wordCount.toLocaleString()} words</span>
                <span>•</span>
                <span>~{estimatedReadTime} min read</span>
              </>
            )}
          </ChapterInfo>
        </HeaderContent>
      </ReaderHeader>
      
      {/* Content */}
      <ContentArea ref={contentRef}>
        {loading ? (
          <LoadingContainer>
            <LoadingSpinner />
            <p>Loading chapter...</p>
          </LoadingContainer>
        ) : error ? (
          <ErrorContainer>
            <AlertCircle />
            <h2>Error Loading Chapter</h2>
            <p>{error}</p>
            <Button onClick={fetchChapterContent}>
              Try Again
            </Button>
          </ErrorContainer>
        ) : (
          <>
            <ChapterTitle>{chapter.title}</ChapterTitle>
            <ChapterContent 
              fontSize={fontSize} 
              fontFamily={getFontFamily()}
            >
              {formatContent(content)}
            </ChapterContent>
          </>
        )}
      </ContentArea>
      
      {/* Floating action buttons */}
      <FloatingActions>
        <FloatingButton 
          onClick={handleBookmark} 
          title={isBookmarked ? 'Remove bookmark (B)' : 'Add bookmark (B)'}
        >
          <Bookmark fill={isBookmarked ? 'currentColor' : 'none'} />
        </FloatingButton>
        <FloatingButton onClick={scrollToTop} title="Scroll to top">
          <ArrowUp />
        </FloatingButton>
        <FloatingButton onClick={scrollToBottom} title="Scroll to bottom">
          <ArrowDown />
        </FloatingButton>
      </FloatingActions>
      
      {/* Toast notification */}
      {showToast && (
        <Toast>
          <Check />
          {toastMessage}
        </Toast>
      )}
    </ReaderContainer>
  );
};

export default Reader;