import { connect } from '@tidbcloud/serverless';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
    console.log("🔍 Checking recent posts...");

    if (!process.env.DATABASE_URL) {
        console.error("Missing DATABASE_URL");
        process.exit(1);
    }

    try {
        const conn = connect({
            url: process.env.DATABASE_URL
        });

        const rows = await conn.execute(`
            SELECT id, user_id, domain_id, imageURL, created_at, left(content, 30) as snippet 
            FROM posts 
            WHERE LENGTH(user_id) > 20
            ORDER BY created_at DESC 
            LIMIT 20
        `);

        // @tidbcloud/serverless return type handling
        // Based on seed-content.ts usage, it likely returns just the result, or we cast it.
        const result = rows as any;
        const posts = Array.isArray(result) ? result : (result.rows || []);

        console.log("\n--- RECENT POSTS ---");
        posts.forEach((p: any) => {
            const type = p.user_id && p.user_id.length > 20 ? 'MANUAL' : 'BOT   ';
            const hasImage = p.imageURL && p.imageURL.length > 5 ? 'YES' : 'NO ';
            console.log(`${type} | ID: "${p.domain_id}" | IMG: ${hasImage} | Time: ${p.created_at}`);
        });
        console.log("--------------------\n");

    } catch (e: any) {
        console.error(e.message);
    }
}

main();
