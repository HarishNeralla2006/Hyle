
const fetch = globalThis.fetch;

const WIKI_API_URL = "https://en.wikipedia.org/w/api.php";

async function testGeneric(term, generator, redirects = false) {
    console.log(`\n--- Testing ${generator} (Redirects: ${redirects}): "${term}" ---`);
    const params: any = {
        action: 'query',
        generator: generator,
        // Common params
        prop: 'categories',
        cllimit: '50',
        format: 'json',
        origin: '*'
    };

    if (generator === 'prefixsearch') {
        params.gpssearch = term;
        params.gpslimit = '10';
    } else {
        params.gsrsearch = term;
        params.gsrlimit = '10';
    }

    if (redirects) {
        params.redirects = '1';
    }

    const url = `${WIKI_API_URL}?${new URLSearchParams(params).toString()}`;
    // console.log(url);
    const res = await fetch(url);
    const data = await res.json();

    if (!data.query || !data.query.pages) {
        console.log("No results.");
        return;
    }

    const pages = Object.values(data.query.pages);
    // Sort logic approximate
    pages.sort((a: any, b: any) => a.index - b.index);

    pages.forEach((p: any) => {
        const title = p.title;
        let cats = "";
        let isPerson = false;

        if (p.categories) {
            cats = p.categories.map((c: any) => c.title.toLowerCase()).join(', ');
            const personCategories = ['living people', 'births', 'deaths', 'people', 'human names', 'surnames', 'given names', 'sportspeople', 'coaches', 'players', 'musicians', 'actors', 'surgeons', 'monarchs', 'presidents', 'hosts', 'writers'];
            isPerson = cats.split(', ').some(cat => personCategories.some(pc => cat.includes(pc)));
        } else {
            cats = "[NONE]";
        }

        console.log(`Title: ${title} | IsPerson: ${isPerson} | Cats: ${cats.slice(0, 50)}...`);
    });
}

async function run() {
    // 1. Test Relevance (Search) without redirects
    await testGeneric("phil", "search", false);
    // 2. Test Relevance (Search) WITH redirects
    await testGeneric("phil", "search", true);

    // 3. Test Autocomplete (Prefix) without redirects
    await testGeneric("phil", "prefixsearch", false);
    // 4. Test Autocomplete (Prefix) WITH redirects (this is the key fix candidate)
    await testGeneric("phil", "prefixsearch", true);
}

run();
