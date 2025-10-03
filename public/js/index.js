// Homepage functionality
const roomInput = document.getElementById('room-input');
const roomForm = document.getElementById('room-form');
const suggestionsDiv = document.getElementById('suggestions');
const recentRoomsDiv = document.getElementById('recent-rooms');
const popularRoomsDiv = document.getElementById('popular-rooms');

let suggestionTimeout;

// Load recent and popular rooms
async function loadRooms() {
  try {
    const [recentResponse, popularResponse] = await Promise.all([
      fetch('/api/rooms/recent'),
      fetch('/api/rooms/popular')
    ]);

    const recent = await recentResponse.json();
    const popular = await popularResponse.json();

    displayRooms(recentRoomsDiv, recent);
    displayRooms(popularRoomsDiv, popular);
  } catch (error) {
    console.error('Error loading rooms:', error);
    recentRoomsDiv.innerHTML = '<div class="loading">Error loading rooms</div>';
    popularRoomsDiv.innerHTML = '<div class="loading">Error loading rooms</div>';
  }
}

function displayRooms(container, rooms) {
  if (rooms.length === 0) {
    container.innerHTML = '<div class="loading">No rooms yet</div>';
    return;
  }

  container.innerHTML = rooms.map(room => {
    const updatedDate = new Date(room.updated_at);
    const timeAgo = getTimeAgo(updatedDate);

    return `
      <a href="/chat/${room.name}" class="room-item">
        <span class="room-item-name">#${room.name}</span>
        <span class="room-item-meta">${room.message_count} messages · ${timeAgo}</span>
      </a>
    `;
  }).join('');
}

function getTimeAgo(date) {
  const seconds = Math.floor((Date.now() - date) / 1000);

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
    }
  }

  return 'just now';
}

// Room name suggestions
roomInput.addEventListener('input', (e) => {
  clearTimeout(suggestionTimeout);
  const query = e.target.value.trim();

  if (query.length < 2) {
    suggestionsDiv.innerHTML = '';
    return;
  }

  suggestionTimeout = setTimeout(async () => {
    try {
      const response = await fetch(`/api/rooms/search?q=${encodeURIComponent(query)}`);
      const rooms = await response.json();

      if (rooms.length > 0) {
        suggestionsDiv.innerHTML = rooms.map(room =>
          `<div class="suggestion-item" data-room="${room.name}">#${room.name}</div>`
        ).join('');

        // Add click handlers to suggestions
        document.querySelectorAll('.suggestion-item').forEach(item => {
          item.addEventListener('click', () => {
            const roomName = item.dataset.room;
            window.location.href = `/chat/${roomName}`;
          });
        });
      } else {
        suggestionsDiv.innerHTML = '';
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  }, 300);
});

// Form submission
roomForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const roomName = roomInput.value.trim().toLowerCase();

  if (!roomName) {
    return;
  }

  // Validate room name
  if (!/^[a-zA-Z0-9_-]+$/.test(roomName)) {
    alert('Room name can only contain letters, numbers, hyphens, and underscores');
    return;
  }

  if (roomName.length > 25) {
    alert('Room name must be 25 characters or less');
    return;
  }

  window.location.href = `/chat/${roomName}`;
});

// Load rooms on page load
loadRooms();
