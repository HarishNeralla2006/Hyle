
import { connect } from '@tidbcloud/serverless';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const PARENT_MAP: Record<string, string> = {
    'cosmology': 'Space',
    'astronomy': 'Space',
    'neuroscience': 'Biology',
    'genetics': 'Biology',
    'topology': 'Mathematics',
    'algebra': 'Mathematics',
    'civil engineering': 'Engineering',
    'startup': 'Business',
    'stoicism': 'Philosophy',
    'logic': 'Philosophy',
    'cognitive': 'Psychology',
    'indie': 'Gaming',
    'rpg': 'Gaming',
    'movies': 'Cinema',
    'wellness': 'Health',
    'fitness': 'Health',
    'botany': 'Nature',
    'wildlife': 'Nature',
    'climate': 'Environment',
    'relativity': 'Physics', // Added based on debug output
    'art': 'Art',
};

async function main() {
    console.log("🚀 Starting Post Migration...");

    if (!process.env.DATABASE_URL) {
        console.error("Missing DATABASE_URL");
        process.exit(1);
    }

    const conn = connect({ url: process.env.DATABASE_URL });

    try {
        const rows = await conn.execute(`SELECT id, domain_id, created_at FROM posts`);
        const posts = (rows as any).rows || rows as any[];

        console.log(`Checking ${posts.length} posts...`);
        let updatedCount = 0;

        for (const post of posts) {
            let newId = post.domain_id;
            let needsUpdate = false;

            // 1. Fix Slash vs Colon
            if (newId.includes('/')) {
                // Science/Physics -> Science: Physics
                const parts = newId.split('/');
                if (parts.length === 2) {
                    // Capitalize both
                    const p1 = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
                    const p2 = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
                    newId = `${p1}: ${p2}`;
                    needsUpdate = true;
                } else {
                    // Just replace slashes with colon space if multiple?
                    newId = newId.replace(/\//g, ': ');
                    needsUpdate = true;
                }
            }

            // 2. Fix Orphans (Lowercase or missing parent)
            // Extract leaf if composite
            const leaf = newId.includes(':') ? newId.split(':')[1].trim().toLowerCase() : newId.toLowerCase();

            if (PARENT_MAP[leaf]) {
                const parent = PARENT_MAP[leaf];
                // Check if already corrected
                if (!newId.includes(':')) {
                    const properLeaf = leaf.charAt(0).toUpperCase() + leaf.slice(1);
                    newId = `${parent}: ${properLeaf}`;
                    needsUpdate = true;
                }
            }

            // 3. Capitalize single words if lowercase
            if (!newId.includes(':') && /^[a-z]/.test(newId)) {
                newId = newId.charAt(0).toUpperCase() + newId.slice(1);
                needsUpdate = true;
            }

            if (needsUpdate && newId !== post.domain_id) {
                console.log(`   Migrating: "${post.domain_id}" -> "${newId}"`);
                await conn.execute('UPDATE posts SET domain_id = ? WHERE id = ?', [newId, post.id]);
                updatedCount++;
            }
        }

        console.log(`✅ Migration Complete. Updated ${updatedCount} posts.`);

    } catch (e: any) {
        console.error("Migration Error:", e.message);
    }
}

main();
