export { }; // Force module scope

// const fetch = globalThis.fetch; // Not needed in Node 18+

const WIKI_API_URL = "https://en.wikipedia.org/w/api.php";

async function testDescription(term: string) {
    console.log(`\n--- Testing Description: "${term}" ---`);
    const params = new URLSearchParams({
        action: 'query',
        generator: 'prefixsearch',
        gpssearch: term,
        gpslimit: '5',
        prop: 'description|categories|pageprops', // Request description
        cllimit: '10',
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

    pages.forEach((p: any) => {
        console.log(`\nTitle: ${p.title}`);
        console.log(`Desc: ${p.description || "[NO DESCRIPTION]"}`);
        if (p.categories) {
            const cats = p.categories.map((c: any) => c.title).slice(0, 3).join(", ");
            console.log(`Cats: ${cats}...`);
        }
    });
}

async function run() {
    await testDescription("phil");
    await testDescription("physics");
}

run();
