# Patrol Navigation App

A community-driven navigation app that helps users drive safer by providing real-time information about patrol locations.

## Features

- Real-time patrol reports from community members
- Navigation with patrol avoidance capabilities
- Alert system for patrol notifications
- User reporting and verification system
- Dark mode support
- Offline map capability

## Technology Stack

- React Native with Expo
- TypeScript
- Expo Router for navigation
- React Native Maps for mapping functionality
- Context API for state management
- AsyncStorage for local data persistence
- WebSocket for real-time updates

## Getting Started

### Prerequisites

- Node.js (v16 or newer)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/patrol-nav-app.git
   cd patrol-nav-app
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```

4. Run on a device or simulator:
    - Press `a` for Android
    - Press `i` for iOS
    - Scan the QR code with Expo Go app on your device

## Project Structure

- `/app` - Expo Router screens and navigation
- `/components` - Reusable UI components
- `/context` - Context providers for state management
- `/services` - API and utility services
- `/constants` - App constants and theme
- `/types` - TypeScript type definitions
- `/utils` - Utility functions

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add some amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- OpenStreetMap for map data
- React Native and Expo community
- Contributors and testers