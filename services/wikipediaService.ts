
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
    const blockedSemantics = [
        // People / Humans (Strict Block)
        'human', 'person', 'people', 'man', 'woman',
        'actor', 'actress', 'presenter', 'broadcaster', 'host',
        'player', 'coach', 'manager', 'athlete', 'swimmer', 'runner',
        'musician', 'singer', 'songwriter', 'rapper', 'drummer', 'guitarist', 'vocalist', 'band',
        'politician', 'senator', 'governor', 'president', 'minister', 'secretary', // e.g. "Interior Secretary"
        'monarch', 'prince', 'princess', 'king', 'queen',
        'writer', 'author', 'novelist', 'poet', 'journalist',
        'lawyer', 'judge', 'attorney',
        'surgeon', 'physician', 'doctor',
        'researcher', 'scientist', // e.g. "American scientist" - we want the FIELD, not the person

        // Business / Organizations
        'business', 'company', 'corporation', 'enterprise', 'manufacturer', 'firm', 'agency',
        'brand', 'retailer',

        // Specific Object/Product types (if not desired as topics)
        'smartphone model', 'vehicle model', 'video game console',

        // Creative Works (Optional: block specific episodes/songs to keep it "Topic" focused)
        'episode', 'song', 'single by', 'album by'
    ];

    if (description) {
        if (blockedSemantics.some(term => description.includes(term))) {
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
            );

        // 6. Limit to top 4 relevant results
        const finalSuggestions = validSuggestions.slice(0, 4);

        suggestionCache[term] = finalSuggestions;
        return finalSuggestions;

    } catch (error) {
        console.warn("Smart Search Failed:", error);
        return [];
    }
};
