const crypto = require('crypto');

/**
 * Generates a unique numeric-only ID using built-in crypto with digits 0-9.
 * The ID is 12 characters long for high uniqueness (10^12 possibilities).
 * This function generates the ID but does not check for database uniqueness.
 * Uniqueness check is handled in the model pre-save hook.
 */
const generateNumericId = (length = 12) => {
    let result = '';
    while (result.length < length) {
        result += crypto.randomInt(0, 10).toString();
    }
    return result;
};

module.exports = {
    generateNumericId
};
