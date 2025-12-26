import * as dotenv from 'dotenv';
import path from 'path';
import { connect } from '@tidbcloud/serverless';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
    console.log("🛠️  Updating Database Schema for Communities...");

    if (!process.env.DATABASE_URL) {
        console.error("❌ Fatal: DATABASE_URL is missing.");
        process.exit(1);
    }

    const conn = connect({ url: process.env.DATABASE_URL });

    try {
        // Create Communities Table
        // id, name, description, tags (JSON or comma-separated), creator_id, created_at
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS communities (
                id VARCHAR(255) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                tags TEXT NOT NULL, 
                theme_color VARCHAR(50) DEFAULT '#FFD820',
                creator_id VARCHAR(255),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("   ✅ Created 'communities' table (if not exists).");

    } catch (e: any) {
        console.error("❌ Error updating schema:", e);
    }
}

main().catch(console.error);
