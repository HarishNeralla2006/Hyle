import { execute } from './tidbClient';
import { generateEmbedding, cosineSimilarity } from './vector';

export interface Community {
    id: string;
    name: string;
    description: string;
    tags: string[];
    themeColor: string;
    icon?: string;
    creator_id?: string;
}

// Fetch all communities from DB
export const fetchCommunities = async (): Promise<Community[]> => {
    try {
        // Fetch all communities
        const comms = await execute('SELECT * FROM communities ORDER BY created_at DESC');

        // Parse tags if they are stringified
        return comms.map((c: any) => ({
            ...c,
            ...c,
            tags: typeof c.tags === 'string' ? (() => {
                try {
                    const parsed = JSON.parse(c.tags);
                    return Array.isArray(parsed) ? parsed : [];
                } catch (e) {
                    // Fallback for legacy comma-separated tags
                    return c.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
                }
            })() : c.tags
        }));
    } catch (error) {
        console.error("Error fetching communities:", error);
        return [];
    }
};

export const joinCommunity = async (communityId: string, userId: string) => {
    try {
        await execute('INSERT INTO community_members (community_id, user_id) VALUES (?, ?)', [communityId, userId]);
        return true;
    } catch (e) {
        console.error("Error joining community:", e);
        return false;
    }
};

export const leaveCommunity = async (communityId: string, userId: string) => {
    try {
        await execute('DELETE FROM community_members WHERE community_id = ? AND user_id = ?', [communityId, userId]);
        return true;
    } catch (e) {
        console.error("Error leaving community:", e);
        return false;
    }
};

export const checkMembership = async (communityId: string, userId: string) => {
    try {
        const res = await execute('SELECT COUNT(*) as c FROM community_members WHERE community_id = ? AND user_id = ?', [communityId, userId]);
        return (res[0] as any).c > 0;
    } catch (e) {
        console.error("Error checking membership:", e);
        return false;
    }
};

export const getMemberCount = async (communityId: string) => {
    try {
        const res = await execute('SELECT COUNT(*) as c FROM community_members WHERE community_id = ?', [communityId]);
        return (res[0] as any).c;
    } catch (e) {
        console.error("Error getting member count:", e);
        return 0;
    }
};

export const createCommunity = async (name: string, description: string, tags: string[], creatorId: string): Promise<Community | null> => {
    try {
        // 1. Semantic Check: Does a similar community already exist?
        try {
            // Note: For scale, this should use a Vector DB index. 
            // For now (prototype), we fetch all and check in-memory.
            const existingCommunities = await fetchCommunities();

            if (existingCommunities.length > 0) {
                const currentEmbedding = await generateEmbedding(`${name} ${description} ${tags.join(' ')}`);

                let bestMatch: Community | null = null;
                let bestScore = -1;

                for (const comm of existingCommunities) {
                    // Generate embedding for existing community on-the-fly (caching would be better)
                    // We use name + description + tags for rich context
                    const commText = `${comm.name} ${comm.description} ${comm.tags.join(' ')}`;
                    const commEmbedding = await generateEmbedding(commText);

                    const score = cosineSimilarity(currentEmbedding, commEmbedding);
                    if (score > bestScore) {
                        bestScore = score;
                        bestMatch = comm;
                    }
                }

                // Semantic Threshold (0.85 is usually a "good" same-topic match)
                if (bestMatch && bestScore > 0.85) {
                    console.log(`Semantic Match Found: "${name}" -> "${bestMatch.name}" (Score: ${bestScore.toFixed(2)})`);
                    return bestMatch;
                }
            }
        } catch (semanticError) {
            // Silently fail on semantic check errors (e.g. model loading issues on client)
            // so we don't block the core creation flow.
            console.warn("Semantic deduplication skipped:", semanticError);
        }

        // Simple ID generation: name-slug
        const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const tagString = JSON.stringify(tags);
        const themeColor = '#FFD820'; // Default Hyle Yellow

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
        console.error("Failed to create community:", error);
        return null;
    }
}
