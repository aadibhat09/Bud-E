// Load whitelist and display it
async function loadWhitelist() {
  const result = await chrome.storage.local.get(['whitelist', 'growthPercent', 'totalProductiveTime', 'userName']);
  const whitelist = result.whitelist || [];
  const growthPercent = result.growthPercent || 0;
  const totalTime = result.totalProductiveTime || 0;
  const userName = result.userName || 'User';

  // Update growth display
  document.getElementById('growth-percent').textContent = `${Math.round(growthPercent)}%`;
  document.getElementById('total-time').textContent = formatTime(totalTime);
  document.getElementById('username-input').value = userName;

  const container = document.getElementById('whitelist');

  if (whitelist.length === 0) {
    container.innerHTML = '<div class="empty-state">No websites added yet</div>';
    return;
  }

  container.innerHTML = whitelist.map(url => `
    <div class="whitelist-item">
      <span class="whitelist-url">${url}</span>
      <button class="remove" data-url="${url}">Remove</button>
    </div>
  `).join('');

  // Add remove listeners
  document.querySelectorAll('.remove').forEach(btn => {
    btn.addEventListener('click', () => removeFromWhitelist(btn.dataset.url));
  });
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// Load API key and update UI
async function loadApiKey() {
  const result = await chrome.storage.local.get(['geminiApiKey']);
  const apiKey = result.geminiApiKey || '';

  if (apiKey) {
    document.getElementById('api-key-input').value = apiKey;
    document.getElementById('get-suggestions-btn').disabled = false;
  }
}

// Add URL to whitelist
async function addToWhitelist() {
  const input = document.getElementById('url-input');
  let url = input.value.trim();

  if (!url) return;

  // Clean up URL - remove protocol and trailing slashes
  url = url.replace(/^https?:\/\//, '').replace(/\/$/, '');

  const result = await chrome.storage.local.get(['whitelist']);
  const whitelist = result.whitelist || [];

  if (!whitelist.includes(url)) {
    whitelist.push(url);
    await chrome.storage.local.set({ whitelist });
    input.value = '';
    loadWhitelist();
  }
}

// Remove URL from whitelist
async function removeFromWhitelist(url) {
  const result = await chrome.storage.local.get(['whitelist']);
  const whitelist = result.whitelist || [];

  const newWhitelist = whitelist.filter(item => item !== url);
  await chrome.storage.local.set({ whitelist: newWhitelist });
  loadWhitelist();
}

// Save Gemini API key
async function saveApiKey() {
  const apiKey = document.getElementById('api-key-input').value.trim();
  const errorElement = document.getElementById('error-message');

  if (!apiKey) {
    errorElement.textContent = 'Please enter an API key';
    return;
  }

  await chrome.storage.local.set({ geminiApiKey: apiKey });
  document.getElementById('get-suggestions-btn').disabled = false;
  errorElement.textContent = '';

  // Show success feedback
  const saveBtn = document.getElementById('save-key-btn');
  const originalText = saveBtn.textContent;
  saveBtn.textContent = '✓ Saved';
  setTimeout(() => {
    saveBtn.textContent = originalText;
  }, 2000);
}

// Get productivity suggestions from Gemini
async function getProductivityPlan() {
  const suggestionsBox = document.getElementById('suggestions-box');
  const errorElement = document.getElementById('error-message');
  const button = document.getElementById('get-suggestions-btn');

  // Clear previous content
  errorElement.textContent = '';
  suggestionsBox.textContent = 'Loading suggestions...';
  suggestionsBox.classList.add('show', 'loading');
  button.disabled = true;

  try {
    const result = await chrome.storage.local.get(['geminiApiKey', 'whitelist', 'growthPercent']);
    const apiKey = result.geminiApiKey;
    const whitelist = result.whitelist || [];
    const growthPercent = result.growthPercent || 0;

    if (!apiKey) {
      throw new Error('API key not found. Please save your API key first.');
    }

    // Call Gemini API
    const suggestions = await getProductivitySuggestions(apiKey, whitelist, growthPercent);

    // Display suggestions
    suggestionsBox.classList.remove('loading');
    suggestionsBox.textContent = suggestions;

  } catch (error) {
    console.error('Error getting suggestions:', error);
    errorElement.textContent = `Error: ${error.message}`;
    suggestionsBox.classList.remove('show', 'loading');
  } finally {
    button.disabled = false;
  }
}

// Tab Switching logic
function setupTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs and contents
      document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      // Add active class to clicked tab and corresponding content
      tab.classList.add('active');
      const contentId = tab.dataset.tab;
      document.getElementById(contentId).classList.add('active');

      if (contentId === 'leaderboard-tab') {
        loadLeaderboard();
      }
    });
  });
}

// User Settings
async function saveUsername() {
  const nameInput = document.getElementById('username-input');
  const name = nameInput.value.trim();
  if (name) {
    await chrome.storage.local.set({ userName: name });
    const btn = document.getElementById('save-username-btn');
    const originalText = btn.textContent;
    btn.textContent = '✓ Saved';
    setTimeout(() => btn.textContent = originalText, 2000);
  }
}

// Leaderboard API
const LEADERBOARD_API = 'http://localhost:8585/api/events/BUD_E_LEADERBOARD';

async function loadLeaderboard() {
  const body = document.getElementById('leaderboard-body');
  const loading = document.getElementById('leaderboard-loading');

  loading.style.display = 'block';
  body.innerHTML = '';

  try {
    const response = await fetch(LEADERBOARD_API);
    if (!response.ok) throw new Error('Failed to fetch leaderboard');

    let logs = await response.json();

    // The backend might return an array of events, we need to extract payload
    // Filter for BUD_E_LEADERBOARD and sort by score
    let scores = logs
      .filter(log => log.payload && typeof log.payload.score === 'number')
      .map(log => log.payload);

    // Deduplicate by name, keep highest score
    const deduped = {};
    scores.forEach(s => {
      if (!deduped[s.name] || s.score > deduped[s.name]) {
        deduped[s.name] = s.score;
      }
    });

    scores = Object.entries(deduped)
      .map(([name, score]) => ({ name, score }))
      .sort((a, b) => b.score - a.score);

    if (scores.length === 0) {
      body.innerHTML = '<tr><td colspan="3" style="text-align:center">No scores yet</td></tr>';
    } else {
      body.innerHTML = scores.map((s, i) => `
        <tr>
          <td class="rank-col">${i + 1}</td>
          <td>${s.name}</td>
          <td class="score-col">${formatTime(s.score)}</td>
        </tr>
      `).join('');
    }
  } catch (error) {
    console.error('Leaderboard error:', error);
    body.innerHTML = `<tr><td colspan="3" style="text-align:center; color:red">Error: ${error.message}</td></tr>`;
  } finally {
    loading.style.display = 'none';
  }
}

async function submitScore() {
  const status = document.getElementById('submit-status');
  const btn = document.getElementById('submit-score-btn');

  status.textContent = 'Submitting...';
  btn.disabled = true;

  try {
    const result = await chrome.storage.local.get(['userName', 'totalProductiveTime']);
    const payload = {
      name: result.userName || 'User',
      score: Math.floor(result.totalProductiveTime || 0)
    };

    const response = await fetch(LEADERBOARD_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload })
    });

    if (!response.ok) throw new Error('Submission failed');

    status.textContent = 'Score submitted successfully!';
    loadLeaderboard();
  } catch (error) {
    console.error('Submit error:', error);
    status.textContent = `Error: ${error.message}`;
  } finally {
    btn.disabled = false;
    setTimeout(() => { if (status.textContent !== 'Submitting...') status.textContent = ''; }, 3000);
  }
}

// Event listeners
document.getElementById('add-btn').addEventListener('click', addToWhitelist);
document.getElementById('url-input').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addToWhitelist();
});

// AI productivity coach listeners
document.getElementById('save-key-btn').addEventListener('click', saveApiKey);
document.getElementById('api-key-input').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') saveApiKey();
});
document.getElementById('get-suggestions-btn').addEventListener('click', getProductivityPlan);

// New listeners
document.getElementById('save-username-btn').addEventListener('click', saveUsername);
document.getElementById('submit-score-btn').addEventListener('click', submitScore);

// Initialize
loadWhitelist();
loadApiKey();
setupTabs();