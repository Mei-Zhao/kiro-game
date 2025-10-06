# Technology Stack & Build System

## Tech Stack
- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+)
- **No Framework Dependencies**: Pure web technologies for maximum compatibility
- **Audio**: Web Audio API for sound effects
- **Storage**: localStorage for game state persistence
- **Performance**: RequestAnimationFrame for smooth animations

## Architecture Pattern
- **Modular Design**: Separate files for different game systems
- **Class-based Components**: ES6 classes for game entities
- **Event-driven Architecture**: Custom event system for component communication
- **Factory Pattern**: Used for creating game instances and components

## File Structure
```
├── index.html              # Main game page
├── styles.css              # All CSS styles and animations
├── main.js                 # Application entry point and initialization
├── gameEngine.js           # Core game loop and state management
├── gameModels.js           # Game data structures and logic
├── renderer.js             # DOM rendering and UI updates
├── inputHandler.js         # Input processing (mouse/touch)
├── audioSystem.js          # Sound effects and audio management
├── scoreSystem.js          # Score calculation and tracking
├── storageManager.js       # Local storage operations
├── performanceOptimizer.js # Performance monitoring and optimization
└── test files              # Various test implementations
```

## Development Commands
Since this is a vanilla web project, no build system is required:

### Local Development
```bash
# Serve files locally (any HTTP server)
python -m http.server 8000
# or
npx serve .
# or
php -S localhost:8000
```

### Testing
```bash
# Open test files directly in browser
open test-gameengine.html
open test-renderer.html
open test-integration-simple.js
```

### Deployment
- Simply upload all files to any web server
- No compilation or build step required
- Ensure proper MIME types for .js files

## Code Style Guidelines
- Use ES6+ features (classes, arrow functions, const/let)
- Modular architecture with clear separation of concerns
- Comprehensive error handling with try-catch blocks
- Performance-first approach with requestAnimationFrame
- Accessibility-first design with ARIA labels
- Mobile-first responsive design approach