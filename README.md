# PillowTalk Backend

Node.js/Express REST API + WebSocket server.

## Setup

### 1. Install Node.js
Download from https://nodejs.org (LTS version recommended).

### 2. Install dependencies
```bash
cd backend
npm install
```

### 3. Start the server
```bash
# Development (auto-restart on file changes)
npm run dev

# Production
npm start
```

Server runs at **http://localhost:3000**  
WebSocket at **ws://localhost:3000/ws**

## Demo credentials
- Email: `demo@pillowtalk.app`
- Password: `demo123`

## API Reference

### Auth
| Method | Route | Body | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/login` | `{email, password}` | Login |
| POST | `/api/auth/register` | `{name, email, password, age?, profession?}` | Register |

### Users
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/users/me` | My profile |
| PUT | `/api/users/me` | Update my profile |
| GET | `/api/users/discover` | Discover feed (unswiped users) |
| GET | `/api/users/:id` | User by ID |

### Matches
| Method | Route | Body | Description |
|--------|-------|------|-------------|
| GET | `/api/matches` | — | My matches list |
| POST | `/api/matches/swipe` | `{targetUserId, direction}` | Swipe left/right |
| DELETE | `/api/matches/:matchId` | — | Unmatch |
| PATCH | `/api/matches/:matchId/lastMessage` | `{lastMessage}` | Update preview |

### Chat
| Method | Route | Body | Description |
|--------|-------|------|-------------|
| GET | `/api/chat/:matchId/messages` | — | Message history |
| POST | `/api/chat/:matchId/messages` | `{content, type?, cardData?}` | Send message |

### Cards
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/cards/decks` | All card decks |
| GET | `/api/cards/decks/:deckId` | Specific deck |

### WebSocket
Connect to `ws://localhost:3000/ws?token=<jwt>`

Send JSON events:
```json
{ "event": "join",   "matchId": "..." }
{ "event": "leave",  "matchId": "..." }
{ "event": "typing", "matchId": "...", "isTyping": true }
```

Receive events:
```json
{ "event": "connected", "userId": "..." }
{ "event": "message",   "data": { ...messageObject } }
{ "event": "typing",    "senderId": "...", "isTyping": true }
```

## Flutter connection
- **Android emulator** → use `http://10.0.2.2:3000`
- **iOS simulator / desktop** → use `http://localhost:3000`

Set the base URL in `lib/services/api_client.dart`.
