import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { connect } from '@tidbcloud/serverless';
import { createHash } from 'crypto';

async function main() {
    console.log("🧹 Starting Duplicate Cleanup...");

    if (!process.env.DATABASE_URL) {
        console.error("❌ Fatal: DATABASE_URL is missing.");
        process.exit(1);
    }

    const conn = connect({ url: process.env.DATABASE_URL });

    try {
        console.log("   Fetching all posts...");
        const posts = (await conn.execute('SELECT id, domain_id, content, imageURL FROM posts')) as any[];
        console.log(`   Found ${posts.length} total posts. Analyzing for duplicates...`);

        const seenMap = new Map<string, string>(); // Key -> ID (First seen)
        const toDelete: string[] = [];

        for (const post of posts) {
            // Create a signature based on Content or Image
            // We include domain_id because it's okay to have the same post in different domains (maybe), 
            // but the user complained about "History" having duplicates, so we definitely dedupe within domain.
            // Actually, let's include domain_id in the signature.
            let signature = '';

            if (post.imageURL) {
                // If image exists, it's the strongest signal.
                // We use the raw URL.
                signature = `${post.domain_id}|IMG:${post.imageURL}`;
            } else {
                // Determine uniqueness by content (first 50 chars sufficient usually, or full)
                // Let's use a hash of the content to be safe and fast
                const contentHash = createHash('md5').update(post.content || '').digest('hex');
                signature = `${post.domain_id}|TXT:${contentHash}`;
            }

            if (seenMap.has(signature)) {
                // Duplicate!
                toDelete.push(post.id);
            } else {
                seenMap.set(signature, post.id);
            }
        }

        console.log(`   🚨 Found ${toDelete.length} duplicates.`);

        if (toDelete.length > 0) {
            // Delete in batches of 50
            const batchSize = 50;
            for (let i = 0; i < toDelete.length; i += batchSize) {
                const batch = toDelete.slice(i, i + batchSize);
                const placeholders = batch.map(() => '?').join(',');
                console.log(`      Deleting batch ${i + 1}-${i + batch.length}...`);
                await conn.execute(`DELETE FROM posts WHERE id IN (${placeholders})`, batch);

                // Also clean up likes/comments if cascade isn't set (safety)
                await conn.execute(`DELETE FROM likes WHERE post_id IN (${placeholders})`, batch);
                await conn.execute(`DELETE FROM comments WHERE post_id IN (${placeholders})`, batch);
            }
            console.log("   ✨ Cleanup complete.");
        } else {
            console.log("   ✨ Database is clean.");
        }

    } catch (e: any) {
        console.error("❌ Error during cleanup:", e);
    }
}

main().catch(console.error);
