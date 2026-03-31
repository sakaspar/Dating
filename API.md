# Doukhou API Documentation

**Base URL:** `https://your-rpi-url.com/api`

All endpoints require `Authorization: Bearer <token>` header unless marked as public.

---

## Auth Routes

### POST `/api/auth/register` — Public
Register a new user.
```json
{
  "email": "user@example.com",
  "password": "min6chars",
  "fullName": "Ahmed Ben Ali",
  "age": 25,
  "gender": "male",
  "latitude": 36.8065,
  "longitude": 10.1815
}
```
**Response:** `{ user, token }` (JWT 7-day expiry)

---

### POST `/api/auth/login` — Public
Login with email + password.
```json
{ "email": "user@example.com", "password": "min6chars" }
```
**Response:** `{ user, token }`

---

### POST `/api/auth/logout`
Logout current session.

### GET `/api/auth/me`
Get current user from token.
**Response:** `{ user }`

---

## User Routes

### GET `/api/users/profile`
Get own profile.

### PUT `/api/users/profile`
Update profile fields (name, bio, age, gender, latitude, longitude, etc.).

### POST `/api/users/photos`
Upload a photo (multipart/form-data, field: `photo`). Max 6 photos per user. Auto-resizes + generates thumbnails.

### DELETE `/api/users/photos/:id`
Delete a photo by ID.

### PUT `/api/users/preferences`
Update discovery preferences (age range, gender preference, max distance, etc.).

---

## Match Routes

### GET `/api/matches/discover`
Get potential matches (top 20 sorted by compatibility score). Filters: 50km radius, gender pref, age range, activity overlap.

### POST `/api/matches/swipe`
```json
{ "targetUserId": "uuid", "action": "like" }
```
`action`: `"like"` or `"pass"`. If mutual like, creates a match + sends push notification.

### GET `/api/matches`
List all active matches with profile previews + last message.

### DELETE `/api/matches/:id`
Unmatch (removes match + cleans up conversation).

---

## Chat Routes

### GET `/api/chat/conversations`
List all conversations (matches with chat history).

### GET `/api/chat/:conversationId/messages?page=1`
Get message history (paginated, 50 per page).

### POST `/api/chat/:conversationId/messages`
Send a message via HTTP (fallback when socket unavailable).
```json
{ "text": "Hello!" }
```

---

## Proposal Routes

### POST `/api/proposals`
Create a date proposal.
```json
{
  "matchId": "uuid",
  "activityType": "coffee",
  "proposedDate": "2026-04-15",
  "proposedTime": "14:00",
  "neighborhood": "La Marsa",
  "budgetRange": "medium",
  "suggestedPlace": "Café Le Baroque",
  "notes": "Optional note"
}
```

### GET `/api/proposals/:matchId`
List all proposals for a match (with status + modification history).

### PUT `/api/proposals/:id/accept`
Accept a proposal → creates confirmed date.

### PUT `/api/proposals/:id/decline`
Decline a proposal.

### PUT `/api/proposals/:id/modify`
Counter-proposal (modification history preserved).
```json
{ "modifications": { "proposedDate": "2026-04-16", "proposedTime": "16:00" } }
```

### GET `/api/proposals/suggestions/:matchId`
Get smart place suggestions based on shared activities. Uses OpenStreetMap Overpass API for nearby cafes, restaurants, parks.

### GET `/api/proposals/search/place?query=cafe`
Search places via Nominatim geocoding.

---

## Group Routes

### POST `/api/groups`
Create a group activity.
```json
{
  "activityType": "outdoor",
  "title": "Hiking in Boukornine",
  "description": "Weekend hike, all levels welcome",
  "date": "2026-04-20",
  "location": { "name": "Boukornine", "lat": 36.7, "lon": 10.3 },
  "groupSize": 8,
  "lookingFor": 4,
  "visibility": "public",
  "ageRange": { "min": 20, "max": 35 },
  "genderPreference": "any"
}
```

### GET `/api/groups?type=outdoor&date=2026-04-20`
Browse groups with filters.

### GET `/api/groups/:id`
Get group details (members, requests, status).

### POST `/api/groups/:id/join`
Request to join a group.

### PUT `/api/groups/:id/approve/:userId`
Approve a join request (creator only).

### DELETE `/api/groups/:id/leave`
Leave a group.

### DELETE `/api/groups/:id/kick/:userId`
Kick a member (creator only).

### GET `/api/groups/:id/messages`
Get group chat history.

---

## Safety Routes

### POST `/api/safety/report`
Report a user. Multipart/form-data for optional evidence upload.
```json
{
  "userId": "uuid",
  "reason": "harassment",
  "details": "Description of the incident"
}
```
**Reasons:** `inappropriate_behavior`, `fake_profile`, `harassment`, `scam`

### GET `/api/safety/reports`
Admin: list all reports.

### PUT `/api/safety/reports/:id`
Admin: update report status (resolve, dismiss, ban user).

### POST `/api/safety/block`
```json
{ "userId": "uuid" }
```
Blocks user: unmatches, removes from discovery, removes from matches.

### GET `/api/safety/blocked`
List blocked users.

### DELETE `/api/safety/block/:userId`
Unblock a user.

---

## Analytics Routes

### GET `/api/analytics/today`
Today's analytics snapshot.

### GET `/api/analytics`
Full analytics history.

### GET `/api/analytics/:date`
Analytics for a specific date (YYYY-MM-DD).

---

## Backup Routes

### GET `/api/backup/status`
Check backup system status.

### POST `/api/backup/run`
Trigger manual backup.

### GET `/api/backup/log`
View backup history log.

---

## Health Check

### GET `/health` — Public
```json
{ "status": "ok", "timestamp": "...", "uptime": 1234, "memory": { ... } }
```

---

## Socket.io Events

Connect with JWT auth:
```js
const socket = io(SERVER_URL, { auth: { token: 'jwt-token' } });
```

### Chat Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `message:send` | Client → Server | `{ conversationId, text }` |
| `message:receive` | Server → Client | `{ matchId, message: { id, senderId, text, timestamp } }` |
| `message:read` | Client → Server | `{ conversationId, messageId }` |
| `typing:start` | Bidirectional | `{ conversationId }` |
| `typing:stop` | Bidirectional | `{ conversationId }` |

### User Status Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `user:online` | Server → Client | `{ userId }` |
| `user:offline` | Server → Client | `{ userId }` |

### Group Chat Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `group:join` | Client → Server | `{ groupId }` |
| `group:leave` | Client → Server | `{ groupId }` |
| `group:message:send` | Client → Server | `{ groupId, text }` |
| `group:message:receive` | Server → Client | `{ groupId, message }` |
| `group:typing:start` | Client → Server | `{ conversationId: 'group_{id}' }` |
| `group:typing:stop` | Client → Server | `{ conversationId: 'group_{id}' }` |

---

## Error Responses

All errors return:
```json
{ "error": "Error message here" }
```

| Code | Meaning |
|------|---------|
| 400 | Bad request / validation error |
| 401 | Unauthorized / invalid token |
| 403 | Forbidden (blocked user, not group creator) |
| 404 | Resource not found |
| 429 | Rate limited (100 req / 15 min) |
| 500 | Server error |

---

## Tunisian Constants

- **Neighborhoods:** Tunis, La Marsa, Carthage, Sidi Bou Said, Sousse, Hammamet, Monastir, Mahdia, Tozeur, Djerba, Sfax, Bizerte
- **Budget Ranges:** `low` (<30 TND), `medium` (30-80 TND), `high` (>80 TND)
- **Activity Types:** `coffee`, `restaurant`, `activities`, `outdoor`, `social`, `events`
