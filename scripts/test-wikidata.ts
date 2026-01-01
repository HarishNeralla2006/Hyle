import fetch from 'node-fetch';

const SUBSCRIPTION_KEY = 'YOUR_MOCK_KEY'; // Not actually used by Wiki, but good practice structure
const USER_AGENT = 'SparkAI_Test/1.0 (contact@example.com)';

// Mock filtering logic from service
interface WikidataEntity {
    id: string;
    label: string;
    description?: string;
}

const isBlockedEntity = (entity: WikidataEntity): boolean => {
    const description = (entity.description || "").toLowerCase();
    const label = entity.label.toLowerCase();

    // 1. Explicit Label Blocklist
    if (/^(list of|category:|template:|wikipedia:)/.test(label)) return true;

    // 2. NSFW Filter
    const nsfwTerms = ['porn', 'sex', 'xxx', 'nsfw'];
    if (nsfwTerms.some(term => label.includes(term))) return true;

    // 3. SEMANTIC DESCRIPTION FILTER
    const blockedSemantics = [
        'human', 'person', 'people', 'man', 'woman',
        'actor', 'actress', 'presenter', 'broadcaster', 'host',
        'politician', 'minister', 'secretary', // e.g. "Interior Secretary"
        'business', 'company', 'brand'
    ];

    if (description) {
        if (blockedSemantics.some(term => description.includes(term))) {
            return true;
        }
    }
    return false;
};

async function testWikidata(query: string) {
    console.log(`\n--- Testing "${query}" ---`);
    const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(query)}&language=en&limit=20&format=json&type=item`;

    try {
        const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
        const data = await response.json();

        if (data.search) {
            data.search.forEach((item: any) => {
                const blocked = isBlockedEntity(item);
                const status = blocked ? "BLOCKED ❌" : "ALLOWED ✅";
                console.log(`[${status}] ${item.label} (${item.description || 'No desc'})`);
            });
        }
    } catch (error) {
        console.error("Fetch error:", error);
    }
}

async function run() {
    await testWikidata('interior'); // Should block "Interior Secretary"
    await testWikidata('artificial intelligence'); // Should be allowed
    await testWikidata('cs'); // See what "Canton of Schwyz" looks like
}

run();
