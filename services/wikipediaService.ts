
// Wikipedia OpenSearch Service
// Provides "Smart Suggestions" by mapping slang/typos to canonical Wikipedia titles.
// 100% Free, No Auth, High Reliability.
// Last Verified: 2026-01-01

const WIKI_API_URL = "https://en.wikipedia.org/w/api.php";

// Wikipedia Generator Response Interface
interface WikiPage {
    pageid: number;
    title: string;
    index: number; // Search rank index
    categories?: Array<{ title: string }>;
    description?: string; // Semantic Description (e.g. "American TV Host")
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

// Helper: Check if a page is a "Person" or non-domain entity using INTELLIGENT REGEX & SEMANTICS
const isNonDomain = (page: WikiPage): boolean => {
    const categories = page.categories?.map(c => c.title.toLowerCase()) || [];
    const title = page.title.toLowerCase();
    const description = page.description?.toLowerCase() || "";

    // 1. Explicit Title Filters
    if (title.startsWith("list of")) return true;
    if (title.startsWith("relationship between")) return true;
    if (title.includes('(disambiguation)')) return true;
    if (title.startsWith("category:")) return true;

    // Check pageprops for disambiguation
    if (page.pageprops && page.pageprops.disambiguation !== undefined) return true;

    // 2. NSFW Filter
    const nsfwTerms = ['porn', 'sex', 'xxx', 'nsfw', 'adult', 'erotic', 'nude', 'nudity', 'fetish', 'hentai', 'vagina', 'penis', 'genital', 'intercourse', 'incest'];
    if (nsfwTerms.some(term => title.includes(term))) return true;

    // 3. SEMANTIC DESCRIPTION FILTER (Intelligent)
    // Blocks entities based on what Wikipedia says they ARE.
    const blockedSemantics = [
        // People roles
        'actor', 'actress', 'television', 'presenter', 'broadcaster', 'host',
        'footballer', 'player', 'coach', 'manager', 'athlete', 'swimmer', 'runner',
        'musician', 'singer', 'songwriter', 'rapper', 'drummer', 'guitarist', 'vocalist', 'band',
        'politician', 'senator', 'governor', 'president', 'monarch', 'prince', 'princess', 'king', 'queen',
        'writer', 'author', 'novelist', 'poet', 'journalist',
        'lawyer', 'judge', 'attorney',
        'surgeon', 'physician', 'doctor',

        // Creative Works (that aren't "Topics")
        'film', 'movie', 'album', 'song', 'single by', 'episode', 'series', 'telenovela',

        // Biographical indicators
        'born', 'died', 'american', 'english', 'british', 'canadian', 'australian', 'indian', // e.g. "American actor"

        // Biological/Medical specifics (User requested clean domains only)
        'reproductive', 'insemination', 'genitalia'
    ];

    if (description) {
        // If description explicitly identifies as a blocked role
        if (blockedSemantics.some(term => description.includes(term))) {
            return true;
        }
    }

    // 4. INTELLIGENT REGEX CATEGORY FILTER (Fallback & Safety Net)
    // Blocks entire classes of pages (People, Alumni, Sports) based on structural patterns.
    const patterns = [
        /\d{4} births/,              // Matches "Category:1935 births", "1950 births" etc. (Catches 99% of people)
        /\d{4} deaths/,              // Matches "Category:2024 deaths"
        /living people/i,            // Matches "Category:Living people"
        /possible living people/i,
        /(alumni|people|graduates|expatriates|students) (from|of|at|to)/i, // "People from X", "Alumni of Y"
        /(players|coaches|managers|politicians|musicians|singers|actors|monarchs|bishops|clergymen)/i,
        /(television|film) (personalities|presenters|hosts|producers|directors)/i
    ];

    // Check if any category matches our intelligent patterns
    for (const cat of categories) {
        for (const pattern of patterns) {
            if (pattern.test(cat)) {
                return true;
            }
        }
    }

    return false;
};

// --- HARDCODED ALIASES (User Override) ---
const HARDCODED_ALIASES: Record<string, string> = {
    // Tech Aliases
    "ai": "Artificial intelligence",
    "ml": "Machine learning",
    "vr": "Virtual reality",
    "ar": "Augmented reality",
    "ui": "User interface",
    "ux": "User experience",
    "iot": "Internet of things",
    "llm": "Large language model",
    "nlp": "Natural language processing",
    "saas": "Software as a service",
    "cs": "Computer science",
    "it": "Information technology",
    "swe": "Software engineering",
    "ds": "Data science",
    "artificial": "Artificial intelligence",

    // User Requests
    "alias": "Pseudonym", // Explicit hardcode request
    "alais": "Pseudonym", // Typo handling
    "lit": "Literature"
};

export const getSmartSuggestions = async (query: string): Promise<string[]> => {
    let term = query.trim();

    // 1. Basic Validation
    if (!term || term.length < 2) return [];

    // 1.5 CHECK HARDCODED ALIASES
    const lowerTerm = term.toLowerCase();
    if (HARDCODED_ALIASES[lowerTerm]) {
        term = HARDCODED_ALIASES[lowerTerm];
    }


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
            prop: 'categories|pageprops|description', // Fetch Description
            cllimit: 'max', // CRITICAL: Fetch MAX categories to ensure 'births/deaths' isn't starved
            redirects: '1', // Resolve redirects to get categories
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
            prop: 'categories|pageprops|description', // Fetch Description
            cllimit: 'max', // CRITICAL: Fetch MAX categories
            redirects: '1', // Resolve redirects to get categories
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

        // 5. Merge & Deduplicate (Prefix-First Strategy)
        // Goal: "What you type is what you see". 
        // Logic: 
        // 1. Exact/Prefix matches go to the TOP.
        // 2. Fuzzy/Relevance matches go to the BOTTOM.

        const allCandidates = [...prefixSuggestions, ...relevanceSuggestions];
        const uniqueCandidates = new Set<string>();
        const validCandidates: string[] = [];

        // Deduplicate
        for (const title of allCandidates) {
            if (uniqueCandidates.has(title)) continue;
            uniqueCandidates.add(title);
            validCandidates.push(title);
        }

        // 6. Strict Ranking
        const rankedSuggestions = validCandidates.sort((a, b) => {
            const lowerA = a.toLowerCase();
            const lowerB = b.toLowerCase();
            const lowerTerm = term.toLowerCase();

            const aStarts = lowerA.startsWith(lowerTerm);
            const bStarts = lowerB.startsWith(lowerTerm);

            // Rule 1: StartsWith takes priority
            if (aStarts && !bStarts) return -1; // A comes first
            if (!aStarts && bStarts) return 1;  // B comes first

            // Rule 2: If both start with (or both don't), sort by length (shorter is usually better match)
            // e.g. "Lit" -> "Literacy" (8) vs "Literature" (10). User probably wants shorter, more common word first?
            // Actually, for "Lite", "Lite" is best.
            if (lowerA.length !== lowerB.length) {
                return lowerA.length - lowerB.length;
            }

            // Rule 3: Alphabetical fallback
            return lowerA.localeCompare(lowerB);
        });

        const finalSuggestions = rankedSuggestions.slice(0, 4);

        suggestionCache[term] = finalSuggestions;
        return finalSuggestions;

    } catch (error) {
        console.warn("Smart Search Failed:", error);
        return [];
    }
};
