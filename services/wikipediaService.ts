
// Wikipedia/Wikidata Smart Search Service
// Switched to Wikidata (wbsearchentities) for concept-based searching.
// 100% Free, No Auth, High Reliability.
// Last Verified: 2026-01-01

const WIKIDATA_API_URL = "https://www.wikidata.org/w/api.php";

// Wikidata Response Interface
interface WikidataEntity {
    id: string;
    label: string;
    description?: string;
    aliases?: string[];
    // URL typically not needed for suggestions, just the label
}

interface WikidataResponse {
    search: WikidataEntity[];
    success?: number;
}

// In-memory cache to prevent redundant network calls
const suggestionCache: Record<string, string[] | null> = {};

// --- HARDCODED ALIASES (User Override) ---
// Kept to handle "ai", "cs" which Wikidata might miss or return obscure results for.
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
    "alias": "Pseudonym",
    "alais": "Pseudonym", // Typo handling
    "lit": "Literature"
};

// --- STRICT FILTERING LOGIC ---
// Blocks entities based on their Wikidata description.
const isBlockedEntity = (entity: WikidataEntity): boolean => {
    const description = (entity.description || "").toLowerCase();
    const label = entity.label.toLowerCase();

    // 1. Explicit Label Blocklist via Regex
    if (/^(list of|category:|template:|wikipedia:)/.test(label)) return true;
    if (label.includes('(disambiguation)')) return true;

    // 2. NSFW Filter (Label Check)
    const nsfwTerms = ['porn', 'sex', 'xxx', 'nsfw', 'adult', 'erotic', 'nude', 'nudity', 'fetish', 'hentai', 'vagina', 'penis', 'genital', 'intercourse', 'incest'];
    if (nsfwTerms.some(term => label.includes(term))) return true;

    // 3. SEMANTIC DESCRIPTION FILTER
    // Blocks "Humans", "Businesses", "Creative Works" if they aren't the primary topic.
    // USES REGEX "\bWORD\b" to avoid substring matches (e.g. "man" in "mental").
    const blockedTerms = [
        // People / Humans (Strict Block)
        'person', 'people', 'human being', 'adult male', 'adult female',
        'actor', 'actress', 'presenter', 'broadcaster', 'host',
        'player', 'coach', 'manager', 'athlete', 'swimmer', 'runner',
        'musician', 'singer', 'songwriter', 'rapper', 'drummer', 'guitarist', 'vocalist', 'band',
        'politician', 'senator', 'governor', 'president', 'minister', 'secretary', // e.g. "Interior Secretary"
        'monarch', 'prince', 'princess', 'king', 'queen',
        'writer', 'author', 'novelist', 'poet', 'journalist',
        'lawyer', 'judge', 'attorney',
        'surgeon', 'physician', 'doctor',
        'researcher', 'scientist', 'inventor',
        'given name', 'family name', 'surname',

        // Business / Organizations
        'business', 'company', 'corporation', 'enterprise', 'manufacturer', 'firm', 'agency',
        'brand', 'retailer', 'store', 'shop',
        'university', 'college', 'school', 'academy', 'institute', 'department', 'faculty', 'campus', 'observatory',
        'political party', 'government', 'organization', 'association', 'charity', 'foundation',

        // Creative Works (Strict Block)
        'episode', 'song', 'single by', 'album by',
        'film', 'movie', 'series', 'show', 'video game',
        'journal', 'magazine', 'newspaper', 'periodical', 'publication', 'book', 'novel',

        // Geography (Reduce noise)
        'commune', 'municipality', 'territory', 'canton', 'airport', 'airline',
    ];

    if (description) {
        // Create a single regex for performance: /\b(word1|word2|...)\b/i
        // Escape special regex chars if any (though our list is simple words)
        const pattern = new RegExp(`\\b(${blockedTerms.join('|')})\\b`, 'i');
        if (pattern.test(description)) {
            return true;
        }
    }

    return false;
};

export const getSmartSuggestions = async (query: string): Promise<string[]> => {
    let term = query.trim();

    // 1. Basic Validation
    if (!term || term.length < 2) return [];

    // 2. CHECK HARDCODED ALIASES
    const lowerTerm = term.toLowerCase();
    if (HARDCODED_ALIASES[lowerTerm]) {
        term = HARDCODED_ALIASES[lowerTerm];
    }

    // 3. Check Cache
    if (suggestionCache[term] !== undefined) {
        return suggestionCache[term] || [];
    }

    try {
        // 4. Wikidata Entity Search
        // Doc: https://www.wikidata.org/w/api.php?action=help&modules=wbsearchentities
        const params = new URLSearchParams({
            action: 'wbsearchentities',
            search: term,
            language: 'en',
            limit: '20', // Fetch more to allow for filtering
            format: 'json',
            uselang: 'en',
            type: 'item', // Only "Items" (Q-codes), not Properties (P-codes)
            origin: '*'
        });

        const response = await fetch(`${WIKIDATA_API_URL}?${params.toString()}`);

        if (!response.ok) {
            console.warn("Wikidata API Error:", response.status);
            return [];
        }

        const data: WikidataResponse = await response.json();

        // 5. Process & Filter Results
        const rawEntities = data.search || [];

        const validSuggestions = rawEntities
            .filter(entity => !isBlockedEntity(entity))
            .map(entity => entity.label)
            // Deduplicate (Case-insensitive)
            .filter((label, index, self) =>
                index === self.findIndex(t => t.toLowerCase() === label.toLowerCase())
            )
            // 6. RANKING: Prioritize "Starts With" to match user typing
            .sort((a, b) => {
                const lowerQuery = term.toLowerCase(); // Use the resolved term (aliases applied)
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

                // 3. Length (Shorter is usually more "broad/canonical")
                return lowerA.length - lowerB.length;
            });

        // 6. Limit to top 4 relevant results
        const finalSuggestions = validSuggestions.slice(0, 4);

        suggestionCache[term] = finalSuggestions;
        return finalSuggestions;

    } catch (error) {
        console.warn("Smart Search Failed:", error);
        return [];
    }
};
