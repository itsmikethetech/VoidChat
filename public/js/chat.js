// Chat page functionality
const roomNameElement = document.getElementById('room-name');
const messagesContainer = document.getElementById('messages');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const submitBtn = messageForm.querySelector('button[type="submit"]');
const usernameInput = document.getElementById('username-input');
const usernameQuickInput = document.getElementById('username-quick');
const settingsBtn = document.getElementById('settings-btn');
const settingsPanel = document.querySelector('.settings-panel');
const closeSettingsBtn = document.getElementById('close-settings');
const exportBtn = document.getElementById('export-btn');
const shareBtn = document.getElementById('share-btn');
const shareModal = document.getElementById('share-modal');
const timestampsToggle = document.getElementById('timestamps-toggle');
const soundToggle = document.getElementById('sound-toggle');
const systemMessagesToggle = document.getElementById('system-messages-toggle');
const typingIndicator = document.getElementById('typing-indicator');

let ws = null;
let roomName = '';
let username = localStorage.getItem('username') || 'guest';
let userColor = '#6366f1';
let typingTimeout = null;
let isTyping = false;

// Extract room name from URL
const pathParts = window.location.pathname.split('/');
roomName = pathParts[pathParts.length - 1];

// Initialize
function init() {
  roomNameElement.textContent = roomName;
  usernameInput.value = username;
  usernameQuickInput.value = username;
  document.title = `VoidChat - #${roomName}`;

  loadMessages();
  connectWebSocket();

  // Load settings from localStorage
  timestampsToggle.checked = localStorage.getItem('showTimestamps') !== 'false';
  soundToggle.checked = localStorage.getItem('soundEnabled') !== 'false';
  systemMessagesToggle.checked = localStorage.getItem('showSystemMessages') !== 'false';
}

// Load initial messages
async function loadMessages() {
  try {
    const response = await fetch(`/api/rooms/${roomName}`);
    const data = await response.json();

    if (data.messages && data.messages.length > 0) {
      messagesContainer.innerHTML = '';
      data.messages.forEach(msg => {
        displayMessage(msg);
      });
      scrollToBottom();
    } else {
      messagesContainer.innerHTML = '<div class="loading">No messages yet. Start the conversation!</div>';
    }
  } catch (error) {
    console.error('Error loading messages:', error);
    messagesContainer.innerHTML = '<div class="loading">Error loading messages</div>';
  }
}

// WebSocket connection
function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${window.location.host}`);

  ws.onopen = () => {
    console.log('WebSocket connected');
    ws.send(JSON.stringify({
      type: 'join',
      room: roomName,
      username: username
    }));
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    handleWebSocketMessage(data);
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    showError('Connection error. Please refresh the page.');
  };

  ws.onclose = () => {
    console.log('WebSocket disconnected');
    showError('Disconnected. Attempting to reconnect...');
    messageInput.disabled = true;
    submitBtn.disabled = true;

    // Attempt to reconnect after 3 seconds
    setTimeout(() => {
      if (ws.readyState === WebSocket.CLOSED) {
        connectWebSocket();
      }
    }, 3000);
  };
}

function handleWebSocketMessage(data) {
  switch (data.type) {
    case 'joined':
      userColor = data.color;
      messageInput.disabled = false;
      submitBtn.disabled = false;
      messageInput.focus();
      break;

    case 'message':
      displayMessage(data);
      if (soundToggle.checked) {
        playNotificationSound();
      }
      break;

    case 'system':
      if (systemMessagesToggle.checked) {
        displaySystemMessage(data.message, data.timestamp);
      }
      break;

    case 'typing':
      showTypingIndicator(data.username);
      break;

    case 'error':
      showError(data.message);
      break;
  }
}

function displayMessage(msg) {
  const messageEl = document.createElement('div');
  messageEl.className = 'message';
  messageEl.style.borderLeftColor = msg.color;

  const timestamp = timestampsToggle.checked
    ? `<span class="message-timestamp">${formatTime(msg.timestamp)}</span>`
    : '';

  const processedMessage = processMarkdown(msg.message);

  messageEl.innerHTML = `
    <div class="message-header">
      <span class="message-username" style="color: ${msg.color}">${escapeHtml(msg.username)}</span>
      ${timestamp}
    </div>
    <div class="message-content">${processedMessage}</div>
  `;

  if (messagesContainer.querySelector('.loading')) {
    messagesContainer.innerHTML = '';
  }

  messagesContainer.appendChild(messageEl);
  scrollToBottom();
}

function displaySystemMessage(message, timestamp) {
  const messageEl = document.createElement('div');
  messageEl.className = 'message system-message';

  const timestampStr = timestampsToggle.checked
    ? `<span class="message-timestamp">${formatTime(timestamp)}</span> `
    : '';

  messageEl.innerHTML = `${timestampStr}${escapeHtml(message)}`;
  messagesContainer.appendChild(messageEl);
  scrollToBottom();
}

function showError(message) {
  const errorEl = document.createElement('div');
  errorEl.className = 'message system-message';
  errorEl.style.color = 'var(--error-color)';
  errorEl.textContent = `Error: ${message}`;
  messagesContainer.appendChild(errorEl);
  scrollToBottom();

  setTimeout(() => errorEl.remove(), 5000);
}

function showTypingIndicator(user) {
  typingIndicator.textContent = `${user} is typing...`;

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    typingIndicator.textContent = '';
  }, 3000);
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function processMarkdown(text) {
  // Simple markdown processing
  let processed = escapeHtml(text);

  // Bold
  processed = processed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic
  processed = processed.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Code
  processed = processed.replace(/`(.+?)`/g, '<code>$1</code>');
  // Links (already handled by sanitizeHtml on server, but ensure they're visible)

  return processed;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function playNotificationSound() {
  // Simple notification sound using Web Audio API
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.1;

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch (error) {
    console.error('Error playing sound:', error);
  }
}

// Send message
messageForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const message = messageInput.value.trim();
  if (!message || !ws || ws.readyState !== WebSocket.OPEN) {
    return;
  }

  // Update username from quick input if it changed
  const currentUsername = usernameQuickInput.value.trim();
  if (currentUsername && currentUsername !== username) {
    updateUsername(currentUsername);
  }

  ws.send(JSON.stringify({
    type: 'message',
    message: message,
    username: username
  }));

  messageInput.value = '';
  messageInput.focus();
  isTyping = false;
});

// Typing indicator
messageInput.addEventListener('input', () => {
  if (!isTyping && ws && ws.readyState === WebSocket.OPEN) {
    isTyping = true;
    ws.send(JSON.stringify({
      type: 'typing',
      username: username
    }));

    setTimeout(() => {
      isTyping = false;
    }, 3000);
  }
});

// Username change - sync between both inputs
function updateUsername(newUsername) {
  if (newUsername && /^[a-zA-Z0-9_-]+$/.test(newUsername)) {
    username = newUsername;
    localStorage.setItem('username', username);
    usernameInput.value = username;
    usernameQuickInput.value = username;
    return true;
  } else {
    usernameInput.value = username;
    usernameQuickInput.value = username;
    alert('Username can only contain letters, numbers, hyphens, and underscores');
    return false;
  }
}

usernameInput.addEventListener('change', (e) => {
  updateUsername(e.target.value.trim());
});

usernameQuickInput.addEventListener('change', (e) => {
  updateUsername(e.target.value.trim());
});

// Also update on blur to ensure sync
usernameQuickInput.addEventListener('blur', (e) => {
  const value = e.target.value.trim();
  if (!value) {
    usernameQuickInput.value = username;
  }
});

// Settings panel
settingsBtn.addEventListener('click', () => {
  settingsPanel.classList.toggle('active');
});

closeSettingsBtn.addEventListener('click', () => {
  settingsPanel.classList.remove('active');
});

// Settings toggles
timestampsToggle.addEventListener('change', (e) => {
  localStorage.setItem('showTimestamps', e.target.checked);
  loadMessages(); // Reload to apply changes
});

soundToggle.addEventListener('change', (e) => {
  localStorage.setItem('soundEnabled', e.target.checked);
});

systemMessagesToggle.addEventListener('change', (e) => {
  localStorage.setItem('showSystemMessages', e.target.checked);
});

// Export chat
exportBtn.addEventListener('click', () => {
  window.open(`/api/rooms/${roomName}/export`, '_blank');
});

// Share functionality
shareBtn.addEventListener('click', () => {
  const url = window.location.href;
  const embedCode = `<iframe src="${url}" width="600" height="500" frameborder="0" style="border: 2px solid #6366f1; border-radius: 8px;"></iframe>`;

  document.getElementById('share-link').value = url;
  document.getElementById('embed-code').value = embedCode;
  shareModal.classList.add('active');
});

// Copy buttons
document.getElementById('copy-link-btn').addEventListener('click', () => {
  const input = document.getElementById('share-link');
  input.select();
  document.execCommand('copy');
  alert('Link copied to clipboard!');
});

document.getElementById('copy-embed-btn').addEventListener('click', () => {
  const textarea = document.getElementById('embed-code');
  textarea.select();
  document.execCommand('copy');
  alert('Embed code copied to clipboard!');
});

// Close modal
shareModal.addEventListener('click', (e) => {
  if (e.target === shareModal || e.target.classList.contains('modal-close')) {
    shareModal.classList.remove('active');
  }
});

// Close settings panel when clicking outside
document.addEventListener('click', (e) => {
  if (!settingsPanel.contains(e.target) && !settingsBtn.contains(e.target)) {
    settingsPanel.classList.remove('active');
  }
});

// Initialize the app
init();
