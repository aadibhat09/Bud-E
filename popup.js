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
      } else if (contentId === 'logger-tab') {
        loadLogger();
      }
    });
  });
}

// Logger Tab
async function loadLogger() {
  const result = await chrome.storage.local.get(['urlTimeLog']);
  const urlTimeLog = result.urlTimeLog || {};
  const container = document.getElementById('url-time-log');

  if (Object.keys(urlTimeLog).length === 0) {
    container.innerHTML = '<div class="empty-state">No time logged yet</div>';
    return;
  }

  // Sort by time spent (descending)
  const sortedLogs = Object.entries(urlTimeLog)
    .sort(([, timeA], [, timeB]) => timeB - timeA);

  container.innerHTML = sortedLogs.map(([url, time]) => `
    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
      <span style="word-break: break-all; padding-right: 10px;">${url}</span>
      <span style="font-weight: 600; white-space: nowrap;">${formatTime(time)}</span>
    </div>
  `).join('');
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

// API Configuration
async function getBaseUrl() {
  const result = await chrome.storage.local.get(['userName']);
  if (result.userName === "ADMIN_3749") {
    return 'http://localhost:8585';
  }
  return 'https://spring.opencodingsociety.com';
}

// Leaderboard API
async function getLeaderboardApiUrl() {
  const baseUrl = await getBaseUrl();
  return `${baseUrl}/api/events/BUD_E_LEADERBOARD`;
}

async function loadLeaderboard() {
  const body = document.getElementById('leaderboard-body');
  const loading = document.getElementById('leaderboard-loading');

  loading.style.display = 'block';
  body.innerHTML = '';

  try {
    const response = await fetch(await getLeaderboardApiUrl());
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

    const response = await fetch(await getLeaderboardApiUrl(), {
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

// Mode Toggle Logic
function updateModeUI(mode) {
  const isSchool = mode === 'school';
  
  // Update toggle switch UI
  document.getElementById('mode-toggle').checked = isSchool;
  document.getElementById('label-personal').classList.toggle('active', !isSchool);
  document.getElementById('label-school').classList.toggle('active', isSchool);

  // Show/hide sections
  document.getElementById('add-website-section').style.display = isSchool ? 'none' : 'block';
  document.getElementById('whitelist-section').style.display = isSchool ? 'none' : 'block';
  
  // Show/hide tabs
  const leaderboardTabBtn = document.getElementById('leaderboard-tab-btn');
  const aiPlannerTabBtn = document.getElementById('ai-planner-tab-btn');
  const loggerTabBtn = document.getElementById('logger-tab-btn');
  
  leaderboardTabBtn.style.display = isSchool ? 'block' : 'none';
  aiPlannerTabBtn.style.display = isSchool ? 'none' : 'block';
  loggerTabBtn.style.display = isSchool ? 'block' : 'none';
  
  // Handle tab switching when mode changes
  if (isSchool && aiPlannerTabBtn.classList.contains('active')) {
    document.querySelector('.tab-btn[data-tab="main-tab"]').click();
  } else if (!isSchool && (leaderboardTabBtn.classList.contains('active') || loggerTabBtn.classList.contains('active'))) {
    document.querySelector('.tab-btn[data-tab="main-tab"]').click();
  }
}

async function loadMode() {
  const result = await chrome.storage.local.get(['mode']);
  const mode = result.mode || 'personal';
  updateModeUI(mode);
}

document.getElementById('mode-toggle').addEventListener('change', async (e) => {
  const mode = e.target.checked ? 'school' : 'personal';
  await chrome.storage.local.set({ mode });
  updateModeUI(mode);
});

// Event listeners
document.getElementById('add-btn').addEventListener('click', addToWhitelist);
document.getElementById('url-input').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addToWhitelist();
});

// AI Planner listeners
document.getElementById('plan-time').addEventListener('input', (e) => {
  document.getElementById('plan-time-val').textContent = e.target.value;
});

document.getElementById('plan-distraction').addEventListener('input', (e) => {
  const vals = ['Low', 'Medium', 'High'];
  document.getElementById('plan-distraction-val').textContent = vals[e.target.value - 1];
});

document.getElementById('generate-plan-btn').addEventListener('click', async () => {
  const btn = document.getElementById('generate-plan-btn');
  const status = document.getElementById('plan-status');
  const box = document.getElementById('generated-plan-box');
  
  btn.disabled = true;
  status.textContent = 'Generating plan...';
  box.classList.remove('show');
  
  const getCheckedValues = (className) => {
    return Array.from(document.querySelectorAll(`.${className}:checked`)).map(cb => cb.value);
  };

  const payload = {
    educationLevel: document.getElementById('plan-education').value,
    timeAvailableHours: parseInt(document.getElementById('plan-time').value),
    sessionLength: document.getElementById('plan-session-length').value,
    peakFocusTime: document.getElementById('plan-peak-time').value,
    subjects: getCheckedValues('plan-subject'),
    learningMethods: getCheckedValues('plan-method'),
    workRestCycle: document.getElementById('plan-cycle').value,
    distractionTolerance: document.getElementById('plan-distraction-val').textContent
  };

  try {
    const baseUrl = await getBaseUrl();
    const response = await fetch(`${baseUrl}/api/productivity_planner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error('Failed to generate plan');
    
    const data = await response.json();
    
    box.textContent = data.plan || JSON.stringify(data, null, 2);
    box.classList.add('show');
    status.textContent = 'Plan generated successfully!';
  } catch (error) {
    console.error('Plan generation error:', error);
    status.textContent = `Error: ${error.message}`;
  } finally {
    btn.disabled = false;
    setTimeout(() => { if (status.textContent !== 'Generating plan...') status.textContent = ''; }, 3000);
  }
});

// New listeners
document.getElementById('save-username-btn').addEventListener('click', saveUsername);
document.getElementById('submit-score-btn').addEventListener('click', submitScore);

// Initialize
loadWhitelist();
loadApiKey();
setupTabs();
loadMode();
loadLogger();