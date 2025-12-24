import React, { useState } from 'react';
import { ViewState, ViewType, Theme } from '../types';
import { BackIcon, LogoutIcon, HeartIcon, BellIcon, EyeIcon, EyeOffIcon, TrashIcon, GlobeIcon, SettingsIcon } from './icons';
import { auth } from '../lib/firebaseClient';
import { signOut } from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

interface SettingsViewProps {
    setCurrentView: (view: ViewState) => void;
}

const Toggle: React.FC<{ checked: boolean; onChange: (val: boolean) => void }> = ({ checked, onChange }) => (
    <button
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full transition-colors relative ${checked ? 'bg-[var(--primary-accent)]' : 'bg-white/10'}`}
    >
        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mb-8 animated-section">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 pl-2">{title}</h2>
        <div className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5 shadow-lg">
            {children}
        </div>
    </section>
);

const SettingsRow: React.FC<{
    icon?: React.ReactNode;
    label: string;
    value?: string;
    action?: React.ReactNode;
    onClick?: () => void;
    danger?: boolean;
}> = ({ icon, label, value, action, onClick, danger }) => (
    <div
        onClick={onClick}
        className={`p-4 flex items-center justify-between hover:bg-white/5 transition-colors ${onClick ? 'cursor-pointer' : ''}`}
    >
        <div className="flex items-center space-x-4">
            {icon && <div className={`text-slate-400 ${danger ? 'text-red-400' : ''}`}>{icon}</div>}
            <div className="flex flex-col">
                <span className={`font-medium ${danger ? 'text-red-400' : 'text-white'}`}>{label}</span>
                {value && <span className="text-xs text-slate-500">{value}</span>}
            </div>
        </div>
        {action && <div>{action}</div>}
    </div>
);

const SettingsView: React.FC<SettingsViewProps> = ({ setCurrentView }) => {
    const { user, profile } = useAuth();
    const { theme, setTheme } = useTheme();

    // Local state for settings simulation
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [privateAccount, setPrivateAccount] = useState(profile?.is_private || false);
    const [dataSaver, setDataSaver] = useState(false);

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            setCurrentView({ type: ViewType.Auth });
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    return (
        <div className="w-full h-full flex flex-col bg-[#050505] text-white overflow-y-auto custom-scrollbar relative font-['Inter']">
            {/* Header */}
            <div className="sticky top-0 left-0 right-0 p-6 flex items-center z-20 bg-[#050505]/80 backdrop-blur-md border-b border-white/5">
                <button
                    onClick={() => setCurrentView({ type: ViewType.Profile, userId: user?.uid })}
                    className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors mr-4 text-slate-400 hover:text-white"
                >
                    <BackIcon className="w-6 h-6" />
                </button>
                <h1 className="text-xl font-bold uppercase tracking-widest flex items-center gap-2">
                    <SettingsIcon className="w-5 h-5 text-[var(--primary-accent)]" />
                    Settings
                </h1>
            </div>

            <div className="p-6 max-w-2xl mx-auto w-full pb-20">

                <Section title="Account">
                    <SettingsRow
                        label="Email"
                        value={user?.email || 'Guest'}
                        icon={<div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold">@</div>}
                    />
                    <SettingsRow
                        label="Username"
                        value={`@${profile?.username || 'user'}`}
                        icon={<div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold">#</div>}
                    />
                    <SettingsRow
                        label="Privacy Mode"
                        value="Only followers can see your posts"
                        icon={privateAccount ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                        action={<Toggle checked={privateAccount} onChange={setPrivateAccount} />}
                    />
                </Section>

                <Section title="Interface & Sound">
                    <SettingsRow
                        label="Theme"
                        value={`Current: ${theme.charAt(0).toUpperCase() + theme.slice(1)}`}
                        icon={<GlobeIcon className="w-5 h-5" />}
                        action={
                            <select
                                value={theme}
                                onChange={(e) => setTheme(e.target.value as Theme)}
                                className="bg-[#111] border border-white/10 rounded-lg text-xs p-2 text-white focus:outline-none focus:border-[var(--primary-accent)] uppercase font-bold"
                            >
                                <option value="hyle">Hyle</option>
                                <option value="nebula">Nebula</option>
                                <option value="zen">Zen</option>
                                <option value="midnight">Midnight</option>
                                <option value="studio">Studio</option>
                            </select>
                        }
                    />
                    <SettingsRow
                        label="System Sounds"
                        value="Interface interaction sounds"
                        icon={<BellIcon className="w-5 h-5" />}
                        action={<Toggle checked={soundEnabled} onChange={setSoundEnabled} />}
                    />
                    <SettingsRow
                        label="Reduce Motion"
                        value="Minimize animations"
                        icon={<EyeOffIcon className="w-5 h-5" />}
                        action={<Toggle checked={dataSaver} onChange={setDataSaver} />}
                    />
                </Section>

                <Section title="Notifications">
                    <SettingsRow
                        label="Push Notifications"
                        value="Pause all notifications"
                        icon={<BellIcon className="w-5 h-5" />}
                        action={<Toggle checked={notificationsEnabled} onChange={setNotificationsEnabled} />}
                    />
                    <SettingsRow
                        label="Email Digests"
                        value="Weekly summary"
                        icon={<div className="w-5 h-5 text-center font-serif italic text-xs">A</div>}
                        action={<Toggle checked={false} onChange={() => { }} />}
                    />
                </Section>

                <Section title="Privacy & Safety">
                    <SettingsRow
                        label="Blocked Accounts"
                        value="Manage blocked users"
                        icon={<div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold">×</div>}
                        onClick={() => alert("Blocked accounts management coming soon.")}
                    />
                    <SettingsRow
                        label="Activity Status"
                        value="Show when you are active"
                        icon={<div className="w-2 h-2 rounded-full bg-green-500"></div>}
                        action={<Toggle checked={true} onChange={() => { }} />}
                    />
                </Section>

                <Section title="Content Preferences">
                    <SettingsRow
                        label="Language"
                        value="English (US)"
                        icon={<GlobeIcon className="w-5 h-5" />}
                        action={
                            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">EN</div>
                        }
                    />
                    <SettingsRow
                        label="Autoplay Videos"
                        value="Play videos automatically"
                        icon={<div className="w-5 h-5 text-center font-bold">▶</div>}
                        action={<Toggle checked={dataSaver} onChange={setDataSaver} />}
                    />
                </Section>

                <Section title="Support">
                    <SettingsRow
                        label="Help Center"
                        value="FAQ and Contact"
                        icon={<div className="w-5 h-5 text-center font-serif text-lg">?</div>}
                        onClick={() => window.open('https://spark.ai/help', '_blank')}
                    />
                    <SettingsRow
                        label="Report a Problem"
                        value="Bug reports and feedback"
                        icon={<div className="w-5 h-5 text-center text-red-400 font-bold">!</div>}
                        onClick={() => alert("Report form coming soon.")}
                    />
                </Section>

                <Section title="Harix Industries">
                    <SettingsRow
                        label="Our Story"
                        value="The origin of Spark.AI"
                        icon={<div className="w-5 h-5 text-center font-bold text-[var(--primary-accent)]">S</div>}
                        onClick={() => alert("Harix Industries: Building the future of digital interplay. Details coming soon.")}
                    />
                    <SettingsRow
                        label="Vision"
                        value="What lies beyond"
                        icon={<EyeIcon className="w-5 h-5 text-[var(--primary-accent)]" />}
                        onClick={() => alert("Vision: To create a seamless fabric of thought and connection. Details coming soon.")}
                    />
                    <SettingsRow
                        label="Team"
                        value="The architects"
                        icon={<div className="w-5 h-5 flex items-center justify-center space-x-0.5"><div className="w-1 h-1 bg-white rounded-full"></div><div className="w-1 h-1 bg-white rounded-full"></div><div className="w-1 h-1 bg-white rounded-full"></div></div>}
                        onClick={() => alert("Team: A collective of dreamers and engineers. Details coming soon.")}
                    />
                </Section>

                <Section title="Data & Storage">
                    <SettingsRow
                        label="Clear Cache"
                        value="Free up local space (12MB)"
                        icon={<TrashIcon className="w-5 h-5" />}
                        onClick={() => alert("Cache cleared.")}
                        danger
                    />
                </Section>

                <div className="mt-8">
                    <button
                        onClick={handleSignOut}
                        className="w-full p-4 flex items-center justify-center space-x-3 bg-red-500/5 border border-red-500/20 rounded-2xl text-red-400 font-bold uppercase tracking-wider hover:bg-red-500/10 hover:text-red-300 transition-all shadow-[0_4px_20px_-5px_rgba(239,68,68,0.2)] active:scale-[0.99]"
                    >
                        <LogoutIcon className="w-5 h-5" />
                        <span>Disconnect Signal</span>
                    </button>
                    <div className="mt-8 text-center space-y-2 opacity-50">
                        <div className="w-8 h-8 mx-auto border-2 border-slate-700/50 rounded-full flex items-center justify-center mb-4">
                            <span className="font-serif font-black text-xs text-slate-500">H</span>
                        </div>
                        <p className="text-[10px] text-slate-600 font-mono tracking-widest uppercase">Hyle Systems v0.9.4 (Beta)</p>
                        <p className="text-[10px] text-slate-700 font-mono">Engineered by Harix Industries</p>
                    </div>
                </div>

            </div>
            <style>{`
                .animated-section {
                    animation: slide-up-fade 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
                    opacity: 0;
                    transform: translateY(20px);
                }
                .animated-section:nth-child(1) { animation-delay: 100ms; }
                .animated-section:nth-child(2) { animation-delay: 200ms; }
                .animated-section:nth-child(3) { animation-delay: 300ms; }
                .animated-section:nth-child(4) { animation-delay: 400ms; }
                @keyframes slide-up-fade {
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default SettingsView;
