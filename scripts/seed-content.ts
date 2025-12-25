
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

    // MASTER FIX: Run all fixes
    if (process.argv.includes('--fix-all')) {
        await ensureBotProfiles(conn);
        await fixLegacyPosts(conn);
        await fixLegacyImages(conn);
        await fixLegacyContent(conn);
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
            //    console.log(`   ✅ Updated ${domain} -> ${targetBot.name}`);
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

async function fixLegacyContent(conn: any) {
    console.log("📝 Refining Content Style (Removing Sources, Refreshing Text)...");

    // We want to force-refresh ALL bot posts content to match the new "No Source / Concise" rule,
    // not just the broken markdown ones. However, we need the original data to do that perfectly.
    // Since we don't have the original Reddit JSON for old posts anymore, we have to do best-effort cleanup
    // on the string we have stored.

    const BOT_IDS = Object.values(PERSONAS).map(p => p.id);
    const placeholders = BOT_IDS.map(() => '?').join(',');

    try {
        const rows = await conn.execute(`
            SELECT id, content FROM posts 
            WHERE user_id IN (${placeholders})
        `, BOT_IDS);

        console.log(`   🔍 Optimizing content for ${rows.length} posts...`);
        let fixedCount = 0;

        for (const row of rows) {
            let content = row.content || "";
            let originalContent = content;

            // 1. Remove "Source: ..." or "[Source](...)"
            content = content.replace(/\n\nSource: https?:\/\/.*/i, '');
            content = content.replace(/\n\n\[Source\]\(.*?\)/gi, '');

            // 2. Remove any remaining raw markdown artifacts
            content = content.replace(/\*\*/g, '').replace(/__/g, '');

            // 3. Truncate long bodies (Simulating "rewrite to small")
            // We split by double newline to separate Title from Body
            const parts = content.split('\n\n');
            if (parts.length > 2) {
                // Determine max length for body
                const title = parts[0];
                let body = parts.slice(1).join('\n\n');

                if (body.length > 300) {
                    body = body.substring(0, 297) + '...';
                }
                content = `${title}\n\n${body}`;
            }

            if (content !== originalContent) {
                await conn.execute('UPDATE posts SET content = ? WHERE id = ?', [content, row.id]);
                fixedCount++;
            }
        }
        console.log(`✅ Content Refinement Complete. Updated ${fixedCount} posts.`);

    } catch (e: any) {
        console.error("❌ Failed to fix content:", e.message);
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

            // FORMATTING (Plain Text, No Source, Concise)
            let cleanTitle = post.title.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').trim();
            // Clean markdown chars
            cleanTitle = cleanTitle.replace(/\*\*/g, '').replace(/\*/g, '').replace(/__/g, '');

            let finalContent = `${cleanTitle}`;
            if (post.selftext) {
                let body = post.selftext;
                // Truncate logic for new posts too
                if (body.length > 300) {
                    body = body.substring(0, 297) + '...';
                }
                finalContent += `\n\n${body}`;
            }
            // NO SOURCE LINK ADDED

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
