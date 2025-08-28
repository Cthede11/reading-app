import { createContext, useContext, useState, useEffect } from 'react';

const LibraryContext = createContext();

export const useLibrary = () => {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error('useLibrary must be used within a LibraryProvider');
  }
  return context;
};

export const LibraryProvider = ({ children }) => {
  const [savedBooks, setSavedBooks] = useState([]);
  const [readingProgress, setReadingProgress] = useState({});

  // Load saved data from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('readingAppLibrary');
    const progress = localStorage.getItem('readingAppProgress');
    
    if (saved) {
      try {
        setSavedBooks(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading library:', error);
      }
    }
    
    if (progress) {
      try {
        setReadingProgress(JSON.parse(progress));
      } catch (error) {
        console.error('Error loading progress:', error);
      }
    }
  }, []);

  // Save library to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('readingAppLibrary', JSON.stringify(savedBooks));
  }, [savedBooks]);

  // Save progress to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('readingAppProgress', JSON.stringify(readingProgress));
  }, [readingProgress]);

  const addBookToLibrary = (book) => {
    const bookId = `${book.source}-${book.link}`;
    
    // Check if book already exists
    if (savedBooks.find(b => `${b.source}-${b.link}` === bookId)) {
      return false; // Book already exists
    }

    const bookToSave = {
      ...book,
      id: bookId,
      addedAt: new Date().toISOString(),
      lastReadAt: null,
      currentChapter: null,
      totalChapters: 0
    };

    setSavedBooks(prev => [...prev, bookToSave]);
    return true;
  };

  const removeBookFromLibrary = (bookId) => {
    setSavedBooks(prev => prev.filter(book => book.id !== bookId));
    
    // Also remove progress for this book
    setReadingProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[bookId];
      return newProgress;
    });
  };

  const updateReadingProgress = (bookId, chapterIndex, totalChapters) => {
    const now = new Date().toISOString();
    
    setReadingProgress(prev => ({
      ...prev,
      [bookId]: {
        currentChapter: chapterIndex,
        totalChapters,
        lastReadAt: now,
        progress: totalChapters > 0 ? Math.round(((chapterIndex + 1) / totalChapters) * 100) : 0
      }
    }));

    // Update the book's last read time
    setSavedBooks(prev => prev.map(book => 
      book.id === bookId 
        ? { ...book, lastReadAt: now, currentChapter: chapterIndex, totalChapters }
        : book
    ));
  };

  const getBookProgress = (bookId) => {
    return readingProgress[bookId] || null;
  };

  const isBookInLibrary = (book) => {
    const bookId = `${book.source}-${book.link}`;
    return savedBooks.find(b => b.id === bookId);
  };

  const getLibraryStats = () => {
    const totalBooks = savedBooks.length;
    const completedBooks = Object.values(readingProgress).filter(p => p.progress === 100).length;
    const currentlyReading = Object.values(readingProgress).filter(p => p.progress > 0 && p.progress < 100).length;
    
    return { totalBooks, completedBooks, currentlyReading };
  };

  const getRecentlyRead = (limit = 5) => {
    return savedBooks
      .filter(book => book.lastReadAt)
      .sort((a, b) => new Date(b.lastReadAt) - new Date(a.lastReadAt))
      .slice(0, limit);
  };

  const value = {
    savedBooks,
    readingProgress,
    addBookToLibrary,
    removeBookFromLibrary,
    updateReadingProgress,
    getBookProgress,
    isBookInLibrary,
    getLibraryStats,
    getRecentlyRead
  };

  return (
    <LibraryContext.Provider value={value}>
      {children}
    </LibraryContext.Provider>
  );
};

export { LibraryContext };
