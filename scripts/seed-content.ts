
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
// NOTE: Keys MUST match the ID in TopicSelector.tsx (Singular mostly)
// Map Spark Domains to Subreddits (Wide Net Strategy)
const DOMAIN_MAP: Record<string, string[]> = {
    'science': ['science', 'EverythingScience', 'biology', 'space', 'Physics'],
    'physics': ['Physics', 'astrophysics', 'QuantumPhysics', 'Cosmology'],
    'chemistry': ['chemistry', 'ChemicalEngineering', 'chemhelp'],
    'business': ['business', 'startups', 'economics', 'finance', 'Entrepreneur'],
    'technology': ['technology', 'gadgets', 'futurology', 'hardware', 'tech'],
    'art': ['Art', 'DigitalArt', 'Museum', 'ConceptArt', 'Illustration', 'Oilpainting', 'StreetArt'],
    'design': ['Design', 'web_design', 'graphic_design', 'UI_Design', 'userexperience', 'architecture'],
    'music': ['Music', 'ListenToThis', 'WeAreTheMusicMakers', 'ElectronicMusic', 'Jazz'],
    'history': ['history', 'AskHistorians', '100yearsago', 'HistoryPorn', 'ArtefactPorn'],
    'philosophy': ['philosophy', 'Stoicism', 'Existentialism', 'PhilosophyofScience'],
    'psychology': ['psychology', 'socialpsychology', 'Neuropsychology', 'CognitiveScience'],
    'coding': ['programming', 'coding', 'webdev', 'javascript', 'Python', 'learnprogramming'],
    'ai': ['artificial', 'MachineLearning', 'OpenAI', 'Singularity', 'ArtificialInteligence'],
    'space': ['space', 'nasa', 'SpaceX', 'astronomy', 'Astrophotography'],
    'nature': ['nature', 'EarthPorn', 'wildlife', 'botany', 'NatureIsFuckingLit'],
    // New Expansion
    'gaming': ['gaming', 'Games', 'pcgaming', 'IndieGaming', 'RetroGaming'],
    'cinema': ['movies', 'cinema', 'Film', 'MovieDetails', 'TrueFilm'],
    'food': ['food', 'FoodPorn', 'Cooking', 'Baking', 'Eats'],
    'travel': ['travel', 'TravelNoPics', 'solotravel', 'backpacking', 'Shoestring'],
    'health': ['health', 'Fitness', 'nutrition', 'HealthyFood', 'running'],
};

// "Real Person" User Pool
const HUMAN_USERS = [
    { id: 'user_alex', name: 'Alex_Dev', desc: 'Software Engineer & Tech Enthusiast' },
    { id: 'user_sarah', name: 'SarahExplore', desc: 'Lover of nature and science.' },
    { id: 'user_mike', name: 'Mike_HistoryBuff', desc: 'Digging into the past.' },
    { id: 'user_emily', name: 'Emily_Art', desc: 'Digital artist and designer.' },
    { id: 'user_david', name: 'David_InSpace', desc: 'Amateur astronomer.' },
    { id: 'user_jess', name: 'Jess_Codes', desc: 'Full stack developer.' },
    { id: 'user_chris', name: 'Chris_Startup', desc: 'Building the next big thing.' },
    { id: 'user_anna', name: 'Anna_Psych', desc: 'Understanding the human mind.' },
    { id: 'user_ryan', name: 'Ryan_Beats', desc: 'Music producer.' },
    { id: 'user_lisa', name: 'Lisa_Green', desc: 'Sustainability advocate.' },
    { id: 'user_tom', name: 'Tom_Physics', desc: 'Quantum mechanics nerd.' },
    { id: 'user_katie', name: 'Katie_Design', desc: 'UX/UI Designer.' },
    { id: 'user_james', name: 'James_Biz', desc: 'Finance and Economics.' },
    { id: 'user_sophie', name: 'Sophie_Phil', desc: 'Deep thinker.' },
    { id: 'user_mark', name: 'Mark_AI', desc: 'Machine Learning Engineer.' },
    { id: 'user_kyle', name: 'Kyle_Gadgets', desc: 'Tech reviewer.' },
    { id: 'user_emma', name: 'Emma_Bio', desc: 'Biology researcher.' },
    { id: 'user_ben', name: 'Ben_Chem', desc: 'Chemistry student.' },
    { id: 'user_lucy', name: 'Lucy_Wild', desc: 'Wildlife photographer.' },
    { id: 'user_dan', name: 'Dan_Retro', desc: 'Retro computing fan.' },
    { id: 'user_olivia', name: 'Olivia_Sketch', desc: 'Illustrator.' },
    { id: 'user_sam', name: 'Sam_Sound', desc: 'Audiophile.' },
    { id: 'user_natalie', name: 'Natalie_Stars', desc: 'Space enthusiast.' },
    { id: 'user_eric', name: 'Eric_Code', desc: 'Python developer.' },
    { id: 'user_grace', name: 'Grace_Mind', desc: 'Psychology major.' },
    { id: 'user_robert', name: 'Robert_Past', desc: 'Historical fiction writer.' },
    { id: 'user_chloe', name: 'Chloe_Market', desc: 'Marketing guru.' },
    { id: 'user_justin', name: 'Justin_Cloud', desc: 'Cloud Architect.' },
    { id: 'user_megan', name: 'Megan_Life', desc: 'Life sciences.' },
    { id: 'user_adam', name: 'Adam_Rocket', desc: 'Aerospace engineer.' }
];

// Thematic Bot Personas
const PERSONAS = {
    'NOVA': { id: 'bot_nova', name: 'Nova', desc: 'The Explorer' },
    'PIXEL': { id: 'bot_pixel', name: 'Pixel', desc: 'The Technologist' },
    'ATLAS': { id: 'bot_atlas', name: 'Atlas', desc: 'The Historian' },
    'MUSE': { id: 'bot_muse', name: 'Muse', desc: 'The Artist' },
    'GAIA': { id: 'bot_gaia', name: 'Gaia', desc: 'The Naturalist' },
    'FLUX': { id: 'bot_flux', name: 'Flux', desc: 'The Curator' },
};

// -----------------------------------------------------------------------------
// MAIN LOGIC
// -----------------------------------------------------------------------------

async function main() {
    console.log("🌱 Starting Content Seeder (Refined - Normalized)...");

    if (!process.env.DATABASE_URL) {
        console.error("❌ Fatal: DATABASE_URL is missing. Make sure .env.local exists or vars are set.");
        process.exit(1);
    }

    const conn = connect({ url: process.env.DATABASE_URL });

    // Step 0: Normalize Domains (Fix "arts" -> "art")
    await normalizeDomains(conn);

    if (process.argv.includes('--purge-bots')) {
        await purgeBotPosts(conn);
        return;
    }

    const isBulk = process.argv.includes('--bulk');
    const postsPerDomain = isBulk ? 7 : 1;

    // Pick domains
    const allDomains = Object.keys(DOMAIN_MAP);
    const selectedDomains = isBulk ? allDomains : allDomains.sort(() => 0.5 - Math.random()).slice(0, 3);

    console.log(`🎯 Targeted Domains: ${selectedDomains.length} domains (Targeting ~${selectedDomains.length * postsPerDomain} new posts)`);

    // Ensure Human Profiles Exist
    await ensureHumanProfiles(conn);

    // PARALLEL BATCH PROCESSING (3 at a time to be safe)
    const BATCH_SIZE = 5;
    for (let i = 0; i < selectedDomains.length; i += BATCH_SIZE) {
        const batch = selectedDomains.slice(i, i + BATCH_SIZE);
        console.log(`\n📦 Processing Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(selectedDomains.length / BATCH_SIZE)}: [${batch.join(', ')}]`);

        await Promise.all(batch.map(domain => processDomain(conn, domain, postsPerDomain)));

        // Small breather between batches
        await new Promise(r => setTimeout(r, 2000));
    }

    console.log("✅ Seeding completed.");
}

async function normalizeDomains(conn: any) {
    console.log("🔄 Normalizing Domain IDs...");
    try {
        // Fix 'arts' -> 'art'
        await conn.execute(`UPDATE posts SET domain_id = 'art' WHERE domain_id = 'arts'`);
        await conn.execute(`UPDATE posts SET domain_id = 'art' WHERE domain_id = 'Art'`);
        await conn.execute(`UPDATE posts SET domain_id = 'art' WHERE domain_id = 'Arts'`);

        // Fix other common mis-matches if they exist
        await conn.execute(`UPDATE posts SET domain_id = 'science' WHERE domain_id = 'Science'`);
        await conn.execute(`UPDATE posts SET domain_id = 'technology' WHERE domain_id = 'tech'`);

        console.log("   ✅ Domains normalized to singular canonical IDs.");
    } catch (e: any) {
        console.error("   ⚠️ Normalization warning (non-fatal):", e.message);
    }
}

async function ensureHumanProfiles(conn: any) {
    console.log("   Checking Human Profiles...");

    for (const user of HUMAN_USERS) {
        try {
            await conn.execute(`
                INSERT INTO profiles (id, username, photoURL, bio)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE username = ?, bio = ?
            `, [
                user.id,
                user.name,
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}&backgroundColor=b6e3f4,c0aede,d1d4f9`,
                user.desc,
                user.name,
                user.desc
            ]);
        } catch (e) {
            // Likely already exists, ignore
        }
    }
}

async function purgeBotPosts(conn: any) {
    console.log("🔥 PURGING ALL BOT POSTS...");
    return;
}

async function processDomain(conn: any, domainId: string, limit: number) {
    const subreddits = DOMAIN_MAP[domainId];
    const subreddit = subreddits[Math.floor(Math.random() * subreddits.length)];

    // ROTATE SORT METHOD: Mix of 'hot', 'new', and 'top' for variety
    const modes = ['hot', 'hot', 'new', 'top']; // Bias towards hot
    const mode = modes[Math.floor(Math.random() * modes.length)];
    const timeRange = mode === 'top' ? (Math.random() > 0.5 ? 'week' : 'month') : 'day'; // If top, look further back

    console.log(`   Processing ${domainId} -> r/${subreddit} (${mode}/${timeRange})`);

    try {
        const fetchLimit = limit + 50; // Increased buffer
        const response = await fetch(`https://www.reddit.com/r/${subreddit}/${mode}.json?t=${timeRange}&limit=${fetchLimit}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Hyle/1.0' }
        });

        if (!response.ok) return;

        const data = await response.json();
        const posts = data.data.children;

        if (!posts || posts.length === 0) return;

        let postsAdded = 0;

        for (const item of posts) {
            if (postsAdded >= limit) break;
            const post = item.data;

            // -------------------------------------------------------------------------
            // QUALITY FILTER
            // -------------------------------------------------------------------------
            const hasImage = post.url && (post.url.endsWith('.jpg') || post.url.endsWith('.png') || post.url.endsWith('.gif'));
            let body = post.selftext || '';
            const isShortText = body.length < 250;
            const wantsImage = Math.random() < 0.70;

            if (wantsImage && !hasImage) {
                if (body.length < 500) continue;
            }

            if (!hasImage && isShortText) continue;

            // -------------------------------------------------------------------------
            // HUMAN ASSIGNMENT
            // -------------------------------------------------------------------------
            const randomHuman = HUMAN_USERS[Math.floor(Math.random() * HUMAN_USERS.length)];

            // FORMATTING
            let cleanTitle = post.title.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').trim();
            cleanTitle = cleanTitle.replace(/\*\*/g, '').replace(/\*/g, '').replace(/__/g, '');

            let finalContent = `${cleanTitle}`;
            if (body) finalContent += `\n\n${body}`;

            // IMAGE PROXY
            let imageUrl = null;
            if (hasImage) {
                const encodedUrl = encodeURIComponent(post.url);
                imageUrl = `https://wsrv.nl/?url=${encodedUrl}&w=600&q=60&output=webp`;
            }

            const postId = randomUUID();
            try {
                await conn.execute(`
                    INSERT INTO posts (id, user_id, domain_id, content, imageURL, created_at)
                    VALUES (?, ?, ?, ?, ?, NOW())
                `, [postId, randomHuman.id, domainId, finalContent, imageUrl]);

                console.log(`      + ${randomHuman.name} Posted: "${cleanTitle.substring(0, 30)}..."`);
                postsAdded++;
            } catch (err: any) { }
        }
    } catch (e: any) {
        console.error(`   ❌ Error processing ${domainId}:`, e.message);
    }
}

main().catch(console.error);
