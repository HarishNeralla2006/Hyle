
import { execute } from '../lib/tidbClient';

// Helper to generate UUIDs if crypto.randomUUID is not available (e.g. older envs, though modern browsers have it)
const generateId = () => crypto.randomUUID();

/**
 * Gets an existing chat ID between two users or creates a new one.
 * 
 * Strategy:
 * 1. Search `chat_participants` for a chat where BOTH users are participants.
 * 2. If found, return that `chat_id`.
 * 3. If not found:
 *    - Create new Chat ID.
 *    - Insert into `chats`.
 *    - Insert `chat_participants` for Me (status='accepted').
 *    - Insert `chat_participants` for Them (status='pending').
 *    - Return new Chat ID.
 */
export const getOrCreateChat = async (myUserId: string, otherUserId: string): Promise<string> => {
    try {
        // 1. Find existing chat
        // We need a chat_id that appears in the participants table for BOTH user_ids.
        // SQL: SELECT c1.chat_id FROM chat_participants c1 JOIN chat_participants c2 ON c1.chat_id = c2.chat_id WHERE c1.user_id = ? AND c2.user_id = ?
        const existing = await execute(`
            SELECT c1.chat_id 
            FROM chat_participants c1 
            JOIN chat_participants c2 ON c1.chat_id = c2.chat_id 
            WHERE c1.user_id = ? AND c2.user_id = ?
            LIMIT 1
        `, [myUserId, otherUserId]);

        if (existing.length > 0) {
            console.log('Found existing chat:', existing[0].chat_id);
            return existing[0].chat_id;
        }

        // 2. Create new chat
        const newChatId = generateId();
        const now = new Date().toISOString();

        console.log('Creating new chat:', newChatId);

        // Transaction-like sequence (TiDB Serverless is HTTP based, so consistent order matters)

        // A. Create Chat Record
        await execute(
            'INSERT INTO chats (id, lastMessage, updatedAt) VALUES (?, ?, ?)',
            [newChatId, '', now]
        );

        // B. Add Me (Accepted)
        await execute(
            'INSERT INTO chat_participants (chat_id, user_id, status) VALUES (?, ?, ?)',
            [newChatId, myUserId, 'accepted'] // I started it, so I accept it
        );

        // C. Add Them (Pending)
        // This makes it show up in their "Requests" tab
        await execute(
            'INSERT INTO chat_participants (chat_id, user_id, status) VALUES (?, ?, ?)',
            [newChatId, otherUserId, 'pending']
        );

        return newChatId;

    } catch (error) {
        console.error("Error in getOrCreateChat:", error);
        throw error;
    }
};
