
const fetch = globalThis.fetch;

const WIKI_API_URL = "https://en.wikipedia.org/w/api.php";

async function testRegexFilter(term) {
    console.log(`\n--- Testing Regex Filter: "${term}" ---`);
    const params = new URLSearchParams({
        action: 'query',
        generator: 'prefixsearch',
        gpssearch: term,
        gpslimit: '10',
        prop: 'categories',
        cllimit: '500',
        redirects: '1',
        format: 'json',
        origin: '*'
    });

    const url = `${WIKI_API_URL}?${params.toString()}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.query || !data.query.pages) {
        console.log("No results.");
        return;
    }

    const pages = Object.values(data.query.pages);
    pages.sort((a: any, b: any) => a.index - b.index);

    // INTELLIGENT REGEX PATTERNS
    const patterns = [
        /\d{4} births/,   // Relaxed: Removed \b to catch "Category:1951 births" more easily
        /\d{4} deaths/,
        /living people/i,
        /possible living people/i,
        /(alumni|people|graduates|expatriates) (from|of|at|to)/i,
        /(players|coaches|managers|politicians|musicians|singers|actors|monarchs)/i
    ];

    pages.forEach((p: any) => {
        let isPerson = false;
        let matchReason = "";

        // 1. Title Checks
        if (p.title.startsWith("List of") || p.title.includes("(disambiguation)")) {
            isPerson = true;
            matchReason = "Title Pattern";
        }

        // 2. Category Checks
        if (p.categories) {
            const cats = p.categories.map((c: any) => c.title.toLowerCase());

            for (const cat of cats) {
                for (const pattern of patterns) {
                    if (pattern.test(cat)) {
                        isPerson = true;
                        matchReason = `Regex: ${pattern} MATCHED "${cat}"`;
                        break;
                    }
                }
                if (isPerson) break;
            }
        }

        if (!isPerson) {
            console.log(`[KEEP] "${p.title}"`);
            if (p.categories) {
                const c = p.categories.map((x: any) => x.title).slice(0, 3).join(", ");
                console.log(`   Cats: ${c}`);
            } else {
                console.log("   Cats: [NONE]");
            }
        } else {
            console.log(`[DROP] "${p.title}" (${matchReason})`);
        }
    });
}

async function run() {
    await testRegexFilter("phil");
}

run();
