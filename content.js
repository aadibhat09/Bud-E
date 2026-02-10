// Create the pet widget
function createWidget() {
  const widget = document.createElement('div');
  widget.id = 'growseed-widget';
  widget.innerHTML = `
    <div class="growseed-container">
      <div class="growseed-pet" id="growseed-pet">🌱</div>
      <div class="growseed-bar">
        <div class="growseed-fill" id="growseed-fill"></div>
      </div>
      <div class="growseed-percent" id="growseed-percent">0%</div>
    </div>
  `;
  document.body.appendChild(widget);
}

// Update widget based on growth
function updateWidget(growthPercent, isWhitelisted) {
  const pet = document.getElementById('growseed-pet');
  const fill = document.getElementById('growseed-fill');
  const percent = document.getElementById('growseed-percent');
  
  if (!pet || !fill || !percent) return;
  
  // Update progress bar
  fill.style.width = `${growthPercent}%`;
  percent.textContent = `${Math.round(growthPercent)}%`;
  
  // Update pet emoji based on growth stage
  if (growthPercent < 20) {
    pet.textContent = '🌱'; // Seed
  } else if (growthPercent < 40) {
    pet.textContent = '🌿'; // Sprout
  } else if (growthPercent < 60) {
    pet.textContent = '☘️'; // Seedling
  } else if (growthPercent < 80) {
    pet.textContent = '🪴'; // Plant
  } else if (growthPercent < 95) {
    pet.textContent = '🌺'; // Flower
  } else {
    pet.textContent = '🌳'; // Tree
  }
  
  // Add visual feedback
  const container = pet.parentElement;
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