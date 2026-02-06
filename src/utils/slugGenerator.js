/**
 * Generates a short, meaningful slug in the SAME language as input
 * @param {string} text - The text to convert to slug
 * @param {number} maxWords - Maximum number of words (default: 4)
 * @returns {string} The generated slug
 */
function generateSlug(text, maxWords = 8) {
  if (typeof text !== 'string' || !text.trim()) {
    return '';
  }

  // Stop words for different languages
  const stopWords = new Set([
    // English
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'been', 'be',
    'this', 'that', 'these', 'those', 'will', 'have', 'has', 'had',
    // Hindi (Devanagari script)
    'का', 'की', 'के', 'को', 'ने', 'से', 'में', 'पर', 'और', 'या',
    'है', 'हैं', 'था', 'थी', 'थे', 'हो', 'हुए', 'गया', 'गई', 'गए',
    'एक', 'यह', 'वह', 'इस', 'उस', 'कि', 'जो', 'तक', 'भी', 'ही', 'कर'
  ]);

  // Split text into words
  const words = text
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0);

  // Keep meaningful words only
  const meaningfulWords = [];
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    
    // Always keep first word
    if (i === 0) {
      meaningfulWords.push(word);
      continue;
    }
    
    // Skip stop words (case-insensitive for English, exact match for Hindi)
    if (stopWords.has(word.toLowerCase()) || stopWords.has(word)) {
      continue;
    }
    
    meaningfulWords.push(word);
    
    // Stop when we have enough words
    if (meaningfulWords.length >= maxWords) {
      break;
    }
  }

  // Create slug from meaningful words
  let slug = meaningfulWords
    .join('-')
    .toLowerCase()
    // Remove special characters but keep letters from all languages
    .replace(/[^\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFFa-z0-9\s-]/gi, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return slug;
}

/**
 * Ensures slug uniqueness by appending a number if needed
 * @param {string} baseSlug - The base slug
 * @param {Model} Model - The Mongoose model to check against
 * @param {string} excludeId - ID to exclude from uniqueness check (for updates)
 * @returns {string} The unique slug
 */
async function ensureUniqueSlug(baseSlug, Model, excludeId = null) {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const query = { slug };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const existing = await Model.findOne(query);
    if (!existing) {
      break;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

module.exports = {
  generateSlug,
  ensureUniqueSlug
};