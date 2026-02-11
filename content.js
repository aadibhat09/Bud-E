// Create the pet widget
function createWidget() {
  const widget = document.createElement('div');
  widget.id = 'growseed-widget';
  widget.innerHTML = `
    <div class="growseed-container">
      <div class="growseed-pet" id="growseed-pet">
        <img width="25%" height="auto" id="growseed-sprite" src="" alt="Pet">
      </div>
      <div class="growseed-bar">
        <div class="growseed-fill" id="growseed-fill"></div>
      </div>
      <div class="growseed-percent" id="growseed-percent">0%</div>
    </div>
  `;
  document.body.appendChild(widget);
}

// Get sprite path based on growth stage
function getSpriteStage(growthPercent) {
  if (growthPercent < 1) {
    return 1; // Seed
  } else if (growthPercent < 2) {
    return 2; // Sprout
  } else if (growthPercent < 3) {
    return 3; // Seedling
  } else if (growthPercent < 4) {
    return 4; // Plant
  } else if (growthPercent < 5) {
    return 5; // Flower
  } else {
    return 6; // Tree
  }
}

// Update widget based on growth
function updateWidget(growthPercent, isWhitelisted) {
  const sprite = document.getElementById('growseed-sprite');
  const fill = document.getElementById('growseed-fill');
  const percent = document.getElementById('growseed-percent');
  
  if (!sprite || !fill || !percent) return;
  
  // Update progress bar
  fill.style.width = `${growthPercent}%`;
  percent.textContent = `${Math.round(growthPercent)}%`;
  
  // Update pet sprite based on growth stage
  const stage = getSpriteStage(growthPercent);
  sprite.src = chrome.runtime.getURL(`/images/sprites/pumpkin/${stage}.png`);
  
  // Add visual feedback
  const container = sprite.closest('.growseed-container');
  if (isWhitelisted) {
    container.classList.add('growing');
    container.classList.remove('degrading');
  } else {
    container.classList.add('degrading');
    container.classList.remove('growing');
  }
}

// Listen for updates from background script
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'UPDATE_GROWTH') {
    updateWidget(message.growthPercent, message.isWhitelisted);
  }
});

// Initialize widget on page load
if (document.body) {
  createWidget();
} else {
  window.addEventListener('DOMContentLoaded', createWidget);
}

// Request initial state
chrome.storage.local.get(['growthPercent']).then(result => {
  updateWidget(result.growthPercent || 0, false);
});