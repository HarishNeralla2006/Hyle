// -----------------------------------------------------------------------------
// HYBRID DATABASE CLIENT
// -----------------------------------------------------------------------------
// Strategy:
// 1. Try to connect to the Secure Next.js API Route (/api/query).
// 2. If that fails (Network Error / 404), fall back to LocalStorage Mock.
//
// This allows the app to work in both:
// - Production (Real TiDB via Next.js)
// - Preview/Demo (Client-side Mock)
// -----------------------------------------------------------------------------

export type ConnectionMode = 'cloud' | 'local';
type ModeListener = (mode: ConnectionMode) => void;

let currentMode: ConnectionMode = 'cloud'; // Optimistically assume cloud first
const listeners: Set<ModeListener> = new Set();

export const subscribeToConnectionMode = (listener: ModeListener) => {
    listeners.add(listener);
    listener(currentMode); // Immediate callback with current state
    return () => listeners.delete(listener);
};

const setMode = (mode: ConnectionMode) => {
    if (currentMode !== mode) {
        currentMode = mode;
        listeners.forEach(l => l(mode));
    }
};

// --- Mock Database Engine (LocalStorage) ---

const getTable = (table: string): any[] => {
    try {
        const data = localStorage.getItem(`spark_db_${table}`);
        return data ? JSON.parse(data) : [];
    } catch { return []; }
};

const setTable = (table: string, data: any[]) => {
    try {
        localStorage.setItem(`spark_db_${table}`, JSON.stringify(data));
    } catch (e) { console.error("Local storage quota exceeded", e); }
};

// This mocks a robust SQL engine for the demo features
const mockExecute = async (sql: string, args: any[] = []): Promise<any[]> => {
    const s = sql.replace(/\s+/g, ' ').trim();
    const lowerSql = s.toLowerCase();

    // console.log(`[LocalDB] ${s.substring(0, 40)}...`, args);

    try {
        // 1. SELECT POSTS
        if (lowerSql.includes('from posts p') && lowerSql.includes('left join profiles')) {
            const posts = getTable('posts');
            const profiles = getTable('profiles');
            const likes = getTable('likes');
            const comments = getTable('comments');
            const userId = args[0];
            const domainId = args[1];

            let results = posts.filter(p => p.domain_id === domainId);

            return results.map(p => {
                const author = profiles.find(u => u.id === p.user_id) || { username: 'Unknown', photoURL: null };
                const postLikes = likes.filter(l => l.post_id === p.id);
                const postComments = comments.filter(c => c.post_id === p.id);
                const isLiked = userId !== 'NO_USER' && likes.some(l => l.post_id === p.id && l.user_id === userId);

                return {
                    ...p,
                    username: author.username,
                    photoURL: author.photoURL,
                    like_count: postLikes.length,
                    comment_count: postComments.length,
                    is_liked_by_user: isLiked ? 1 : 0
                };
            }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }

        // 2. SELECT COMMENTS
        if (lowerSql.includes('from comments c')) {
            const comments = getTable('comments');
            const profiles = getTable('profiles');
            const postId = args[0];

            return comments
                .filter(c => c.post_id === postId)
                .map(c => {
                    const author = profiles.find(u => u.id === c.user_id) || { username: 'Unknown', photoURL: null };
                    return { ...c, username: author.username, photoURL: author.photoURL };
                })
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        }

        // 3. SELECT SAVED
        if (lowerSql.includes('select * from saved_domains')) {
            const saved = getTable('saved_domains');
            return saved.filter(i => i.user_id === args[0]).sort((a, b) => new Date(b.saved_at).getTime() - new Date(a.saved_at).getTime());
        }

        // 4. CHECK SAVED
        if (lowerSql.includes('select id from saved_domains where user_id')) {
            const saved = getTable('saved_domains');
            return saved.filter(i => i.user_id === args[0] && i.domain_id === args[1]);
        }

        // 5. SELECT PROFILE
        if (lowerSql.includes('select * from profiles')) {
            const profiles = getTable('profiles');
            return profiles.filter(p => p.id === args[0]);
        }

        // 6. MESSAGES
        if (lowerSql.includes('select * from messages')) {
            const msgs = getTable('messages');
            return msgs.filter(m => m.chat_id === args[0]).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        }

        // 7. INSERTS
        if (lowerSql.startsWith('insert into') || lowerSql.startsWith('insert ignore into')) {
            const parts = s.split(' ');
            let tableName = parts[2] === 'ignore' ? parts[4] : parts[2];
            if (tableName.includes('(')) tableName = tableName.split('(')[0];

            const rows = getTable(tableName);
            const colsMatch = s.match(/\((.*?)\)/);

            if (colsMatch) {
                const keys = colsMatch[1].split(',').map(k => k.trim());
                const newItem: any = {};
                keys.forEach((k, i) => newItem[k] = args[i]);

                // Simple duplication check for profiles
                if (tableName === 'profiles' && rows.find(r => r.id === newItem.id)) {
                    return []; // Skip if exists (INSERT IGNORE behavior)
                }

                rows.push(newItem);
                setTable(tableName, rows);
            }
            return [];
        }

        // 8. UPDATES
        if (lowerSql.startsWith('update')) {
            const parts = s.split(' ');
            const tableName = parts[1];
            const rows = getTable(tableName);

            // Very specific mock for 'profiles' update
            if (tableName === 'profiles') {
                const id = args[args.length - 1];
                const row = rows.find(r => r.id === id);
                if (row) {
                    if (lowerSql.includes('username =')) row.username = args[0];
                    if (lowerSql.includes('photourl =')) row.photoURL = args[0];
                    setTable(tableName, rows);
                }
            }
            // Mock for 'chats' update
            if (tableName === 'chats') {
                // args: [lastMessage, updatedAt, id]
                const id = args[2];
                const row = rows.find(r => r.id === id);
                if (row) {
                    row.lastMessage = args[0];
                    row.updatedAt = args[1];
                    setTable(tableName, rows);
                }
            }
            return [];
        }

        // 9. DELETES
        if (lowerSql.startsWith('delete from')) {
            const tableName = s.split(' ')[2];
            let rows = getTable(tableName);
            // Rough delete logic based on args convention in app
            if (args.length === 1) { // Delete by ID
                rows = rows.filter(r => r.id !== args[0] && r.post_id !== args[0]);
            } else if (args.length === 2) {
                if (tableName === 'likes') {
                    rows = rows.filter(r => !(r.post_id === args[0] && r.user_id === args[1]));
                }
                if (tableName === 'follows') {
                    // DELETE FROM follows WHERE follower_id = ? AND following_id = ?
                    // args: [followerId, followingId]
                    rows = rows.filter(r => !(r.follower_id === args[0] && r.following_id === args[1]));
                }
            }
            setTable(tableName, rows);
            return [];
        }

        // 10. Profile Counts
        if (lowerSql.includes('select p.*') && lowerSql.includes('from posts p where user_id')) {
            const posts = getTable('posts');
            return posts.filter(p => p.user_id === args[0]).map(p => ({
                ...p,
                like_count: 0,
                comment_count: 0
            }));
        }

        // 11. Content Search (Signals)
        if (lowerSql.includes('from posts p') && lowerSql.includes('like')) {
            const posts = getTable('posts');
            const profiles = getTable('profiles');
            const searchTerm = args[0].replace(/%/g, '').toLowerCase(); // Remove % wildcards

            return posts
                .filter(p => p.content.toLowerCase().includes(searchTerm))
                .map(p => {
                    const author = profiles.find(u => u.id === p.user_id) || { username: 'Unknown', photoURL: null };
                    return {
                        ...p,
                        username: author.username,
                        photoURL: author.photoURL
                    };
                })
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }



        // 12. GET FOLLOWERS / FOLLOWING LISTS
        if (lowerSql.includes('from profiles p') && lowerSql.includes('join follows f')) {
            const profiles = getTable('profiles');
            const follows = getTable('follows');

            // Case A: Followers (People following the user)
            // Query: SELECT p.* FROM profiles p JOIN follows f ON f.follower_id = p.id WHERE f.following_id = ?
            if (lowerSql.includes('f.follower_id = p.id') && lowerSql.includes('f.following_id = ?')) {
                const targetUserId = args[0];
                const followerIds = follows
                    .filter(f => f.following_id === targetUserId)
                    .map(f => f.follower_id);
                return profiles.filter(p => followerIds.includes(p.id));
            }

            // Case B: Following (People the user follows)
            // Query: SELECT p.* FROM profiles p JOIN follows f ON f.following_id = p.id WHERE f.follower_id = ?
            if (lowerSql.includes('f.following_id = p.id') && lowerSql.includes('f.follower_id = ?')) {
                const currentUserId = args[0];
                const followingIds = follows
                    .filter(f => f.follower_id === currentUserId)
                    .map(f => f.following_id);
                return profiles.filter(p => followingIds.includes(p.id));
            }

            return [];
        }

        return [];
    } catch (e) {
        console.error("LocalDB Error", e);
        return [];
    }
};

// --- Main Execute Function ---

export async function execute(sql: string, args: any[] = []) {
    // 1. Try Secure Server-Side Execution (Next.js)
    try {
        // Attempt to hit the Next.js API route
        const response = await fetch('/api/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: sql, params: args })
        });

        if (response.ok) {
            const json = await response.json();

            // Success! We are connected to the cloud.
            setMode('cloud');

            // Assuming the API returns { data: { rows: [] } }
            if (json.data && Array.isArray(json.data.rows)) {
                return json.data.rows;
            }
            return json.data || [];
        } else {
            // Recieved an error from the server (e.g. 500 or 404)
            throw new Error(`API Error: ${response.status}`);
        }
    } catch (err) {
        // 2. Fallback to Local Mock (for Preview/Offline/Error)
        // console.warn("Remote DB Connection Failed. Switching to Local Storage Mock.", err);
        setMode('local');
        return mockExecute(sql, args);
    }
}

export async function initDB() {
    // Define schema
    const queries = [
        `CREATE TABLE IF NOT EXISTS profiles (id VARCHAR(255) PRIMARY KEY, username VARCHAR(255), email VARCHAR(255), photoURL LONGTEXT)`,
        `CREATE TABLE IF NOT EXISTS posts (id VARCHAR(36) PRIMARY KEY, user_id VARCHAR(255), domain_id VARCHAR(255), content TEXT, imageURL LONGTEXT, created_at DATETIME)`,
        `CREATE TABLE IF NOT EXISTS comments (id VARCHAR(36) PRIMARY KEY, post_id VARCHAR(36), user_id VARCHAR(255), content TEXT, created_at DATETIME)`,
        `CREATE TABLE IF NOT EXISTS likes (id VARCHAR(36) PRIMARY KEY, post_id VARCHAR(36), user_id VARCHAR(255), created_at DATETIME)`,
        `CREATE TABLE IF NOT EXISTS saved_domains (id VARCHAR(36) PRIMARY KEY, user_id VARCHAR(255), domain_id VARCHAR(255), domain_name VARCHAR(255), saved_at DATETIME)`,
        `CREATE TABLE IF NOT EXISTS chats (id VARCHAR(255) PRIMARY KEY, participants JSON, lastMessage TEXT, updatedAt DATETIME)`,
        `CREATE TABLE IF NOT EXISTS messages (id VARCHAR(36) PRIMARY KEY, chat_id VARCHAR(255), senderId VARCHAR(255), text TEXT, createdAt DATETIME)`
    ];

    // Run initialization
    // The execute function handles the routing (API vs Mock) automatically.
    for (const q of queries) {
        await execute(q);
    }
    console.log("System Initialized");
}
