import * as dotenv from 'dotenv';
import path from 'path';
import { connect } from '@tidbcloud/serverless';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
    console.log("🧹 Starting Link Sanitation (Removing preview.redd.it)...");

    if (!process.env.DATABASE_URL) {
        console.error("❌ Fatal: DATABASE_URL is missing.");
        process.exit(1);
    }

    const conn = connect({ url: process.env.DATABASE_URL });

    try {
        console.log("   Searching for posts with 'preview.redd.it' links...");

        // Fetch posts that MIGHT have the bad link
        const posts = (await conn.execute("SELECT id, content FROM posts WHERE content LIKE '%preview.redd.it%'")) as any[];
        console.log(`   Found ${posts.length} posts to sanitize.`);

        let updatedCount = 0;

        for (const post of posts) {
            // "Intelligently" remove the link using Regex
            const cleanContent = post.content.replace(/https:\/\/preview\.redd\.it\/[^\s\)]+/g, '').trim();

            if (cleanContent !== post.content) {
                await conn.execute('UPDATE posts SET content = ? WHERE id = ?', [cleanContent, post.id]);
                updatedCount++;
                if (updatedCount % 10 === 0) process.stdout.write('.');
            }
        }

        console.log(`\n   ✅ Successfully sanitized ${updatedCount} posts.`);

    } catch (e: any) {
        console.error("❌ Error during sanitation:", e);
    }
}

main().catch(console.error);
