
const fetch = require('node-fetch');

async function check() {
    const terms = ["Artificial intelligence", "Data structure", "Computer science", "Machine learning"];

    for (const term of terms) {
        const url = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(term)}&gsrlimit=1&prop=description|categories&format=json&origin=*`;
        const res = await fetch(url);
        const data = await res.json();
        const page = Object.values(data.query.pages)[0] as any;
        console.log(`\n--- ${term} ---`);
        console.log(`Title: ${page.title}`);
        console.log(`Description: ${page.description}`);

        const blocked = ['machine', 'structure', 'device', 'material', 'compound'];
        const hit = blocked.find(b => page.description?.toLowerCase().includes(b));
        if (hit) {
            console.log(`[BLOCKED] by keyword: '${hit}'`);
        } else {
            console.log(`[PASSED] No blocked keywords found.`);
        }
    }
}

check();
