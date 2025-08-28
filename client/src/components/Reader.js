import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import axios from 'axios';
import { useTheme } from '../context/ThemeContext';
import { useLibrary } from '../context/LibraryContext';

const ReaderContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  min-height: 100vh;
`;

const ReaderHeader = styled.div`
  background-color: var(--bg-secondary-light);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  border: 1px solid var(--border-light);
  
  .theme-dark & {
    background-color: var(--bg-secondary-dark);
    border-color: var(--border-dark);
  }
  
  .theme-sepia & {
    background-color: var(--bg-secondary-sepia);
    border-color: var(--border-sepia);
  }
`;

const BookInfo = styled.div`
  text-align: center;
  margin-bottom: 1rem;
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
`;

const ChapterTitle = styled.h2`
  font-size: 1.2rem;
  color: var(--text-secondary-light);
  
  .theme-dark & {
    color: var(--text-secondary-dark);
  }
  
  .theme-sepia & {
    color: var(--text-secondary-sepia);
  }
`;

const NavigationControls = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
`;

const NavButton = styled.button`
  background-color: var(--accent-light);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &:hover:not(:disabled) {
    background-color: var(--accent-dark);
  }
  
  &:disabled {
    background-color: var(--text-secondary-light);
    cursor: not-allowed;
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
`;

const ChapterSelector = styled.select`
  padding: 0.75rem;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  background-color: var(--bg-primary-light);
  color: var(--text-primary-light);
  font-size: 1rem;
  cursor: pointer;
  
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
`;

const ContentContainer = styled.div`
  background-color: var(--bg-primary-light);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 3rem;
  line-height: 1.8;
  font-family: ${props => props.fontFamily};
  font-size: ${props => props.fontSize}px;
  color: var(--text-primary-light);
  min-height: 60vh;
  
  .theme-dark & {
    background-color: var(--bg-primary-dark);
    border-color: var(--border-dark);
    color: var(--text-primary-dark);
  }
  
  .theme-sepia & {
    background-color: var(--bg-primary-sepia);
    border-color: var(--border-sepia);
    color: var(--text-primary-sepia);
  }
  
  p {
    margin-bottom: 1.5rem;
    text-align: justify;
  }
  
  h1, h2, h3, h4, h5, h6 {
    margin: 2rem 0 1rem 0;
    color: var(--accent-light);
    
    .theme-dark & {
      color: var(--accent-dark);
    }
    
    .theme-sepia & {
      color: var(--accent-sepia);
    }
  }
`;

const LoadingSpinner = styled.div`
  text-align: center;
  padding: 4rem;
  font-size: 1.2rem;
  color: var(--text-secondary-light);
  
  .theme-dark & {
    color: var(--text-secondary-dark);
  }
  
  .theme-sepia & {
    color: var(--text-secondary-sepia);
  }
`;

const ErrorMessage = styled.div`
  text-align: center;
  padding: 2rem;
  color: #dc3545;
  font-size: 1.1rem;
`;

const BackButton = styled.button`
  background-color: var(--accent-light);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s ease;
  margin-bottom: 1rem;
  
  &:hover {
    background-color: var(--accent-dark);
  }
  
  .theme-dark & {
    background-color: var(--accent-dark);
    
    &:hover {
      background-color: var(--accent-light);
    }
  }
  
  .theme-sepia & {
    background-color: var(--accent-sepia);
    
    &:hover {
      background-color: var(--accent-light);
    }
  }
`;

const Reader = () => {
  const { source } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { fontSize, fontFamily } = useTheme();
  const { updateReadingProgress } = useLibrary();
  
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  
  const book = location.state?.book;
  const chapter = location.state?.chapter;
  const bookUrl = location.state?.bookUrl;
  const chapters = location.state?.chapters || [];

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
      updateReadingProgress(book.id, index >= 0 ? index : 0, chapters.length);
    }

    const fetchChapterContent = async () => {
      try {
        const response = await axios.get(`/api/chapter/${source}?url=${encodeURIComponent(chapter.link)}`);
        setContent(response.data.content);
      } catch (err) {
        setError('Failed to load chapter content. Please try again.');
        console.error('Chapter content error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchChapterContent();
  }, [chapter, bookUrl, source, chapters]);

  const goToChapter = (index) => {
    if (index >= 0 && index < chapters.length) {
      const newChapter = chapters[index];
      
      // Update reading progress when changing chapters
      if (book && book.id) {
        updateReadingProgress(book.id, index, chapters.length);
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

  if (!book || !chapter) {
    return (
      <ReaderContainer>
        <ErrorMessage>Chapter information not found. Please go back and try again.</ErrorMessage>
        <BackButton onClick={handleBackClick}>← Back to Book</BackButton>
      </ReaderContainer>
    );
  }

  return (
    <ReaderContainer>
      <BackButton onClick={handleBackClick}>← Back to Book</BackButton>
      
      <ReaderHeader>
        <BookInfo>
          <BookTitle>{book.title}</BookTitle>
          <ChapterTitle>{chapter.title}</ChapterTitle>
        </BookInfo>
        
        <NavigationControls>
          <NavButton 
            onClick={goToPreviousChapter}
            disabled={currentChapterIndex === 0}
          >
            ← Previous
          </NavButton>
          
          <ChapterSelector 
            value={currentChapterIndex}
            onChange={handleChapterSelect}
          >
            {chapters.map((ch, index) => (
              <option key={index} value={index}>
                {ch.title}
              </option>
            ))}
          </ChapterSelector>
          
          <NavButton 
            onClick={goToNextChapter}
            disabled={currentChapterIndex === chapters.length - 1}
          >
            Next →
          </NavButton>
        </NavigationControls>
      </ReaderHeader>

      {loading && (
        <LoadingSpinner>
          📖 Loading chapter content...
        </LoadingSpinner>
      )}

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {!loading && content && (
        <ContentContainer 
          fontSize={fontSize}
          fontFamily={fontFamily}
          dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br><br>') }}
        />
      )}
    </ReaderContainer>
  );
};

export default Reader;
