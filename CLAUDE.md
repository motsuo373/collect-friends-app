# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Development Server
- `npm start` or `npx expo start` - Start the development server
- `npm run ios` or `npx expo start --ios` - Run on iOS Simulator
- `npm run android` or `npx expo start --android` - Run on Android Emulator
- `npm run web` or `npx expo start --web` - Run on web browser

### Code Quality
- `npm run lint` or `expo lint` - Run ESLint to check code quality
- ESLint configuration is in `eslint.config.js` using Expo's flat config

### Project Management
- `npm run reset-project` - Reset project to initial state (runs `scripts/reset-project.js`)

## Architecture Overview

### Technology Stack
- **Frontend Framework**: React Native 0.79.3 with React 19.0.0
- **Development Platform**: Expo SDK ~53.0.11
- **Routing**: Expo Router ~5.0.7 (file-based routing)
- **Styling**: twrnc ^4.9.0 (TailwindCSS for React Native)
- **Maps**: react-native-maps 1.20.1
- **Database**: Firebase 11.9.1 (Firestore for data, Authentication)
- **Language**: TypeScript ~5.8.3

### Project Structure
```
collect-friends-app/
├── app/                     # Screen files using Expo Router
│   ├── (tabs)/             # Tab-based navigation
│   │   ├── index.tsx       # Main map screen (home)
│   │   └── explore.tsx     # Explore/discovery screen
│   ├── _layout.tsx         # Root layout with navigation theme
│   └── +not-found.tsx      # 404 page
├── components/             # Reusable UI components
│   ├── StatusModal.tsx     # Main status setting modal
│   ├── ThemedText.tsx      # Themed text component
│   ├── ThemedView.tsx      # Themed view component
│   └── ui/                # UI utility components
├── constants/             # App constants and configurations
├── hooks/                # Custom React hooks
├── assets/               # Images, fonts, and static assets
├── firebaseConfig.js     # Firebase configuration and setup
└── package.json         # Dependencies and scripts
```

### Core App Concept
This is a location-based social app called "Collect Friends" that helps users find nearby friends who are available to hang out in real-time. Key features:
- Real-time location sharing and status updates
- Immediate availability matching ("free now", "free this evening", etc.)
- Activity preferences (café, drinks, walking, shopping, movies, lunch)
- Movement range settings (walking distance, train distance, etc.)
- Map-based visualization of friends' availability

### Key Components & Architecture

#### Main Map Screen (`app/(tabs)/index.tsx`)
- Handles location permissions and GPS access
- Uses `react-native-maps` for map display (mobile) with fallback for web
- Implements status modal for availability settings
- Shows user location with colored markers (green=available, orange=busy)
- Displays movement range as a circle overlay on map
- Contains floating action buttons for location and status

#### Status Management (`components/StatusModal.tsx`)
- Modal component for setting user availability
- Manages availability types: 'now', 'evening', 'tomorrow_morning', 'tomorrow_evening'
- Activity selection with emoji icons
- Movement range selection (500m to 10km)
- Validates that at least one activity is selected when available

#### Firebase Integration (`firebaseConfig.js`)
- Configured for Firestore database and Authentication
- Uses environment variables for API keys
- Exports `db` instance for database operations

#### Styling Approach
- Uses `twrnc` for TailwindCSS-style classes in React Native
- Themed components (`ThemedText`, `ThemedView`) for consistent design
- Platform-specific adaptations (web vs mobile)

### Development Notes

#### Location Handling
- Requests location permissions on app startup
- Uses Expo Location API for mobile platforms
- Falls back to web geolocation API for browser
- Handles permission denial gracefully with retry options

#### Cross-Platform Considerations
- Map functionality limited on web (displays fallback UI)
- Different permission flows for iOS/Android vs web
- Platform-specific imports for react-native-maps

#### State Management
- Uses React hooks for local state management
- No external state management library currently
- Firebase will be used for persistent data storage

#### Firebase Environment Setup
Firebase configuration expects environment variables:
- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`
- `EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID`

### Future Implementation Plans
Based on the feature specification document, the app will expand to include:
- User authentication and friend management
- Real-time friend status updates via Firestore
- AI-powered activity suggestions
- Chat functionality
- Automatic venue reservations
- Community tags for groups (university, company, etc.)
- Push notifications for availability updates

### Code Conventions
- TypeScript interfaces are used for type safety
- Component props are properly typed
- TailwindCSS classes via `twrnc` for styling
- Expo conventions for file structure and routing
- Platform-specific code handled via Platform.OS checks