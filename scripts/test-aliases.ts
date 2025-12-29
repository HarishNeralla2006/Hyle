
export { }; // Force module scope

const fetch = globalThis.fetch;
const WIKI_API_URL = "https://en.wikipedia.org/w/api.php";

async function testTerm(term: string) {
    console.log(`\n--- Testing Term: "${term}" ---`);
    const params = new URLSearchParams({
        action: 'query',
        generator: 'prefixsearch',
        gpssearch: term,
        gpslimit: '5',
        prop: 'description',
        cllimit: 'max',
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

    const pages = Object.values(data.query.pages) as any[];
    pages.forEach(p => {
        console.log(`- ${p.title} (${p.description || "No desc"})`);
    });
}

async function run() {
    await testTerm("ai");
    await testTerm("alias");
}

run();
