// Gemini API Integration for Productivity Suggestions

// Using the latest Gemini model (gemini-1.5-flash or gemini-2.0-flash)
// gemini-pro is deprecated - use newer models instead
const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

/**
 * Generate productivity plan suggestions using Gemini API
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
      throw new Error(`API Error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      return data.candidates[0].content.parts[0].text;
    } else {
      throw new Error('Unexpected API response format');
    }
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw error;
  }
}

// Export for use in popup.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getProductivitySuggestions };
}
