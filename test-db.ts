
import { execute } from './lib/tidbClient';

async function main() {
    try {
        console.log("Testing DB Connection...");
        // Use a simple query that shouldn't fail
        const rows = await execute('SELECT 1 as val');
        console.log("Connection Success:", rows);

        const count = await execute('SELECT COUNT(*) as c FROM communities');
        console.log("Community Count:", count);

    } catch (e) {
        console.error("DB Connection FAILED:", e);
        if (process.env.TiDB_USER) {
            console.log("User defined in env:", process.env.TiDB_USER);
        } else {
            console.log("Wait... TiDB_USER is missing from process.env!");
        }
    }
}

main();
