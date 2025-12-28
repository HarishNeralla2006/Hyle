
import { execute } from './tidbClient';

const checkColumnExists = async (table: string, column: string): Promise<boolean> => {
    try {
        const result = await execute(`SELECT count(*) as count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${table}' AND COLUMN_NAME = '${column}'`);
        // TiDB/MySQL returns count in different formats, sometimes array of objects
        if (result && result.length > 0) {
            const row = result[0];
            const count = row.count || row.COUNT || Object.values(row)[0]; // Fallback
            return Number(count) > 0;
        }
    } catch (e) {
        console.warn("Schema check failed, assuming false", e);
    }
    return false;
};

export const initializeSchema = async () => {
    console.log("Checking DB schema...");
    try {
        const profilesExists = await execute("SHOW TABLES LIKE 'profiles'");
        if (profilesExists.length === 0) {
            await execute(`CREATE TABLE IF NOT EXISTS profiles (id VARCHAR(255) PRIMARY KEY, username VARCHAR(255), email VARCHAR(255), photoURL LONGTEXT)`);
        }

        // Bio Column
        if (!(await checkColumnExists('profiles', 'bio'))) {
            try {
                await execute('ALTER TABLE profiles ADD COLUMN bio TEXT');
                console.log("Added bio column.");
            } catch (e) { console.log("Bio add failed", e); }
        }

        // PhotoURL Column (Fix for missing profile pictures)
        if (!(await checkColumnExists('profiles', 'photoURL'))) {
            try {
                await execute('ALTER TABLE profiles ADD COLUMN photoURL LONGTEXT');
                console.log("Added photoURL column.");
            } catch (e) { console.log("PhotoURL add failed", e); }
        }

        // Posts Table Schema Repair
        await execute(`
            CREATE TABLE IF NOT EXISTS posts (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(255),
                domain_id VARCHAR(255),
                content TEXT,
                imageURL LONGTEXT,
                created_at DATETIME
            )
        `);

        if (!(await checkColumnExists('posts', 'domain_id'))) {
            try { await execute('ALTER TABLE posts ADD COLUMN domain_id VARCHAR(255)'); console.log("Added domain_id to posts."); } catch (e) { console.log("Failed to add domain_id", e); }
        }
        if (!(await checkColumnExists('posts', 'imageURL'))) {
            try { await execute('ALTER TABLE posts ADD COLUMN imageURL LONGTEXT'); console.log("Added imageURL to posts."); } catch (e) { console.log("Failed to add imageURL", e); }
        }
        if (!(await checkColumnExists('posts', 'user_id'))) {
            try { await execute('ALTER TABLE posts ADD COLUMN user_id VARCHAR(255)'); console.log("Added user_id to posts."); } catch (e) { console.log("Failed to add user_id", e); }
        }

        // Comments Table Schema Repair
        await execute(`
            CREATE TABLE IF NOT EXISTS comments (
                id VARCHAR(36) PRIMARY KEY,
                post_id VARCHAR(36),
                user_id VARCHAR(255),
                content TEXT,
                parent_id VARCHAR(255) DEFAULT NULL,
                created_at DATETIME
            )
        `);

        // Theme Column (Fix for 500 Error on Theme Save)
        if (!(await checkColumnExists('profiles', 'theme'))) {
            try {
                await execute("ALTER TABLE profiles ADD COLUMN theme VARCHAR(20) DEFAULT 'nebula'");
                console.log("Added theme column.");
            } catch (e) { console.log("Theme add failed", e); }
        }

        // Create follows table
        await execute(`
            CREATE TABLE IF NOT EXISTS follows (
                follower_id VARCHAR(255) NOT NULL,
                following_id VARCHAR(255) NOT NULL,
                status VARCHAR(20) DEFAULT 'accepted',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (follower_id, following_id)
            )
        `);

        // Migration: Add status to follows
        if (!(await checkColumnExists('follows', 'status'))) {
            try { await execute("ALTER TABLE follows ADD COLUMN status VARCHAR(20) DEFAULT 'accepted'"); } catch { }
        }

        // Add is_private to profiles
        if (!(await checkColumnExists('profiles', 'is_private'))) {
            try { await execute('ALTER TABLE profiles ADD COLUMN is_private BOOLEAN DEFAULT FALSE'); } catch { }
        }

        // Add tags to profiles
        if (!(await checkColumnExists('profiles', 'tags'))) {
            try { await execute('ALTER TABLE profiles ADD COLUMN tags TEXT'); } catch { }
        }

        // Add interests to profiles
        if (!(await checkColumnExists('profiles', 'interests'))) {
            try { await execute('ALTER TABLE profiles ADD COLUMN interests TEXT'); } catch { }
        }

        console.log("Schema checks completed.");

        // Add status to chat participants for invitations
        if (!(await checkColumnExists('chat_participants', 'status'))) {
            try {
                await execute("ALTER TABLE chat_participants ADD COLUMN status VARCHAR(20) DEFAULT 'accepted'");
                console.log("Added chat invitations support.");
            } catch { }
        }

        await execute(`
            CREATE TABLE IF NOT EXISTS chats (
                id VARCHAR(255) PRIMARY KEY,
                lastMessage TEXT,
                updatedAt DATETIME
            )
        `);

        await execute(`
            CREATE TABLE IF NOT EXISTS chat_participants (
                chat_id VARCHAR(255),
                user_id VARCHAR(255),
                status VARCHAR(20) DEFAULT 'pending',
                PRIMARY KEY (chat_id, user_id)
            )
        `);

        await execute(`
            CREATE TABLE IF NOT EXISTS messages (
                id VARCHAR(255) PRIMARY KEY,
                chat_id VARCHAR(255),
                sender_id VARCHAR(255),
                text TEXT,
                created_at DATETIME,
                FOREIGN KEY (chat_id) REFERENCES chats(id)
            )
        `);

        // Migration: Messages schema repair
        if (!(await checkColumnExists('messages', 'sender_id'))) {
            try { await execute('ALTER TABLE messages ADD COLUMN sender_id VARCHAR(255)'); } catch (e) { console.log('Message sender_id migration failed', e); }
        }
        if (!(await checkColumnExists('messages', 'chat_id'))) {
            try { await execute('ALTER TABLE messages ADD COLUMN chat_id VARCHAR(255)'); } catch (e) { console.log('Message chat_id migration failed', e); }
        }
        if (!(await checkColumnExists('messages', 'created_at'))) {
            try { await execute('ALTER TABLE messages ADD COLUMN created_at DATETIME'); } catch (e) { console.log('Message created_at migration failed', e); }
        }

        await execute(`
            CREATE TABLE IF NOT EXISTS notifications (
                id VARCHAR(255) PRIMARY KEY,
                user_id VARCHAR(255),
                actor_id VARCHAR(255),
                type VARCHAR(50),
                entity_id VARCHAR(255),
                read_status BOOLEAN DEFAULT FALSE,
                created_at DATETIME
            )
        `);
        // Add parent_id to comments for nesting
        if (!(await checkColumnExists('comments', 'parent_id'))) {
            try {
                await execute('ALTER TABLE comments ADD COLUMN parent_id VARCHAR(255) DEFAULT NULL');
                console.log("Added parent_id to comments.");
            } catch (e) { console.log("Failed to add parent_id to comments", e); }
        }

        // Community Members (Join/Follow)
        await execute(`
            CREATE TABLE IF NOT EXISTS community_members (
                community_id VARCHAR(255),
                user_id VARCHAR(255),
                role VARCHAR(20) DEFAULT 'member',
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (community_id, user_id)
            )
        `);
        console.log("Ensured community_members table.");

        console.log("Ensured notifications table.");

    } catch (error) {
        console.error("Schema initialization error:", error);
    }
};
