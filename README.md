# VoidChat

A modern, real-time chat application built with Node.js, Express, WebSocket, and SQLite. This is a complete rewrite of the legacy AjChat PHP application with modern web technologies and a sleek UI.

## Features

- 🚀 **Real-time messaging** with WebSocket technology
- 💬 **Dynamic chat rooms** - create and join rooms on the fly
- 🎨 **Color-coded users** - unique colors for each username
- 📱 **Responsive design** - works on desktop, tablet, and mobile
- 🔒 **No registration required** - just pick a username and start chatting
- 💾 **Message persistence** - chat history stored in SQLite
- 📤 **Export chat logs** - download conversation history
- 🔗 **Share rooms** - easy links and embed codes
- ⚙️ **Customizable settings** - timestamps, sounds, and more
- ✨ **Markdown support** - bold, italic, code, and auto-linked URLs

## Technology Stack

- **Backend**: Node.js with Express
- **Real-time Communication**: WebSocket (ws library)
- **Database**: SQLite with better-sqlite3
- **Frontend**: Vanilla JavaScript (no frameworks)
- **Styling**: Modern CSS with CSS Grid and Flexbox
- **Security**: Rate limiting, input sanitization, XSS protection

## Requirements

- Node.js 16+
- npm or yarn

## Installation

1. Clone or download this repository

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

4. Open your browser and navigate to:
```
http://localhost:3000
```

## Project Structure

```
VoidChat/
├── server.js              # Main server file with Express & WebSocket
├── database.js            # SQLite database setup and operations
├── package.json           # Dependencies and scripts
├── voidchat.db           # SQLite database (auto-created)
├── public/               # Static frontend files
│   ├── index.html        # Homepage
│   ├── chat.html         # Chat room page
│   ├── css/
│   │   └── style.css     # Modern dark theme styles
│   └── js/
│       ├── index.js      # Homepage functionality
│       └── chat.js       # Chat room functionality
└── README.md
```

## Usage

### Creating/Joining a Room

1. Go to the homepage
2. Enter a room name (alphanumeric, hyphens, underscores)
3. Click "Enter Room" or press Enter
4. Choose a username (optional - defaults to "guest")
5. Start chatting!

### Chat Features

- **Send messages**: Type and press Enter or click Send
- **Format text**: Use `**bold**`, `*italic*`, `` `code` ``
- **Settings**: Click the gear icon to customize
- **Export**: Download chat history as a text file
- **Share**: Get shareable links or embed codes

### API Endpoints

- `GET /` - Homepage
- `GET /chat/:roomName` - Chat room page
- `GET /api/rooms/recent` - Get recently active rooms
- `GET /api/rooms/popular` - Get popular rooms by message count
- `GET /api/rooms/search?q=query` - Search for rooms
- `GET /api/rooms/:name` - Get room info and messages
- `GET /api/rooms/:name/export` - Export chat log

### WebSocket Messages

**Client → Server:**
```javascript
// Join room
{ type: 'join', room: 'roomname', username: 'user' }

// Send message
{ type: 'message', message: 'Hello!', username: 'user' }

// Typing indicator
{ type: 'typing', username: 'user' }
```

**Server → Client:**
```javascript
// Join confirmation
{ type: 'joined', room: 'roomname', username: 'user', color: '#abc123' }

// New message
{ type: 'message', username: 'user', message: 'Hello!', color: '#abc123', timestamp: 1234567890 }

// System message
{ type: 'system', message: 'User joined', timestamp: 1234567890 }

// Error
{ type: 'error', message: 'Error description' }
```

## Configuration

Edit `server.js` to customize:

- **Port**: Change `PORT` environment variable or default (3000)
- **Rate limiting**: Modify `apiLimiter` settings
- **Message length**: Adjust max message length (default: 500 chars)
- **Room name length**: Modify validation (default: 1-25 chars)

Edit `database.js` to customize:

- **Message retention**: Change `cleanOldMessages` keep count (default: 200)
- **Default settings**: Modify user defaults (max lines, date format, etc.)

## Security Features

- Input validation and sanitization
- XSS protection with sanitize-html
- Rate limiting on API and messages
- WebSocket message throttling
- SQL injection prevention with prepared statements
- HTTPS support ready (configure reverse proxy)

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Android)

## Differences from Original AjChat

**Improvements:**
- Modern WebSocket instead of AJAX polling
- SQLite instead of MySQL
- No PHP dependencies
- Responsive mobile-first design
- Dark theme UI
- Better security practices
- Simplified codebase
- Real-time typing indicators
- Markdown formatting
- Better error handling

**Removed Features:**
- User authentication (simplified to username-only)
- BBCode (replaced with Markdown)
- Smileys/emoticons (can be added via Unicode)
- Timezone settings (uses browser local time)

## Development

To contribute or modify:

1. Fork the repository
2. Make your changes
3. Test thoroughly
4. Submit a pull request

### Adding Features

**Example: Add emoji picker**
1. Add emoji library to `public/index.html`
2. Create emoji picker UI in `public/chat.html`
3. Add click handler in `public/js/chat.js`
4. Insert emoji into message input

**Example: Add user authentication**
1. Add auth routes to `server.js`
2. Create login/signup pages
3. Store sessions with express-session
4. Validate user tokens in WebSocket connections

## Troubleshooting

**WebSocket won't connect:**
- Check firewall settings
- Ensure port 3000 is available
- Check browser console for errors

**Messages not persisting:**
- Ensure write permissions for voidchat.db
- Check disk space
- Review server logs

**High memory usage:**
- Reduce message retention count
- Implement message archiving
- Add automatic cleanup job

## License

[VoidChat](https://github.com/itsmikethetech/VoidChat) © 2025 by [MikeTheTech](http://playcast.io/a/mikethetech) and [Playcast Inc.](https://pyrosoft.pro/) is licensed under [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/)

[![CC BY-NC 4.0](https://licensebuttons.net/l/by-nc/4.0/88x31.png)](http://creativecommons.org/licenses/by-nc/4.0/)

You are free to:
- **Share** — copy and redistribute the material in any medium or format
- **Adapt** — remix, transform, and build upon the material

Under the following terms:
- **Attribution** — You must give appropriate credit, provide a link to the license, and indicate if changes were made
- **NonCommercial** — You may not use the material for commercial purposes

## Credits

Modern rewrite of [AjChat](http://ajchat.sourceforge.net) by Teh Ming Han (2005-2006)

Rewritten in 2025 with modern web technologies.

## Support

For issues, questions, or contributions, please open an issue on GitHub.
