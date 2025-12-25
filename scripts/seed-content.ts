
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { connect } from '@tidbcloud/serverless';
import { randomUUID } from 'crypto';

// -----------------------------------------------------------------------------
// CONFIGURATION
// -----------------------------------------------------------------------------

// Map Spark Domains to Subreddits
const DOMAIN_MAP: Record<string, string[]> = {
    'science': ['science', 'EverythingScience', 'biology'],
    'physics': ['Physics', 'astrophysics'],
    'chemistry': ['chemistry', 'ChemicalEngineering'],
    'business': ['business', 'startups', 'economics'],
    'technology': ['technology', 'gadgets', 'futurology'],
    'art': ['Art', 'DigitalArt', 'Museum'],
    'design': ['Design', 'web_design', 'graphic_design'],
    'music': ['Music', 'ListenToThis'],
    'history': ['history', 'AskHistorians'],
    'philosophy': ['philosophy', 'Stoicism'],
    'psychology': ['psychology', 'socialpsychology'],
    'coding': ['programming', 'coding', 'webdev'],
    'ai': ['artificial', 'MachineLearning', 'OpenAI'],
    'space': ['space', 'nasa', 'SpaceX'],
    'nature': ['nature', 'EarthPorn', 'wildlife'],
};

// Bot "Personas" to make it look organic
const BOT_USERS = [
    { id: 'bot_curator', name: 'Curator' },
    { id: 'bot_news', name: 'Daily Digest' },
    { id: 'bot_spark', name: 'Spark Bot' }
];

// -----------------------------------------------------------------------------
// MAIN LOGIC
// -----------------------------------------------------------------------------

async function main() {
    console.log("🌱 Starting Content Seeder...");

    if (!process.env.DATABASE_URL) {
        console.error("❌ Fatal: DATABASE_URL is missing. Make sure .env.local exists or vars are set.");
        process.exit(1);
    }

    const conn = connect({ url: process.env.DATABASE_URL });

    // BULK MODE: If running manually, we might want to fill the DB.
    // Standard run: 3 domains. Bulk run: All domains, 3 posts each (~45 posts).
    const isBulk = process.argv.includes('--bulk');
    const postsPerDomain = isBulk ? 3 : 1;

    // Pick domains
    const allDomains = Object.keys(DOMAIN_MAP);
    const selectedDomains = isBulk ? allDomains : allDomains.sort(() => 0.5 - Math.random()).slice(0, 3);

    console.log(`🎯 Targeted Domains: ${selectedDomains.length} domains (Bulk: ${isBulk})`);

    for (const domain of selectedDomains) {
        await processDomain(conn, domain, postsPerDomain);
    }

    console.log("✅ Seeding completed.");
}

async function processDomain(conn: any, domainId: string, limit: number) {
    const subreddits = DOMAIN_MAP[domainId];
    const subreddit = subreddits[Math.floor(Math.random() * subreddits.length)];

    console.log(`   Processing ${domainId} -> r/${subreddit}`);

    try {
        // Fetch top posts of the day
        // We fetch slightly more than 'limit' to account for filters (images/text ratio)
        const fetchLimit = limit + 5;
        const response = await fetch(`https://www.reddit.com/r/${subreddit}/top.json?t=day&limit=${fetchLimit}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Hyle/1.0' }
        });

        if (!response.ok) {
            console.warn(`   ⚠️ Status ${response.status} from Reddit.`);
            return;
        }

        const data = await response.json();
        const posts = data.data.children;

        if (!posts || posts.length === 0) {
            console.log("   ⚠️ No posts found.");
            return;
        }

        let postsAdded = 0;

        for (const item of posts) {
            if (postsAdded >= limit) break;

            const post = item.data;

            // -------------------------------------------------------------------------
            // 30% IMAGE / 70% TEXT RULE
            // -------------------------------------------------------------------------
            const hasImage = post.url && (post.url.endsWith('.jpg') || post.url.endsWith('.png') || post.url.endsWith('.gif'));
            const wantsImage = Math.random() < 0.30;

            if (wantsImage && !hasImage) continue; // Skip if we wanted image but got text

            // If we wanted text but got image, we allow it ONLY if we haven't filled quota, 
            // but loosely enforce preference. For bulk, we get what we can.

            // Prepare Data
            const postId = randomUUID();
            const botUser = BOT_USERS[Math.floor(Math.random() * BOT_USERS.length)];
            const content = `**${post.title}**\n\n${post.selftext || ''}\n\n[Source](https://reddit.com${post.permalink})`;
            const imageUrl = hasImage ? post.url : null;

            // Insert
            try {
                await conn.execute(`
                    INSERT INTO posts (id, user_id, domain_id, content, imageURL, created_at)
                    VALUES (?, ?, ?, ?, ?, NOW())
                `, [postId, botUser.id, domainId, content, imageUrl]);

                console.log(`      + Posted: "${post.title.substring(0, 30)}..."`);
                postsAdded++;
            } catch (err: any) {
                // Ignore errors (like dupes if we had better checks)
            }
        }

    } catch (e: any) {
        console.error(`   ❌ Error processing ${domainId}:`, e.message);
    }
}

main().catch(console.error);
