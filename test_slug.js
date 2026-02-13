const { generateSlug } = require('./src/utils/slugGenerator');

const testCases = [
    "अपना वादा नहीं निभाया, इसलिए जाना पड़ा जेल",
    "Rajpal Yadav पर दिल्ली हाईकोर्ट की कड़ी टिप्पणी",
    "मशहूर पंजाबी गायक सिद्धू मूसेवाला"
];

testCases.forEach(tc => {
    console.log(`Original: ${tc}`);
    console.log(`Slug:     ${generateSlug(tc)}`);
    console.log('---');
});
