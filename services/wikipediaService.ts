
// Wikipedia OpenSearch Service
// Provides "Smart Suggestions" by mapping slang/typos to canonical Wikipedia titles.
// 100% Free, No Auth, High Reliability.

const WIKI_API_URL = "https://en.wikipedia.org/w/api.php";

interface WikiOpenSearchResponse extends Array<any> {
    0: string; // The search query
    1: string[]; // Completion suggestions
    2: string[]; // Descriptions (often empty for Opensearch)
    3: string[]; // Links
}

// In-memory cache to prevent redundant network calls for the same term
const suggestionCache: Record<string, string | null> = {};

export const getSmartSuggestion = async (query: string): Promise<string | null> => {
    const term = query.trim();

    // 1. Basic Validation
    if (!term || term.length < 2) return null;

    // 2. Check Cache
    if (suggestionCache[term] !== undefined) {
        return suggestionCache[term];
    }

    try {
        // 3. Construct URL
        // action=opensearch: Standard autocomplete API
        // limit=5: Get multiple candidates to skip "Disambiguation" pages or simple capitalization matches
        // namespace=0: Only articles
        // origin=*: Required for CORS in browser
        const params = new URLSearchParams({
            action: 'opensearch',
            search: term,
            limit: '5',
            namespace: '0',
            format: 'json',
            origin: '*'
        });

        const response = await fetch(`${WIKI_API_URL}?${params.toString()}`);

        if (!response.ok) {
            console.warn("Wiki API Error:", response.statusText);
            return null;
        }

        const data: WikiOpenSearchResponse = await response.json();
        const suggestions = data[1];

        if (suggestions && suggestions.length > 0) {
            // Smart Selection Logic:
            // Iterate through candidates to find the first "Useful" suggestion.

            for (const candidate of suggestions) {
                // Skip if it's the exact same as input (case-insensitive) - e.g. "Ai" vs "ai"
                if (candidate.toLowerCase() === term.toLowerCase()) continue;

                // Skip if it is a disambiguation page
                if (candidate.toLowerCase().includes('(disambiguation)')) continue;

                // If checking "ai", and we found "Artificial intelligence", this is PERFECT.
                // This candidate is likely the main topic.
                suggestionCache[term] = candidate;
                return candidate;
            }
        }

        // No useful suggestion found
        suggestionCache[term] = null;
        return null;

    } catch (error) {
        // Fail silently - this is an enhancement, not a critical path
        console.warn("Smart Search Failed:", error);
        return null;
    }
};
