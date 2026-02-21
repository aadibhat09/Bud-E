// Enhanced Popup Script with Spring Backend Integration

let currentUser = null;
let currentSort = 'current';

// ==================== UI Update Functions ====================

/**
 * Load and display whitelist
 */
async function loadWhitelist() {
  const result = await chrome.storage.local.get(['whitelist', 'growthPercent']);
  const whitelist = result.whitelist || [];
  const growthPercent = result.growthPercent || 0;
  
  // Update growth display
  document.getElementById('growth-percent').textContent = `${Math.round(growthPercent)}%`;
  
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

/**
 * Check and update authentication UI
 */
async function updateAuthUI() {
  const isAuth = await isAuthenticated();
  const authSection = document.getElementById('auth-section');
  const loginForm = document.getElementById('login-form');
  const userInfo = document.getElementById('user-info');
  const syncSection = document.getElementById('sync-section');
  const leaderboardSection = document.getElementById('leaderboard-section');
  
  if (isAuth) {
    // Get user email from storage
    const result = await chrome.storage.local.get(['userEmail']);
    const email = result.userEmail || 'User';
    
    authSection.classList.add('authenticated');
    loginForm.classList.add('hidden');
    userInfo.classList.remove('hidden');
    document.getElementById('user-email').textContent = email;
    
    // Show sync and leaderboard sections
    syncSection.style.display = 'block';
    leaderboardSection.style.display = 'block';
  } else {
    authSection.classList.remove('authenticated');
    loginForm.classList.remove('hidden');
    userInfo.classList.add('hidden');
    
    // Hide sync and leaderboard sections
    syncSection.style.display = 'none';
    leaderboardSection.style.display = 'none';
  }
}

/**
 * Display leaderboard
 */
async function displayLeaderboard(data) {
  const container = document.getElementById('leaderboard');
  
  if (!data || !data.leaderboard || data.leaderboard.length === 0) {
    container.innerHTML = '<div class="empty-state">No leaderboard data available</div>';
    return;
  }
  
  container.innerHTML = data.leaderboard.map(entry => {
    let scoreText = '';
    if (currentSort === 'current') {
      scoreText = `${Math.round(entry.growthPercent)}%`;
    } else if (currentSort === 'max') {
      scoreText = `${Math.round(entry.maxGrowthAchieved)}%`;
    } else {
      const hours = Math.floor(entry.totalProductiveTime / 3600);
      const minutes = Math.floor((entry.totalProductiveTime % 3600) / 60);
      scoreText = `${hours}h ${minutes}m`;
    }
    
    return `
      <div class="leaderboard-item">
        <span class="leaderboard-rank">#${entry.rank}</span>
        <span class="leaderboard-name">${entry.displayName}</span>
        <span class="leaderboard-score">${scoreText}</span>
      </div>
    `;
  }).join('');
}

// ==================== Backend Integration Functions ====================

/**
 * Login to Spring backend
 */
async function login() {
  const email = document.getElementById('email-input').value.trim();
  const password = document.getElementById('password-input').value;
  const errorElement = document.getElementById('auth-error');
  const loginBtn = document.getElementById('login-btn');
  
  if (!email || !password) {
    errorElement.textContent = 'Please enter email and password';
    return;
  }
  
  loginBtn.disabled = true;
  errorElement.textContent = '';
  
  try {
    const response = await authenticate(email, password);
    
    // Store user email
    await chrome.storage.local.set({ userEmail: email });
    
    errorElement.classList.remove('error');
    errorElement.classList.add('success');
    errorElement.textContent = '✓ Login successful!';
    
    // Clear inputs
    document.getElementById('email-input').value = '';
    document.getElementById('password-input').value = '';
    
    // Update UI
    await updateAuthUI();
    
    // Auto-sync after login
    setTimeout(syncFromBackend, 500);
    setTimeout(loadLeaderboard, 1000);
    
  } catch (error) {
    console.error('Login error:', error);
    errorElement.classList.remove('success');
    errorElement.classList.add('error');
    errorElement.textContent = `Login failed: ${error.message}`;
  } finally {
    loginBtn.disabled = false;
  }
}

/**
 * Logout from backend
 */
async function logout() {
  await clearJwtToken();
  await chrome.storage.local.remove(['userEmail']);
  await updateAuthUI();
  
  // Clear leaderboard
  document.getElementById('leaderboard').innerHTML = '<div class="empty-state">Login to view leaderboard</div>';
}

/**
 * Sync data FROM backend (pull)
 */
async function syncFromBackend() {
  const syncStatus = document.getElementById('sync-status');
  const syncBtn = document.getElementById('sync-btn');
  
  syncBtn.disabled = true;
  syncStatus.textContent = 'Syncing...';
  
  try {
    const data = await getProductivityData();
    
    // Update local storage with backend data
    await chrome.storage.local.set({
      whitelist: data.whitelist || [],
      growthPercent: data.growthPercent || 0,
      lastUpdateTime: Date.now()
    });
    
    // Reload UI
    await loadWhitelist();
    
    syncStatus.textContent = `✓ Synced at ${new Date().toLocaleTimeString()}`;
    setTimeout(() => {
      syncStatus.textContent = 'Ready to sync';
    }, 3000);
    
  } catch (error) {
    console.error('Sync error:', error);
    syncStatus.textContent = `✗ Sync failed: ${error.message}`;
  } finally {
    syncBtn.disabled = false;
  }
}

/**
 * Push local data TO backend
 */
async function pushToBackend() {
  const syncStatus = document.getElementById('sync-status');
  const pushBtn = document.getElementById('push-btn');
  
  pushBtn.disabled = true;
  syncStatus.textContent = 'Pushing data...';
  
  try {
    const result = await chrome.storage.local.get(['whitelist', 'growthPercent']);
    const whitelist = result.whitelist || [];
    const growthPercent = result.growthPercent || 0;
    
    await updateProductivityData(whitelist, growthPercent);
    
    syncStatus.textContent = `✓ Pushed at ${new Date().toLocaleTimeString()}`;
    setTimeout(() => {
      syncStatus.textContent = 'Ready to sync';
    }, 3000);
    
  } catch (error) {
    console.error('Push error:', error);
    syncStatus.textContent = `✗ Push failed: ${error.message}`;
  } finally {
    pushBtn.disabled = false;
  }
}

/**
 * Load and display leaderboard
 */
async function loadLeaderboard() {
  const refreshBtn = document.getElementById('refresh-leaderboard-btn');
  
  refreshBtn.disabled = true;
  
  try {
    const data = await getLeaderboard(currentSort, 10);
    await displayLeaderboard(data);
  } catch (error) {
    console.error('Leaderboard error:', error);
    document.getElementById('leaderboard').innerHTML = 
      `<div class="empty-state">Failed to load leaderboard</div>`;
  } finally {
    refreshBtn.disabled = false;
  }
}

// ==================== Whitelist Management ====================

/**
 * Add URL to whitelist
 */
async function addToWhitelist() {
  const input = document.getElementById('url-input');
  let url = input.value.trim();
  
  if (!url) return;
  
  // Clean up URL
  url = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  
  const result = await chrome.storage.local.get(['whitelist']);
  const whitelist = result.whitelist || [];
  
  if (!whitelist.includes(url)) {
    whitelist.push(url);
    await chrome.storage.local.set({ whitelist });
    input.value = '';
    await loadWhitelist();
    
    // Auto-push to backend if authenticated
    const isAuth = await isAuthenticated();
    if (isAuth) {
      try {
        await updateWhitelist(whitelist);
      } catch (error) {
        console.error('Failed to push whitelist to backend:', error);
      }
    }
  }
}

/**
 * Remove URL from whitelist
 */
async function removeFromWhitelist(url) {
  const result = await chrome.storage.local.get(['whitelist']);
  const whitelist = result.whitelist || [];
  
  const newWhitelist = whitelist.filter(item => item !== url);
  await chrome.storage.local.set({ whitelist: newWhitelist });
  await loadWhitelist();
  
  // Auto-push to backend if authenticated
  const isAuth = await isAuthenticated();
  if (isAuth) {
    try {
      await updateWhitelist(newWhitelist);
    } catch (error) {
      console.error('Failed to push whitelist to backend:', error);
    }
  }
}

// ==================== Event Listeners ====================

// Whitelist management
document.getElementById('add-btn').addEventListener('click', addToWhitelist);
document.getElementById('url-input').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addToWhitelist();
});

// Authentication
document.getElementById('login-btn').addEventListener('click', login);
document.getElementById('password-input').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') login();
});
document.getElementById('logout-btn').addEventListener('click', logout);

// Backend sync
document.getElementById('sync-btn').addEventListener('click', syncFromBackend);
document.getElementById('push-btn').addEventListener('click', pushToBackend);

// Leaderboard
document.getElementById('refresh-leaderboard-btn').addEventListener('click', loadLeaderboard);

// Leaderboard tabs
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', async () => {
    // Update active tab
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    // Update sort and reload
    currentSort = tab.dataset.sort;
    await loadLeaderboard();
  });
});

// ==================== Initialization ====================

async function initialize() {
  await loadWhitelist();
  await updateAuthUI();
  
  // If authenticated, load leaderboard
  const isAuth = await isAuthenticated();
  if (isAuth) {
    await loadLeaderboard();
  }
}

// Initialize on load
initialize();
