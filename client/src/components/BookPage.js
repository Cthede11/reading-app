import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import axios from 'axios';
import { useLibrary } from '../context/LibraryContext';

const BookContainer = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
  
  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const BookHeader = styled.div`
  background: linear-gradient(135deg, var(--bg-secondary-light), var(--bg-primary-light));
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
  border: 1px solid var(--border-light);
  position: relative;
  overflow: hidden;
  
  .theme-dark & {
    background: linear-gradient(135deg, var(--bg-secondary-dark), var(--bg-primary-dark));
    border-color: var(--border-dark);
  }
  
  .theme-sepia & {
    background: linear-gradient(135deg, var(--bg-secondary-sepia), var(--bg-primary-sepia));
    border-color: var(--border-sepia);
  }
  
  @media (max-width: 768px) {
    padding: 1.5rem;
  }
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
  margin-bottom: 2rem;
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

const BookContent = styled.div`
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 2rem;
  align-items: start;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
    text-align: center;
  }
`;

const BookCover = styled.div`
  width: 200px;
  height: 280px;
  background-color: var(--accent-light);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 4rem;
  color: white;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  background-image: ${props => props.cover ? `url(${props.cover})` : 'none'};
  background-size: cover;
  background-position: center;
  
  .theme-dark & {
    background-color: var(--accent-dark);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
  }
  
  .theme-sepia & {
    background-color: var(--accent-sepia);
    box-shadow: 0 8px 25px rgba(92, 75, 55, 0.15);
  }
  
  @media (max-width: 768px) {
    width: 150px;
    height: 210px;
    margin: 0 auto;
    font-size: 3rem;
  }
`;

const BookInfo = styled.div`
  flex: 1;
`;

const BookTitle = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 1rem;
  color: var(--text-primary-light);
  line-height: 1.2;
  
  .theme-dark & {
    color: var(--text-primary-dark);
  }
  
  .theme-sepia & {
    color: var(--text-primary-sepia);
  }
  
  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const BookAuthor = styled.p`
  font-size: 1.3rem;
  color: var(--text-secondary-light);
  margin-bottom: 1rem;
  
  .theme-dark & {
    color: var(--text-secondary-dark);
  }
  
  .theme-sepia & {
    color: var(--text-secondary-sepia);
  }
`;

const BookMeta = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
`;

const BookSource = styled.span`
  display: inline-block;
  background-color: var(--accent-light);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
  text-transform: uppercase;
  font-weight: 600;
  
  .theme-dark & {
    background-color: var(--accent-dark);
  }
  
  .theme-sepia & {
    background-color: var(--accent-sepia);
  }
`;

const BookStats = styled.div`
  display: flex;
  gap: 2rem;
  margin-bottom: 2rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
  }
`;

const StatItem = styled.div`
  text-align: center;
  
  .number {
    font-size: 1.5rem;
    font-weight: bold;
    color: var(--accent-light);
    
    .theme-dark & {
      color: var(--accent-dark);
    }
    
    .theme-sepia & {
      color: var(--accent-sepia);
    }
  }
  
  .label {
    font-size: 0.9rem;
    color: var(--text-secondary-light);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    
    .theme-dark & {
      color: var(--text-secondary-dark);
    }
    
    .theme-sepia & {
      color: var(--text-secondary-sepia);
    }
  }
`;

const BookDescription = styled.div`
  margin-bottom: 2rem;
  
  p {
    color: var(--text-primary-light);
    line-height: 1.6;
    margin-bottom: 1rem;
    
    .theme-dark & {
      color: var(--text-primary-dark);
    }
    
    .theme-sepia & {
      color: var(--text-primary-sepia);
    }
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const ActionButton = styled.button`
  padding: 1rem 2rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  
  &.primary {
    background-color: var(--accent-light);
    color: white;
    
    &:hover {
      background-color: var(--accent-dark);
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(0, 123, 255, 0.3);
    }
    
    .theme-dark & {
      background-color: var(--accent-dark);
      
      &:hover {
        background-color: var(--accent-light);
        box-shadow: 0 4px 15px rgba(77, 171, 247, 0.3);
      }
    }
    
    .theme-sepia & {
      background-color: var(--accent-sepia);
      
      &:hover {
        background-color: var(--accent-light);
        box-shadow: 0 4px 15px rgba(210, 105, 30, 0.3);
      }
    }
  }
  
  &.secondary {
    background-color: var(--bg-primary-light);
    color: var(--text-primary-light);
    border: 2px solid var(--border-light);
    
    &:hover {
      background-color: var(--border-light);
      transform: translateY(-1px);
    }
    
    .theme-dark & {
      background-color: var(--bg-primary-dark);
      color: var(--text-primary-dark);
      border-color: var(--border-dark);
      
      &:hover {
        background-color: var(--border-dark);
      }
    }
    
    .theme-sepia & {
      background-color: var(--bg-primary-sepia);
      color: var(--text-primary-sepia);
      border-color: var(--border-sepia);
      
      &:hover {
        background-color: var(--border-sepia);
      }
    }
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
  }
`;

const ChaptersSection = styled.div`
  background-color: var(--bg-secondary-light);
  border-radius: 16px;
  border: 1px solid var(--border-light);
  overflow: hidden;
  
  .theme-dark & {
    background-color: var(--bg-secondary-dark);
    border-color: var(--border-dark);
  }
  
  .theme-sepia & {
    background-color: var(--bg-secondary-sepia);
    border-color: var(--border-sepia);
  }
`;

const ChaptersHeader = styled.div`
  padding: 1.5rem 2rem;
  border-bottom: 1px solid var(--border-light);
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  .theme-dark & {
    border-bottom-color: var(--border-dark);
  }
  
  .theme-sepia & {
    border-bottom-color: var(--border-sepia);
  }
  
  @media (max-width: 768px) {
    padding: 1rem;
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
`;

const ChaptersTitle = styled.h2`
  font-size: 1.5rem;
  color: var(--text-primary-light);
  
  .theme-dark & {
    color: var(--text-primary-dark);
  }
  
  .theme-sepia & {
    color: var(--text-primary-sepia);
  }
`;

const ChaptersControls = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  
  @media (max-width: 768px) {
    justify-content: space-between;
  }
`;

const ChapterSearch = styled.input`
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  background-color: var(--bg-primary-light);
  color: var(--text-primary-light);
  
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
`;

const ChaptersList = styled.div`
  max-height: 600px;
  overflow-y: auto;
`;

const ChapterItem = styled.div`
  padding: 1rem 2rem;
  border-bottom: 1px solid var(--border-light);
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  &:hover {
    background-color: var(--bg-primary-light);
  }
  
  &:last-child {
    border-bottom: none;
  }
  
  .theme-dark & {
    border-bottom-color: var(--border-dark);
    
    &:hover {
      background-color: var(--bg-primary-dark);
    }
  }
  
  .theme-sepia & {
    border-bottom-color: var(--border-sepia);
    
    &:hover {
      background-color: var(--bg-primary-sepia);
    }
  }
  
  @media (max-width: 768px) {
    padding: 1rem;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
`;

const ChapterTitle = styled.div`
  color: var(--text-primary-light);
  font-weight: 500;
  
  .theme-dark & {
    color: var(--text-primary-dark);
  }
  
  .theme-sepia & {
    color: var(--text-primary-sepia);
  }
`;

const ChapterMeta = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  
  @media (max-width: 768px) {
    gap: 0.5rem;
    flex-wrap: wrap;
  }
`;

const ReadStatus = styled.span.withConfig({
  shouldForwardProp: (prop) => prop !== 'isRead'
})`
  background-color: ${props => props.isRead ? 'var(--accent-light)' : 'var(--text-secondary-light)'};
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
  
  .theme-dark & {
    background-color: ${props => props.isRead ? 'var(--accent-dark)' : 'var(--text-secondary-dark)'};
  }
  
  .theme-sepia & {
    background-color: ${props => props.isRead ? 'var(--accent-sepia)' : 'var(--text-secondary-sepia)'};
  }
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 4rem;
  font-size: 1.2rem;
  color: var(--text-secondary-light);
  
  .spinner {
    display: inline-block;
    width: 20px;
    height: 20px;
    border: 2px solid var(--border-light);
    border-radius: 50%;
    border-top-color: var(--accent-light);
    animation: spin 1s ease-in-out infinite;
    margin-right: 1rem;
    
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

const BookPage = () => {
  const { source } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const {
    addBookToLibrary,
    removeBookFromLibrary,
    savedBooks,
    updateBookCategory,
    updateBookRating,
    getBookProgress,
    categories
  } = useLibrary();

  const [book, setBook] = useState(location.state?.book || null);
  const [bookUrl] = useState(location.state?.url || '');
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chapterSearch, setChapterSearch] = useState('');
  const [isInLibrary, setIsInLibrary] = useState(false);
  const [bookProgress, setBookProgress] = useState(null);

  useEffect(() => {
    if (bookUrl) {
      // Check if book is in library
      const bookId = `${source}-${bookUrl}`;
      const libraryBook = savedBooks.find(b => b.id === bookId);
      setIsInLibrary(!!libraryBook);
      if (libraryBook) {
        setBook(libraryBook);
        setBookProgress(getBookProgress(bookId));
      }
      fetchBookDetails();
    } else {
      setError('Book information not found');
      setLoading(false);
    }
    // Only run when bookUrl or source changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookUrl, source, savedBooks]);

  const fetchBookDetails = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await axios.get(`/api/book/${source}?url=${encodeURIComponent(bookUrl)}`);
      const bookDetails = response.data;
      
      setChapters(bookDetails.chapters || []);
      
      // Update book info if we got more details
      if (bookDetails.title || bookDetails.author || bookDetails.description) {
        setBook(prev => ({
          ...prev,
          title: bookDetails.title || prev?.title || 'Unknown Title',
          author: bookDetails.author || prev?.author || 'Unknown Author',
          description: bookDetails.description || prev?.description || '',
          cover: bookDetails.cover || prev?.cover || ''
        }));
      }
    } catch (err) {
      console.error('Error fetching book details:', err);
      setError('Failed to load book details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToLibrary = () => {
    if (book) {
      const success = addBookToLibrary(book);
      if (success) {
        setIsInLibrary(true);
      }
    }
  };

  const handleRemoveFromLibrary = () => {
    if (book) {
      const bookId = `${source}-${bookUrl}`;
      removeBookFromLibrary(bookId);
      setIsInLibrary(false);
      setBookProgress(null);
    }
  };

  const handleReadChapter = (chapter, index) => {
    navigate(`/reader/${source}`, {
      state: {
        book,
        chapter,
        bookUrl,
        chapters,
        chapterIndex: index
      }
    });
  };

  const handleStartReading = () => {
    if (chapters.length > 0) {
      let startIndex = 0;
      
      // If book is in library and has progress, start from current chapter
      if (isInLibrary && bookProgress && bookProgress.currentChapter !== null) {
        startIndex = bookProgress.currentChapter;
      }
      
      const chapter = chapters[startIndex];
      handleReadChapter(chapter, startIndex);
    }
  };

  const handleBackClick = () => {
    navigate(-1);
  };

  const filteredChapters = chapters.filter(chapter =>
    chapter.title.toLowerCase().includes(chapterSearch.toLowerCase())
  );

  if (loading) {
    return (
      <BookContainer>
        <LoadingSpinner>
          <div className="spinner"></div>
          Loading book details...
        </LoadingSpinner>
      </BookContainer>
    );
  }

  if (error) {
    return (
      <BookContainer>
        <BackButton onClick={handleBackClick}>
          ← Back
        </BackButton>
        <ErrorMessage>{error}</ErrorMessage>
      </BookContainer>
    );
  }

  if (!book) {
    return (
      <BookContainer>
        <BackButton onClick={handleBackClick}>
          ← Back
        </BackButton>
        <ErrorMessage>Book information not found.</ErrorMessage>
      </BookContainer>
    );
  }

  return (
    <BookContainer>
      <BackButton onClick={handleBackClick}>
        ← Back to Search
      </BackButton>

      <BookHeader>
        <BookContent>
          <BookCover cover={book.cover}>
            {!book.cover && '📖'}
          </BookCover>
          
          <BookInfo>
            <BookTitle>{book.title}</BookTitle>
            {book.author && <BookAuthor>by {book.author}</BookAuthor>}
            
            <BookMeta>
              <BookSource>{source}</BookSource>
              {isInLibrary && (
                <BookSource style={{ backgroundColor: '#28a745' }}>
                  ✓ In Library
                </BookSource>
              )}
            </BookMeta>

            <BookStats>
              <StatItem>
                <div className="number">{chapters.length}</div>
                <div className="label">Chapters</div>
              </StatItem>
              {bookProgress && (
                <>
                  <StatItem>
                    <div className="number">{bookProgress.progress}%</div>
                    <div className="label">Progress</div>
                  </StatItem>
                  <StatItem>
                    <div className="number">{bookProgress.currentChapter + 1}</div>
                    <div className="label">Current</div>
                  </StatItem>
                </>
              )}
            </BookStats>

            {book.description && (
              <BookDescription>
                <p>{book.description}</p>
              </BookDescription>
            )}

            <ActionButtons>
              {chapters.length > 0 && (
                <ActionButton className="primary" onClick={handleStartReading}>
                  📖 {bookProgress?.currentChapter !== null ? 'Continue Reading' : 'Start Reading'}
                </ActionButton>
              )}
              
              {!isInLibrary ? (
                <ActionButton className="secondary" onClick={handleAddToLibrary}>
                  ➕ Add to Library
                </ActionButton>
              ) : (
                <ActionButton className="secondary" onClick={handleRemoveFromLibrary}>
                  ❌ Remove from Library
                </ActionButton>
              )}
            </ActionButtons>
          </BookInfo>
        </BookContent>
      </BookHeader>

      {chapters.length > 0 && (
        <ChaptersSection>
          <ChaptersHeader>
            <ChaptersTitle>Chapters ({chapters.length})</ChaptersTitle>
            <ChaptersControls>
              <ChapterSearch
                type="text"
                placeholder="Search chapters..."
                value={chapterSearch}
                onChange={(e) => setChapterSearch(e.target.value)}
              />
            </ChaptersControls>
          </ChaptersHeader>
          
          <ChaptersList>
            {filteredChapters.map((chapter, index) => {
              const actualIndex = chapters.indexOf(chapter);
              const isRead = bookProgress && actualIndex <= bookProgress.currentChapter;
              
              return (
                <ChapterItem
                  key={actualIndex}
                  onClick={() => handleReadChapter(chapter, actualIndex)}
                >
                  <ChapterTitle>{chapter.title}</ChapterTitle>
                  <ChapterMeta>
                    <ReadStatus className={isRead ? 'read' : 'unread'}>
                      {isRead ? '✓ Read' : 'Unread'}
                    </ReadStatus>
                  </ChapterMeta>
                </ChapterItem>
              );
            })}
          </ChaptersList>
        </ChaptersSection>
      )}
    </BookContainer>
  );
};

export default BookPage;