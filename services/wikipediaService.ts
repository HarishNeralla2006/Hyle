
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

        // 4. Merge & Deduplicate Results (Interleaved Strategy)
        // Goal: Mix "Topic" (Relevance) and "Word" (Autocomplete) so neither dominates.
        // Pattern: [Relevance #1, Autocomplete #1, Relevance #2, Autocomplete #2, ...]

        const openSearchSuggestions = openSearchData[1] || [];
        const querySuggestions = queryData.query?.search?.map(s => s.title) || [];

        const rawResults: string[] = [];
        const maxLength = Math.max(openSearchSuggestions.length, querySuggestions.length);

        for (let i = 0; i < maxLength; i++) {
            // Priority 1: Relevance (Topic) - "Virtual Reality"
            if (i < querySuggestions.length) rawResults.push(querySuggestions[i]);

            // Priority 2: Autocomplete (Word) - "Science" (or "Vr")
            if (i < openSearchSuggestions.length) rawResults.push(openSearchSuggestions[i]);
        }

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

            // NSFW Filter
            const nsfwTerms = ['porn', 'sex', 'xxx', 'nsfw', 'adult', 'erotic', 'nude', 'nudity', 'fetish', 'hentai'];
            const lowerTitle = title.toLowerCase();
            if (nsfwTerms.some(term => lowerTitle.includes(term))) continue;

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
