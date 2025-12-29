
// Wikipedia OpenSearch Service
// Provides "Smart Suggestions" by mapping slang/typos to canonical Wikipedia titles.
// 100% Free, No Auth, High Reliability.

const WIKI_API_URL = "https://en.wikipedia.org/w/api.php";

// Wikipedia Query Response Interface
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

// Wikipedia OpenSearch Response Interface
type WikiOpenSearchResponse = [string, string[], string[], string[]];

// In-memory cache to prevent redundant network calls for the same term
const suggestionCache: Record<string, string[] | null> = {};

export const getSmartSuggestions = async (query: string): Promise<string[]> => {
    const term = query.trim();

    // 1. Basic Validation
    if (!term || term.length < 2) return [];

    // 2. Check Cache
    if (suggestionCache[term] !== undefined) {
        return suggestionCache[term] || [];
    }

    try {
        // 3. Parallel Fetch: Autocomplete (Prefix) + Relevance (Topic)

        // A. Relevance Search (Finds "Virtual Reality" for "vr")
        const queryParams = new URLSearchParams({
            action: 'query',
            list: 'search',
            srsearch: term,
            srlimit: '5',
            format: 'json',
            origin: '*'
        });

        // B. Autocomplete Search (Finds "Science" for "sci")
        const openSearchParams = new URLSearchParams({
            action: 'opensearch',
            search: term,
            limit: '5',
            namespace: '0',
            format: 'json',
            origin: '*'
        });

        const [queryRes, openSearchRes] = await Promise.all([
            fetch(`${WIKI_API_URL}?${queryParams.toString()}`),
            fetch(`${WIKI_API_URL}?${openSearchParams.toString()}`)
        ]);

        if (!queryRes.ok || !openSearchRes.ok) {
            console.warn("Wiki API Error");
            return [];
        }

        const queryData: WikiQueryResponse = await queryRes.json();
        const openSearchData: WikiOpenSearchResponse = await openSearchRes.json();

        // 4. Merge & Deduplicate Results
        const rawResults: string[] = [];

        // Prioritize Autocomplete for short prefixes (likely user is typing a word)
        // Check if query length is small (< 4), prioritising autocomplete
        const openSearchSuggestions = openSearchData[1] || [];
        rawResults.push(...openSearchSuggestions);

        // Add Relevance results
        const querySuggestions = queryData.query?.search?.map(s => s.title) || [];
        rawResults.push(...querySuggestions);

        const uniqueResults = new Set<string>();
        const finalSuggestions: string[] = [];

        for (const candidate of rawResults) {
            // Clean title
            const title = candidate;

            // Dedupe
            if (uniqueResults.has(title)) continue;

            // Filter logic
            if (title.startsWith("List of")) continue;
            if (title.toLowerCase().includes('(disambiguation)')) continue;
            if (title.startsWith("Category:")) continue;

            // Logic to filter strict case-insensitive duplicates if we already have a display version?
            // Actually, we usually want the most "proper" casing.
            // If we have "sci" (input), and we find "SCI" and "Science".
            // We keep both. "SCI" might be what they mean.

            uniqueResults.add(title);
            finalSuggestions.push(title);

            if (finalSuggestions.length >= 4) break; // Limit to 4 chips
        }

        suggestionCache[term] = finalSuggestions;
        return finalSuggestions;

    } catch (error) {
        console.warn("Smart Search Failed:", error);
        return [];
    }
};
