
// Wikipedia OpenSearch Service
// Provides "Smart Suggestions" by mapping slang/typos to canonical Wikipedia titles.
// 100% Free, No Auth, High Reliability.

const WIKI_API_URL = "https://en.wikipedia.org/w/api.php";

// Wikipedia Query Response Interface
interface WikiQueryResponse {
    query: {
        search: Array<{
            title: string;
            snippet: string;
            pageid: number;
        }>;
    };
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
        // action=query&list=search: Performs a full text/relevance search (better than opensearch prefix matching)
        // srsearch: The query term
        // srlimit=5: Fetch top 5 results
        // origin=*: CORS
        const params = new URLSearchParams({
            action: 'query',
            list: 'search',
            srsearch: term,
            srlimit: '5',
            format: 'json',
            origin: '*'
        });

        const response = await fetch(`${WIKI_API_URL}?${params.toString()}`);

        if (!response.ok) {
            console.warn("Wiki API Error:", response.statusText);
            return null;
        }

        const data: WikiQueryResponse = await response.json();
        const results = data.query?.search;

        if (results && results.length > 0) {
            // Smart Selection Logic:
            for (const candidate of results) {
                const title = candidate.title;

                // Skip "List of..." pages
                if (title.startsWith("List of")) continue;

                // Skip "Disambiguation" pages
                // Note: The API usually puts "(disambiguation)" in the title if it's explicitly one,
                // or the snippet might clarify, but title check is usually enough for top results.
                if (title.toLowerCase().includes('(disambiguation)')) continue;

                // Skip Category pages
                if (title.startsWith("Category:")) continue;

                // Skip if it's identical to the query (to avoid redundant suggestions like "ai" -> "AI")
                // UNLESS the casing is significantly cleaner (e.g. "vr" -> "VR").
                // For now, let's allow it if it's not a strict case-insensitive match, OR if it fixes capitalization.
                // Actually, showing "Artificial Intelligence" for "ai" is good.
                // Showing "VR" for "vr" is good.
                // Showing "virtual reality" for "vr" is GREAT.
                // We simply return the title.

                suggestionCache[term] = title;
                return title;
            }
        }

        // No useful suggestion found
        suggestionCache[term] = null;
        return null;

    } catch (error) {
        console.warn("Smart Search Failed:", error);
        return null;
    }
};
