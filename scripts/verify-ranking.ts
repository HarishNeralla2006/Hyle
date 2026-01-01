
// Mock Fetch Global for Node Environment
if (!global.fetch) {
    global.fetch = require('node-fetch');
}

// Logic Mirror
function sortSuggestions(term: string, suggestions: string[]) {
    return suggestions.sort((a, b) => {
        const lowerQuery = term.toLowerCase();
        const lowerA = a.toLowerCase();
        const lowerB = b.toLowerCase();

        // 1. Exact Match gets top priority
        if (lowerA === lowerQuery && lowerB !== lowerQuery) return -1;
        if (lowerB === lowerQuery && lowerA !== lowerQuery) return 1;

        // 2. Starts With Query (Prefix)
        const aStarts = lowerA.startsWith(lowerQuery);
        const bStarts = lowerB.startsWith(lowerQuery);

        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        // 3. Length
        return lowerA.length - lowerB.length;
    });
}

// Mock Data from "sci" query (from previous debug output)
const sciData = [
    "site of community importance",
    "Sciences Po",
    "Science",
    "scientific article",
    "scikit-learn",
    "scientific method"
];

// Mock Data from "digital" query
const digitalData = [
    "Digitalis purpurea",
    "Digital Prosopography",
    "Digital art",
    "musical work/composition",
    "Digital transformation"
];

console.log("--- SCI Sorting ---");
console.log(sortSuggestions("sci", [...sciData]));

console.log("\n--- DIGITAL Sorting ---");
console.log(sortSuggestions("digital", [...digitalData]));
