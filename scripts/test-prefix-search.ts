
const fetch = globalThis.fetch;

const WIKI_API_URL = "https://en.wikipedia.org/w/api.php";

async function testPrefixSearch(term) {
    console.log(`\n--- Testing Prefix Search: "${term}" ---`);
    const params = new URLSearchParams({
        action: 'query',
        generator: 'prefixsearch',
        gpssearch: term,
        gpslimit: '5',
        prop: 'categories|pageprops',
        cllimit: '10',
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
        // Sort by index (index is often not provided in prefix search directly in same way? let's check output)
        // Usually prefixsearch returns results in order, but the pages dict is unordered.
        // We usually rely on the generator index if available, or just the returned order if we used list=prefixsearch (but we actally use generator).
        // Let's see if there's an 'index' property.

        pages.forEach((p: any) => {
            console.log(`\nTitle: ${p.title} (Index: ${p.index})`);
            if (p.categories) {
                console.log("Categories:", p.categories.map((c: any) => c.title).join(', '));
            }
        });

    } catch (e) {
        console.error(e);
    }
}

async function run() {
    await testPrefixSearch("vr");       // Expect: "Mike Vrabel" (ensure I can see his categories)
    await testPrefixSearch("liter");    // Expect: "Lexus RX" (maybe?)
}

run();
