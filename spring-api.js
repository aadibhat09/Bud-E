// Spring Backend API Integration for Bud-E Productivity Tracker

// Configuration
const SPRING_API_BASE_URL = 'http://localhost:8585'; // Change to your Spring backend URL
// For production: 'https://spring.opencodingsociety.com'

/**
 * Get JWT token from storage
 * @returns {Promise<string|null>} JWT token or null
 */
async function getJwtToken() {
  const result = await chrome.storage.local.get(['jwtToken']);
  return result.jwtToken || null;
}

/**
 * Save JWT token to storage
 * @param {string} token - JWT token
 */
async function saveJwtToken(token) {
  await chrome.storage.local.set({ jwtToken: token });
}

/**
 * Clear JWT token from storage
 */
async function clearJwtToken() {
  await chrome.storage.local.remove(['jwtToken']);
}

/**
 * Authenticate with Spring backend
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} Response with token and user info
 */
async function authenticate(email, password) {
  try {
    const response = await fetch(`${SPRING_API_BASE_URL}/authenticate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Authentication failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.token) {
      await saveJwtToken(data.token);
    }
    
    return data;
  } catch (error) {
    console.error('Authentication Error:', error);
    throw error;
  }
}

/**
 * Get current user's productivity data from Spring backend
 * @returns {Promise<Object>} Productivity data
 */
async function getProductivityData() {
  const token = await getJwtToken();
  
  if (!token) {
    throw new Error('Not authenticated. Please login first.');
  }

  try {
    const response = await fetch(`${SPRING_API_BASE_URL}/api/productivity/data`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 401) {
      await clearJwtToken();
      throw new Error('Authentication expired. Please login again.');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to get productivity data: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Get Productivity Data Error:', error);
    throw error;
  }
}

/**
 * Update productivity data (whitelist and growth)
 * @param {Array<string>} whitelist - List of productive websites
 * @param {number} growthPercent - Current growth percentage (0-100)
 * @param {string} suggestions - Optional AI suggestions
 * @returns {Promise<Object>} Updated productivity data
 */
async function updateProductivityData(whitelist, growthPercent, suggestions = null) {
  const token = await getJwtToken();
  
  if (!token) {
    throw new Error('Not authenticated. Please login first.');
  }

  const body = {
    whitelist,
    growthPercent,
  };
  
  if (suggestions) {
    body.suggestions = suggestions;
  }

  try {
    const response = await fetch(`${SPRING_API_BASE_URL}/api/productivity/data`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    if (response.status === 401) {
      await clearJwtToken();
      throw new Error('Authentication expired. Please login again.');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to update productivity data: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Update Productivity Data Error:', error);
    throw error;
  }
}

/**
 * Update only the whitelist
 * @param {Array<string>} whitelist - List of productive websites
 * @returns {Promise<Object>} Response
 */
async function updateWhitelist(whitelist) {
  const token = await getJwtToken();
  
  if (!token) {
    throw new Error('Not authenticated. Please login first.');
  }

  try {
    const response = await fetch(`${SPRING_API_BASE_URL}/api/productivity/whitelist`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ whitelist })
    });

    if (response.status === 401) {
      await clearJwtToken();
      throw new Error('Authentication expired. Please login again.');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to update whitelist: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Update Whitelist Error:', error);
    throw error;
  }
}

/**
 * Update only the growth percentage
 * @param {number} growthPercent - Current growth percentage (0-100)
 * @returns {Promise<Object>} Response
 */
async function updateGrowth(growthPercent) {
  const token = await getJwtToken();
  
  if (!token) {
    throw new Error('Not authenticated. Please login first.');
  }

  try {
    const response = await fetch(`${SPRING_API_BASE_URL}/api/productivity/growth`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ growthPercent })
    });

    if (response.status === 401) {
      await clearJwtToken();
      throw new Error('Authentication expired. Please login again.');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to update growth: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Update Growth Error:', error);
    throw error;
  }
}

/**
 * Update productivity statistics (time and sessions)
 * @param {number} productiveTimeSeconds - Productive time in seconds
 * @param {boolean} incrementSession - Whether to increment session counter
 * @returns {Promise<Object>} Response
 */
async function updateStats(productiveTimeSeconds, incrementSession) {
  const token = await getJwtToken();
  
  if (!token) {
    throw new Error('Not authenticated. Please login first.');
  }

  try {
    const response = await fetch(`${SPRING_API_BASE_URL}/api/productivity/stats`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        productiveTimeSeconds,
        incrementSession 
      })
    });

    if (response.status === 401) {
      await clearJwtToken();
      throw new Error('Authentication expired. Please login again.');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to update stats: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Update Stats Error:', error);
    throw error;
  }
}

/**
 * Get productivity leaderboard
 * @param {string} sortBy - Sort criteria: "current", "max", or "time"
 * @param {number} limit - Number of entries (max 100)
 * @returns {Promise<Object>} Leaderboard data
 */
async function getLeaderboard(sortBy = 'current', limit = 10) {
  const token = await getJwtToken();
  
  if (!token) {
    throw new Error('Not authenticated. Please login first.');
  }

  try {
    const response = await fetch(
      `${SPRING_API_BASE_URL}/api/productivity/leaderboard?sortBy=${sortBy}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.status === 401) {
      await clearJwtToken();
      throw new Error('Authentication expired. Please login again.');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to get leaderboard: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Get Leaderboard Error:', error);
    throw error;
  }
}

/**
 * Update leaderboard settings
 * @param {string} displayName - Display name for leaderboard
 * @param {boolean} publicLeaderboard - Whether to appear on public leaderboard
 * @returns {Promise<Object>} Response
 */
async function updateSettings(displayName, publicLeaderboard) {
  const token = await getJwtToken();
  
  if (!token) {
    throw new Error('Not authenticated. Please login first.');
  }

  try {
    const response = await fetch(`${SPRING_API_BASE_URL}/api/productivity/settings`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        displayName,
        publicLeaderboard 
      })
    });

    if (response.status === 401) {
      await clearJwtToken();
      throw new Error('Authentication expired. Please login again.');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to update settings: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Update Settings Error:', error);
    throw error;
  }
}

/**
 * Check if user is authenticated
 * @returns {Promise<boolean>} True if authenticated
 */
async function isAuthenticated() {
  const token = await getJwtToken();
  return token !== null;
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    authenticate,
    getProductivityData,
    updateProductivityData,
    updateWhitelist,
    updateGrowth,
    updateStats,
    getLeaderboard,
    updateSettings,
    isAuthenticated,
    clearJwtToken,
  };
}
