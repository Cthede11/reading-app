import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useLibrary } from '../context/LibraryContext';

const LibraryContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const LibraryHeader = styled.div`
  text-align: center;
  margin-bottom: 3rem;
`;

const LibraryTitle = styled.h1`
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

const LibraryStats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
`;

const StatCard = styled.div`
  background-color: var(--bg-secondary-light);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  
  .theme-dark & {
    background-color: var(--bg-secondary-dark);
    border-color: var(--border-dark);
  }
  
  .theme-sepia & {
    background-color: var(--bg-secondary-sepia);
    border-color: var(--border-sepia);
  }
`;

const StatNumber = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: var(--accent-light);
  margin-bottom: 0.5rem;
  
  .theme-dark & {
    color: var(--accent-dark);
  }
  
  .theme-sepia & {
    color: var(--accent-sepia);
  }
`;

const StatLabel = styled.div`
  color: var(--text-secondary-light);
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  .theme-dark & {
    color: var(--text-secondary-dark);
  }
  
  .theme-sepia & {
    color: var(--text-secondary-sepia);
  }
`;

const SectionTitle = styled.h2`
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

const BooksGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
`;

const BookCard = styled.div`
  background-color: var(--bg-secondary-light);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  }
  
  .theme-dark & {
    background-color: var(--bg-secondary-dark);
    border-color: var(--border-dark);
  }
  
  .theme-sepia & {
    background-color: var(--bg-secondary-sepia);
    border-color: var(--border-sepia);
  }
`;

const BookTitle = styled.h3`
  font-size: 1.2rem;
  margin-bottom: 0.5rem;
  color: var(--text-primary-light);
  
  .theme-dark & {
    color: var(--text-primary-dark);
  }
  
  .theme-sepia & {
    color: var(--text-primary-sepia);
  }
`;

const BookAuthor = styled.p`
  color: var(--text-secondary-light);
  margin-bottom: 1rem;
  font-style: italic;
  
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
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  text-transform: uppercase;
  margin-bottom: 1rem;
  
  .theme-dark & {
    background-color: var(--accent-dark);
  }
  
  .theme-sepia & {
    background-color: var(--accent-sepia);
  }
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background-color: var(--border-light);
  border-radius: 4px;
  margin-bottom: 1rem;
  overflow: hidden;
  
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

const ProgressText = styled.div`
  font-size: 0.9rem;
  color: var(--text-secondary-light);
  margin-bottom: 1rem;
  
  .theme-dark & {
    color: var(--text-secondary-dark);
  }
  
  .theme-sepia & {
    color: var(--text-secondary-sepia);
  }
`;

const BookActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ActionButton = styled.button`
  flex: 1;
  padding: 0.5rem;
  border: 1px solid var(--border-light);
  border-radius: 6px;
  background: none;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;
  
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

const RemoveButton = styled.button`
  padding: 0.5rem;
  border: 1px solid #dc3545;
  border-radius: 6px;
  background: none;
  color: #dc3545;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;
  
  &:hover {
    background-color: #dc3545;
    color: white;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary-light);
  
  .theme-dark & {
    color: var(--text-secondary-dark);
  }
  
  .theme-sepia & {
    color: var(--text-secondary-sepia);
  }
`;

const EmptyIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 1rem;
`;

const EmptyText = styled.p`
  font-size: 1.2rem;
  margin-bottom: 1rem;
`;

const EmptySubtext = styled.p`
  font-size: 1rem;
  opacity: 0.8;
`;

const LibraryPage = () => {
  const { 
    savedBooks, 
    readingProgress, 
    removeBookFromLibrary, 
    getBookProgress,
    getLibraryStats 
  } = useLibrary();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all'); // all, reading, completed

  const stats = getLibraryStats();

  const handleContinueReading = (book) => {
    const progress = getBookProgress(book.id);
    if (progress && progress.currentChapter !== null) {
      // Navigate to the book page to continue reading
      navigate(`/book/${book.source}`, { 
        state: { book, url: book.link } 
      });
    } else {
      // Start from beginning
      navigate(`/book/${book.source}`, { 
        state: { book, url: book.link } 
      });
    }
  };

  const handleRemoveBook = (bookId) => {
    if (window.confirm('Are you sure you want to remove this book from your library?')) {
      removeBookFromLibrary(bookId);
    }
  };

  const filteredBooks = savedBooks.filter(book => {
    const progress = getBookProgress(book.id);
    if (filter === 'reading') return progress && progress.progress > 0 && progress.progress < 100;
    if (filter === 'completed') return progress && progress.progress === 100;
    return true;
  });

  const formatDate = (dateString) => {
    if (!dateString) return 'Never read';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  if (savedBooks.length === 0) {
    return (
      <LibraryContainer>
        <LibraryHeader>
          <LibraryTitle>📚 My Library</LibraryTitle>
        </LibraryHeader>
        
        <EmptyState>
          <EmptyIcon>📖</EmptyIcon>
          <EmptyText>Your library is empty</EmptyText>
          <EmptySubtext>
            Start by searching for books and adding them to your library
          </EmptySubtext>
        </EmptyState>
      </LibraryContainer>
    );
  }

  return (
    <LibraryContainer>
      <LibraryHeader>
        <LibraryTitle>📚 My Library</LibraryTitle>
      </LibraryHeader>

      <LibraryStats>
        <StatCard>
          <StatNumber>{stats.totalBooks}</StatNumber>
          <StatLabel>Total Books</StatLabel>
        </StatCard>
        <StatCard>
          <StatNumber>{stats.currentlyReading}</StatNumber>
          <StatLabel>Currently Reading</StatLabel>
        </StatCard>
        <StatCard>
          <StatNumber>{stats.completedBooks}</StatNumber>
          <StatLabel>Completed</StatLabel>
        </StatCard>
      </LibraryStats>

      <div style={{ marginBottom: '2rem' }}>
        <SectionTitle>Filter Books</SectionTitle>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <ActionButton 
            onClick={() => setFilter('all')}
            style={{ 
              backgroundColor: filter === 'all' ? 'var(--accent-light)' : 'transparent',
              color: filter === 'all' ? 'white' : 'inherit'
            }}
          >
            All Books ({savedBooks.length})
          </ActionButton>
          <ActionButton 
            onClick={() => setFilter('reading')}
            style={{ 
              backgroundColor: filter === 'reading' ? 'var(--accent-light)' : 'transparent',
              color: filter === 'reading' ? 'white' : 'inherit'
            }}
          >
            Currently Reading ({stats.currentlyReading})
          </ActionButton>
          <ActionButton 
            onClick={() => setFilter('completed')}
            style={{ 
              backgroundColor: filter === 'completed' ? 'var(--accent-light)' : 'transparent',
              color: filter === 'completed' ? 'white' : 'inherit'
            }}
          >
            Completed ({stats.completedBooks})
          </ActionButton>
        </div>
      </div>

      <SectionTitle>My Books</SectionTitle>
      
      {filteredBooks.length === 0 ? (
        <EmptyState>
          <EmptyIcon>🔍</EmptyIcon>
          <EmptyText>No books match your filter</EmptyText>
          <EmptySubtext>Try changing the filter or add more books to your library</EmptySubtext>
        </EmptyState>
      ) : (
        <BooksGrid>
          {filteredBooks.map((book) => {
            const progress = getBookProgress(book.id);
            return (
              <BookCard key={book.id}>
                <BookTitle>{book.title}</BookTitle>
                {book.author && <BookAuthor>by {book.author}</BookAuthor>}
                <BookSource>{book.source}</BookSource>
                
                {progress && (
                  <>
                    <ProgressBar>
                      <ProgressFill progress={progress.progress || 0} />
                    </ProgressBar>
                    <ProgressText>
                      {progress.progress || 0}% complete • 
                      Chapter {progress.currentChapter + 1} of {progress.totalChapters}
                    </ProgressText>
                  </>
                )}
                
                <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary-light)' }}>
                  Last read: {formatDate(book.lastReadAt)}
                </div>
                
                <BookActions>
                  <ActionButton onClick={() => handleContinueReading(book)}>
                    {progress && progress.progress > 0 ? 'Continue' : 'Start Reading'}
                  </ActionButton>
                  <RemoveButton onClick={() => handleRemoveBook(book.id)}>
                    Remove
                  </RemoveButton>
                </BookActions>
              </BookCard>
            );
          })}
        </BooksGrid>
      )}
    </LibraryContainer>
  );
};

export default LibraryPage;
