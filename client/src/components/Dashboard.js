import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useLibrary } from '../context/LibraryContext';

const DashboardContainer = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
  
  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const WelcomeSection = styled.div`
  text-align: center;
  margin-bottom: 3rem;
  padding: 3rem 2rem;
  background: linear-gradient(135deg, var(--accent-light), var(--accent-dark));
  border-radius: 16px;
  color: white;
  position: relative;
  overflow: hidden;
  
  .theme-dark & {
    background: linear-gradient(135deg, var(--accent-dark), var(--accent-light));
  }
  
  .theme-sepia & {
    background: linear-gradient(135deg, var(--accent-sepia), #b8860b);
  }
  
  @media (max-width: 768px) {
    padding: 2rem 1rem;
  }
`;

const WelcomeTitle = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 1rem;
  font-weight: 700;
  
  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const WelcomeSubtitle = styled.p`
  font-size: 1.2rem;
  opacity: 0.9;
  margin-bottom: 2rem;
  
  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const QuickActions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
`;

const ActionButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 0.75rem 2rem;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
  }
  
  @media (max-width: 768px) {
    padding: 0.75rem 1.5rem;
    font-size: 0.9rem;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
`;

const StatCard = styled.div`
  background-color: var(--bg-secondary-light);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  }
  
  .theme-dark & {
    background-color: var(--bg-secondary-dark);
    border-color: var(--border-dark);
    
    &:hover {
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
    }
  }
  
  .theme-sepia & {
    background-color: var(--bg-secondary-sepia);
    border-color: var(--border-sepia);
    
    &:hover {
      box-shadow: 0 8px 25px rgba(92, 75, 55, 0.1);
    }
  }
`;

const StatIcon = styled.div`
  font-size: 2.5rem;
  margin-bottom: 1rem;
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

const RecentlyReadGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
`;

const BookCard = styled.div`
  background-color: var(--bg-secondary-light);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  }
  
  .theme-dark & {
    background-color: var(--bg-secondary-dark);
    border-color: var(--border-dark);
    
    &:hover {
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
    }
  }
  
  .theme-sepia & {
    background-color: var(--bg-secondary-sepia);
    border-color: var(--border-sepia);
    
    &:hover {
      box-shadow: 0 4px 15px rgba(92, 75, 55, 0.1);
    }
  }
`;

const BookCover = styled.div`
  width: 100%;
  height: 120px;
  background-color: var(--accent-light);
  border-radius: 8px;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: white;
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

const BookTitle = styled.h3`
  font-size: 1rem;
  margin-bottom: 0.5rem;
  color: var(--text-primary-light);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  
  .theme-dark & {
    color: var(--text-primary-dark);
  }
  
  .theme-sepia & {
    color: var(--text-primary-sepia);
  }
`;

const BookProgress = styled.div`
  font-size: 0.8rem;
  color: var(--text-secondary-light);
  margin-bottom: 0.5rem;
  
  .theme-dark & {
    color: var(--text-secondary-dark);
  }
  
  .theme-sepia & {
    color: var(--text-secondary-sepia);
  }
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 4px;
  background-color: var(--border-light);
  border-radius: 2px;
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
  
  h3 {
    font-size: 1.2rem;
    margin-bottom: 1rem;
  }
  
  p {
    margin-bottom: 1.5rem;
  }
`;

const Dashboard = () => {
  const navigate = useNavigate();
  const { savedBooks, readingProgress, getReadingStats, getRecentlyRead } = useLibrary();
  const [greeting, setGreeting] = useState('');

  const stats = getReadingStats();
  const recentBooks = getRecentlyRead();

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const handleBookClick = (book) => {
    navigate(`/book/${book.source}`, { 
      state: { book, url: book.link } 
    });
  };

  const continueReading = (book) => {
    const progress = readingProgress[book.id];
    if (progress && progress.currentChapter !== null) {
      // Navigate to the current chapter
      navigate(`/reader/${book.source}`, {
        state: { 
          book, 
          bookUrl: book.link,
          // This would need to be populated with actual chapter data
          chapter: { title: `Chapter ${progress.currentChapter + 1}`, link: '#' }
        }
      });
    } else {
      handleBookClick(book);
    }
  };

  return (
    <DashboardContainer>
      <WelcomeSection>
        <WelcomeTitle>{greeting}, Reader! 📚</WelcomeTitle>
        <WelcomeSubtitle>
          Ready to dive into your next great adventure?
        </WelcomeSubtitle>
        <QuickActions>
          <ActionButton onClick={() => navigate('/search')}>
            🔍 Discover Books
          </ActionButton>
          <ActionButton onClick={() => navigate('/library')}>
            📚 My Library
          </ActionButton>
        </QuickActions>
      </WelcomeSection>

      <StatsGrid>
        <StatCard>
          <StatIcon>📚</StatIcon>
          <StatNumber>{stats.totalBooks}</StatNumber>
          <StatLabel>Total Books</StatLabel>
        </StatCard>
        
        <StatCard>
          <StatIcon>📖</StatIcon>
          <StatNumber>{stats.currentlyReading}</StatNumber>
          <StatLabel>Currently Reading</StatLabel>
        </StatCard>
        
        <StatCard>
          <StatIcon>✅</StatIcon>
          <StatNumber>{stats.completed}</StatNumber>
          <StatLabel>Completed</StatLabel>
        </StatCard>
        
        <StatCard>
          <StatIcon>🎯</StatIcon>
          <StatNumber>{Math.round(stats.averageProgress)}%</StatNumber>
          <StatLabel>Average Progress</StatLabel>
        </StatCard>
      </StatsGrid>

      {recentBooks.length > 0 ? (
        <>
          <SectionTitle>Continue Reading</SectionTitle>
          <RecentlyReadGrid>
            {recentBooks.map((book) => {
              const progress = readingProgress[book.id] || {};
              return (
                <BookCard key={book.id} onClick={() => continueReading(book)}>
                  <BookCover cover={book.cover}>
                    {!book.cover && '📖'}
                  </BookCover>
                  <BookTitle>{book.title}</BookTitle>
                  <BookProgress>
                    {progress.progress ? `${progress.progress}% complete` : 'Not started'}
                  </BookProgress>
                  <ProgressBar>
                    <ProgressFill progress={progress.progress || 0} />
                  </ProgressBar>
                </BookCard>
              );
            })}
          </RecentlyReadGrid>
        </>
      ) : (
        <EmptyState>
          <h3>📚 Your Reading Journey Starts Here</h3>
          <p>You haven't added any books to your library yet.</p>
          <ActionButton onClick={() => navigate('/search')}>
            Start Exploring Books
          </ActionButton>
        </EmptyState>
      )}
    </DashboardContainer>
  );
};

export default Dashboard;