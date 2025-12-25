
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
        console.error("❌ Fatal: DATABASE_URL is missing.");
        process.exit(1);
    }

    const conn = connect({ url: process.env.DATABASE_URL });

    // 1. Pick 3 random domains to update this run
    const allDomains = Object.keys(DOMAIN_MAP);
    const selectedDomains = allDomains.sort(() => 0.5 - Math.random()).slice(0, 3);

    console.log(`🎯 Targeted Domains: ${selectedDomains.join(', ')}`);

    for (const domain of selectedDomains) {
        await processDomain(conn, domain);
    }

    console.log("✅ Seeding completed.");
}

async function processDomain(conn: any, domainId: string) {
    const subreddits = DOMAIN_MAP[domainId];
    const subreddit = subreddits[Math.floor(Math.random() * subreddits.length)];

    console.log(`   Processing ${domainId} -> r/${subreddit}`);

    try {
        // Fetch top post of the day
        const response = await fetch(`https://www.reddit.com/r/${subreddit}/top.json?t=day&limit=1`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Hyle/1.0' }
        });

        if (!response.ok) {
            console.warn(`   ⚠️ Status ${response.status} from Reddit.`);
            return;
        }

        const data = await response.json();
        const post = data.data.children[0]?.data;

        if (!post) {
            console.log("   ⚠️ No posts found.");
            return;
        }

        // -------------------------------------------------------------------------
        // 30% IMAGE / 70% TEXT RULE
        // -------------------------------------------------------------------------
        const hasImage = post.url && (post.url.endsWith('.jpg') || post.url.endsWith('.png') || post.url.endsWith('.gif'));
        const wantsImage = Math.random() < 0.30; // 30% chance we WANT an image

        if (wantsImage && !hasImage) {
            console.log(`   ⏭️ Skipped: Wanted image, but post was text.`);
            return;
        }
        if (!wantsImage && hasImage) {
            // If we wanted text but got an image, we CAN still use it, 
            // but let's prefer text bodies if available. 
            // For now, straightforward logic: if we strictly want text-heavy, maybe skip simple image posts?
            // Actually, let's just allow it but strip the image if strictly text mode? 
            // No, better to just skip to maintain the ratio loosely.
            console.log(`   ⏭️ Skipped: Wanted text/discussion, but post was image.`);
            return;
        }

        // Prepare Data
        const postId = randomUUID();
        const botUser = BOT_USERS[Math.floor(Math.random() * BOT_USERS.length)];
        const content = `**${post.title}**\n\n${post.selftext || ''}\n\n[Source](https://reddit.com${post.permalink})`;
        const imageUrl = hasImage ? post.url : null;

        // Check for duplicates (Simple check by Title content rough match or just recent limits)
        // Ideally we check if we already posted this source link, but for now let's just insert.
        // We'll trust the "limit=1" and "t=day" rotation to keep it mostly fresh.

        // Insert
        await conn.execute(`
            INSERT INTO posts (id, user_id, domain_id, content, imageURL, created_at)
            VALUES (?, ?, ?, ?, ?, NOW())
        `, [postId, botUser.id, domainId, content, imageUrl]);

        console.log(`   ✅ Posted: "${post.title.substring(0, 30)}..."`);

    } catch (e: any) {
        console.error(`   ❌ Error processing ${domainId}:`, e.message);
    }
}

main().catch(console.error);
