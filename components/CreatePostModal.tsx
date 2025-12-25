
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Domain, ViewState, ViewType, PostWithAuthorAndLikes } from '../types';
import { CloseIcon, SearchIcon, PlusCircleIcon, TrashIcon } from './icons';
import { useAuth } from '../contexts/AuthContext';
import { useStatus } from '../contexts/StatusContext';
import { execute } from '../lib/tidbClient';
import { compressImage } from '../lib/imageUtils';

interface CreatePostModalProps {
    isOpen: boolean;
    onClose: () => void;
    domainTree: Domain | null;
    setCurrentView: (view: ViewState) => void;
    initialDomain?: Domain | null;
    initialPost?: PostWithAuthorAndLikes | null;
}

type SearchableDomain = {
    name: string;
    id: string;
}

const flattenDomainTree = (node: Domain | null, prefix: string = ''): SearchableDomain[] => {
    if (!node) return [];

    let results: SearchableDomain[] = [];

    if (prefix) {
        results.push({ name: node.name, id: prefix });
    }

    if (node.children) {
        for (const child of node.children) {
            const childId = prefix ? `${prefix}/${child.name}` : child.name;
            results = results.concat(flattenDomainTree(child, childId));
        }
    }
    return results;
};

const CreatePostModal: React.FC<CreatePostModalProps> = ({ isOpen, onClose, domainTree, setCurrentView, initialDomain, initialPost }) => {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDomain, setSelectedDomain] = useState<SearchableDomain | null>(null);
    const [postContent, setPostContent] = useState('');
    const [postImage, setPostImage] = useState<string | null>(null);
    const [isPosting, setIsPosting] = useState(false);
    const [isCompressing, setIsCompressing] = useState(false);
    const { error, setError } = useStatus();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const searchableDomains = useMemo(() => flattenDomainTree(domainTree), [domainTree]);

    const isEditing = !!initialPost;

    const searchResults = useMemo(() => {
        if (!searchTerm.trim()) return [];
        const lowercasedTerm = searchTerm.toLowerCase();
        return searchableDomains.filter(d =>
            d.name.toLowerCase().includes(lowercasedTerm) ||
            d.id.toLowerCase().includes(lowercasedTerm)
        ).slice(0, 5);
    }, [searchTerm, searchableDomains]);

    useEffect(() => {
        if (isOpen) {
            if (initialPost) {
                setPostContent(initialPost.content);
                setPostImage(initialPost.imageURL || null);
                // Find domain name from domainTree or id
                const domainId = initialPost.domain_id;
                const domainName = domainId.split('/').pop() || domainId;
                setSelectedDomain({ name: domainName, id: domainId });
            } else if (initialDomain && initialDomain.id !== 'root') {
                setSelectedDomain({ name: initialDomain.name, id: initialDomain.id });
            }
        } else {
            setTimeout(() => {
                setSearchTerm('');
                setSelectedDomain(null);
                setPostContent('');
                setPostImage(null);
                setIsPosting(false);
                setIsCompressing(false);
            }, 300);
        }
    }, [isOpen, initialDomain, initialPost]);

    if (!isOpen) return null;

    const handleSelectDomain = (domain: SearchableDomain) => {
        setSelectedDomain(domain);
        setSearchTerm('');
    };

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setIsCompressing(true);
            try {
                const compressedBase64 = await compressImage(e.target.files[0]);
                setPostImage(compressedBase64);
            } catch (err) {
                console.error("Compression failed", err);
                setError("Failed to process image.");
            } finally {
                setIsCompressing(false);
            }
        }
    };

    const handleCreatePost = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!postContent.trim() && !postImage) || !selectedDomain || !user) return;

        // FIX: Ensure manual posts use the same Composite ID logic as the seeder
        // This ensures posts in 'Cosmology' show up in 'Space' feeds
        const PARENT_MAP: Record<string, string> = {
            'Cosmology': 'Space',
            'Astronomy': 'Space',
            'Neuroscience': 'Biology',
            'Genetics': 'Biology',
            'Topology': 'Mathematics',
            'Algebra': 'Mathematics',
            'Civil Engineering': 'Engineering',
            'Startup': 'Business',
            'Stoicism': 'Philosophy',
            'Logic': 'Philosophy',
            'Cognitive': 'Psychology',
            'Indie': 'Gaming',
            'RPG': 'Gaming',
            'Movies': 'Cinema',
            'Wellness': 'Health',
            'Fitness': 'Health',
            'Botany': 'Nature',
            'Wildlife': 'Nature',
            'Climate': 'Environment',
        };

        let finalDomainId = selectedDomain.id;
        // Check if the selected ID is a raw sub-domain that needs parenting
        // We strip any existing parent prefix first just in case
        const rawId = selectedDomain.id.split(':').pop()?.trim() || selectedDomain.id;

        if (PARENT_MAP[rawId]) {
            finalDomainId = `${PARENT_MAP[rawId]}: ${rawId}`;
        } else if (PARENT_MAP[selectedDomain.name]) {
            finalDomainId = `${PARENT_MAP[selectedDomain.name]}: ${selectedDomain.name}`;
        }

        setIsPosting(true);
        try {
            if (isEditing && initialPost) {
                await execute(
                    'UPDATE posts SET content = ?, imageURL = ?, domain_id = ? WHERE id = ?',
                    [postContent.trim(), postImage || null, finalDomainId, initialPost.id]
                );
            } else {
                const newId = crypto.randomUUID();
                await execute(
                    'INSERT INTO posts (id, user_id, domain_id, content, imageURL, created_at) VALUES (?, ?, ?, ?, ?, ?)',
                    [newId, user.uid, finalDomainId, postContent.trim(), postImage || null, new Date().toISOString()]
                );
            }

            onClose();
            if (!isEditing) {
                setTimeout(() => {
                    setCurrentView({ type: ViewType.Post, domainId: selectedDomain.id, domainName: selectedDomain.name, focusedPostId: isEditing ? initialPost?.id : undefined });
                }, 300);
            }
        } catch (err: any) {
            setError(isEditing ? 'Failed to update post.' : 'Failed to create post. Please try again.');
            console.error("Post action failed:", err);
            setIsPosting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100]"
            onClick={onClose}
            style={{ animation: 'fadeIn 0.3s ease-out' }}
        >
            <div
                className="glass-panel rounded-[32px] shadow-2xl w-full max-w-lg m-4 p-8 text-[var(--text-color)] relative flex flex-col border border-[var(--glass-border)] animate-spring max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
                style={{ background: 'var(--glass-surface)' }}
            >
                <div className="flex justify-between items-start mb-6 flex-shrink-0">
                    <h2 className="text-2xl font-bold tracking-tight">{isEditing ? 'Edit Transmission' : 'New Transmission'}</h2>
                    <button onClick={onClose} className="p-2 -mr-2 -mt-2 rounded-full text-slate-400 hover:bg-white/10 hover:text-[var(--text-color)] transition-colors">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleCreatePost} className="flex flex-col flex-1 min-h-0">
                    <div className="mb-6 relative flex-shrink-0">
                        <label htmlFor="domain-search" className="block text-xs uppercase tracking-widest text-slate-400 mb-2 font-semibold">
                            {selectedDomain ? 'Selected Frequency' : '1. Target Frequency'}
                        </label>
                        {selectedDomain ? (
                            <div className="flex items-center justify-between p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl">
                                <span className="text-indigo-200 font-medium">{selectedDomain.id}</span>
                                <button type="button" onClick={() => setSelectedDomain(null)} className="p-1 text-indigo-300 hover:text-white transition-colors">
                                    <CloseIcon className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="relative">
                                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        id="domain-search"
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Search frequencies (e.g. Science/Physics)..."
                                        className="w-full glass-input bg-white/5 rounded-2xl pl-12 pr-4 py-3.5 text-[var(--text-color)] focus:outline-none focus:border-indigo-500/50 transition-colors placeholder-slate-500"
                                        autoComplete="off"
                                    />
                                </div>
                                {searchResults.length > 0 && (
                                    <div className="absolute w-full mt-2 glass-panel rounded-2xl shadow-xl overflow-hidden z-10 border border-white/10">
                                        {searchResults.map(domain => (
                                            <button
                                                type="button"
                                                key={domain.id}
                                                onClick={() => handleSelectDomain(domain)}
                                                className="block w-full text-left px-5 py-3.5 text-slate-300 hover:bg-white/10 hover:text-white transition-colors text-sm"
                                            >
                                                {domain.id}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <div className="mb-6 flex flex-col flex-1 min-h-0">
                        <label htmlFor="post-content" className="block text-xs uppercase tracking-widest text-slate-400 mb-2 font-semibold">
                            2. Signal Content
                        </label>
                        <textarea
                            id="post-content"
                            value={postContent}
                            onChange={(e) => setPostContent(e.target.value)}
                            placeholder="Broadcast your thoughts..."
                            className="w-full p-5 glass-input bg-white/5 rounded-2xl text-[var(--text-color)] focus:outline-none focus:border-indigo-500/50 transition-colors flex-1 resize-none placeholder-slate-500 text-[15px] leading-relaxed min-h-[100px]"
                        />
                    </div>

                    {/* Image Upload */}
                    <div className="mb-8">
                        <label className="block text-xs uppercase tracking-widest text-slate-400 mb-2 font-semibold">
                            3. Visual Data (Optional)
                        </label>
                        <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleImageSelect}
                        />

                        {postImage ? (
                            <div className="relative w-full h-48 rounded-2xl overflow-hidden border border-white/10 group">
                                <img src={postImage} alt="Preview" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button
                                        type="button"
                                        onClick={() => { setPostImage(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                        className="p-3 bg-red-500/80 rounded-full text-white hover:bg-red-500 transition-colors"
                                    >
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isCompressing}
                                className="w-full py-6 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:border-indigo-500/50 hover:text-indigo-300 hover:bg-white/5 transition-all"
                            >
                                {isCompressing ? (
                                    <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <PlusCircleIcon className="w-8 h-8 mb-2 opacity-50" />
                                        <span className="text-sm font-medium">Attach Image</span>
                                        <span className="text-[10px] opacity-60 mt-1">Auto-compressed to &lt;100KB</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>

                    <div className="flex-shrink-0">
                        <button
                            type="submit"
                            disabled={isPosting || isCompressing || (!postContent.trim() && !postImage) || !selectedDomain}
                            className="w-full py-4 px-4 bg-[var(--primary-accent)] hover:bg-indigo-500 rounded-2xl text-white font-semibold transition-all shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed tracking-wide"
                        >
                            {isPosting ? 'Transmitting...' : (isEditing ? 'Update Broadcast' : 'Initiate Broadcast')}
                        </button>
                    </div>
                </form>
            </div>
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            `}</style>
        </div>
    );
};

export default CreatePostModal;
