
import { connect } from '@tidbcloud/serverless';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
    console.log("🔥 Starting ABSOLUTE Flattening Migration...");

    if (!process.env.DATABASE_URL) {
        process.exit(1);
    }
    const conn = connect({ url: process.env.DATABASE_URL });

    try {
        const rows = await conn.execute(`SELECT id, domain_id FROM posts`);
        const posts = (rows as any).rows || rows as any[];

        console.log(`Scanning ${posts.length} posts...`);
        let updatedCount = 0;

        for (const post of posts) {
            let currentId = post.domain_id;
            // STRATEGY: Take the LAST part of any split.
            // "Physics: Relativity" -> "Relativity"
            // "Science: Physics" -> "Physics"
            // "Space/Cosmology" -> "Cosmology"

            let parts = currentId.split(/[:/]/); // Split by colon or slash
            let leaf = parts[parts.length - 1].trim();

            // NORMALIZE: Title Case
            if (leaf.length > 0) {
                leaf = leaf.charAt(0).toUpperCase() + leaf.slice(1);
            }

            if (leaf !== currentId) {
                console.log(`   Flattening: "${currentId}" -> "${leaf}"`);
                await conn.execute('UPDATE posts SET domain_id = ? WHERE id = ?', [leaf, post.id]);
                updatedCount++;
            }
        }

        console.log(`✅ Absolute Flattening Complete. Updated ${updatedCount} posts.`);

    } catch (e: any) {
        console.error(e.message);
    }
}

main();
