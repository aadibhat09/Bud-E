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

// Initialize
loadWhitelist();
loadApiKey();