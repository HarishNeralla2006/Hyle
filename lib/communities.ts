import { execute } from './tidbClient';

export interface Community {
    id: string;
    name: string;
    description: string;
    tags: string[];
    themeColor: string;
    creator_id?: string;
}

// Fetch all communities from DB
export async function fetchCommunities(): Promise<Community[]> {
    try {
        const rows = await execute('SELECT * FROM communities ORDER BY created_at DESC');
        return rows.map((row: any) => ({
            id: row.id,
            name: row.name,
            description: row.description,
            tags: row.tags.split(',').map((t: string) => t.trim()),
            themeColor: row.theme_color,
            creator_id: row.creator_id
        }));
    } catch (error) {
        console.error("Failed to fetch communities:", error);
        return [];
    }
}

// Create a new community
export async function createCommunity(
    name: string,
    description: string,
    tags: string[],
    creatorId: string
): Promise<boolean> {
    try {
        // Simple ID generation: name-slug
        const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const tagString = tags.join(',');
        const themeColor = '#FFD820'; // Default Hyle Yellow

        await execute(
            `INSERT INTO communities (id, name, description, tags, theme_color, creator_id) VALUES (?, ?, ?, ?, ?, ?)`,
            [id, name, description, tagString, themeColor, creatorId]
        );
        return true;
    } catch (error) {
        console.error("Failed to create community:", error);
        return false;
    }
}
