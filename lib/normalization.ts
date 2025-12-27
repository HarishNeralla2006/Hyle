
import { createHash } from 'crypto';

// 1. Synonym Map: Hardcoded knowledge of identical concepts
export const SYNONYM_MAP: Record<string, string> = {
    'independent games': 'Indie Games',
    'indie gaming': 'Indie Games',
    'indiegaming': 'Indie Games',
    'pcgaming': 'PC Gaming',
    'computer games': 'PC Gaming',
    'machine learning': 'AI',
    'artificial intelligence': 'AI',
    'deep learning': 'AI',
    'web development': 'Web Dev',
    'webdev': 'Web Dev',
    'cinema': 'Movies',
    'cinematography': 'Movies',
    'film': 'Movies',
    'biology': 'Biology',
    'microbiology': 'Biology',
    'quantum physics': 'Quantum Physics',
    'quantummechanics': 'Quantum Physics'
};

// 2. Levenshtein Distance (Fuzzy Matcher) - No external dependencies
export function levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    Math.min(
                        matrix[i][j - 1] + 1, // insertion
                        matrix[i - 1][j] + 1  // deletion
                    )
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

// 3. The Logic: Normalize Input -> Canonical Sub-Sphere
export function normalizeSubTopic(input: string): string {
    if (!input) return '';
    const weirdInput = input.toLowerCase().replace(/r\//, '').replace(/_/g, ' ').trim();

    // Direct Synonym Check
    if (SYNONYM_MAP[weirdInput]) {
        return SYNONYM_MAP[weirdInput];
    }

    // Fuzzy Check against known keys
    const knownKeys = Object.keys(SYNONYM_MAP);
    for (const key of knownKeys) {
        // If similarity is > 80% (distance is small)
        const dist = levenshteinDistance(weirdInput, key);
        const maxLen = Math.max(weirdInput.length, key.length);
        if (1 - (dist / maxLen) > 0.8) {
            return SYNONYM_MAP[key];
        }
    }

    // Default: Return original (capitalized for display if possible, but we mostly use this for matching)
    // For search matching, we might just want the normalized string if found, or strictly the input.
    // If no match found in synonyms, return the input itself so it searches for exactly what user typed.
    return input;
}
