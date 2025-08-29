# Reading App

A modern web application for reading and managing books, built with React and Node.js.

## Features

- **Book Library Management**: Organize and categorize your book collection
- **Reading Interface**: Clean, distraction-free reading experience
- **Search Functionality**: Find books quickly with advanced search capabilities
- **Theme Support**: Light and dark mode for comfortable reading
- **Responsive Design**: Works seamlessly across desktop and mobile devices

## Tech Stack

- **Frontend**: React.js with modern hooks and context API
- **Backend**: Node.js server
- **Styling**: CSS with responsive design principles
- **State Management**: React Context for global state

## Project Structure

```
reading-app/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── BookPage.js
│   │   │   ├── Header.js
│   │   │   ├── LibraryPage.js
│   │   │   ├── Reader.js
│   │   │   └── SearchPage.js
│   │   ├── context/       # React context providers
│   │   │   ├── LibraryContext.js
│   │   │   └── ThemeContext.js
│   │   ├── App.js         # Main application component
│   │   └── index.js       # Application entry point
│   └── public/            # Static assets
├── server/                 # Node.js backend server
│   └── index.js           # Server entry point
└── package.json            # Project dependencies and scripts
```

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn package manager

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd reading-app
   ```

2. Install dependencies for both client and server:
   ```bash
   # Install root dependencies
   npm install
   
   # Install client dependencies
   cd client
   npm install
   
   # Install server dependencies
   cd ../server
   npm install
   ```

3. Set up environment variables:
   ```bash
   # Copy the example environment file
   cp env.example .env
   
   # Edit .env with your configuration
   ```

### Running the Application

1. Start the backend server:
   ```bash
   cd server
   npm start
   ```

2. In a new terminal, start the frontend client:
   ```bash
   cd client
   npm start
   ```

3. Open your browser and navigate to `http://localhost:3000`

## Available Scripts

### Root Directory
- `npm install` - Install all dependencies

### Client Directory
- `npm start` - Start the development server
- `npm build` - Build the app for production
- `npm test` - Run tests
- `npm eject` - Eject from Create React App

### Server Directory
- `npm start` - Start the Node.js server

## Features in Detail

### Library Management
- Add, edit, and remove books from your collection
- Organize books by categories and tags
- Track reading progress and book status

### Reading Experience
- Clean, typography-focused reading interface
- Adjustable font sizes and line spacing
- Bookmark and highlight functionality

### Search and Discovery
- Full-text search across your library
- Filter books by various criteria
- Sort and organize your collection

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

If you encounter any issues or have questions, please open an issue on the repository or contact the development team.

---

**Happy Reading! 📚**

