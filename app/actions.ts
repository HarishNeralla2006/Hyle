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
                // A. MATH Logic (Deterministic, Fast, Free)
                // ---------------------------------------------------------
                // 1. Prefix Match ("Sci" -> "Science")
                const lowName = name.toLowerCase().trim();
                const prefixMatch = existingCommunities.find(c =>
                    c.name.toLowerCase().startsWith(lowName) &&
                    c.name.length > lowName.length // Ensure it's strictly a prefix, not equal
                );

                if (prefixMatch) {
                    console.log(` [Server Action] Prefix Match: "${name}" -> "${prefixMatch.name}"`);
                    return prefixMatch;
                }

                // 2. Acronym/Substring Heuristic (Simple "Comp Sci" -> "Computer Science")
                // Check if all parts of input are prefixes of words in an existing community
                const inputParts = lowName.split(' ');
                if (inputParts.length > 1) {
                    const acronymMatch = existingCommunities.find(c => {
                        const targetParts = c.name.toLowerCase().split(' ');
                        // Strict check: Input "Comp Sci" (2 parts) must match 2 parts in Target "Computer Science"
                        return inputParts.every((part, i) => targetParts[i]?.startsWith(part));
                    });

                    if (acronymMatch) {
                        console.log(` [Server Action] Acronym/Sub-word Match: "${name}" -> "${acronymMatch.name}"`);
                        return acronymMatch;
                    }
                }

                // B. AI Logic (Semantic Vectors)
                // ---------------------------------------------------------
                const currentEmbedding = await generateEmbedding(`${name} ${description} ${tags.join(' ')}`);

                let bestMatch: Community | null = null;
                let bestScore = -1;

                for (const comm of existingCommunities) {
                    const commText = `${comm.name} ${comm.description} ${comm.tags.join(' ')}`;
                    const commEmbedding = await generateEmbedding(commText);

                    const score = cosineSimilarity(currentEmbedding, commEmbedding);
                    if (score > bestScore) {
                        bestScore = score;
                        bestMatch = comm;
                    }
                }

                if (bestMatch && bestScore > 0.58) {
                    console.log(` [Server Action] Semantic Match Found: "${name}" -> "${bestMatch.name}" (Score: ${bestScore.toFixed(2)})`);
                    return bestMatch; // Return existing instead of creating new
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
