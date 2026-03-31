# Doukhou 🎯

**Activity-Based Dating App for the Tunisian Market**

Doukhou helps people move from online matches to real-life meetings through structured, safe activity planning.

## What Makes It Different

Instead of endless chatting, Doukhou focuses on **getting people to actually meet**. After matching, users can suggest concrete date plans — activities, locations, times — making the transition from match to real meeting seamless.

## Tech Stack

### Backend (runs on Raspberry Pi)
- **Runtime:** Node.js 18+ with Express.js
- **Database:** JSON file-based data lake (no traditional DB)
- **Real-time:** Socket.io for chat
- **Auth:** JWT + bcrypt
- **Maps:** OpenStreetMap (Overpass API, Nominatim)
- **Push:** OneSignal (free tier)
- **Process:** PM2 + Nginx reverse proxy

### Mobile (iOS + Android)
- **Framework:** React Native with Expo
- **UI:** React Native Paper
- **State:** Redux Toolkit
- **Navigation:** React Navigation
- **Maps:** react-native-maps with OSM tiles
- **Chat:** Socket.io client

## Project Structure

```
/backend
  /src
    /routes        — API route handlers
    /controllers   — Business logic
    /middleware     — Auth, validation, rate limiting
    /utils         — DB manager, constants, helpers
  /data            — JSON data lake (gitignored)
  /uploads         — User photos (gitignored)
  package.json
  .env.example

/mobile            — React Native app (coming soon)
```

## Getting Started

### Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env with your values
npm install
npm run dev
```

### Raspberry Pi Deployment
See [deployment guide] for full instructions.

## API Endpoints

| Category | Endpoints |
|----------|-----------|
| Auth | register, login, logout, me |
| Users | profile CRUD, photos, preferences |
| Matches | discover, swipe, match list, unmatch |
| Chat | conversations, messages (HTTP + Socket.io) |
| Proposals | create, accept/decline/modify, suggestions |
| Groups | CRUD, join/approve, group chat |
| Safety | report, block/unblock |

## License

MIT
