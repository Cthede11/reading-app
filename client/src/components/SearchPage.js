import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import axios from 'axios';
import { useLibrary } from '../context/LibraryContext';

const SearchContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const SearchForm = styled.form`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  justify-content: center;
`;

const SearchInput = styled.input`
  flex: 1;
  max-width: 500px;
  padding: 1rem;
  border: 2px solid var(--border-light);
  border-radius: 8px;
  font-size: 1.1rem;
  background-color: var(--bg-primary-light);
  color: var(--text-primary-light);
  transition: border-color 0.3s ease;
  
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

const SearchButton = styled.button`
  padding: 1rem 2rem;
  background-color: var(--accent-light);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  cursor: pointer;
  transition: background-color 0.3s ease;
  
  &:hover {
    background-color: var(--accent-dark);
  }
  
  &:disabled {
    background-color: var(--text-secondary-light);
    cursor: not-allowed;
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

const ResultsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2rem;
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
    border-color: var(--accent-light);
  }
  
  .theme-dark & {
    background-color: var(--bg-secondary-dark);
    border-color: var(--border-dark);
    
    &:hover {
      border-color: var(--accent-dark);
    }
  }
  
  .theme-sepia & {
    background-color: var(--bg-secondary-sepia);
    border-color: var(--border-sepia);
    
    &:hover {
      border-color: var(--accent-sepia);
    }
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

const BookActions = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
`;

const ActionButton = styled.button`
  flex: 1;
  padding: 0.75rem;
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

const LibraryButton = styled.button`
  padding: 0.75rem;
  border: 1px solid var(--accent-light);
  border-radius: 6px;
  background-color: var(--accent-light);
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;
  
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

const RecentlyReadSection = styled.div`
  margin-bottom: 3rem;
`;

const RecentlyReadTitle = styled.h2`
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

const RecentlyReadGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
`;

const RecentlyReadCard = styled.div`
  background-color: var(--bg-secondary-light);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
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

const RecentlyReadTitleText = styled.h3`
  font-size: 1rem;
  margin-bottom: 0.5rem;
  color: var(--text-primary-light);
  
  .theme-dark & {
    color: var(--text-primary-dark);
  }
  
  .theme-sepia & {
    color: var(--text-primary-sepia);
  }
`;

const RecentlyReadSource = styled.span`
  display: inline-block;
  background-color: var(--accent-light);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.7rem;
  text-transform: uppercase;
  
  .theme-dark & {
    background-color: var(--accent-dark);
  }
  
  .theme-sepia & {
    background-color: var(--accent-sepia);
  }
`;

const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { addBookToLibrary, isBookInLibrary, getRecentlyRead } = useLibrary();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    
    try {
      const response = await axios.get(`/api/search?query=${encodeURIComponent(query)}`);
      setResults(response.data.results);
    } catch (err) {
      setError('Search failed. Please try again.');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBookClick = (book) => {
    navigate(`/book/${book.source}`, { 
      state: { book, url: book.link } 
    });
  };

  const handleAddToLibrary = (book) => {
    const success = addBookToLibrary(book);
    if (success) {
      // You could add a toast notification here
      console.log('Book added to library!');
    }
  };

  const recentlyRead = getRecentlyRead(4);

  return (
    <SearchContainer>
      {recentlyRead.length > 0 && (
        <RecentlyReadSection>
          <RecentlyReadTitle>📚 Recently Read</RecentlyReadTitle>
          <RecentlyReadGrid>
            {recentlyRead.map((book) => (
              <RecentlyReadCard key={book.id} onClick={() => handleBookClick(book)}>
                <RecentlyReadTitleText>{book.title}</RecentlyReadTitleText>
                <RecentlyReadSource>{book.source}</RecentlyReadSource>
              </RecentlyReadCard>
            ))}
          </RecentlyReadGrid>
        </RecentlyReadSection>
      )}

      <SearchForm onSubmit={handleSearch}>
        <SearchInput
          type="text"
          placeholder="Search for books, novels, or stories..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <SearchButton type="submit" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </SearchButton>
      </SearchForm>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {loading && (
        <LoadingSpinner>
          🔍 Searching for books...
        </LoadingSpinner>
      )}

              {!loading && results.length > 0 && (
          <ResultsContainer>
            {results.map((book, index) => {
              const isInLibrary = isBookInLibrary(book);
              return (
                <BookCard key={`${book.source}-${index}`}>
                  <div onClick={() => handleBookClick(book)} style={{ cursor: 'pointer' }}>
                    <BookTitle>{book.title}</BookTitle>
                    {book.author && <BookAuthor>by {book.author}</BookAuthor>}
                    <BookSource>{book.source}</BookSource>
                  </div>
                  
                  <BookActions>
                    <ActionButton onClick={() => handleBookClick(book)}>
                      View Details
                    </ActionButton>
                    {!isInLibrary ? (
                      <LibraryButton onClick={() => handleAddToLibrary(book)}>
                        Add to Library
                      </LibraryButton>
                    ) : (
                      <ActionButton disabled style={{ opacity: 0.6 }}>
                        In Library
                      </ActionButton>
                    )}
                  </BookActions>
                </BookCard>
              );
            })}
          </ResultsContainer>
        )}

      {!loading && results.length === 0 && query && !error && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          No books found for "{query}". Try a different search term.
        </div>
      )}
    </SearchContainer>
  );
};

export default SearchPage;
