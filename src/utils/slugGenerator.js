/**
 * Generate a meaningful SEO slug (supports Hindi + English + mixed text)
 * @param {string} text
 * @param {number} maxWords
 * @returns {string}
 */
function generateSlug(text, maxWords = 12) {
  if (typeof text !== "string") return "";

  const clean = text.trim();
  if (!clean) return "";

  // Stop words (English + Hindi)
  const stopWords = new Set([
    // English
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "as", "is", "was", "are", "been", "be",
    "this", "that", "these", "those", "will", "have", "has", "had",
    "what", "where", "when", "who", "why", "how", "all", "any", "both",
    "each", "few", "more", "most", "other", "some", "such", "no", "nor",
    "not", "only", "own", "same", "so", "than", "too", "very", "can",
    "just", "should", "now", "it", "its",

    // Hindi
    "का", "की", "के", "को", "ने", "से", "में", "पर", "और", "या",
    "है", "हैं", "था", "थी", "थे", "हो", "हुए", "गया", "गई", "गए",
    "एक", "यह", "वह", "इस", "उस", "कि", "जो", "तक", "भी", "ही", "कर",
    "किया", "liye", "saath", "kon", "kya", "kaise"
  ]);

  // Replace punctuation/symbols with space to avoid word concatenation
  const words = clean
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const meaningful = [];

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const normalized = w.toLowerCase();

    // Always keep first word to ensure slug isn't empty, otherwise filtered
    if (i === 0 || !stopWords.has(normalized)) {
      meaningful.push(normalized);
    }

    if (meaningful.length >= maxWords) break;
  }

  return meaningful
    .join("-")
    .replace(/-+/g, "-") // Ensure no double hyphens
    .replace(/^-|-$/g, ""); // Trim hyphens
}

/**
 * Ensure slug uniqueness in MongoDB
 * @param {string} baseSlug
 * @param {mongoose.Model} Model
 * @param {string|null} excludeId
 * @returns {Promise<string>}
 */
async function ensureUniqueSlug(baseSlug, Model, excludeId = null) {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const query = { slug };
    if (excludeId) query._id = { $ne: excludeId };

    const exists = await Model.exists(query);
    if (!exists) return slug;

    slug = `${baseSlug}-${counter++}`;
  }
}

module.exports = {
  generateSlug,
  ensureUniqueSlug
};
