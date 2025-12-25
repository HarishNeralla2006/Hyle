
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
    'physics': ['Physics', 'astrophysics', 'QuantumPhysics'],
    'chemistry': ['chemistry', 'ChemicalEngineering'],
    'business': ['business', 'startups', 'economics', 'finance'],
    'technology': ['technology', 'gadgets', 'futurology', 'hardware'],
    'art': ['Art', 'DigitalArt', 'Museum', 'ConceptArt'],
    'design': ['Design', 'web_design', 'graphic_design', 'UI_Design'],
    'music': ['Music', 'ListenToThis', 'WeAreTheMusicMakers'],
    'history': ['history', 'AskHistorians', '100yearsago'],
    'philosophy': ['philosophy', 'Stoicism', 'Existentialism'],
    'psychology': ['psychology', 'socialpsychology', 'Neuropsychology'],
    'coding': ['programming', 'coding', 'webdev', 'javascript'],
    'ai': ['artificial', 'MachineLearning', 'OpenAI', 'Singularity'],
    'space': ['space', 'nasa', 'SpaceX', 'astronomy'],
    'nature': ['nature', 'EarthPorn', 'wildlife', 'botany'],
};

// Thematic Bot Personas "The Sphere Keepers"
const PERSONAS = {
    'NOVA': { id: 'bot_nova', name: 'Nova', desc: 'The Explorer' },     // Space, Science, Physics
    'PIXEL': { id: 'bot_pixel', name: 'Pixel', desc: 'The Technologist' }, // Tech, Coding, AI, Design
    'ATLAS': { id: 'bot_atlas', name: 'Atlas', desc: 'The Historian' },   // History, Philosophy, Business
    'MUSE': { id: 'bot_muse', name: 'Muse', desc: 'The Artist' },       // Art, Music, Culture
    'GAIA': { id: 'bot_gaia', name: 'Gaia', desc: 'The Naturalist' },   // Nature, Biology, Psych
    'FLUX': { id: 'bot_flux', name: 'Flux', desc: 'The Curator' },      // General / Fallback
};

// Map Domains to Best Fit Bot
const DOMAIN_BOT_MAP: Record<string, any> = {
    'science': PERSONAS.NOVA,
    'physics': PERSONAS.NOVA,
    'space': PERSONAS.NOVA,
    'chemistry': PERSONAS.NOVA,

    'technology': PERSONAS.PIXEL,
    'coding': PERSONAS.PIXEL,
    'ai': PERSONAS.PIXEL,
    'design': PERSONAS.PIXEL,

    'history': PERSONAS.ATLAS,
    'philosophy': PERSONAS.ATLAS,
    'business': PERSONAS.ATLAS,

    'art': PERSONAS.MUSE,
    'music': PERSONAS.MUSE,

    'nature': PERSONAS.GAIA,
    'psychology': PERSONAS.GAIA,
};

// -----------------------------------------------------------------------------
// MAIN LOGIC
// -----------------------------------------------------------------------------

async function main() {
    console.log("🌱 Starting Content Seeder (Refined)...");

    if (!process.env.DATABASE_URL) {
        console.error("❌ Fatal: DATABASE_URL is missing. Make sure .env.local exists or vars are set.");
        process.exit(1);
    }

    const conn = connect({ url: process.env.DATABASE_URL });

    // FIX MODE 1: Update existing posts to use the new personas
    if (process.argv.includes('--fix-personas')) {
        await ensureBotProfiles(conn);
        await fixLegacyPosts(conn);
        return;
    }

    // FIX MODE 2: Retroactively compress images
    if (process.argv.includes('--fix-images')) {
        await fixLegacyImages(conn);
        return;
    }

    // BULK MODE: If running manually, we might want to fill the DB.
    // Standard run: 3 domains. Bulk run: All domains, 3 posts each (~45 posts).
    const isBulk = process.argv.includes('--bulk');
    const postsPerDomain = isBulk ? 3 : 1;

    // Pick domains
    const allDomains = Object.keys(DOMAIN_MAP);
    const selectedDomains = isBulk ? allDomains : allDomains.sort(() => 0.5 - Math.random()).slice(0, 3);

    console.log(`🎯 Targeted Domains: ${selectedDomains.length} domains (Bulk: ${isBulk})`);

    // Ensure Bot Profiles Exist
    await ensureBotProfiles(conn);

    for (const domain of selectedDomains) {
        await processDomain(conn, domain, postsPerDomain);
    }

    console.log("✅ Seeding completed.");
}

async function ensureBotProfiles(conn: any) {
    console.log("   Checking Bot Personas...");
    const bots = Object.values(PERSONAS);

    for (const bot of bots) {
        try {
            await conn.execute(`
                INSERT INTO profiles (id, username, photoURL, bio)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE username = ?, bio = ?
            `, [
                bot.id,
                bot.name,
                `https://api.dicebear.com/7.x/bottts/svg?seed=${bot.name}`,
                `I am ${bot.name}, ${bot.desc}. I curate content for Hyle.`,
                bot.name,
                `I am ${bot.name}, ${bot.desc}. I curate content for Hyle.`
            ]);
        } catch (e) {
            // Likely already exists, ignore
        }
    }
}

async function fixLegacyPosts(conn: any) {
    console.log("🛠️ Fixing Legacy Posts (Assigning new Personas)...");
    const OLD_BOT_IDS = ['bot_curator', 'bot_news', 'bot_spark', 'bot_flux'];

    for (const [domain, subreddits] of Object.entries(DOMAIN_MAP)) {
        const targetBot = DOMAIN_BOT_MAP[domain] || PERSONAS.FLUX;
        try {
            const query = `
                UPDATE posts 
                SET user_id = ? 
                WHERE domain_id = ? 
                AND user_id IN ('${OLD_BOT_IDS.join("','")}')
           `;
            await conn.execute(query, [targetBot.id, domain]);
            console.log(`   ✅ Updated ${domain} -> ${targetBot.name}`);
        } catch (e: any) {
            console.error(`   ❌ Failed to update ${domain}:`, e.message);
        }
    }
}

async function fixLegacyImages(conn: any) {
    console.log("🖼️  Retroactively Compressing Bot Images...");

    const BOT_IDS = Object.values(PERSONAS).map(p => p.id);
    const placeholders = BOT_IDS.map(() => '?').join(',');

    try {
        // 1. Get all bot posts with images that aren't already proxied
        const rows = await conn.execute(`
            SELECT id, imageURL FROM posts 
            WHERE imageURL IS NOT NULL 
            AND imageURL NOT LIKE 'https://wsrv.nl%' 
            AND user_id IN (${placeholders})
        `, BOT_IDS);

        console.log(`   🔍 Found ${rows.length} uncompressed images.`);

        for (const row of rows) {
            const originalUrl = row.imageURL;
            if (!originalUrl) continue;

            const encodedUrl = encodeURIComponent(originalUrl);
            // 50KB Target: Width 600, Quality 60, WebP
            const newUrl = `https://wsrv.nl/?url=${encodedUrl}&w=600&q=60&output=webp`;

            await conn.execute('UPDATE posts SET imageURL = ? WHERE id = ?', [newUrl, row.id]);
            console.log(`      ✨ Compressed: ${row.id}`);
        }
        console.log("✅ Image Compression Complete.");

    } catch (e: any) {
        console.error("❌ Failed to fix images:", e.message);
    }
}

async function processDomain(conn: any, domainId: string, limit: number) {
    const subreddits = DOMAIN_MAP[domainId];
    const subreddit = subreddits[Math.floor(Math.random() * subreddits.length)];
    const botUser = DOMAIN_BOT_MAP[domainId] || PERSONAS.FLUX;

    console.log(`   Processing ${domainId} -> r/${subreddit} [Bot: ${botUser.name}]`);

    try {
        const fetchLimit = limit + 5;
        const response = await fetch(`https://www.reddit.com/r/${subreddit}/top.json?t=day&limit=${fetchLimit}`, {
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

            // 30% IMAGE RULE
            const hasImage = post.url && (post.url.endsWith('.jpg') || post.url.endsWith('.png') || post.url.endsWith('.gif'));
            const wantsImage = Math.random() < 0.30;
            if (wantsImage && !hasImage) continue;

            // FORMATTING (Plain Text)
            let cleanTitle = post.title.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').trim();
            let finalContent = `${cleanTitle}`;
            if (post.selftext) finalContent += `\n\n${post.selftext}`;
            finalContent += `\n\nSource: https://reddit.com${post.permalink}`;

            // IMAGE PROXY (Compression)
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
                `, [postId, botUser.id, domainId, finalContent, imageUrl]);

                console.log(`      + ${botUser.name} Posted: "${cleanTitle.substring(0, 30)}..." (Img: ${!!imageUrl})`);
                postsAdded++;
            } catch (err: any) { }
        }
    } catch (e: any) {
        console.error(`   ❌ Error processing ${domainId}:`, e.message);
    }
}

main().catch(console.error);
