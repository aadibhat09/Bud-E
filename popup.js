// Load whitelist and display it
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

// Event listeners
document.getElementById('add-btn').addEventListener('click', addToWhitelist);
document.getElementById('url-input').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addToWhitelist();
});

// Initialize
loadWhitelist();