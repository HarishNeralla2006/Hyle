
// Wikipedia OpenSearch Service
// Provides "Smart Suggestions" by mapping slang/typos to canonical Wikipedia titles.
// 100% Free, No Auth, High Reliability.

const WIKI_API_URL = "https://en.wikipedia.org/w/api.php";

// Wikipedia Generator Response Interface
interface WikiPage {
    pageid: number;
    title: string;
    index: number; // Search rank index
    categories?: Array<{ title: string }>;
    pageprops?: {
        disambiguation?: string;
    };
}

interface WikiGeneratorResponse {
    query: {
        pages: Record<string, WikiPage>;
    };
}

// In-memory cache to prevent redundant network calls for the same term
const suggestionCache: Record<string, string[] | null> = {};

// Helper: Check if a page is a "Person" or non-domain entity
const isNonDomain = (page: WikiPage): boolean => {
    const categories = page.categories?.map(c => c.title.toLowerCase()) || [];
    const title = page.title.toLowerCase();

    // 1. Explicit Title Filters
    if (title.startsWith("list of")) return true;
    if (title.startsWith("relationship between")) return true;
    if (title.includes('(disambiguation)')) return true;
    if (title.startsWith("category:")) return true;

    // Check pageprops for disambiguation
    if (page.pageprops && page.pageprops.disambiguation !== undefined) return true;

    // 2. NSFW Filter
    const nsfwTerms = ['porn', 'sex', 'xxx', 'nsfw', 'adult', 'erotic', 'nude', 'nudity', 'fetish', 'hentai'];
    if (nsfwTerms.some(term => title.includes(term))) return true;

    // 3. Category Filters (People, etc.)
    const personCategories = [
        'living people',
        'births',
        'deaths',
        'people',
        'human names',
        'surnames',
        'given names',
        'sportspeople',
        'coaches',
        'players',
        'musicians',
        'actors',
        'surgeons',
        'monarchs',
        'presidents'
    ];

    // Check if any category indicates a person
    if (categories.some(cat => personCategories.some(pc => cat.includes(pc)))) return true;

    return false;
};

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
        // We use generators for BOTH to get categories and filter "People".

        // A. Relevance Search (Finds "Virtual Reality" for "vr")
        const relevanceParams = new URLSearchParams({
            action: 'query',
            generator: 'search',
            gsrsearch: term,
            gsrlimit: '5',
            prop: 'categories|pageprops',
            cllimit: '50',
            format: 'json',
            origin: '*'
        });

        // B. Autocomplete Search (Finds "VR" for "vr", matches prefixes)
        // Replaced 'opensearch' with 'prefixsearch' generator to get categories
        const prefixParams = new URLSearchParams({
            action: 'query',
            generator: 'prefixsearch',
            gpssearch: term,
            gpslimit: '5',
            prop: 'categories|pageprops',
            cllimit: '50',
            format: 'json',
            origin: '*'
        });

        const [relevanceRes, prefixRes] = await Promise.all([
            fetch(`${WIKI_API_URL}?${relevanceParams.toString()}`),
            fetch(`${WIKI_API_URL}?${prefixParams.toString()}`)
        ]);

        if (!relevanceRes.ok || !prefixRes.ok) {
            console.warn("Wiki API Error");
            return [];
        }

        const relevanceData: WikiGeneratorResponse = await relevanceRes.json();
        const prefixData: WikiGeneratorResponse = await prefixRes.json();

        // 4. Process Results
        const processPages = (data: WikiGeneratorResponse): string[] => {
            const pages = data.query?.pages ? Object.values(data.query.pages) : [];
            // Sort by index
            const sorted = pages.sort((a, b) => a.index - b.index);
            // Filter
            return sorted.filter(p => !isNonDomain(p)).map(p => p.title);
        };

        const relevanceSuggestions = processPages(relevanceData);
        const prefixSuggestions = processPages(prefixData);

        // 5. Merge & Deduplicate (Interleaved)
        // [Rel #1, Prefix #1, Rel #2, Prefix #2...]

        const rawResults: string[] = [];
        const maxLength = Math.max(relevanceSuggestions.length, prefixSuggestions.length);

        for (let i = 0; i < maxLength; i++) {
            if (i < relevanceSuggestions.length) rawResults.push(relevanceSuggestions[i]);
            if (i < prefixSuggestions.length) rawResults.push(prefixSuggestions[i]);
        }

        const uniqueResults = new Set<string>();
        const finalSuggestions: string[] = [];

        for (const title of rawResults) {
            if (uniqueResults.has(title)) continue;
            uniqueResults.add(title);
            finalSuggestions.push(title);
            if (finalSuggestions.length >= 4) break;
        }

        suggestionCache[term] = finalSuggestions;
        return finalSuggestions;

    } catch (error) {
        console.warn("Smart Search Failed:", error);
        return [];
    }
};
