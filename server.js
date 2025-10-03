const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { db_ops } = require('./database');
const sanitizeHtml = require('sanitize-html');
const MarkdownIt = require('markdown-it');
const rateLimit = require('express-rate-limit');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;
const md = new MarkdownIt();

// Store active connections per room
const roomConnections = new Map();

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60
});

app.use('/api/', apiLimiter);

// Utility functions
function generateColorFromIP(ip) {
  // Extract IP address (handle IPv6 and proxied IPs)
  let cleanIP = ip;
  if (ip.startsWith('::ffff:')) {
    cleanIP = ip.substring(7); // Remove IPv6 prefix for IPv4
  }

  let hash = 0;
  for (let i = 0; i < cleanIP.length; i++) {
    hash = cleanIP.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 65%, 50%)`;
}

function sanitizeMessage(message) {
  return sanitizeHtml(message, {
    allowedTags: ['b', 'i', 'u', 'a', 'code', 'pre', 'br'],
    allowedAttributes: {
      'a': ['href', 'target']
    },
    transformTags: {
      'a': (tagName, attribs) => ({
        tagName: 'a',
        attribs: {
          href: attribs.href,
          target: '_blank',
          rel: 'noopener noreferrer'
        }
      })
    }
  });
}

function validateRoomName(name) {
  return /^[a-zA-Z0-9_-]{1,25}$/.test(name);
}

function validateUsername(username) {
  return /^[a-zA-Z0-9_-]{1,20}$/.test(username);
}

// API Routes
app.get('/api/rooms/search', (req, res) => {
  const query = req.query.q || '';
  if (!query) {
    return res.json([]);
  }
  const rooms = db_ops.searchRooms(query.toLowerCase());
  res.json(rooms);
});

app.get('/api/rooms/recent', (req, res) => {
  const rooms = db_ops.getRecentRooms(5);
  res.json(rooms);
});

app.get('/api/rooms/popular', (req, res) => {
  const rooms = db_ops.getPopularRooms(5);
  res.json(rooms);
});

app.get('/api/rooms/:name', (req, res) => {
  const roomName = req.params.name.toLowerCase();

  if (!validateRoomName(roomName)) {
    return res.status(400).json({ error: 'Invalid room name' });
  }

  let room = db_ops.getRoom(roomName);

  if (!room) {
    db_ops.createRoom(roomName);
    room = db_ops.getRoom(roomName);
  }

  const messages = db_ops.getMessages(room.id, 50);

  res.json({
    room,
    messages
  });
});

app.get('/api/rooms/:name/export', (req, res) => {
  const roomName = req.params.name.toLowerCase();

  if (!validateRoomName(roomName)) {
    return res.status(400).json({ error: 'Invalid room name' });
  }

  const room = db_ops.getRoom(roomName);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const messages = db_ops.getMessages(room.id, 1000);

  let logText = `Chat Log for #${roomName}\n`;
  logText += `Exported: ${new Date().toISOString()}\n`;
  logText += '='.repeat(50) + '\n\n';

  messages.forEach(msg => {
    const timestamp = new Date(msg.timestamp).toISOString();
    logText += `[${timestamp}] ${msg.username}: ${msg.message}\n`;
  });

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', `attachment; filename="chat-${roomName}-${Date.now()}.txt"`);
  res.send(logText);
});

// Serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/chat/:roomName', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  let currentRoom = null;
  let username = 'guest';
  let lastMessageTime = 0;

  // Get client IP address
  const clientIP = req.headers['x-forwarded-for']?.split(',')[0].trim() ||
                   req.socket.remoteAddress ||
                   'unknown';
  const userColor = generateColorFromIP(clientIP);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      // Rate limiting
      const now = Date.now();
      if (now - lastMessageTime < 500) {
        ws.send(JSON.stringify({ type: 'error', message: 'Too many messages. Please slow down.' }));
        return;
      }

      switch (data.type) {
        case 'join':
          const roomName = data.room.toLowerCase();

          if (!validateRoomName(roomName)) {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid room name. Use only alphanumeric characters, hyphens, and underscores (1-25 chars).' }));
            return;
          }

          // Create room if it doesn't exist
          let room = db_ops.getRoom(roomName);
          if (!room) {
            db_ops.createRoom(roomName);
            room = db_ops.getRoom(roomName);
          }

          currentRoom = roomName;
          username = data.username || 'guest';

          if (!validateUsername(username)) {
            username = 'guest';
          }

          // Add connection to room
          if (!roomConnections.has(roomName)) {
            roomConnections.set(roomName, new Set());
          }
          roomConnections.get(roomName).add(ws);

          // Send join confirmation
          ws.send(JSON.stringify({
            type: 'joined',
            room: roomName,
            username: username,
            color: userColor
          }));

          // Broadcast join message
          broadcastToRoom(roomName, {
            type: 'system',
            message: `${username} joined the chat`,
            timestamp: Date.now()
          }, ws);

          break;

        case 'message':
          if (!currentRoom) {
            ws.send(JSON.stringify({ type: 'error', message: 'Not in a room' }));
            return;
          }

          if (!data.message || data.message.trim().length === 0) {
            return;
          }

          if (data.message.length > 500) {
            ws.send(JSON.stringify({ type: 'error', message: 'Message too long (max 500 characters)' }));
            return;
          }

          username = data.username || 'guest';
          if (!validateUsername(username)) {
            username = 'guest';
          }

          const messageRoom = db_ops.getRoom(currentRoom);
          const cleanMessage = sanitizeMessage(data.message.trim());

          // Save message to database
          db_ops.insertMessage(messageRoom.id, username, cleanMessage, userColor);
          db_ops.updateRoomTimestamp(messageRoom.id);

          // Broadcast message to room
          const messageData = {
            type: 'message',
            username: username,
            message: cleanMessage,
            color: userColor,
            timestamp: Date.now()
          };

          broadcastToRoom(currentRoom, messageData);
          lastMessageTime = now;

          // Clean old messages periodically (every 50 messages)
          if (messageRoom.message_count % 50 === 0) {
            db_ops.cleanOldMessages(messageRoom.id);
          }

          break;

        case 'typing':
          if (currentRoom) {
            broadcastToRoom(currentRoom, {
              type: 'typing',
              username: username
            }, ws);
          }
          break;
      }
    } catch (error) {
      console.error('WebSocket error:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });

  ws.on('close', () => {
    if (currentRoom && roomConnections.has(currentRoom)) {
      roomConnections.get(currentRoom).delete(ws);

      // Broadcast leave message
      broadcastToRoom(currentRoom, {
        type: 'system',
        message: `${username} left the chat`,
        timestamp: Date.now()
      });

      // Clean up empty rooms
      if (roomConnections.get(currentRoom).size === 0) {
        roomConnections.delete(currentRoom);
      }
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

function broadcastToRoom(roomName, data, excludeWs = null) {
  if (!roomConnections.has(roomName)) return;

  const message = JSON.stringify(data);
  roomConnections.get(roomName).forEach((client) => {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Start server
server.listen(PORT, () => {
  console.log(`VoidChat server running on http://localhost:${PORT}`);
});
