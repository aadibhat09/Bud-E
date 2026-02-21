// Gemini API Integration for Productivity Suggestions

// Using the latest Gemini model (gemini-1.5-flash or gemini-2.0-flash)
// gemini-pro is deprecated - use newer models instead
const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

/**
 * Generate fallback suggestions when API quota is exceeded
 * @param {Array<string>} whitelist - Current list of productive websites
 * @param {number} growthPercent - Current growth percentage
 * @returns {string} - Local productivity suggestions
 */
function getLocalFallbackSuggestions(whitelist, growthPercent) {
  const suggestions = [
    "1. **Focus Sessions**: Try the Pomodoro Technique - 25 minutes focused work, 5-minute breaks.",
    "2. **Website Rotation**: You're whitelisting productive sites. Add documentation sites for your tech stack.",
    "3. **Peak Hours**: Identify your most productive hours and schedule deep work during that time.",
    "4. **Keep Growing**: Your productivity is at " + Math.round(growthPercent) + "% - you're doing great!"
  ];

  if (whitelist.length === 0) {
    suggestions.push("5. **Get Started**: Add your first productive website to the whitelist to begin tracking!");
  } else if (whitelist.length > 5) {
    suggestions.push("5. **Quality over Quantity**: You have " + whitelist.length + " whitelisted sites. Focus on the most impactful ones.");
  }

  if (growthPercent > 80) {
    suggestions.push("🌟 **Excellent Progress**: You're in the top tier! Maintain this momentum.");
  } else if (growthPercent > 50) {
    suggestions.push("📈 **Good Pace**: Keep consistent - small daily improvements add up!");
  } else {
    suggestions.push("🚀 **Room to Grow**: Every productive session counts. Build the habit gradually.");
  }

  return suggestions.join("\n\n");
}

/**
 * Generate productivity plan suggestions using Gemini API
 * Falls back to local suggestions if quota is exceeded
 * @param {string} apiKey - Gemini API key
 * @param {Array<string>} whitelist - Current list of productive websites
 * @param {number} growthPercent - Current growth percentage
 * @returns {Promise<string>} - Productivity suggestions
 */
async function getProductivitySuggestions(apiKey, whitelist, growthPercent) {
  if (!apiKey) {
    throw new Error('API key is required');
  }

  const whitelistText = whitelist.length > 0 
    ? whitelist.join(', ') 
    : 'no websites yet';

  const prompt = `You are a productivity coach. Based on the following information, provide 3-4 actionable productivity suggestions:

Current Productivity Stats:
- Growth Level: ${Math.round(growthPercent)}%
- Productive Websites: ${whitelistText}

Please provide:
1. Specific tips to improve productivity
2. Website recommendations that could be added to the whitelist
3. Time management suggestions
4. A motivational message

Keep the response concise and actionable (under 300 words).`;

  try {
    const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
          topP: 0.8,
          topK: 40
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.error?.message || response.statusText;
      
      // Check if it's a quota exceeded error
      if (errorMessage.includes('quota') || errorMessage.includes('Quota')) {
        console.warn('Gemini API quota exceeded, using fallback suggestions');
        return getLocalFallbackSuggestions(whitelist, growthPercent);
      }
      
      throw new Error(`API Error: ${errorMessage}`);
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      return data.candidates[0].content.parts[0].text;
    } else {
      throw new Error('Unexpected API response format');
    }
  } catch (error) {
    console.error('Gemini API Error:', error);
    // Fall back to local suggestions on any error
    console.warn('Using fallback suggestions due to API error');
    return getLocalFallbackSuggestions(whitelist, growthPercent);
  }
}

// Export for use in popup.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getProductivitySuggestions };
}
