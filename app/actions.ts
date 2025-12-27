'use server';

import { generateEmbedding, cosineSimilarity } from '../lib/vector';
import { fetchCommunities, Community } from '../lib/communities';
import { execute } from '../lib/tidbClient';

export async function createCommunityAction(name: string, description: string, tags: string[], creatorId: string): Promise<Community | null> {
    try {
        console.log(" [Server Action] Creating community:", name);

        // 1. Semantic Check (Runs on Server - Safe & Fast)
        try {
            const existingCommunities = await fetchCommunities();

            if (existingCommunities.length > 0) {
                // Collect All Potential Matches to find the BEST/LONGEST one
                const candidates: { community: Community, score: number, type: string }[] = [];
                const lowName = name.toLowerCase().trim();

                // A. MATH Logic (Deterministic, Fast, Free)
                // ---------------------------------------------------------

                // 1. Prefix Match ("Sci" -> "Science")
                const prefixMatches = existingCommunities.filter(c =>
                    c.name.toLowerCase().startsWith(lowName) &&
                    c.name.length >= lowName.length
                );
                prefixMatches.forEach(c => candidates.push({ community: c, score: 99, type: 'Prefix' }));

                // 2. Acronym/Substring Heuristic (Simple "Comp Sci" -> "Computer Science")
                const inputParts = lowName.split(/\s+/);
                if (inputParts.length > 1) {
                    const acronymMatches = existingCommunities.filter(c => {
                        const targetParts = c.name.toLowerCase().split(/\s+/);
                        // Strict check: Input "Comp Sci" must match start of "Computer Science" words
                        return inputParts.every((part, i) => targetParts[i]?.startsWith(part));
                    });
                    acronymMatches.forEach(c => candidates.push({ community: c, score: 90, type: 'Acronym' }));
                }

                // If Math found robust matches, we could return early.
                // But to fix "Ghost Buckets" (where "Comp sci" matches itself but "Computer Science" is better),
                // we should always compare lengths if scores are high.

                // B. AI Logic (Semantic Vectors)
                // ---------------------------------------------------------
                // Only run AI if no high-confidence Math match was found?
                // Or run it anyway to be safe?
                // Let's run it if candidates < 1 to save cost/speed, as Math is very reliable for abbreviations.
                if (candidates.length === 0) {
                    try {
                        const currentEmbedding = await generateEmbedding(`${name} ${description} ${tags.join(' ')}`);
                        for (const comm of existingCommunities) {
                            const commText = `${comm.name} ${comm.description} ${comm.tags.join(' ')}`;
                            const commEmbedding = await generateEmbedding(commText);
                            const score = cosineSimilarity(currentEmbedding, commEmbedding);

                            if (score > 0.58) {
                                candidates.push({ community: comm, score: score * 100, type: 'Semantic' });
                            }
                        }
                    } catch (e) {
                        console.warn(" [Server Action] Semantic check skipped:", e);
                    }
                }

                // C. DECISION Logic (The Fix for Ghost Buckets)
                // ---------------------------------------------------------
                // If we found ANY matches (Self, Shadow, or Canonical)
                if (candidates.length > 0) {
                    // Sort by:
                    // 1. Name Length (DESC) -> Prefers "Computer Science" over "Comp Sci"
                    // 2. Score (DESC) -> Prefers Prefix (99) over Semantic (58-85)
                    candidates.sort((a, b) => {
                        const lenDiff = b.community.name.length - a.community.name.length;
                        if (Math.abs(lenDiff) > 0) return lenDiff; // Longest name wins (Canonical)
                        return b.score - a.score; // Higher confidence wins
                    });

                    // Deduplicate if needed (same community might match multiple ways)
                    const best = candidates[0];
                    console.log(` [Server Action] Matched: "${name}" -> "${best.community.name}" (${best.type}, Len: ${best.community.name.length})`);
                    return best.community;
                }
            }
        } catch (semanticError) {
            console.error(" [Server Action] Semantic check failed:", semanticError);
            // Continue to creation if vector check fails
        }

        // 2. Database Insertion (Standard)
        const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const tagString = JSON.stringify(tags);
        const themeColor = '#FFD820';

        await execute(
            `INSERT INTO communities (id, name, description, tags, theme_color, creator_id) VALUES (?, ?, ?, ?, ?, ?)`,
            [id, name, description, tagString, themeColor, creatorId]
        );

        return {
            id,
            name,
            description,
            tags,
            themeColor,
            creator_id: creatorId
        };

    } catch (error) {
        console.error(" [Server Action] Failed to create community:", error);
        return null;
    }
}
