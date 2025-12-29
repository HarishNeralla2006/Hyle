
const fetch = globalThis.fetch;

const WIKI_API_URL = "https://en.wikipedia.org/w/api.php";

async function testWiki(term) {
    console.log(`\n--- Testing: "${term}" ---`);
    const params = new URLSearchParams({
        action: 'query',
        generator: 'search',
        gsrsearch: term,
        gsrlimit: '5',
        prop: 'categories|pageprops',
        cllimit: '10', // Get up to 10 categories
        format: 'json',
        origin: '*'
    });

    try {
        const url = `${WIKI_API_URL}?${params.toString()}`;
        console.log(`URL: ${url}`);
        const res = await fetch(url);
        const data = await res.json();

        if (!data.query || !data.query.pages) {
            console.log("No results.");
            return;
        }

        const pages = Object.values(data.query.pages);
        pages.forEach((p: any) => {
            console.log(`\nTitle: ${p.title}`);
            if (p.categories) {
                console.log("Categories:", p.categories.map((c: any) => c.title).join(', '));
            } else {
                console.log("Categories: [NONE]");
            }
            if (p.pageprops) {
                if (p.pageprops.disambiguation !== undefined) console.log("[DISAMBIGUATION PAGE]");
            }
        });

    } catch (e) {
        console.error(e);
    }
}

async function run() {
    await testWiki("vr");       // Expect: Virtual Reality (Topic) vs Mike Vrabel (Person)
    await testWiki("ai");       // Expect: Artificial Intelligence (Topic) vs ...
    await testWiki("Apple");    // Expect: Apple Inc (Company) vs Apple (Fruit) - both might be "domains"?
    await testWiki("Mike Vrabel"); // Pure Person
}

run();
