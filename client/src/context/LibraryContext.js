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
  const [bookmarks, setBookmarks] = useState({});
  const [readingGoals, setReadingGoals] = useState({});
  const [categories, setCategories] = useState(['Want to Read', 'Currently Reading', 'Completed', 'Favorites']);

  // Load saved data from localStorage on mount
  useEffect(() => {
    const loadData = () => {
      try {
        // Load books
        const savedBooksData = localStorage.getItem('readingApp_library');
        if (savedBooksData) {
          setSavedBooks(JSON.parse(savedBooksData));
        }
        
        // Load progress
        const progressData = localStorage.getItem('readingApp_progress');
        if (progressData) {
          setReadingProgress(JSON.parse(progressData));
        }
        
        // Load bookmarks
        const bookmarksData = localStorage.getItem('readingApp_bookmarks');
        if (bookmarksData) {
          setBookmarks(JSON.parse(bookmarksData));
        }
        
        // Load reading goals
        const goalsData = localStorage.getItem('readingApp_goals');
        if (goalsData) {
          setReadingGoals(JSON.parse(goalsData));
        }
        
        // Load categories
        const categoriesData = localStorage.getItem('readingApp_categories');
        if (categoriesData) {
          setCategories(JSON.parse(categoriesData));
        }
      } catch (error) {
        console.error('Error loading library data:', error);
      }
    };

    loadData();
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('readingApp_library', JSON.stringify(savedBooks));
  }, [savedBooks]);

  useEffect(() => {
    localStorage.setItem('readingApp_progress', JSON.stringify(readingProgress));
  }, [readingProgress]);

  useEffect(() => {
    localStorage.setItem('readingApp_bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  useEffect(() => {
    localStorage.setItem('readingApp_goals', JSON.stringify(readingGoals));
  }, [readingGoals]);

  useEffect(() => {
    localStorage.setItem('readingApp_categories', JSON.stringify(categories));
  }, [categories]);

  // Book management functions
  const addBookToLibrary = (book, category = 'Want to Read') => {
    const bookId = `${book.source}-${book.link}`;
    
    // Check if book already exists
    if (savedBooks.find(b => b.id === bookId)) {
      return false; // Book already exists
    }

    const bookToSave = {
      ...book,
      id: bookId,
      addedAt: new Date().toISOString(),
      lastReadAt: null,
      currentChapter: null,
      totalChapters: 0,
      category,
      rating: 0,
      notes: '',
      tags: []
    };

    setSavedBooks(prev => [...prev, bookToSave]);
    return true;
  };

  const removeBookFromLibrary = (bookId) => {
    setSavedBooks(prev => prev.filter(book => book.id !== bookId));
    
    // Also remove related data
    setReadingProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[bookId];
      return newProgress;
    });
    
    setBookmarks(prev => {
      const newBookmarks = { ...prev };
      delete newBookmarks[bookId];
      return newBookmarks;
    });
  };

  const updateBookCategory = (bookId, category) => {
    setSavedBooks(prev => prev.map(book => 
      book.id === bookId ? { ...book, category, updatedAt: new Date().toISOString() } : book
    ));
  };

  const updateBookRating = (bookId, rating) => {
    setSavedBooks(prev => prev.map(book => 
      book.id === bookId ? { ...book, rating, updatedAt: new Date().toISOString() } : book
    ));
  };

  const updateBookNotes = (bookId, notes) => {
    setSavedBooks(prev => prev.map(book => 
      book.id === bookId ? { ...book, notes, updatedAt: new Date().toISOString() } : book
    ));
  };

  const updateBookTags = (bookId, tags) => {
    setSavedBooks(prev => prev.map(book => 
      book.id === bookId ? { ...book, tags, updatedAt: new Date().toISOString() } : book
    ));
  };

  // Reading progress functions
  const updateReadingProgress = (bookId, chapterIndex, totalChapters, chapterTitle = null) => {
    const now = new Date().toISOString();
    
    setReadingProgress(prev => ({
      ...prev,
      [bookId]: {
        currentChapter: chapterIndex,
        totalChapters,
        chapterTitle,
        lastReadAt: now,
        progress: totalChapters > 0 ? Math.round(((chapterIndex + 1) / totalChapters) * 100) : 0
      }
    }));

    // Update the book's last read time and auto-categorize
    setSavedBooks(prev => prev.map(book => {
      if (book.id === bookId) {
        const updatedBook = {
          ...book,
          lastReadAt: now,
          currentChapter: chapterIndex,
          totalChapters
        };
        
        // Auto-categorize based on progress
        if (chapterIndex >= totalChapters - 1 && totalChapters > 0) {
          updatedBook.category = 'Completed';
        } else if (book.category === 'Want to Read') {
          updatedBook.category = 'Currently Reading';
        }
        
        return updatedBook;
      }
      return book;
    }));
  };

  const getBookProgress = (bookId) => {
    return readingProgress[bookId] || {
      currentChapter: 0,
      totalChapters: 0,
      progress: 0,
      lastReadAt: null
    };
  };

  // Bookmark functions
  const addBookmark = (bookId, chapterIndex, chapterTitle, note = '') => {
    const bookmarkId = `${bookId}-${Date.now()}`;
    const bookmark = {
      id: bookmarkId,
      bookId,
      chapterIndex,
      chapterTitle,
      note,
      createdAt: new Date().toISOString()
    };

    setBookmarks(prev => ({
      ...prev,
      [bookId]: [...(prev[bookId] || []), bookmark]
    }));

    return bookmarkId;
  };

  const removeBookmark = (bookId, bookmarkId) => {
    setBookmarks(prev => ({
      ...prev,
      [bookId]: (prev[bookId] || []).filter(bookmark => bookmark.id !== bookmarkId)
    }));
  };

  const getBookmarks = (bookId) => {
    return bookmarks[bookId] || [];
  };

  // Statistics and analytics functions
  const getReadingStats = () => {
    const totalBooks = savedBooks.length;
    const currentlyReading = savedBooks.filter(book => book.category === 'Currently Reading').length;
    const completed = savedBooks.filter(book => book.category === 'Completed').length;
    const wantToRead = savedBooks.filter(book => book.category === 'Want to Read').length;
    
    const totalProgress = Object.values(readingProgress).reduce((sum, progress) => sum + progress.progress, 0);
    const averageProgress = totalBooks > 0 ? totalProgress / totalBooks : 0;
    
    // Calculate reading streak
    const now = new Date();
    let streak = 0;
    const sortedProgress = Object.values(readingProgress)
      .filter(p => p.lastReadAt)
      .sort((a, b) => new Date(b.lastReadAt) - new Date(a.lastReadAt));
    
    for (const progress of sortedProgress) {
      const lastRead = new Date(progress.lastReadAt);
      const daysDiff = Math.floor((now - lastRead) / (1000 * 60 * 60 * 24));
      if (daysDiff <= streak + 1) {
        streak = Math.max(streak, daysDiff === 0 ? 1 : daysDiff);
      } else {
        break;
      }
    }

    return {
      totalBooks,
      currentlyReading,
      completed,
      wantToRead,
      averageProgress,
      readingStreak: streak,
      totalChaptersRead: Object.values(readingProgress).reduce((sum, p) => sum + (p.currentChapter + 1), 0)
    };
  };

  const getRecentlyRead = (limit = 6) => {
    return savedBooks
      .filter(book => book.lastReadAt)
      .sort((a, b) => new Date(b.lastReadAt) - new Date(a.lastReadAt))
      .slice(0, limit);
  };

  const getBooksByCategory = (category) => {
    return savedBooks.filter(book => book.category === category);
  };

  const searchLibrary = (query) => {
    if (!query.trim()) return savedBooks;
    
    const searchTerm = query.toLowerCase();
    return savedBooks.filter(book => 
      book.title.toLowerCase().includes(searchTerm) ||
      book.author?.toLowerCase().includes(searchTerm) ||
      book.source.toLowerCase().includes(searchTerm) ||
      book.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  };

  // Category management
  const addCategory = (categoryName) => {
    if (!categories.includes(categoryName)) {
      setCategories(prev => [...prev, categoryName]);
      return true;
    }
    return false;
  };

  const removeCategory = (categoryName) => {
    // Don't remove default categories
    const defaultCategories = ['Want to Read', 'Currently Reading', 'Completed'];
    if (defaultCategories.includes(categoryName)) return false;
    
    // Move books from this category to 'Want to Read'
    setSavedBooks(prev => prev.map(book => 
      book.category === categoryName ? { ...book, category: 'Want to Read' } : book
    ));
    
    setCategories(prev => prev.filter(cat => cat !== categoryName));
    return true;
  };

  // Reading goals
  const setReadingGoal = (year, goal) => {
    setReadingGoals(prev => ({
      ...prev,
      [year]: { ...prev[year], ...goal }
    }));
  };

  const getReadingGoal = (year = new Date().getFullYear()) => {
    return readingGoals[year] || {
      booksTarget: 0,
      chaptersTarget: 0,
      booksCompleted: 0,
      chaptersRead: 0
    };
  };

  // Export/Import functionality
  const exportLibraryData = () => {
    const data = {
      savedBooks,
      readingProgress,
      bookmarks,
      readingGoals,
      categories,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reading-app-library-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importLibraryData = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          
          // Validate data structure
          if (!data.version || !data.savedBooks) {
            throw new Error('Invalid library data format');
          }
          
          // Merge or replace data
          setSavedBooks(prev => {
            const existingIds = new Set(prev.map(book => book.id));
            const newBooks = data.savedBooks.filter(book => !existingIds.has(book.id));
            return [...prev, ...newBooks];
          });
          
          if (data.readingProgress) {
            setReadingProgress(prev => ({ ...prev, ...data.readingProgress }));
          }
          
          if (data.bookmarks) {
            setBookmarks(prev => ({ ...prev, ...data.bookmarks }));
          }
          
          if (data.readingGoals) {
            setReadingGoals(prev => ({ ...prev, ...data.readingGoals }));
          }
          
          if (data.categories) {
            setCategories(prev => [...new Set([...prev, ...data.categories])]);
          }
          
          resolve(data.savedBooks.length);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const contextValue = {
    // State
    savedBooks,
    readingProgress,
    bookmarks,
    categories,
    
    // Book management
    addBookToLibrary,
    removeBookFromLibrary,
    updateBookCategory,
    updateBookRating,
    updateBookNotes,
    updateBookTags,
    
    // Reading progress
    updateReadingProgress,
    getBookProgress,
    
    // Bookmarks
    addBookmark,
    removeBookmark,
    getBookmarks,
    
    // Statistics and search
    getReadingStats,
    getRecentlyRead,
    getBooksByCategory,
    searchLibrary,
    
    // Categories
    addCategory,
    removeCategory,
    
    // Reading goals
    setReadingGoal,
    getReadingGoal,
    
    // Export/Import
    exportLibraryData,
    importLibraryData
  };

  return (
    <LibraryContext.Provider value={contextValue}>
      {children}
    </LibraryContext.Provider>
  );
};