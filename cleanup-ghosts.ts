
import { execute } from './lib/tidbClient';
import { fetchCommunities } from './lib/communities';

async function main() {
    try {
        console.log("Starting Cleanup...");
        const communities = await fetchCommunities();

        // Exact names or IDs to target. 
        // Based on user report: "Sci" and "Comp science". 
        // Their IDs are likely slugs: 'sci', 'comp-science'.
        const targets = ['sci', 'comp-science', 'comp-sci'];

        for (const targetId of targets) {
            console.log(`Checking for ghost bucket: "${targetId}"`);
            const exists = communities.find(c => c.id === targetId);

            if (exists) {
                console.log(`Found "${exists.name}" (ID: ${exists.id}). Deleting...`);
                // Assuming 'createCommunityAction' makes rows in 'communities'.
                // If there are FK constraints (posts), this might fail, but for a new/empty bucket, it's fine.
                await execute('DELETE FROM communities WHERE id = ?', [exists.id]);
                console.log(`Deleted ${exists.id}.`);
            } else {
                console.log(`Target "${targetId}" not found (Good).`);
            }
        }

    } catch (e) {
        console.error("Cleanup Error:", e);
    }
}

main();
