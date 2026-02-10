// Initialize storage
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    whitelist: [],
    growthPercent: 0,
    lastUpdateTime: Date.now()
  });
});

// Check if current URL is whitelisted
function isWhitelisted(url, whitelist) {
  if (!url) return false;
  
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    
    return whitelist.some(whitelistedUrl => {
      return hostname.includes(whitelistedUrl) || whitelistedUrl.includes(hostname);
    });
  } catch (e) {
    return false;
  }
}

// Update growth based on current tab
async function updateGrowth() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab || !tab.url) return;
  
  const result = await chrome.storage.local.get(['whitelist', 'growthPercent', 'lastUpdateTime']);
  const whitelist = result.whitelist || [];
  const currentGrowth = result.growthPercent || 0;
  const lastUpdate = result.lastUpdateTime || Date.now();
  
  const now = Date.now();
  const timeDiff = (now - lastUpdate) / 1000; // seconds
  
  // Growth/degradation rates (per second)
  const GROWTH_RATE = 0.05; // 3% per minute when productive
  const DEGRADE_RATE = 0.025; // 1.5% per minute when not productive
  
  let newGrowth = currentGrowth;
  
  if (isWhitelisted(tab.url, whitelist)) {
    // On whitelisted site - grow
    newGrowth = Math.min(100, currentGrowth + (GROWTH_RATE * timeDiff));
  } else {
    // Not on whitelisted site - degrade
    newGrowth = Math.max(0, currentGrowth - (DEGRADE_RATE * timeDiff));
  }
  
  await chrome.storage.local.set({
    growthPercent: newGrowth,
    lastUpdateTime: now
  });
  
  // Notify content script to update widget
  chrome.tabs.sendMessage(tab.id, {
    type: 'UPDATE_GROWTH',
    growthPercent: newGrowth,
    isWhitelisted: isWhitelisted(tab.url, whitelist)
  }).catch(() => {
    // Tab might not have content script loaded yet
  });
}

// Update growth every second
setInterval(updateGrowth, 1000);

// Also update when tab changes
chrome.tabs.onActivated.addListener(updateGrowth);
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    updateGrowth();
  }
});