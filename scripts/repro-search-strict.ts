
import * as fs from 'fs';

const WIKIDATA_API_URL = "https://www.wikidata.org/w/api.php";
let output = "";

function log(msg: string) {
    console.log(msg);
    output += msg + "\n";
}

// MIRROR of wikipediaService.ts logic
const isBlockedEntity = (entity: any): boolean => {
    const description = (entity.description || "").toLowerCase();
    const label = entity.label.toLowerCase();

    if (/^(list of|category:|template:|wikipedia:)/.test(label)) return true;
    if (label.includes('(disambiguation)')) return true;

    // USES REGEX "\bWORD\b" to avoid substring matches
    const blockedTerms = [
        // People / Humans (Strict Block)
        'person', 'people', 'human being', 'adult male', 'adult female',
        'actor', 'actress', 'presenter', 'broadcaster', 'host',
        'player', 'coach', 'manager', 'athlete', 'swimmer', 'runner',
        'musician', 'singer', 'songwriter', 'rapper', 'drummer', 'guitarist', 'vocalist', 'band',
        'politician', 'senator', 'governor', 'president', 'minister', 'secretary',
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
        const pattern = new RegExp(`\\b(${blockedTerms.join('|')})\\b`, 'i');
        if (pattern.test(description)) {
            return true;
        }
    }
    return false;
};

async function checkDescriptions(term: string) {
    const params = new URLSearchParams({
        action: 'wbsearchentities',
        search: term,
        language: 'en',
        limit: '20',
        format: 'json',
        uselang: 'en',
        type: 'item',
        origin: '*'
    });

    const response = await fetch(`${WIKIDATA_API_URL}?${params.toString()}`);
    const data = await response.json();
    log(`\nResults for "${term}" (STRICT DOMAIN MODE):`);
    data.search.forEach((entity: any) => {
        const status = isBlockedEntity(entity) ? "[BLOCKED]" : "[ALLOWED]";
        log(`${status} [${entity.id}] ${entity.label}: "${entity.description || ''}"`);
    });
}

(async () => {
    await checkDescriptions("cs");
    await checkDescriptions("artificial");
    await checkDescriptions("ai");
    fs.writeFileSync('c:/Users/naral/Downloads/spark.ai/scripts/output_strict_verify.txt', output);
})();
