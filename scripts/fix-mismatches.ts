
import { connect } from '@tidbcloud/serverless';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
    console.log("🚑 Starting Mismatch Remediation...");

    if (!process.env.DATABASE_URL) {
        process.exit(1);
    }
    const conn = connect({ url: process.env.DATABASE_URL });

    try {
        // Fix Topology
        const res1 = await conn.execute(`UPDATE posts SET domain_id = 'Topology' WHERE domain_id = 'Mathematics: Topology'`);
        console.log(`Updated Topology`);

        // Fix Neuroscience
        const res2 = await conn.execute(`UPDATE posts SET domain_id = 'Neuroscience' WHERE domain_id = 'Biology: Neuroscience'`);
        console.log(`Updated Neuroscience`);

        // Fix Astronomy
        const res3 = await conn.execute(`UPDATE posts SET domain_id = 'Astronomy' WHERE domain_id = 'Space: Astronomy'`);
        console.log(`Updated Astronomy`);

        // Ensure Physics is good
        await conn.execute(`UPDATE posts SET domain_id = 'Physics' WHERE domain_id = 'Science: Physics'`);

    } catch (e: any) {
        console.error(e.message);
    }
}
main();
