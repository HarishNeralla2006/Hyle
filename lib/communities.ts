// You might need to import specific icons or just use strings if we Map them later.
// For simplicity in this config, we'll use string IDs for icons and map them in the UI.

export interface Community {
    id: string;
    name: string;
    description: string;
    tags: string[]; // The "Smart" part: tags/subreddits that feed this community
    themeColor: string;
    iconId: 'flame' | 'chip' | 'palette' | 'globe' | 'atom' | 'music';
}

export const COMMUNITIES: Community[] = [
    {
        id: 'indie-forge',
        name: 'The Indie Forge',
        description: 'Where pixel dreams are hammered into reality.',
        tags: ['indiegaming', 'gamedev', 'pixelart', 'devlog', 'independent games'],
        themeColor: '#FFD820', // Yellow
        iconId: 'flame'
    },
    {
        id: 'silicon-horizon',
        name: 'Silicon Horizon',
        description: 'The bleeding edge of hardware and code.',
        tags: ['technology', 'hardware', 'cybersecurity', 'programming', 'webdev', 'linux'],
        themeColor: '#00F0FF', // Cyan
        iconId: 'chip'
    },
    {
        id: 'prism-gallery',
        name: 'Prism Gallery',
        description: 'Visual noise signal. Art, design, and aesthetics.',
        tags: ['art', 'design', 'digitalart', 'cinema', 'photography'],
        themeColor: '#FF0055', // Pink
        iconId: 'palette'
    },
    {
        id: 'quantum-realm',
        name: 'Quantum Realm',
        description: 'Unpacking the universe, one atom at a time.',
        tags: ['science', 'physics', 'space', 'chemistry', 'biology'],
        themeColor: '#7000FF', // Purple
        iconId: 'atom'
    }
];
