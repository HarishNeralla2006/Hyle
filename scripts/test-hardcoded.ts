
export { };

// Mocking the behavior since we can't easily import the service function in isolation 
// without resolving all imports, but we can test the URL generation if we could import it.
// Instead, let's just make a script that imports 'getSmartSuggestions' if possible, 
// or simpler: just write a script that mimicks the logic to prove the typescript compiles and logic is sound?
// Better: We can try to import the service. 

// Actually, `wikipediaService.ts` has imports that might fail in a standalone script if not fully configured (tsconfig aliases).
// Let's rely on the build success and maybe a simple script that mimics the fetch using the SAME hardcoded map 
// to see what the Wikipedia API returns for the TARGET terms.

const fetch = globalThis.fetch;
const WIKI_API_URL = "https://en.wikipedia.org/w/api.php";

const HARDCODED_ALIASES: Record<string, string> = {
    "alias": "Pseudonym",
    "alais": "Pseudonym",
    "ai": "Artificial intelligence"
};

async function testAliasResponse(inputTerm: string) {
    let term = inputTerm.toLowerCase();
    let mapped = false;

    if (HARDCODED_ALIASES[term]) {
        console.log(`[MAPPING] "${inputTerm}" -> "${HARDCODED_ALIASES[term]}"`);
        term = HARDCODED_ALIASES[term];
        mapped = true;
    } else {
        console.log(`[NO MAP] "${inputTerm}"`);
    }

    // Now fetch what the Service WOULD fetch for this new term
    const params = new URLSearchParams({
        action: 'query',
        generator: 'prefixsearch',
        gpssearch: term,
        gpslimit: '1',
        prop: 'description',
        cllimit: '1',
        redirects: '1',
        format: 'json',
        origin: '*'
    });

    const url = `${WIKI_API_URL}?${params.toString()}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.query?.pages) {
        const p = Object.values(data.query.pages)[0] as any;
        console.log(`   -> Wikipedia returned: "${p.title}" (${p.description})`);
    }
}

async function run() {
    await testAliasResponse("alias");
    await testAliasResponse("alais");
    await testAliasResponse("ai");
}

run();
