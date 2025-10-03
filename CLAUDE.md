# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VoidChat v2.0 - A modern real-time chat application built with Node.js, Express, WebSocket, and SQLite. This is a complete rewrite of the legacy AjChat PHP application using modern web technologies, providing real-time communication with a sleek dark theme UI.

## Technology Stack

- **Backend**: Node.js 16+ with Express.js
- **Database**: SQLite with better-sqlite3 (synchronous API)
- **Real-time**: WebSocket via ws library
- **Frontend**: Vanilla JavaScript (no frameworks)
- **Styling**: Modern CSS with CSS Grid, Flexbox, and CSS Variables
- **Security**: sanitize-html, express-rate-limit

## Commands

### Development
```bash
npm install          # Install dependencies
npm start           # Start production server (port 3000)
npm run dev         # Start development server with nodemon
```

### Database
- Database file: `voidchat.db` (auto-created on first run)
- Schema initialized automatically via `database.js`
- No manual setup required

## Project Structure

```
VoidChat/
├── server.js              # Express server + WebSocket handler
├── database.js            # SQLite schema & database operations
├── package.json           # Dependencies and scripts
├── voidchat.db           # SQLite database (auto-generated)
├── public/               # Static frontend files
│   ├── index.html        # Homepage (room browser)
│   ├── chat.html         # Chat room interface
│   ├── css/style.css     # Modern dark theme styles
│   └── js/
│       ├── index.js      # Homepage logic (room search, suggestions)
│       └── chat.js       # Chat functionality (WebSocket client)
```

## Architecture

### Backend (server.js)

**Express Routes:**
- `GET /` → Serve homepage
- `GET /chat/:roomName` → Serve chat page
- `GET /api/rooms/search?q=query` → Search rooms by prefix
- `GET /api/rooms/recent` → Get recently active rooms (top 5)
- `GET /api/rooms/popular` → Get popular rooms by message count (top 5)
- `GET /api/rooms/:name` → Get room info + last 50 messages
- `GET /api/rooms/:name/export` → Export chat log as text file

**WebSocket Protocol:**

Client → Server:
```javascript
{ type: 'join', room: 'roomname', username: 'user' }
{ type: 'message', message: 'text', username: 'user' }
{ type: 'typing', username: 'user' }
```

Server → Client:
```javascript
{ type: 'joined', room: 'name', username: 'user', color: '#hex' }
{ type: 'message', username: 'user', message: 'text', color: '#hex', timestamp: 123 }
{ type: 'system', message: 'User joined', timestamp: 123 }
{ type: 'typing', username: 'user' }
{ type: 'error', message: 'error text' }
```

**Room Management:**
- Rooms auto-created on first join
- Active connections tracked in `roomConnections` Map
- Broadcast messages to all clients in room except sender

**Rate Limiting:**
- API: 60 requests per minute per IP
- Messages: 500ms minimum between messages per user

### Database (database.js)

**Schema:**
- `rooms` table: id, name (unique), created_at, updated_at, message_count
- `messages` table: id, room_id, username, message, color, timestamp
- `users` table: id, username (unique), password, email, settings (unused in current version)

**Key Operations:**
- `db_ops.createRoom(name)` - Insert new room
- `db_ops.getRoom(name)` - Fetch room by name
- `db_ops.insertMessage(roomId, username, message, color)` - Save message
- `db_ops.getMessages(roomId, limit)` - Fetch last N messages
- `db_ops.cleanOldMessages(roomId, keepCount)` - Delete old messages (keeps last 200)

**Automatic Cleanup:**
- Triggered every 50 messages per room
- Keeps most recent 200 messages, deletes older ones

### Frontend

**Homepage (index.html + index.js):**
- Room name input with live search suggestions (debounced 300ms)
- Display recent/popular rooms loaded via fetch
- Form validation: alphanumeric + hyphens/underscores, 1-25 chars
- Navigate to `/chat/:roomName` on submission

**Chat Page (chat.html + chat.js):**
- WebSocket connection established on load
- Load initial messages via REST API
- Real-time message display with fade-in animation
- Settings panel: username, timestamps toggle, sound toggle, system messages toggle
- Typing indicator (3s timeout)
- Export chat log (downloads text file)
- Share modal with room link and iframe embed code
- Local storage: username, settings preferences

**Message Formatting:**
- Simple markdown: `**bold**`, `*italic*`, `` `code` ``
- Auto-linked URLs (sanitized server-side)
- XSS prevention via sanitize-html

**Color Assignment:**
- Username hashed to HSL color: `hsl(hash % 360, 65%, 50%)`
- Persistent per username, visual user identification

## Key Features

### Real-time Communication
- WebSocket maintains persistent connection
- Instant message delivery without polling
- Typing indicators broadcast to room
- Join/leave notifications

### Security
- Input validation: room names (1-25 alphanumeric+hyphens), usernames (1-20 alphanumeric)
- HTML sanitization with sanitize-html (allows only safe tags)
- Rate limiting on API and WebSocket messages
- Prepared statements prevent SQL injection
- XSS protection on all user inputs

### Responsive Design
- Mobile-first CSS with breakpoints at 768px
- Flexbox/Grid layouts adapt to screen size
- Settings panel slides in on mobile
- Touch-friendly controls

## Common Development Tasks

### Adding a New API Endpoint
1. Add route in `server.js` (e.g., `app.get('/api/...', (req, res) => {})`)
2. Add database operation in `database.js` if needed
3. Test with curl or browser fetch

### Modifying Database Schema
1. Edit schema in `database.js` `initializeDatabase()`
2. Delete `voidchat.db` to recreate (loses data)
3. For production, write migration script

### Customizing UI Theme
1. Edit CSS variables in `public/css/style.css` `:root` selector
2. Colors, shadows, spacing all defined as variables
3. Dark theme currently, can add light theme toggle

### Adding Markdown Features
1. Extend `processMarkdown()` in `public/js/chat.js`
2. Add regex patterns for new syntax
3. Sanitize on server-side in `server.js` if needed

## Differences from Legacy AjChat

**Major Changes:**
- WebSocket replaces AJAX polling (750ms → real-time)
- SQLite replaces MySQL + file storage
- No PHP/Apache dependencies
- Simplified authentication (username-only, no passwords)
- Markdown instead of BBCode
- Modern dark theme UI
- No smileys/emoticons (can use Unicode emoji)
- Browser timezone instead of server-side timezone setting

**Retained Features:**
- Dynamic room creation
- Color-coded users
- Chat history persistence
- Export chat logs
- Shareable/embeddable rooms
- Recent/popular room lists

## Troubleshooting

**WebSocket connection fails:**
- Check if port 3000 is open
- Verify no reverse proxy issues (ensure WS upgrade works)
- Check browser console for connection errors

**Database locked errors:**
- better-sqlite3 is single-writer, ensure no concurrent writes
- Check file permissions on voidchat.db
- Restart server if corruption suspected

**High memory usage:**
- Reduce message retention in `cleanOldMessages` (default 200)
- Add periodic cleanup job for inactive rooms
- Monitor `roomConnections` Map size

## Testing

Manual testing checklist:
1. Homepage loads and shows recent/popular rooms
2. Search suggestions appear when typing
3. Can create new room
4. Can join existing room
5. Messages send and receive in real-time
6. Multiple users see each other's messages
7. Settings persist in localStorage
8. Export downloads chat log
9. Share modal shows correct URLs
10. Mobile responsive design works
