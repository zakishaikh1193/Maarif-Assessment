/**
 * Converts image placeholders in question text to HTML img tags
 * Placeholders format: {filename.png} or {filename.jpg}
 * Converts to: <img src="http://localhost:5000/api/uploads/images/filename.png">
 */

/**
 * Get the base URL for API endpoints
 * @param {Object} req - Express request object (optional)
 * @returns {string} Base URL
 */
export function getBaseUrl(req = null) {
  // If request object is provided, use it to get the base URL
  if (req) {
    const protocol = req.protocol || 'http';
    const host = req.get('host') || 'localhost:5000';
    return `${protocol}://${host}`;
  }
  
  // Otherwise, use environment variable or default
  return process.env.API_BASE_URL || process.env.BASE_URL || 'http://localhost:5000';
}

/**
 * Converts image placeholders in text to HTML img tags
 * @param {string} text - Text containing placeholders like {filename.png}
 * @param {Object} req - Express request object (optional, for getting base URL)
 * @returns {string} Text with img tags
 */
export function convertImagePlaceholders(text, req = null) {
  if (!text || typeof text !== 'string') {
    return text;
  }

  const baseUrl = getBaseUrl(req);
  const apiBaseUrl = `${baseUrl}/api`;
  
  // Match {filename.ext} pattern
  // This regex matches: { followed by filename (letters, numbers, dots, hyphens, underscores) followed by }
  const placeholderRegex = /\{([a-zA-Z0-9._-]+\.(png|jpg|jpeg|gif|webp|svg))\}/gi;
  
  return text.replace(placeholderRegex, (match, filename) => {
    // Remove the curly braces to get just the filename
    const imageUrl = `${apiBaseUrl}/uploads/images/${filename}`;
    return `<img src="${imageUrl}" alt="${filename}" style="max-width: 100%; height: auto; border-radius: 0.5rem; margin: 0.5rem 0;" />`;
  });
}
