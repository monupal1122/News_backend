const { customAlphabet } = require('nanoid');

/**
 * Generates a unique numeric-only ID using nanoid with digits 0-9.
 * The ID is 12 characters long for high uniqueness (10^12 possibilities).
 * This function generates the ID but does not check for database uniqueness.
 * Uniqueness check is handled in the model pre-save hook.
 */
const generateNumericId = customAlphabet('0123456789', 12);

module.exports = {
    generateNumericId
};
