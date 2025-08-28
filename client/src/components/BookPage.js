import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import axios from 'axios';
import { useLibrary } from '../context/LibraryContext';

const BookContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const BookHeader = styled.div`
  background-color: var(--bg-secondary-light);
  border-radius: 12px;
  padding: 2rem;
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

const BookTitle = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 1rem;
  color: var(--text-primary-light);
  
  .theme-dark & {
    color: var(--text-primary-dark);
  }
  
  .theme-sepia & {
    color: var(--text-primary-sepia);
  }
`;

const BookAuthor = styled.p`
  font-size: 1.2rem;
  color: var(--text-secondary-light);
  margin-bottom: 1rem;
  
  .theme-dark & {
    color: var(--text-secondary-dark);
  }
  
  .theme-sepia & {
    color: var(--text-secondary-sepia);
  }
`;

const BookSource = styled.span`
  display: inline-block;
  background-color: var(--accent-light);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
  text-transform: uppercase;
  
  .theme-dark & {
    background-color: var(--accent-dark);
  }
  
  .theme-sepia & {
    background-color: var(--accent-sepia);
  }
`;

const ChaptersContainer = styled.div`
  background-color: var(--bg-secondary-light);
  border-radius: 12px;
  padding: 2rem;
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

const ChaptersTitle = styled.h2`
  font-size: 1.8rem;
  margin-bottom: 1.5rem;
  color: var(--text-primary-light);
  
  .theme-dark & {
    color: var(--text-primary-dark);
  }
  
  .theme-sepia & {
    color: var(--text-primary-sepia);
  }
`;

const ChapterList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
`;

const ChapterItem = styled.div`
  background-color: var(--bg-primary-light);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background-color: var(--accent-light);
    color: white;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  .theme-dark & {
    background-color: var(--bg-primary-dark);
    border-color: var(--border-dark);
    
    &:hover {
      background-color: var(--accent-dark);
    }
  }
  
  .theme-sepia & {
    background-color: var(--bg-primary-sepia);
    border-color: var(--border-sepia);
    
    &:hover {
      background-color: var(--accent-sepia);
    }
  }
`;

const ChapterTitle = styled.h3`
  font-size: 1rem;
  margin: 0;
`;

const LoadingSpinner = styled.div`
  text-align: center;
  padding: 2rem;
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

const BookActions = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const ActionButton = styled.button`
  padding: 0.75rem 1.5rem;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  background: none;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 1rem;
  
  &:hover {
    background-color: var(--accent-light);
    color: white;
    border-color: var(--accent-light);
  }
  
  .theme-dark & {
    border-color: var(--border-dark);
    
    &:hover {
      background-color: var(--accent-dark);
      border-color: var(--accent-dark);
    }
  }
  
  .theme-sepia & {
    border-color: var(--border-sepia);
    
    &:hover {
      background-color: var(--accent-sepia);
      border-color: var(--accent-sepia);
    }
  }
`;

const LibraryButton = styled.button`
  padding: 0.75rem 1.5rem;
  border: 1px solid var(--accent-light);
  border-radius: 8px;
  background-color: var(--accent-light);
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 1rem;
  
  &:hover {
    background-color: var(--accent-dark);
    border-color: var(--accent-dark);
  }
  
  .theme-dark & {
    border-color: var(--accent-dark);
    background-color: var(--accent-dark);
    
    &:hover {
      background-color: var(--accent-light);
      border-color: var(--accent-light);
    }
  }
  
  .theme-sepia & {
    border-color: var(--accent-sepia);
    background-color: var(--accent-sepia);
    
    &:hover {
      background-color: var(--accent-light);
      border-color: var(--accent-light);
    }
  }
`;

const ProgressInfo = styled.div`
  background-color: var(--bg-primary-light);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  
  .theme-dark & {
    background-color: var(--bg-primary-dark);
    border-color: var(--border-dark);
  }
  
  .theme-sepia & {
    background-color: var(--bg-primary-sepia);
    border-color: var(--border-sepia);
  }
`;

const ProgressText = styled.p`
  margin: 0;
  color: var(--text-secondary-light);
  
  .theme-dark & {
    color: var(--text-secondary-dark);
  }
  
  .theme-sepia & {
    color: var(--text-secondary-sepia);
  }
`;

const BookPage = () => {
  const { source } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const book = location.state?.book;
  const bookUrl = location.state?.url;
  
  const { addBookToLibrary, isBookInLibrary, getBookProgress } = useLibrary();
  const isInLibrary = book ? isBookInLibrary(book) : null;
  const progress = book ? getBookProgress(book.id || `${source}-${bookUrl}`) : null;

  useEffect(() => {
    if (!bookUrl) {
      setError('No book URL provided');
      setLoading(false);
      return;
    }

    const fetchChapters = async () => {
      try {
        const response = await axios.get(`/api/book/${source}?url=${encodeURIComponent(bookUrl)}`);
        setChapters(response.data.chapters);
      } catch (err) {
        setError('Failed to load chapters. Please try again.');
        console.error('Chapters error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchChapters();
  }, [source, bookUrl]);

  const handleChapterClick = (chapter) => {
    navigate(`/reader/${source}`, {
      state: { 
        book, 
        chapter, 
        bookUrl,
        chapters 
      }
    });
  };

  const handleBackClick = () => {
    navigate('/');
  };

  const handleAddToLibrary = () => {
    if (book) {
      const success = addBookToLibrary(book);
      if (success) {
        // You could add a toast notification here
        console.log('Book added to library!');
      }
    }
  };

  if (!book) {
    return (
      <BookContainer>
        <ErrorMessage>Book information not found. Please search again.</ErrorMessage>
        <BackButton onClick={handleBackClick}>← Back to Search</BackButton>
      </BookContainer>
    );
  }

  return (
    <BookContainer>
      <BookHeader>
        <BookTitle>{book.title}</BookTitle>
        {book.author && <BookAuthor>by {book.author}</BookAuthor>}
        <BookSource>{source}</BookSource>
      </BookHeader>

      <BookActions>
        <BackButton onClick={handleBackClick}>← Back to Search</BackButton>
        {!isInLibrary ? (
          <LibraryButton onClick={handleAddToLibrary}>
            📚 Add to Library
          </LibraryButton>
        ) : (
          <ActionButton disabled style={{ opacity: 0.6 }}>
            📚 In Library
          </ActionButton>
        )}
      </BookActions>

      {progress && (
        <ProgressInfo>
          <ProgressText>
            📖 Reading Progress: Chapter {progress.currentChapter + 1} of {progress.totalChapters} 
            ({progress.progress}% complete)
          </ProgressText>
        </ProgressInfo>
      )}

      <ChaptersContainer>
        <ChaptersTitle>Chapters</ChaptersTitle>
        
        {loading && (
          <LoadingSpinner>
            📚 Loading chapters...
          </LoadingSpinner>
        )}

        {error && <ErrorMessage>{error}</ErrorMessage>}

        {!loading && chapters.length > 0 && (
          <ChapterList>
            {chapters.map((chapter, index) => (
              <ChapterItem 
                key={index} 
                onClick={() => handleChapterClick(chapter)}
              >
                <ChapterTitle>{chapter.title}</ChapterTitle>
              </ChapterItem>
            ))}
          </ChapterList>
        )}

        {!loading && chapters.length === 0 && !error && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            No chapters found for this book.
          </div>
        )}
      </ChaptersContainer>
    </BookContainer>
  );
};

export default BookPage;
