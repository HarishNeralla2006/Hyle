
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
        // limit=1: We only want the "Best" match
        // namespace=0: Only articles (no user pages, talk pages, etc)
        // origin=*: Required for CORS in browser
        const params = new URLSearchParams({
            action: 'opensearch',
            search: term,
            limit: '1',
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
            const bestMatch = suggestions[0];

            // 4. Smart Logic: Only return if it's a "Correction" or "Expansion"
            // If user types "AI", and wiki gives "Artificial Intelligence" -> RETURN IT.
            // If user types "Artificial Intelligence", and wiki gives "Artificial Intelligence" -> RETURN NULL (No point suggesting what they already typed).

            if (bestMatch.toLowerCase() !== term.toLowerCase()) {
                suggestionCache[term] = bestMatch;
                return bestMatch;
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
