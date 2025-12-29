
const fetch = globalThis.fetch;

const WIKI_API_URL = "https://en.wikipedia.org/w/api.php";

async function testPrefixSearch(term) {
    console.log(`\n--- Testing Prefix Search: "${term}" ---`);
    const params = new URLSearchParams({
        action: 'query',
        generator: 'prefixsearch',
        gpssearch: term,
        gpslimit: '10', // Get more to be sure
        prop: 'categories|pageprops',
        cllimit: 'max',
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

    // Sort by index
    pages.sort((a, b) => a.index - b.index);

    pages.forEach((p: any) => {
        console.log(`\nTitle: ${p.title} (Index: ${p.index})`);
        if (p.categories) {
            const cats = p.categories.map((c: any) => c.title).join(', ');
            console.log(`Categories: ${cats.slice(0, 100)}...`); // Truncate for readability

            if (cats.toLowerCase().includes('living people')) {
                console.log("MATCH: Living people");
            }
        } else {
            console.log("Categories: [NONE]");
        }
    });
}

async function run() {
    await testPrefixSearch("rela");
}

run();
