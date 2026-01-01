
import { getSmartSuggestions } from '../services/wikipediaService';

async function debug() {
    console.log("Testing 'ai' -> 'Artificial intelligence'...");
    const results = await getSmartSuggestions("ai");
    console.log("Results for 'ai':", results);

    if (!results.includes("Artificial intelligence")) {
        console.error("CRITICAL: 'Artificial intelligence' is MISSING from results!");
    } else {
        console.log("SUCCESS: 'Artificial intelligence' is present.");
    }
}

debug();
