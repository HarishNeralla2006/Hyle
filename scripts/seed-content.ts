import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { connect } from '@tidbcloud/serverless';
import { createHash } from 'crypto';

// -----------------------------------------------------------------------------
// CONFIGURATION
// -----------------------------------------------------------------------------

// STRICT DOMAIN REGISTRY (Mirrors TopicSelector.tsx)
// This ensures that every bot post lands in a valid, clickable sphere in the UI.
const TOPIC_REGISTRY = [
    { id: 'science', subreddits: ['science', 'EverythingScience', 'biology', 'Physics', 'space', 'QuantumPhysics', 'microbiology'] },
    { id: 'physics', subreddits: ['Physics', 'astrophysics', 'QuantumPhysics', 'fluidmechanics', 'Mechanics'] },
    { id: 'chemistry', subreddits: ['chemistry', 'ChemicalEngineering', 'organicchemistry', 'reactiongifs'] },
    { id: 'mathematics', subreddits: ['math', 'mathematics', 'statistics', 'algebra', 'OrderOfTheStick', 'Chaos'] },
    { id: 'biology', subreddits: ['biology', 'microbiology', 'genetics', 'neuroscience', 'marinebiology'] },
    { id: 'technology', subreddits: ['technology', 'gadgets', 'futurology', 'hardware', 'artificial', 'cybersecurity', 'internetofthings'] },
    { id: 'engineering', subreddits: ['engineering', 'CivilEngineering', 'mechanicalengineering', 'aerospace'] },
    { id: 'business', subreddits: ['business', 'startups', 'economics', 'finance', 'investing'] },
    { id: 'law', subreddits: ['law', 'legaladvice', 'intellectualproperty'] },
    { id: 'art', subreddits: ['Art', 'DigitalArt', 'Museum', 'ArtHistory', 'ModernArt'] },
    { id: 'design', subreddits: ['Design', 'web_design', 'graphic_design', 'userexperience', 'ProductGrants'] },
    { id: 'music', subreddits: ['Music', 'ListenToThis', 'WeAreTheMusicMakers', 'ElectronicMusic', 'Jazz', 'musicproduction'] },
    { id: 'literature', subreddits: ['books', 'literature', 'Poetry', 'scifi', 'ClassicBookClub'] },
    { id: 'history', subreddits: ['history', 'AskHistorians', 'AncientCivilizations', 'MilitaryHistory', 'CultureImpact'] },
    { id: 'philosophy', subreddits: ['philosophy', 'Stoicism', 'logic', 'ethics'] },
    { id: 'psychology', subreddits: ['psychology', 'socialpsychology', 'CognitiveScience', 'neuropsychology'] },
    { id: 'social sciences', subreddits: ['sociology', 'anthropology', 'PublicPolicy'] },
    { id: 'education', subreddits: ['education', 'Teachers', 'EdTech', 'stem'] },
    { id: 'coding', subreddits: ['programming', 'coding', 'webdev', 'javascript', 'Python', 'algorithms'] },
    { id: 'ai', subreddits: ['artificial', 'MachineLearning', 'OpenAI', 'ComputerVision'] },
    { id: 'space', subreddits: ['space', 'nasa', 'SpaceX', 'astronomy', 'Cosmology'] },
    { id: 'nature', subreddits: ['nature', 'EarthPorn', 'wildlife', 'botany', 'geology'] },
    { id: 'environment', subreddits: ['environment', 'climatechange', 'ecology', 'energy'] },
    { id: 'gaming', subreddits: ['gaming', 'pcgaming', 'IndieGaming', 'rpg_gamers'] },
    { id: 'cinema', subreddits: ['movies', 'cinema', 'Cinematography'] },
    { id: 'food', subreddits: ['food', 'Cooking', 'Baking', 'Chefit'] },
    { id: 'travel', subreddits: ['travel', 'solotravel', 'digitalnomad', 'backpacking'] },
    { id: 'health', subreddits: ['health', 'Fitness', 'medicine', 'wellness'] },
];

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

// -----------------------------------------------------------------------------
// SMART NORMALIZATION UTILS (The "Brilliant" Solution)
// -----------------------------------------------------------------------------

// 1. Synonym Map: Hardcoded knowledge of identical concepts
const SYNONYM_MAP: Record<string, string> = {
    'independent games': 'Indie Games',
    'indie gaming': 'Indie Games',
    'indiegaming': 'Indie Games',
    'pcgaming': 'PC Gaming',
    'computer games': 'PC Gaming',
    'machine learning': 'AI',
    'artificial intelligence': 'AI',
    'deep learning': 'AI',
    'web development': 'Web Dev',
    'webdev': 'Web Dev',
    'cinema': 'Movies',
    'cinematography': 'Movies',
    'film': 'Movies',
    'biology': 'Biology',
    'microbiology': 'Biology',
    'quantum physics': 'Quantum Physics',
    'quantummechanics': 'Quantum Physics'
};

// 2. Levenshtein Distance (Fuzzy Matcher) - No external dependencies
function levenshteinDistance(a: string, b: string): number {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    Math.min(
                        matrix[i][j - 1] + 1, // insertion
                        matrix[i - 1][j] + 1  // deletion
                    )
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

// 3. The Logic: Normalize Input -> Canonical Sub-Sphere
function normalizeSubTopic(input: string): string {
    const weirdInput = input.toLowerCase().replace(/r\//, '').replace(/_/g, ' ').trim();

    // Direct Synonym Check
    if (SYNONYM_MAP[weirdInput]) {
        return SYNONYM_MAP[weirdInput];
    }

    // Fuzzy Check against known keys
    // If "Indie-Gamez" comes in, and we have "Indie Games", match it!
    const knownKeys = Object.keys(SYNONYM_MAP);
    for (const key of knownKeys) {
        // If similarity is > 80% (distance is small)
        const dist = levenshteinDistance(weirdInput, key);
        const maxLen = Math.max(weirdInput.length, key.length);
        if (1 - (dist / maxLen) > 0.8) {
            return SYNONYM_MAP[key];
        }
    }

    // Fallback: Capitalize Words
    return weirdInput.replace(/\b\w/g, l => l.toUpperCase());
}


// -----------------------------------------------------------------------------
// MAIN LOGIC
// -----------------------------------------------------------------------------

async function main() {
    console.log("🌱 Starting Content Seeder (Strict Domain Alignment)...");

    if (!process.env.DATABASE_URL) {
        console.error("❌ Fatal: DATABASE_URL is missing. Make sure .env.local exists or vars are set.");
        process.exit(1);
    }

    const conn = connect({ url: process.env.DATABASE_URL });

    // Step 0: Ensure profiles exist
    await ensureHumanProfiles(conn);

    const isBulk = process.argv.includes('--bulk');
    // For bulk: 28 domains * 11 posts ~= 308 posts total. Perfect for "Bulk 300".
    const postsPerDomain = isBulk ? 11 : 2;

    console.log(`🎯 Targeting ${TOPIC_REGISTRY.length} Valid Domains from TopicSelector...`);

    // Process domains in batches
    const BATCH_SIZE = 5;
    for (let i = 0; i < TOPIC_REGISTRY.length; i += BATCH_SIZE) {
        const batch = TOPIC_REGISTRY.slice(i, i + BATCH_SIZE);
        console.log(`\n📦 Processing Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(TOPIC_REGISTRY.length / BATCH_SIZE)}: [${batch.map(t => t.id).join(', ')}]`);

        await Promise.all(batch.map(topic => processTopic(conn, topic, postsPerDomain)));

        // Small breather
        await new Promise(r => setTimeout(r, 1500));
    }

    console.log("✅ Seeding completed.");
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
            // Ignore duplicates
        }
    }
}

async function processTopic(conn: any, topic: { id: string, subreddits: string[] }, limit: number) {
    const { id: domainId, subreddits } = topic;
    let successCount = 0;

    // Pick a random subreddit from the allowed list
    const subreddit = subreddits[Math.floor(Math.random() * subreddits.length)];
    const modes = ['hot', 'top', 'new'];
    const mode = modes[Math.floor(Math.random() * modes.length)];
    const timeRange = mode === 'top' ? 'month' : 'day';

    console.log(`   Processing ${domainId} -> r/${subreddit} (${mode})`);

    try {
        const fetchLimit = limit + 15;
        const response = await fetch(`https://www.reddit.com/r/${subreddit}/${mode}.json?t=${timeRange}&limit=${fetchLimit}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Hyle/1.0' }
        });

        if (!response.ok) {
            console.log(`   ⚠️ Failed to fetch from r/${subreddit}`);
            return;
        }

        const data = await response.json();
        const posts = data.data.children;

        if (!posts || posts.length === 0) return;

        for (const item of posts) {
            if (successCount >= limit) break;
            const post = item.data;

            // Filter for high quality
            const hasImage = post.url && (post.url.endsWith('.jpg') || post.url.endsWith('.png') || post.url.endsWith('.gif'));
            const isLongRef = post.selftext && post.selftext.length > 300;

            // We want either an image OR a decent text post
            if (!hasImage && !isLongRef) continue;

            const randomHuman = HUMAN_USERS[Math.floor(Math.random() * HUMAN_USERS.length)];

            // Clean title
            let cleanTitle = post.title.replace(/\[.*?\]/g, '').trim();

            // SMART NORMALIZATION: Identify the canonical sub-topic
            const subTopicName = normalizeSubTopic(subreddit);

            let finalContent = cleanTitle;
            if (post.selftext) {
                // Remove preview.redd.it links (often artifacts of image posts)
                const cleanText = post.selftext.replace(/https:\/\/preview\.redd\.it\/[^\s\)]+/g, '').trim();
                finalContent += `\n\n${cleanText.substring(0, 1000)}`;
            }

            // Append the Intelligent Tag so it's searchable
            finalContent += `\n\n#${subTopicName.replace(/\s/g, '')} #${domainId}`;

            // Image Proxy
            let imageUrl = null;
            if (hasImage) {
                const encodedUrl = encodeURIComponent(post.url);
                imageUrl = `https://wsrv.nl/?url=${encodedUrl}&w=800&q=80&output=webp`;
            }

            // ID Generation (Deterministic based on CONTENT + DOMAIN)
            // Previously we used permalink, but that allows cross-posts to duplicate.
            // valid unique string: domain + (imageURL OR contentHash)
            const contentSig = imageUrl
                ? `img-${imageUrl}`
                : `txt-${createHash('md5').update(finalContent).digest('hex')}`;

            const uniqueString = `${domainId}-${contentSig}`;
            const hash = createHash('sha1').update(uniqueString).digest('hex');
            const postId = `${hash.substring(0, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}-${hash.substring(16, 20)}-${hash.substring(20, 32)}`;

            try {
                await conn.execute(`
                    INSERT INTO posts (id, user_id, domain_id, content, imageURL, created_at)
                    VALUES (?, ?, ?, ?, ?, NOW())
                `, [postId, randomHuman.id, domainId, finalContent, imageUrl]);

                // console.log(`   -> Inserted: ${postId}`);
                successCount++;
            } catch (err: any) {
                // Ignore duplicates
            }
        }
        if (successCount > 0) {
            // console.log(`   ✅ Seeded ${successCount} posts for ${domainId}`);
        }
    } catch (e: any) {
        console.error(`   ❌ Error processing ${domainId}:`, e.message);
    }
}

main().catch(console.error);
