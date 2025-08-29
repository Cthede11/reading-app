import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import axios from 'axios';
import { useLibrary } from '../context/LibraryContext';

const SearchContainer = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
  
  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const SearchHeader = styled.div`
  text-align: center;
  margin-bottom: 3rem;
`;

const SearchTitle = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 1rem;
  color: var(--text-primary-light);
  
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

const SearchForm = styled.form`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  justify-content: center;
  align-items: center;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const SearchInputContainer = styled.div`
  position: relative;
  flex: 1;
  max-width: 600px;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 1.25rem 1.5rem;
  padding-right: 3rem;
  border: 2px solid var(--border-light);
  border-radius: 12px;
  font-size: 1.1rem;
  background-color: var(--bg-primary-light);
  color: var(--text-primary-light);
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: var(--accent-light);
    box-shadow: 0 0 0 4px rgba(0, 123, 255, 0.1);
    transform: translateY(-1px);
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
      box-shadow: 0 0 0 4px rgba(77, 171, 247, 0.1);
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
      box-shadow: 0 0 0 4px rgba(210, 105, 30, 0.1);
    }
    
    &::placeholder {
      color: var(--text-secondary-sepia);
    }
  }
`;

const ClearButton = styled.button`
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--text-secondary-light);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  font-size: 1.2rem;
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

const SearchButton = styled.button`
  padding: 1.25rem 2.5rem;
  background-color: var(--accent-light);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &:hover:not(:disabled) {
    background-color: var(--accent-dark);
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(0, 123, 255, 0.3);
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
      box-shadow: 0 4px 15px rgba(77, 171, 247, 0.3);
    }
  }
  
  .theme-sepia & {
    background-color: var(--accent-sepia);
    
    &:hover:not(:disabled) {
      background-color: var(--accent-light);
      box-shadow: 0 4px 15px rgba(210, 105, 30, 0.3);
    }
  }
  
  @media (max-width: 768px) {
    width: 100%;
    justify-content: center;
  }
`;

const FiltersContainer = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  justify-content: center;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const FilterSelect = styled.select`
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  background-color: var(--bg-secondary-light);
  color: var(--text-primary-light);
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: var(--accent-light);
  }
  
  .theme-dark & {
    border-color: var(--border-dark);
    background-color: var(--bg-secondary-dark);
    color: var(--text-primary-dark);
    
    &:focus {
      border-color: var(--accent-dark);
    }
  }
  
  .theme-sepia & {
    border-color: var(--border-sepia);
    background-color: var(--bg-secondary-sepia);
    color: var(--text-primary-sepia);
    
    &:focus {
      border-color: var(--accent-sepia);
    }
  }
`;

const SearchStatus = styled.div`
  text-align: center;
  padding: 1rem;
  margin-bottom: 2rem;
  background-color: var(--bg-secondary-light);
  border-radius: 8px;
  color: var(--text-secondary-light);
  
  .theme-dark & {
    background-color: var(--bg-secondary-dark);
    color: var(--text-secondary-dark);
  }
  
  .theme-sepia & {
    background-color: var(--bg-secondary-sepia);
    color: var(--text-secondary-sepia);
  }
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-light);
  border-radius: 50%;
  border-top-color: var(--accent-light);
  animation: spin 1s ease-in-out infinite;
  margin-right: 0.5rem;
  
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

const ResultsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 2rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
`;

const BookCard = styled.div`
  background-color: var(--bg-secondary-light);
  border: 1px solid var(--border-light);
  border-radius: 16px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
    border-color: var(--accent-light);
  }
  
  .theme-dark & {
    background-color: var(--bg-secondary-dark);
    border-color: var(--border-dark);
    
    &:hover {
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
      border-color: var(--accent-dark);
    }
  }
  
  .theme-sepia & {
    background-color: var(--bg-secondary-sepia);
    border-color: var(--border-sepia);
    
    &:hover {
      box-shadow: 0 8px 25px rgba(92, 75, 55, 0.1);
      border-color: var(--accent-sepia);
    }
  }
`;

const BookHeader = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const BookCover = styled.div`
  width: 60px;
  height: 80px;
  background-color: var(--accent-light);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: white;
  flex-shrink: 0;
  background-image: ${props => props.cover ? `url(${props.cover})` : 'none'};
  background-size: cover;
  background-position: center;
  
  .theme-dark & {
    background-color: var(--accent-dark);
  }
  
  .theme-sepia & {
    background-color: var(--accent-sepia);
  }
`;

const BookInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const BookTitle = styled.h3`
  font-size: 1.2rem;
  margin-bottom: 0.5rem;
  color: var(--text-primary-light);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
  
  .theme-dark & {
    color: var(--text-primary-dark);
  }
  
  .theme-sepia & {
    color: var(--text-primary-sepia);
  }
`;

const BookAuthor = styled.p`
  color: var(--text-secondary-light);
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  
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
  border-radius: 12px;
  font-size: 0.8rem;
  text-transform: uppercase;
  font-weight: 600;
  
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
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.3s ease;
  
  &.primary {
    background-color: var(--accent-light);
    color: white;
    
    &:hover {
      background-color: var(--accent-dark);
      transform: translateY(-1px);
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
  }
  
  &.secondary {
    background-color: var(--bg-primary-light);
    color: var(--text-primary-light);
    border: 1px solid var(--border-light);
    
    &:hover {
      background-color: var(--border-light);
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
`;

const LibraryBadge = styled.div`
  position: absolute;
  top: 1rem;
  right: 1rem;
  background-color: var(--accent-light);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 600;
  
  .theme-dark & {
    background-color: var(--accent-dark);
  }
  
  .theme-sepia & {
    background-color: var(--accent-sepia);
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: var(--text-secondary-light);
  
  .theme-dark & {
    color: var(--text-secondary-dark);
  }
  
  .theme-sepia & {
    color: var(--text-secondary-sepia);
  }
  
  h3 {
    font-size: 1.5rem;
    margin-bottom: 1rem;
    color: var(--text-primary-light);
    
    .theme-dark & {
      color: var(--text-primary-dark);
    }
    
    .theme-sepia & {
      color: var(--text-primary-sepia);
    }
  }
  
  p {
    font-size: 1.1rem;
    margin-bottom: 2rem;
    max-width: 500px;
    margin-left: auto;
    margin-right: auto;
  }
`;

const RecentSearches = styled.div`
  margin-bottom: 2rem;
`;

const RecentSearchTitle = styled.h3`
  font-size: 1.1rem;
  margin-bottom: 1rem;
  color: var(--text-primary-light);
  
  .theme-dark & {
    color: var(--text-primary-dark);
  }
  
  .theme-sepia & {
    color: var(--text-primary-sepia);
  }
`;

const RecentSearchTags = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
`;

const SearchTag = styled.button`
  background-color: var(--bg-secondary-light);
  border: 1px solid var(--border-light);
  color: var(--text-secondary-light);
  padding: 0.5rem 1rem;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;
  
  &:hover {
    background-color: var(--accent-light);
    border-color: var(--accent-light);
    color: white;
  }
  
  .theme-dark & {
    background-color: var(--bg-secondary-dark);
    border-color: var(--border-dark);
    color: var(--text-secondary-dark);
    
    &:hover {
      background-color: var(--accent-dark);
      border-color: var(--accent-dark);
    }
  }
  
  .theme-sepia & {
    background-color: var(--bg-secondary-sepia);
    border-color: var(--border-sepia);
    color: var(--text-secondary-sepia);
    
    &:hover {
      background-color: var(--accent-sepia);
      border-color: var(--accent-sepia);
    }
  }
`;

const SearchPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addBookToLibrary, savedBooks } = useLibrary();
  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [sortBy, setSortBy] = useState('relevance');
  const [recentSearches, setRecentSearches] = useState([]);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('readingApp_recentSearches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading recent searches:', e);
      }
    }
  }, []);

  // Handle URL query parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const urlQuery = urlParams.get('q');
    if (urlQuery && urlQuery !== query) {
      setQuery(urlQuery);
      handleSearch(null, urlQuery);
    }
  }, [location.search]);

  const saveRecentSearch = (searchQuery) => {
    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('readingApp_recentSearches', JSON.stringify(updated));
  };

  const handleSearch = async (e, searchQuery = null) => {
    if (e) e.preventDefault();
    
    const searchTerm = searchQuery || query.trim();
    if (!searchTerm) return;
    
    setLoading(true);
    setError('');
    setMessage('');
    saveRecentSearch(searchTerm);
    
    try {
      const response = await axios.get(`/api/search?query=${encodeURIComponent(searchTerm)}`);
      let books = response.data.results || [];
      
      // Apply source filter
      if (sourceFilter !== 'all') {
        books = books.filter(book => book.source === sourceFilter);
      }
      
      // Apply sorting
      books = sortBooks(books, sortBy);
      
      setResults(books);
      setMessage(response.data.message || '');
      
      // Update URL without causing a reload
      if (!searchQuery) {
        const newUrl = `/search?q=${encodeURIComponent(searchTerm)}`;
        window.history.pushState({}, '', newUrl);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Search failed. Please try again.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const sortBooks = (books, sortType) => {
    const sorted = [...books];
    
    switch (sortType) {
      case 'title':
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      case 'author':
        return sorted.sort((a, b) => (a.author || '').localeCompare(b.author || ''));
      case 'source':
        return sorted.sort((a, b) => a.source.localeCompare(b.source));
      case 'relevance':
      default:
        return sorted; // Keep original order for relevance
    }
  };

  const handleFilterChange = (newSourceFilter, newSortBy) => {
    if (newSourceFilter !== undefined) setSourceFilter(newSourceFilter);
    if (newSortBy !== undefined) setSortBy(newSortBy);
    
    // Re-apply filters to current results
    if (results.length > 0) {
      let filteredBooks = [...results];
      
      const currentSource = newSourceFilter !== undefined ? newSourceFilter : sourceFilter;
      const currentSort = newSortBy !== undefined ? newSortBy : sortBy;
      
      if (currentSource !== 'all') {
        filteredBooks = filteredBooks.filter(book => book.source === currentSource);
      }
      
      filteredBooks = sortBooks(filteredBooks, currentSort);
      setResults(filteredBooks);
    }
  };

  const handleBookClick = (book) => {
    navigate(`/book/${book.source}`, { 
      state: { book, url: book.link } 
    });
  };

  const handleAddToLibrary = (book, e) => {
    e.stopPropagation();
    const success = addBookToLibrary(book);
    if (success) {
      // Show success feedback
      setMessage(`"${book.title}" added to your library!`);
    } else {
      setMessage(`"${book.title}" is already in your library.`);
    }
  };

  const isBookInLibrary = (book) => {
    const bookId = `${book.source}-${book.link}`;
    return savedBooks.some(savedBook => savedBook.id === bookId);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setMessage('');
    setError('');
    window.history.pushState({}, '', '/search');
  };

  const handleRecentSearchClick = (searchTerm) => {
    setQuery(searchTerm);
    handleSearch(null, searchTerm);
  };

  const sources = [
  { value: 'all', label: 'All Sources' },
  { value: 'webnovel', label: 'WebNovel' },
  { value: 'novelbin', label: 'NovelBin' },
  { value: 'lightnovelpub', label: 'LightNovelPub' },
  { value: 'novelfull', label: 'NovelFull' },
  { value: 'royalroad', label: 'Royal Road' },
  { value: 'novelupdates', label: 'Novel Updates' },
  { value: 'wuxiaworld', label: 'WuxiaWorld' },
  { value: 'scribblehub', label: 'ScribbleHub' }
];

  const sortOptions = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'title', label: 'Title A-Z' },
    { value: 'author', label: 'Author A-Z' },
    { value: 'source', label: 'Source' }
  ];

  return (
    <SearchContainer>
      <SearchHeader>
        <SearchTitle>🔍 Discover Your Next Great Read</SearchTitle>
        
        {recentSearches.length > 0 && results.length === 0 && (
          <RecentSearches>
            <RecentSearchTitle>Recent Searches</RecentSearchTitle>
            <RecentSearchTags>
              {recentSearches.map((search, index) => (
                <SearchTag
                  key={index}
                  onClick={() => handleRecentSearchClick(search)}
                >
                  {search}
                </SearchTag>
              ))}
            </RecentSearchTags>
          </RecentSearches>
        )}
      </SearchHeader>

      <SearchForm onSubmit={handleSearch}>
        <SearchInputContainer>
          <SearchInput
            type="text"
            placeholder="Search for books, authors, or series..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
          />
          {query && (
            <ClearButton type="button" onClick={clearSearch}>
              ✕
            </ClearButton>
          )}
        </SearchInputContainer>
        
        <SearchButton type="submit" disabled={loading || !query.trim()}>
          {loading ? <LoadingSpinner /> : '🔍'}
          {loading ? 'Searching...' : 'Search'}
        </SearchButton>
      </SearchForm>

      {(results.length > 0 || loading) && (
        <FiltersContainer>
          <FilterSelect 
            value={sourceFilter}
            onChange={(e) => handleFilterChange(e.target.value, undefined)}
          >
            {sources.map(source => (
              <option key={source.value} value={source.value}>
                📚 {source.label}
              </option>
            ))}
          </FilterSelect>
          
          <FilterSelect 
            value={sortBy}
            onChange={(e) => handleFilterChange(undefined, e.target.value)}
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>
                🔄 {option.label}
              </option>
            ))}
          </FilterSelect>
        </FiltersContainer>
      )}

      {loading && (
        <SearchStatus>
          <LoadingSpinner />
          Searching across multiple sources...
        </SearchStatus>
      )}

      {message && !loading && (
        <SearchStatus>
          {message}
        </SearchStatus>
      )}

      {error && (
        <SearchStatus style={{ backgroundColor: 'rgba(220, 53, 69, 0.1)', color: '#dc3545' }}>
          ⚠️ {error}
        </SearchStatus>
      )}

      {results.length > 0 ? (
        <ResultsContainer>
          {results.map((book, index) => (
            <BookCard key={`${book.source}-${book.link}-${index}`} onClick={() => handleBookClick(book)}>
              {isBookInLibrary(book) && (
                <LibraryBadge>
                  ✓ In Library
                </LibraryBadge>
              )}
              
              <BookHeader>
                <BookCover cover={book.cover}>
                  {!book.cover && '📖'}
                </BookCover>
                <BookInfo>
                  <BookTitle>{book.title}</BookTitle>
                  {book.author && <BookAuthor>By {book.author}</BookAuthor>}
                  <BookSource>{book.source}</BookSource>
                </BookInfo>
              </BookHeader>
              
              <BookActions>
                <ActionButton 
                  className="primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBookClick(book);
                  }}
                >
                  📖 Read Details
                </ActionButton>
                <ActionButton 
                  className="secondary"
                  onClick={(e) => handleAddToLibrary(book, e)}
                  disabled={isBookInLibrary(book)}
                >
                  {isBookInLibrary(book) ? '✓ Added' : '+ Library'}
                </ActionButton>
              </BookActions>
            </BookCard>
          ))}
        </ResultsContainer>
      ) : !loading && query && (
        <EmptyState>
          <h3>📚 No Books Found</h3>
          <p>
            We couldn't find any books matching "{query}". 
            Try different keywords or check your spelling.
          </p>
          <ActionButton className="primary" onClick={clearSearch}>
            🔍 Try New Search
          </ActionButton>
        </EmptyState>
      )}

      {!loading && !query && results.length === 0 && (
        <EmptyState>
          <h3>🌟 Start Your Reading Journey</h3>
          <p>
            Enter a book title, author name, or series to discover your next favorite read 
            from multiple sources across the web.
          </p>
        </EmptyState>
      )}
    </SearchContainer>
  );
};

export default SearchPage;