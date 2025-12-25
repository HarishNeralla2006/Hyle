
import { connect } from '@tidbcloud/serverless';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// EXACT COPY OF THE KEYS FROM SEED CONTENT
const TOP_LEVEL_KEYS = new Set([
    'Science', 'Physics', 'Chemistry', 'Business', 'Technology', 'Art', 'Design', 'Music', 'History', 'Philosophy', 'Psychology', 'Coding', 'Ai', 'Space', 'Nature', 'Mathematics', 'Law', 'Environment', 'Literature', 'Engineering', 'Education', 'Social Sciences',
    'Astronomy', 'Astrophysics', 'Biology', 'Neuroscience', 'Quantum Mechanics', 'Computer Science', 'Earth Science', 'Geophysics', 'Molecular Biology', 'Organic Chemistry', 'Environmental Science', 'Ecology',
    'Mechanical Engineering', 'Civil Engineering', 'Electrical Engineering', 'Software Engineering', 'Aerospace Engineering', 'Chemical Engineering', 'Biomedical Engineering', 'Environmental Engineering',
    'Marketing', 'Finance', 'International Business', 'Human Resources', 'Operations Management', 'Supply Chain Management', 'Entrepreneurship', 'Business Analytics',
    'Artificial Intelligence', 'Data Science', 'Cybersecurity', 'Cloud Computing', 'Blockchain', 'Internet of Things', 'Robotics', 'Augmented Reality', 'Quantum Computing',
    'Algebra', 'Calculus', 'Geometry', 'Statistics', 'Probability', 'Number Theory', 'Combinatorics', 'Topology', 'Analysis',
    'Digital Art', 'Photography', 'Web Development', 'Game Development', 'PC Gaming', 'Indie Games', 'Virtual Reality'
]);

async function main() {
    console.log("🔥 Starting FINAL Universal Structure Fix...");

    if (!process.env.DATABASE_URL) {
        process.exit(1);
    }
    const conn = connect({ url: process.env.DATABASE_URL });

    try {
        const rows = await conn.execute(`SELECT id, domain_id FROM posts`);
        const posts = (rows as any).rows || rows as any[];

        console.log(`Scanning ${posts.length} posts for structural errors...`);
        let updatedCount = 0;

        for (const post of posts) {
            let currentId = post.domain_id;
            let newId = currentId;

            // 1. Check if it has a Parent Prefix (e.g. "Science: Physics")
            if (currentId.includes(':')) {
                const parts = currentId.split(':');
                if (parts.length === 2) {
                    const leaf = parts[1].trim(); // "Physics"

                    // NORMALIZE LEAF for Check
                    // Does our TOP LEVEL SET contain "Physics"?
                    // Case-insensitive check
                    let matchKey: string | undefined;
                    for (const key of TOP_LEVEL_KEYS) {
                        if (key.toLowerCase() === leaf.toLowerCase()) {
                            matchKey = key;
                            break;
                        }
                    }

                    if (matchKey) {
                        // Found! This leaf IS a Top Level Key. Remove parent.
                        newId = matchKey;
                    }
                }
            } else {
                // No prefix. Just check casing?
                // e.g. "physics" -> "Physics"
                let matchKey: string | undefined;
                for (const key of TOP_LEVEL_KEYS) {
                    if (key.toLowerCase() === currentId.toLowerCase() && key !== currentId) {
                        matchKey = key;
                        break;
                    }
                }
                if (matchKey) newId = matchKey;
            }

            if (newId !== currentId) {
                console.log(`   Fixing: "${currentId}" -> "${newId}"`);
                await conn.execute('UPDATE posts SET domain_id = ? WHERE id = ?', [newId, post.id]);
                updatedCount++;
            }
        }

        console.log(`✅ Universal Fix Complete. Corrected ${updatedCount} posts.`);

    } catch (e: any) {
        console.error(e.message);
    }
}

main();
