
import { connect } from '@tidbcloud/serverless';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
    console.log("🚑 Starting Physics Remediation...");

    if (!process.env.DATABASE_URL) {
        process.exit(1);
    }

    const conn = connect({ url: process.env.DATABASE_URL });

    try {
        // 1. Fix Science: Physics -> Physics
        console.log("Checking Science: Physics...");
        const res1 = await conn.execute(`UPDATE posts SET domain_id = 'Physics' WHERE domain_id = 'Science: Physics'`);
        console.log(`Updated ${res1.affectedRows || (res1 as any).rowsAffected} posts from 'Science: Physics' to 'Physics'.`);

        // 2. Fix Science: biology -> Biology
        console.log("Checking Science: Biology...");
        const res2 = await conn.execute(`UPDATE posts SET domain_id = 'Biology' WHERE domain_id = 'Science: Biology'`);
        console.log(`Updated ${res2.affectedRows || (res2 as any).rowsAffected} posts from 'Science: Biology' to 'Biology'.`);

        // 3. Fix Science: chemistry -> Chemistry
        console.log("Checking Science: Chemistry...");
        const res3 = await conn.execute(`UPDATE posts SET domain_id = 'Chemistry' WHERE domain_id = 'Science: Chemistry'`);
        console.log(`Updated ${res3.affectedRows || (res3 as any).rowsAffected} posts from 'Science: Chemistry' to 'Chemistry'.`);

        // 4. Ensure Physics is Title Case (Bot uses lowercase 'physics' sometimes? Let's Standardize to Title Case for UI consistency if possible, or lowercase if Bot dominates)
        // Seeder DOMAIN_MAP uses lowercase 'physics' key.
        // But let's check what the Bot actually wrote recently.
        // Previous log: "ID: physics".
        // My migration wrote "Physics".
        // Let's normalize ALL 'physics' to 'Physics' (Title Case looks better).
        // OR normalize all to 'physics'.
        // The user screenshot showed "Physics" (Title Case) in the channel header.

        await conn.execute(`UPDATE posts SET domain_id = 'Physics' WHERE domain_id = 'physics'`);
        console.log("Normalized 'physics' -> 'Physics'");

    } catch (e: any) {
        console.error(e.message);
    }
}

main();
