import { execute } from './tidbClient';

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
