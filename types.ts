
export enum ViewType {
  Explore = 'EXPLORE',
  Post = 'POST',
  Profile = 'PROFILE',
  Chat = 'CHAT',
  Inbox = 'INBOX',
  Notifications = 'NOTIFICATIONS',
  Auth = 'AUTH',
  Feed = 'FEED',
  Search = 'SEARCH',
  Settings = 'SETTINGS',
}

export type ProfileTab = 'posts' | 'likes' | 'saved' | 'comments';

export type ViewState =
  | { type: ViewType.Explore; initialPath?: string[]; overlayProfileId?: string }
  | { type: ViewType.Post; domainId: string; domainName: string; focusedPostId?: string; overlayProfileId?: string }
  | { type: ViewType.Profile; initialTab?: ProfileTab; userId?: string; overlayProfileId?: string }
  | { type: ViewType.Chat; chatId?: string; otherUserId?: string; overlayProfileId?: string }
  | { type: ViewType.Inbox; overlayProfileId?: string }
  | { type: ViewType.Notifications; overlayProfileId?: string }
  | { type: ViewType.Search; query?: string; overlayProfileId?: string }
  | { type: ViewType.Auth; overlayProfileId?: string }
  | { type: ViewType.Feed; overlayProfileId?: string }
  | { type: ViewType.Settings; overlayProfileId?: string };

export interface Domain {
  id: string; // Path-based ID, e.g., "Art/Painting"
  name: string;
  children: Domain[] | null; // null means not yet fetched
  position?: { x: number; y: number }; // Optional: Only for orbital view
  source?: 'web' | 'ai'; // 'web' results float to periphery, 'ai' results stay in core
}

export interface Profile {
  id: string; // UID from Firebase Auth
  username: string;
  email?: string;
  photoURL?: string; // Base64 compressed image
  bio?: string;
  is_private?: boolean;
  tags?: string; // Comma separated tags
  interests?: string; // Comma separated topics
  theme?: string;
}

export interface Comment {
  id: string;
  user_id: string;
  parent_id?: string | null;
  content: string;
  created_at: string;
  profiles: { // Manually populated
    username: string;
    photoURL?: string;
  };
}

// This type is for client-side use after combining Firestore queries
export interface PostWithAuthorAndLikes {
  id: string; // Firestore Doc ID
  content: string;
  imageURL?: string; // Base64 compressed image
  created_at: string; // ISO string
  user_id: string;
  domain_id: string;
  profiles: { // Manually populated
    username: string;
    photoURL?: string;
  };
  // These will be added client-side after initial fetch
  like_count: number;
  is_liked_by_user: boolean;
  comment_count: number;
  comments: Comment[];
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  participants: string[]; // [uid1, uid2]
  lastMessage: string;
  updatedAt: string;
  participantProfile?: Profile; // Populated client side
}

export type Theme = 'nebula' | 'zen' | 'midnight' | 'studio' | 'hyle';
