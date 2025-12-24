
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { execute } from '../lib/tidbClient';
import AuthView from './AuthView';
import { BackIcon, EditIcon, HeartIcon, SettingsIcon, CloseIcon, GridIcon, BookmarkIcon, ProfileIcon, PlusCircleIcon } from './icons';
import { useStatus } from '../contexts/StatusContext';
import { ViewState, ViewType, ProfileTab, Profile, PostWithAuthorAndLikes } from '../types';

interface ProfileViewProps {
    setCurrentView: (view: ViewState) => void;
    initialTab?: ProfileTab;
    targetUserId?: string;
    isOverlay?: boolean;
    onClose?: () => void;
    onEditPost?: (post: PostWithAuthorAndLikes) => void;
    refreshKey?: number;
}

const LoadingSpinner: React.FC = () => (
    <div className="flex items-center justify-center h-full w-full p-20 text-slate-400">
        <div className="w-8 h-8 border-2 border-slate-500/30 border-t-slate-500 rounded-full animate-spin"></div>
    </div>
);

// --- Styled Components ---

const Divider = () => <div className="h-4 w-[1px] bg-white/20 mx-3"></div>;

const StatItem: React.FC<{ label: string; value: string | number; onClick?: () => void }> = ({ label, value, onClick }) => (
    <div className={`flex flex-col items-center min-w-[30px] ${onClick ? 'cursor-pointer group' : ''}`} onClick={onClick}>
        <span className="font-black text-lg text-white tracking-tight group-hover:text-pink-400 transition-colors font-['Inter'] leading-none mb-1">{value}</span>
        <span className="text-slate-500 text-[9px] font-bold uppercase tracking-wider font-['Inter']">{label}</span>
    </div>
);

const Chip: React.FC<{ label: string }> = ({ label }) => (
    <span className="px-4 py-1.5 rounded-full border border-white/10 text-[10px] font-semibold text-slate-300 bg-[#1A1A1A] tracking-wide hover:bg-white/10 transition-colors">
        #{label}
    </span>
);

const TabButton: React.FC<{ active: boolean; label?: string; icon?: React.ComponentType<any>; count?: number; onClick: () => void }> = ({ active, label, icon: Icon, count, onClick }) => (

    <button
        onClick={onClick}
        className={`relative group px-4 py-2 flex items-center justify-center transition-all ${active ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
    >
        {Icon ? (
            <Icon className={`w-6 h-6 ${active ? 'stroke-[2.5px]' : 'stroke-2'}`} />
        ) : (
            <span className={`text-sm font-bold uppercase tracking-widest ${active ? 'font-black' : 'font-medium'}`}>{label}</span>
        )}

        {/* Count Badge for Icons (optional, maybe distinct) - kept inline for now if needed, but usually icons are solo */}
        {count !== undefined && !Icon && (
            <span className={`ml-1 text-[9px] font-bold -mt-1 ${active ? 'text-white' : 'text-slate-600'}`}>{count}</span>
        )}

        {active && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-full"></span>}
    </button>
);


const ProfileView: React.FC<ProfileViewProps> = ({ setCurrentView, initialTab = 'posts', targetUserId, isOverlay, onClose, onEditPost, refreshKey }) => {
    const { user, profile: myProfile, fetchProfile, isLoading: isAuthLoading } = useAuth();
    const [displayProfile, setDisplayProfile] = useState<Profile | null>(null);
    const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab);
    const [items, setItems] = useState<any[]>([]);

    // Edit Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editUsername, setEditUsername] = useState('');
    const [editTagline, setEditTagline] = useState('');
    const [editBio, setEditBio] = useState('');
    const [editTags, setEditTags] = useState('');
    const [editPhoto, setEditPhoto] = useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Data States
    const [stats, setStats] = useState({ posts: 0, followers: 0, following: 0, totalLikes: 0 });
    const [isFollowing, setIsFollowing] = useState(false);
    const { setError } = useStatus();

    // User List Modal State
    const [showUserList, setShowUserList] = useState<'followers' | 'following' | null>(null);
    const [userList, setUserList] = useState<Profile[]>([]);

    const isOwnProfile = !targetUserId || (user && user.uid === targetUserId);
    const profileId = isOwnProfile ? user?.uid : targetUserId;

    // Numbers
    const formatCount = (n: number) => {
        if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
        if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
        return n;
    };

    // --- EFFECTS ---
    useEffect(() => {
        if (isOwnProfile) {
            setDisplayProfile(myProfile);
            if (myProfile) {
                setEditUsername(myProfile.username || '');
                // Split bio for tagline if possible, or just use bio
                const bioParts = (myProfile.bio || '').split('\n');
                setEditTagline(bioParts[0] || '');
                setEditBio(bioParts.slice(1).join('\n') || '');
                setEditTags(myProfile.tags || '');
                setEditPhoto(myProfile.photoURL || null);
            }
        } else if (profileId) {
            const loadOtherProfile = async () => {
                try {
                    const res = await execute('SELECT * FROM profiles WHERE id = ?', [profileId]);
                    if (res.length > 0) {
                        setDisplayProfile(res[0] as Profile);
                    }
                } catch (e) { console.error(e); }
            };
            loadOtherProfile();
        }
    }, [isOwnProfile, myProfile, profileId]);

    useEffect(() => {
        if (profileId) {
            fetchStats();
            fetchItems();
            if (!isOwnProfile && user) {
                checkIfFollowing().then(status => setIsFollowing(!!status));
            }
        }
    }, [profileId, activeTab, user]);

    // Force Edit for New Users
    useEffect(() => {
        if (isOwnProfile && myProfile && !myProfile.username) {
            setShowEditModal(true);
        }
    }, [isOwnProfile, myProfile]);

    // --- DATA FETCHING ---
    const fetchStats = async () => {
        if (!profileId) return;
        try {
            const postCount = await execute('SELECT COUNT(*) as c FROM posts WHERE user_id = ?', [profileId]);
            const followers = await execute('SELECT COUNT(*) as c FROM follows WHERE following_id = ?', [profileId]);
            const following = await execute('SELECT COUNT(*) as c FROM follows WHERE follower_id = ?', [profileId]);

            // Calculate total likes received
            const likesCount = await execute(`
                SELECT COUNT(*) as c FROM likes l
                JOIN posts p ON l.post_id = p.id
                WHERE p.user_id = ?
            `, [profileId]);

            setStats({
                posts: postCount[0].c,
                followers: followers[0].c,
                following: following[0].c,
                totalLikes: likesCount[0].c
            });
        } catch (e) { console.error(e); }
    };

    const checkIfFollowing = async () => {
        if (!user || !profileId) return;
        const res = await execute('SELECT * FROM follows WHERE follower_id = ? AND following_id = ?', [user.uid, profileId]);
        if (res.length > 0) return res[0].status;
        return null;
    };

    const fetchItems = async () => {
        if (!profileId) return;
        try {
            let result = [];
            if (activeTab === 'posts') {
                result = await execute(`
                    SELECT p.*, 
                    (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) as like_count
                    FROM posts p WHERE user_id = ? ORDER BY created_at DESC
                 `, [profileId]);
            } else if (activeTab === 'likes' && isOwnProfile) {
                result = await execute(`
                    SELECT p.*,
                    (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) as like_count
                    FROM posts p
                    JOIN likes l ON p.id = l.post_id
                    WHERE l.user_id = ? ORDER BY l.created_at DESC
                 `, [profileId]);
            } else if (activeTab === 'saved' && isOwnProfile) {
                result = await execute(`
                    SELECT * FROM saved_domains WHERE user_id = ? ORDER BY saved_at DESC
                `, [profileId]);
            }
            setItems(result);
        } catch (e) { console.error(e); }
    };

    const fetchUserList = async (type: 'followers' | 'following') => {
        if (!profileId) return;
        setShowUserList(type);
        try {
            let users = [];
            if (type === 'followers') {
                users = await execute(`SELECT p.* FROM profiles p JOIN follows f ON f.follower_id = p.id WHERE f.following_id = ?`, [profileId]);
            } else {
                users = await execute(`SELECT p.* FROM profiles p JOIN follows f ON f.following_id = p.id WHERE f.follower_id = ?`, [profileId]);
            }
            setUserList(users as Profile[]);
        } catch (e) { console.error(e); setError("Failed to load users"); }
    };

    // --- ACTIONS ---
    const handleSaveProfile = async () => {
        if (!user || !editUsername.trim()) return;
        try {
            // Check for uniqueness
            const existing = await execute('SELECT id FROM profiles WHERE username = ? AND id != ?', [editUsername.trim(), user.uid]);
            if (existing.length > 0) {
                setError("Username already taken.");
                return;
            }

            // Combine Tagline + Bio
            const combinedBio = `${editTagline}\n${editBio}`;
            await execute(`
                INSERT INTO profiles (id, username, email, bio, tags, photoURL) VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE username = ?, bio = ?, tags = ?, photoURL = ?
            `, [user.uid, editUsername.trim(), user.email || '', combinedBio, editTags.trim(), editPhoto, editUsername.trim(), combinedBio, editTags.trim(), editPhoto]);
            await fetchProfile();
            setShowEditModal(false);
        } catch (e) { setError("Failed to update profile."); }
    };

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const { compressImage } = await import('../lib/imageUtils');
            const compressed = await compressImage(file);
            setEditPhoto(compressed);
        } catch (err) {
            setError("Failed to process image.");
        }
    };

    const handleFollowToggle = async () => {
        if (!user || !profileId) return;
        try {
            if (isFollowing) {
                await execute('DELETE FROM follows WHERE follower_id = ? AND following_id = ?', [user.uid, profileId]);
                setIsFollowing(false);
            } else {
                const status = displayProfile?.is_private ? 'pending' : 'accepted';
                await execute('INSERT IGNORE INTO follows (follower_id, following_id, status) VALUES (?, ?, ?)', [user.uid, profileId, status]);
                setIsFollowing(true);
            }
            fetchStats();
        } catch (e) { setError("Action failed."); }
    };

    const handleMessage = async () => {
        if (!user || !profileId) return;
        try {
            setCurrentView({ type: ViewType.Chat, otherUserId: profileId });
        } catch (e) { console.error(e); setError("Could not start chat."); }
    };


    if (isAuthLoading) return <LoadingSpinner />;
    if (!user && isOwnProfile) return <div className="p-4 flex flex-col items-center justify-center"><AuthView /></div>;
    if (!displayProfile) return <div className="p-8 text-center text-white">Loading...</div>;


    // --- RENDERING ---
    // Extract Tagline and Bio for Display
    const profileBioParts = (displayProfile.bio || "I create. I think. I develop.\nDesigner -> Product Thinker\nMoscow -> Berlin").split('\n');
    const tagline = profileBioParts[0];
    const bioDetails = profileBioParts.slice(1);

    const content = (
        <div className="w-full h-full flex flex-col bg-[#050505] text-white relative font-['Inter'] scroll-smooth overflow-y-auto custom-scrollbar">

            {/* 
                MOBILE "ANNETTE" HEADER 
             */}
            <div className="md:hidden relative w-full shrink-0">
                {/* Hero Image Layer - Further reduced height to 40vh to remove blank space */}
                <div className="relative w-full h-[40vh]">
                    <div className="absolute inset-0 z-0">
                        {displayProfile.photoURL ? (
                            <img src={displayProfile.photoURL} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-[#111] flex items-center justify-center">
                                <span className="text-9xl font-black text-white/5">{displayProfile.username?.charAt(0)}</span>
                            </div>
                        )}
                        {/* Gradients */}
                        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#050505] to-transparent" />
                        <div className="absolute inset-0 bg-black/10" />
                    </div>

                    {/* Top Nav */}
                    <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-20">
                        <button onClick={() => onClose ? onClose() : setCurrentView({ type: ViewType.Explore })} className="bg-black/20 backdrop-blur-md p-2 rounded-full hover:bg-black/40 transition-colors"><BackIcon className="w-5 h-5 text-white" /></button>

                        <div className="flex items-center space-x-2">
                            <div className="flex items-center space-x-2 bg-black/20 backdrop-blur-md px-3 py-1 rounded-full">
                                <span className="text-[10px] font-bold tracking-widest uppercase text-white/90">online</span>
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_8px_rgb(34,197,94)]"></span>
                            </div>
                            {isOwnProfile && (
                                <button onClick={() => setCurrentView({ type: ViewType.Settings })} className="bg-black/20 backdrop-blur-md p-2 rounded-full hover:bg-black/40 transition-colors">
                                    <SettingsIcon className="w-5 h-5 text-white" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Overlay */}
            <div className="relative px-6 -mt-24 z-10 flex flex-col items-start pb-10 md:hidden">

                {/* Name Block */}
                <h1 className="text-5xl font-black text-white leading-[0.9] tracking-tighter mb-1 drop-shadow-2xl">{displayProfile.username}</h1>
                <p className="text-gray-400 font-bold text-sm mb-4 tracking-wide">@{displayProfile.username?.toLowerCase().replace(/\s+/g, '')}</p>

                {/* Stats Flex Row - Tighter spacing */}
                <div className="flex items-center w-full justify-between mb-6 pr-4">
                    <StatItem label="Followers" value={formatCount(stats.followers)} onClick={() => fetchUserList('followers')} />
                    <Divider />
                    <StatItem label="Following" value={formatCount(stats.following)} onClick={() => fetchUserList('following')} />
                    <Divider />
                    <StatItem label="Posts" value={formatCount(stats.posts)} />
                </div>

                {/* Mobile Edit Button - Inline */}
                {isOwnProfile && (
                    <button
                        onClick={() => setShowEditModal(true)}
                        className="w-full py-3.5 mb-6 rounded-2xl bg-white text-black font-black text-[10px] tracking-[0.2em] uppercase shadow-xl transition-all active:scale-95 flex items-center justify-center space-x-2 border border-black/10"
                    >
                        <SettingsIcon className="w-4 h-4" />
                        <span>Update Identity State</span>
                    </button>
                )}

                {/* Tagline / Quote - Tighter spacing */}
                <blockquote className="text-2xl font-bold text-white leading-tight tracking-tight mb-2 drop-shadow-md">
                    "{tagline}"
                </blockquote>

                {/* Bio Details List - Tighter spacing */}
                <div className="flex flex-col space-y-0.5 mb-4">
                    {bioDetails.length > 0 ? bioDetails.map((line, i) => (
                        <span key={i} className="text-gray-400 text-sm font-medium">{line}</span>
                    )) : (
                        <>
                            <span className="text-gray-400 text-sm font-medium">Designer → Product Thinker</span>
                            <span className="text-gray-400 text-sm font-medium">I love clean lines and clear ideas</span>
                            <span className="text-gray-400 text-sm font-medium">Moscow → Berlin</span>
                        </>
                    )}
                </div>

                {/* Chips - Tighter spacing */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {displayProfile.tags && displayProfile.tags.trim().length > 0 ? (
                        displayProfile.tags.split(',').map((tag, i) => <Chip key={i} label={tag.trim()} />)
                    ) : (
                        <>
                            <Chip label="Minimalism" />
                            <Chip label="DesignThinking" />
                            <Chip label="Photography" />
                        </>
                    )}
                </div>
            </div>

            {/* 
                DESKTOP "IRENE" HEADER
             */}
            <main className="hidden md:flex flex-col items-center w-full pt-16 px-6 pb-6">
                {/* Reduced size: max-w-4xl and p-10 (was p-12) */}
                <div className="w-full max-w-4xl bg-[#0f0f11] border border-white/10 rounded-[2.5rem] p-10 flex items-start space-x-10 shadow-2xl relative overflow-hidden">
                    <div className="absolute -top-32 -right-32 w-96 h-96 bg-purple-900/20 rounded-full blur-[120px]"></div>

                    <div className="relative group shrink-0">
                        {/* Reduced avatar size slightly */}
                        <div className="w-40 h-40 rounded-[2rem] overflow-hidden shadow-2xl bg-[#1a1a1a]">
                            {displayProfile.photoURL ? (
                                <img src={displayProfile.photoURL} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-indigo-600 text-white font-black text-6xl">{displayProfile.username?.charAt(0)}</div>
                            )}
                        </div>
                        {isOwnProfile && <button onClick={() => setShowEditModal(true)} className="absolute -bottom-2 -right-2 p-3 bg-white text-black rounded-full hover:scale-110 transition-transform shadow-lg z-10"><EditIcon className="w-4 h-4" /></button>}
                    </div>

                    <div className="flex-1 z-10 pt-2">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <div className="flex items-center space-x-3 mb-1">
                                    <h1 className="text-4xl font-black text-white tracking-tight font-['Inter']">{displayProfile.username}</h1>
                                    <span className="px-2 py-0.5 bg-[#4F46E5] text-white rounded text-[10px] font-black uppercase tracking-wider">PRO</span>
                                </div>
                                <p className="text-lg font-medium text-slate-400 leading-snug max-w-md">{tagline}</p>
                            </div>
                            {!isOwnProfile && (
                                <div className="flex space-x-3">
                                    <button onClick={handleFollowToggle} className={`px-6 py-2.5 rounded-xl font-bold shadow-lg transition-transform active:scale-95 border border-white/10 text-xs uppercase tracking-wide ${isFollowing ? 'bg-white/5 text-white' : 'bg-white text-black'}`}>
                                        {isFollowing ? 'Following' : 'Follow'}
                                    </button>
                                    <button onClick={handleMessage} className="px-6 py-2.5 rounded-xl font-bold border border-white/20 hover:bg-white/5 transition-colors text-white text-xs uppercase tracking-wide">
                                        Message
                                    </button>
                                </div>
                            )}
                            {isOwnProfile && (
                                <button onClick={() => setCurrentView({ type: ViewType.Settings })} className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors group">
                                    <SettingsIcon className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                                </button>
                            )}
                        </div>
                        <div className="flex items-center space-x-12 mb-2">
                            <div className="text-center cursor-pointer group" onClick={() => fetchUserList('followers')}>
                                <div className="text-slate-500 text-[10px] font-bold uppercase mb-1 tracking-wider group-hover:text-white transition-colors">Followers</div>
                                <div className="text-2xl font-black font-['Inter']">{formatCount(stats.followers)}</div>
                            </div>
                            <div className="text-center cursor-pointer group" onClick={() => fetchUserList('following')}>
                                <div className="text-slate-500 text-[10px] font-bold uppercase mb-1 tracking-wider group-hover:text-white transition-colors">Following</div>
                                <div className="text-2xl font-black font-['Inter']">{formatCount(stats.following)}</div>
                            </div>
                            <div className="text-center">
                                <div className="text-slate-500 text-[10px] font-bold uppercase mb-1 tracking-wider">Posts</div>
                                <div className="text-2xl font-black font-['Inter']">{formatCount(stats.posts)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>


            {/* 
                CONTENT
            */}
            <section className="flex-1 w-full max-w-4xl mx-auto px-6 md:px-0 pb-20">
                {/* Tabs - Centered Icons for Mobile */}
                <div className="flex items-center justify-center md:justify-start mb-8 border-b border-white/10 pb-0 md:border-b-0 md:pb-0">
                    <div className="flex space-x-12 mx-auto md:mx-0">
                        <TabButton active={activeTab === 'posts'} icon={GridIcon} onClick={() => setActiveTab('posts')} />
                        {isOwnProfile && (
                            <>
                                <TabButton active={activeTab === 'likes'} icon={HeartIcon} onClick={() => setActiveTab('likes')} />
                                <TabButton active={activeTab === 'saved'} icon={BookmarkIcon} onClick={() => setActiveTab('saved')} />
                            </>
                        )}
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                    {items.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => {
                                const fullId = item.domain_id || item.domain_name;
                                // ALWAYS use the leaf ID (e.g. Science/Physics -> Physics) for the domain lookup
                                // This ensures "Relativity" finds "Science/Relativity" and "Cosmology/Relativity" (Broad Search)
                                const leafId = fullId ? fullId.split('/').pop() : 'Unknown';

                                setCurrentView({ type: ViewType.Post, domainId: leafId, domainName: leafId, focusedPostId: item.id });
                            }}
                            className="aspect-[4/5] rounded-[1.5rem] bg-[#111] overflow-hidden relative group cursor-pointer shadow-lg transition-all duration-500 border border-white/5"
                        >
                            {item.imageURL ? (
                                <img src={item.imageURL} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                                    <span className="font-extrabold text-white text-sm">{item.domain_name}</span>
                                </div>
                            )}

                            {/* REMOVED THE "UI" CIRCLE BADGE HERE AS REQUESTED */}

                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6">
                                <div className="flex justify-between items-end text-white">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-sm truncate max-w-[70%]">{item.title || 'Post'}</span>
                                        {isOwnProfile && activeTab === 'posts' && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onEditPost?.({
                                                        ...item,
                                                        profiles: {
                                                            username: displayProfile.username,
                                                            photoURL: displayProfile.photoURL
                                                        },
                                                        like_count: Number(item.like_count || 0),
                                                        is_liked_by_user: false, // Default or fetch if needed
                                                        comment_count: 0, // Default or fetch if needed
                                                        comments: []
                                                    } as PostWithAuthorAndLikes);
                                                }}
                                                className="mt-1 text-[10px] uppercase tracking-widest text-white/60 hover:text-white transition-colors flex items-center space-x-1"
                                            >
                                                <EditIcon className="w-3 h-3" />
                                                <span>Edit</span>
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex items-center space-x-1.5 bg-white/20 backdrop-blur-md px-2 py-1 rounded-full">
                                        <HeartIcon className="w-3.5 h-3.5 fill-white" />
                                        <span className="text-xs font-bold">{item.like_count || 0}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>


            {/* FLOATING FOLLOW BUTTON (Mobile Only) */}
            {
                !isOwnProfile && (
                    <div className="fixed bottom-0 left-0 right-0 px-6 py-6 md:hidden z-50 bg-gradient-to-t from-[#050505] via-[#050505] to-transparent">
                        <button
                            onClick={handleFollowToggle}
                            className={`w-full py-5 rounded-[2rem] font-black text-sm tracking-[0.2em] uppercase shadow-2xl transition-all active:scale-95 ${isFollowing
                                ? 'bg-slate-800 text-white'
                                : 'bg-gradient-to-r from-[#4F46E5] via-[#A855F7] to-[#F97316] text-white shadow-[0_10px_40px_-10px_rgba(168,85,247,0.6)]'
                                }`}
                        >
                            {isFollowing ? 'Following' : 'FOLLOW'}
                        </button>
                    </div>
                )
            }

            {/* NEW: Edit Profile Modal */}
            {
                showEditModal && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-xl p-6 animate-fade-in" onClick={() => !editUsername ? null : setShowEditModal(false)}>
                        <div className="w-full max-w-md bg-[#111] border border-white/10 rounded-[2rem] p-8 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                            {displayProfile?.username && <button onClick={() => setShowEditModal(false)} className="absolute top-6 right-6 p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors"><CloseIcon className="w-5 h-5 text-white" /></button>}

                            <h2 className="text-2xl font-black text-white mb-6">Edit Profile</h2>

                            <div className="space-y-4">
                                <div className="flex flex-col items-center mb-4">
                                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                        <div className="w-24 h-24 rounded-2xl overflow-hidden bg-white/5 border border-white/10 relative">
                                            {editPhoto ? (
                                                <img src={editPhoto} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-500">
                                                    <ProfileIcon className="w-8 h-8" />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <PlusCircleIcon className="w-6 h-6 text-white" />
                                            </div>
                                        </div>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handlePhotoChange}
                                            className="hidden"
                                            accept="image/*"
                                        />
                                    </div>
                                    <button onClick={() => fileInputRef.current?.click()} className="mt-2 text-[10px] font-bold uppercase text-indigo-400 hover:text-white transition-colors tracking-widest">Change Identity Image</button>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-2 block">Username</label>
                                    <input value={editUsername} onChange={e => setEditUsername(e.target.value)} className="w-full bg-transparent border-b border-white/20 py-2 font-bold text-xl text-white focus:outline-none focus:border-white transition-colors" placeholder="Username" />
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-2 block">Tagline (One Line)</label>
                                    <input value={editTagline} onChange={e => setEditTagline(e.target.value)} className="w-full bg-white/5 rounded-xl px-4 py-3 font-medium text-white focus:outline-none border border-transparent focus:border-white/20 transition-all" placeholder="E.g. I create. I think." />
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-2 block">Bio Details</label>
                                    <textarea value={editBio} onChange={e => setEditBio(e.target.value)} className="w-full bg-white/5 rounded-xl px-4 py-3 font-medium text-slate-300 focus:outline-none border border-transparent focus:border-white/20 transition-all h-32 resize-none" placeholder="Details about you..." />
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-2 block">Labels (Comma Separated)</label>
                                    <input value={editTags} onChange={e => setEditTags(e.target.value)} className="w-full bg-white/5 rounded-xl px-4 py-3 font-medium text-white focus:outline-none border border-transparent focus:border-white/20 transition-all" placeholder="Minimalism, Design, Art" />
                                </div>

                                <button onClick={handleSaveProfile} className="w-full py-4 bg-white text-black font-black uppercase tracking-widest rounded-xl hover:bg-gray-200 transition-colors mt-4">Save Changes</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* User List Modal */}
            {
                showUserList && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-fade-in" onClick={() => setShowUserList(null)}>
                        <div className="w-full max-w-sm bg-[#111] rounded-[2rem] overflow-hidden border border-white/10 flex flex-col max-h-[70vh] shadow-2xl" onClick={e => e.stopPropagation()}>
                            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/50">
                                <h3 className="font-black text-2xl text-white capitalize tracking-tight font-['Inter']">{showUserList}</h3>
                                <button onClick={() => setShowUserList(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><CloseIcon className="w-5 h-5 text-gray-400" /></button>
                            </div>
                            <div className="overflow-y-auto p-2 custom-scrollbar flex-1 space-y-1">
                                {userList.map(u => (
                                    <div key={u.id} onClick={() => { setShowUserList(null); setCurrentView({ type: ViewType.Profile, userId: u.id }); }} className="flex items-center space-x-4 p-3 hover:bg-white/5 rounded-2xl cursor-pointer transition-colors group">
                                        <div className="w-12 h-12 rounded-full bg-slate-800 overflow-hidden border-2 border-transparent group-hover:border-white/50 transition-all">
                                            {u.photoURL ? <img src={u.photoURL} className="w-full h-full object-cover" /> : null}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-white text-base leading-none mb-1">{u.username}</span>
                                            <span className="text-xs text-slate-500 font-medium">View Profile</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );

    if (isOverlay) {
        return (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95 backdrop-blur-xl md:p-4 animate-fade-in" onClick={onClose}>
                <div
                    className="w-full max-w-6xl h-full md:h-[95vh] md:rounded-[3rem] overflow-hidden shadow-2xl border-x md:border border-white/10 flex flex-col relative bg-[#050505]"
                    onClick={e => e.stopPropagation()}
                >
                    {content}
                </div>
            </div>
        );
    }
    return content;
};

export default ProfileView;
