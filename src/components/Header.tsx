import React, { useState, useEffect } from 'react';
import {
  Copy,
  Check,
  Users,
  Plus,
  ShieldCheck,
  Terminal,
  LogOut,
  LogIn,
  UserCheck,
  Mail,
  Building2,
  Sparkles,
  CheckCircle2
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'simulator' | 'code' | 'firebase' | 'advisor' | 'columns' | 'guide';
  setActiveTab: (tab: 'simulator' | 'code' | 'firebase' | 'advisor' | 'columns' | 'guide') => void;
  onCopyCode: () => void;
  copied: boolean;
  isFullWidth: boolean;
  setIsFullWidth: (val: boolean) => void;
}

export interface ConnectedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  branch: string;
  status: 'active' | 'editing' | 'idle';
  activeCell: string;
  avatarColor: string;
}

const PRESET_GINZA_ACCOUNTS = [
  {
    name: 'Tushar Padavi',
    email: 'tushpadavi1@gmail.com',
    role: 'FMS Admin & Automation Lead',
    branch: 'Delhi / Mumbai',
    avatarColor: 'bg-teal-600'
  },
  {
    name: 'MIS Mumbai',
    email: 'mis.mumbai@ginzalimited.com',
    role: 'Operations & FMS Lead',
    branch: 'Mumbai Central',
    avatarColor: 'bg-emerald-600'
  },
  {
    name: 'Delhi Branch',
    email: 'delhi@ginzalimited.com',
    role: 'Branch Dispatch & O.N Team',
    branch: 'New Delhi',
    avatarColor: 'bg-blue-600'
  },
  {
    name: 'Lalit Maroo',
    email: 'lalit.maroo@ginzalimited.com',
    role: 'Sales Manager (Delhi)',
    branch: 'Delhi Branch',
    avatarColor: 'bg-indigo-600'
  },
  {
    name: 'Viren Shah',
    email: 'viren.shah@ginzalimited.com',
    role: 'Order Approval Authority',
    branch: 'HO Surat',
    avatarColor: 'bg-purple-600'
  }
];

/**
 * Extracts the proper uppercase first English alphabet letter (A-Z) from Name or Email
 * Exactly like Google Sheets displays M, T, D, L, V in the top active user bar.
 */
export function getProperInitial(name?: string, email?: string): string {
  const raw = (name && name.trim() ? name.trim() : email && email.trim() ? email.trim() : 'U');
  const match = raw.match(/[a-zA-Z]/);
  return match ? match[0].toUpperCase() : 'U';
}

export const Header: React.FC<HeaderProps> = ({
  onCopyCode,
  copied,
  isFullWidth
}) => {
  // Authentication gate state: opens Login Box before entering sheet if not yet authenticated in this session
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('ginza_fms_auth_session_v2') === 'true';
    } catch (e) {
      return false;
    }
  });

  // Current Logged-in Google User
  const [currentUser, setCurrentUser] = useState<{
    name: string;
    email: string;
    role: string;
    branch: string;
    avatarColor: string;
  }>(() => {
    try {
      const saved = localStorage.getItem('ginza_google_user_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      name: 'Tushar Padavi',
      email: 'tushpadavi1@gmail.com',
      role: 'FMS Admin & Automation Lead',
      branch: 'Delhi / Mumbai',
      avatarColor: 'bg-teal-600'
    };
  });

  // Login Modal Form State
  const [loginName, setLoginName] = useState(currentUser.name);
  const [loginEmail, setLoginEmail] = useState(currentUser.email);
  const [loginBranch, setLoginBranch] = useState(currentUser.branch);
  const [loginRole, setLoginRole] = useState(currentUser.role);
  const [loginColor, setLoginColor] = useState(currentUser.avatarColor || 'bg-teal-600');

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showConnectedUsersModal, setShowConnectedUsersModal] = useState(false);
  const [showVercelFixModal, setShowVercelFixModal] = useState(false);
  const [hoveredAvatarId, setHoveredAvatarId] = useState<string | null>(null);
  const [newInviteEmail, setNewInviteEmail] = useState('');
  const [copiedGitCmd, setCopiedGitCmd] = useState(false);

  // Live Connected Team Member IDs (Google Sheets-style real-time presence)
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([
    {
      id: 'usr_active_you',
      name: `${currentUser.name} (You)`,
      email: currentUser.email,
      role: currentUser.role,
      branch: currentUser.branch,
      status: 'active',
      activeCell: 'Active on Sheet',
      avatarColor: currentUser.avatarColor || 'bg-teal-600'
    },
    {
      id: 'usr_mis',
      name: 'MIS Mumbai',
      email: 'mis.mumbai@ginzalimited.com',
      role: 'Operations & FMS Lead',
      branch: 'Mumbai Central',
      status: 'active',
      activeCell: 'Col AN (Status)',
      avatarColor: 'bg-emerald-600'
    },
    {
      id: 'usr_delhi',
      name: 'Delhi Branch',
      email: 'delhi@ginzalimited.com',
      role: 'Branch Dispatch & O.N Team',
      branch: 'New Delhi',
      status: 'editing',
      activeCell: 'Col 27 (Order No)',
      avatarColor: 'bg-blue-600'
    },
    {
      id: 'usr_lalit',
      name: 'Lalit Maroo',
      email: 'lalit.maroo@ginzalimited.com',
      role: 'Sales Manager (Delhi)',
      branch: 'Delhi Branch',
      status: 'editing',
      activeCell: 'PO 5277 (Col S)',
      avatarColor: 'bg-indigo-600'
    },
    {
      id: 'usr_viren',
      name: 'Viren Shah',
      email: 'viren.shah@ginzalimited.com',
      role: 'Order Approval Authority',
      branch: 'HO Surat',
      status: 'active',
      activeCell: 'Col V (Approval)',
      avatarColor: 'bg-purple-600'
    }
  ]);

  // Keep the first connected user synced with the logged-in user
  useEffect(() => {
    setConnectedUsers(prev => {
      const others = prev.filter(
        u => u.id !== 'usr_active_you' && u.email.toLowerCase() !== currentUser.email.toLowerCase()
      );
      const activeEntry: ConnectedUser = {
        id: 'usr_active_you',
        name: `${currentUser.name} (You)`,
        email: currentUser.email,
        role: currentUser.role,
        branch: currentUser.branch,
        status: 'active',
        activeCell: 'Active Session (Viewing / Editing)',
        avatarColor: currentUser.avatarColor || 'bg-teal-600'
      };
      return [activeEntry, ...others];
    });
  }, [currentUser]);

  const handleCompleteLogin = (userObj: {
    name: string;
    email: string;
    role: string;
    branch: string;
    avatarColor: string;
  }) => {
    setCurrentUser(userObj);
    try {
      localStorage.setItem('ginza_google_user_v2', JSON.stringify(userObj));
      sessionStorage.setItem('ginza_fms_auth_session_v2', 'true');
    } catch (e) {}
    setIsAuthenticated(true);
    setShowProfileMenu(false);
  };

  const handleLoginFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = loginEmail.trim() || 'user@ginzalimited.com';
    const fallbackName = cleanEmail.split('@')[0].replace(/[._-]/g, ' ');
    const cleanName = loginName.trim() || fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1);

    handleCompleteLogin({
      name: cleanName,
      email: cleanEmail,
      role: loginRole.trim() || 'Sheet Editor',
      branch: loginBranch.trim() || 'Delhi Branch',
      avatarColor: loginColor || 'bg-teal-600'
    });
  };

  const handleSignOutOrSwitchUser = () => {
    setLoginName(currentUser.name);
    setLoginEmail(currentUser.email);
    setLoginBranch(currentUser.branch);
    setLoginRole(currentUser.role);
    setLoginColor(currentUser.avatarColor || 'bg-teal-600');
    try {
      sessionStorage.removeItem('ginza_fms_auth_session_v2');
    } catch (e) {}
    setShowProfileMenu(false);
    setIsAuthenticated(false);
  };

  const handleAddConnectedUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInviteEmail.trim()) return;
    const namePart = newInviteEmail.split('@')[0].replace(/[._-]/g, ' ');
    const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);

    const palette = ['bg-rose-600', 'bg-amber-600', 'bg-cyan-600', 'bg-fuchsia-600', 'bg-emerald-600'];
    const randomColor = palette[connectedUsers.length % palette.length];

    const newUser: ConnectedUser = {
      id: `usr_${Date.now()}`,
      name: formattedName,
      email: newInviteEmail.trim().toLowerCase(),
      role: 'Sheet Viewer & Editor',
      branch: 'Connected Device',
      status: 'active',
      activeCell: 'Viewing Automation Grid',
      avatarColor: randomColor
    };

    setConnectedUsers(prev => [...prev, newUser]);
    setNewInviteEmail('');
  };

  const handleCopyGitCommand = () => {
    const cmd = `git add package.json .npmrc vercel.json\ngit commit -m "fix: resolve vercel esbuild peer dependency"\ngit push origin main`;
    navigator.clipboard.writeText(cmd).then(() => {
      setCopiedGitCmd(true);
      setTimeout(() => setCopiedGitCmd(false), 2500);
    });
  };

  const activeInitial = getProperInitial(currentUser.name, currentUser.email);

  return (
    <>
      {/* 0. PRE-OPEN AUTHENTICATION LOGIN GATE MODAL (Shows before opening the sheet) */}
      {!isAuthenticated && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Top Ginza Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 px-6 py-5 text-white flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-3.5">
                <div className="h-12 px-2.5 py-1 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-md shrink-0">
                  <img
                    src="https://www.ginzalimited.com/cdn/shop/files/Ginza_logo.jpg?v=1668509673&width=500"
                    alt="Ginza Industries Limited"
                    className="h-9 w-auto object-contain"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-bold">
                    Google Sheet Authentication
                  </span>
                  <h2 className="text-lg font-extrabold tracking-tight text-white mt-0.5">
                    Ginza FMS — New Delhi
                  </h2>
                  <p className="text-xs text-slate-300">
                    Sign in with your Google / Ginza ID to open the live sheet
                  </p>
                </div>
              </div>

              {/* Live Alphabet Preview Badge */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-11 h-11 rounded-full ${loginColor} text-white flex items-center justify-center font-extrabold text-lg shadow-lg ring-2 ring-white`}
                  title="Your Google Sheet Active Alphabet Avatar"
                >
                  {getProperInitial(loginName, loginEmail)}
                </div>
                <span className="text-[10px] text-emerald-300 font-mono mt-1 font-semibold">
                  Active ID: {getProperInitial(loginName, loginEmail)}
                </span>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Quick 1-Click Ginza Account Selector (Shows M, T, D, L, V alphabets) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Quick Select Active Google Sheet ID (Click to Login Directly):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PRESET_GINZA_ACCOUNTS.map((acc) => {
                    const letter = getProperInitial(acc.name, acc.email);
                    const isSelected = loginEmail.toLowerCase() === acc.email.toLowerCase();
                    return (
                      <button
                        key={acc.email}
                        type="button"
                        onClick={() => handleCompleteLogin(acc)}
                        className={`flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50/90 border-emerald-500 ring-1 ring-emerald-500 shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full ${acc.avatarColor} text-white flex items-center justify-center font-extrabold text-sm shrink-0 shadow-xs ring-2 ring-white`}
                        >
                          {letter}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-slate-900 truncate">{acc.name}</span>
                            <span className="text-[10px] font-mono font-extrabold px-1.5 py-0.2 rounded bg-white text-slate-700 border border-slate-200">
                              {letter}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono truncate">{acc.email}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="relative flex py-0.5 items-center">
                <div className="grow border-t border-slate-200"></div>
                <span className="shrink mx-3 text-[11px] font-semibold text-slate-400 uppercase">
                  Or Enter Your Custom Google ID
                </span>
                <div className="grow border-t border-slate-200"></div>
              </div>

              {/* Manual Login Form */}
              <form onSubmit={handleLoginFormSubmit} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Your Name (Determines Alphabet Badge):
                    </label>
                    <div className="relative">
                      <UserCheck className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={loginName}
                        onChange={(e) => setLoginName(e.target.value)}
                        placeholder="e.g. Tushar / MIS / Delhi"
                        className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Google Email ID:
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="e.g. user@ginzalimited.com"
                        className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-slate-900"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Branch / Department:
                    </label>
                    <div className="relative">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={loginBranch}
                        onChange={(e) => setLoginBranch(e.target.value)}
                        placeholder="e.g. New Delhi / Mumbai"
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Badge Color (Google Sheet Style):
                    </label>
                    <div className="flex items-center gap-2 pt-1">
                      {[
                        { cls: 'bg-teal-600', label: 'Teal' },
                        { cls: 'bg-emerald-600', label: 'Green' },
                        { cls: 'bg-blue-600', label: 'Blue' },
                        { cls: 'bg-indigo-600', label: 'Indigo' },
                        { cls: 'bg-purple-600', label: 'Purple' },
                        { cls: 'bg-rose-600', label: 'Red' },
                        { cls: 'bg-amber-600', label: 'Amber' }
                      ].map((c) => (
                        <button
                          key={c.cls}
                          type="button"
                          onClick={() => setLoginColor(c.cls)}
                          className={`w-6 h-6 rounded-full ${c.cls} text-white font-bold text-[11px] flex items-center justify-center cursor-pointer transition-transform ${
                            loginColor === c.cls ? 'ring-2 ring-offset-2 ring-slate-900 scale-110' : 'opacity-75 hover:opacity-100'
                          }`}
                          title={c.label}
                        >
                          {getProperInitial(loginName, loginEmail)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 text-xs transition-all cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>
                      Login &amp; Open Sheet as "{getProperInitial(loginName, loginEmail)}" ({loginName || loginEmail})
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 1. MAIN HEADER NAVIGATION BAR */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-2xs">
        <div className={`mx-auto transition-all ${isFullWidth ? 'px-3 sm:px-6' : 'max-w-7xl px-4 sm:px-6 lg:px-8'}`}>
          <div className="flex items-center justify-between gap-4 h-16">
            {/* Zone 1: Ginza Logo & Wordmark */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="h-11 px-2 py-1 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-2xs overflow-hidden">
                <img
                  src="https://www.ginzalimited.com/cdn/shop/files/Ginza_logo.jpg?v=1668509673&width=500"
                  alt="Ginza Industries Limited"
                  className="h-9 w-auto object-contain"
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
                    GINZA FMS
                  </span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Delhi Branch
                  </span>
                </div>
                <span className="hidden sm:inline-block text-xs font-medium text-slate-500">
                  Product Order → Product Automation 1
                </span>
              </div>
            </div>

            {/* Zone 3: Google Sheets-Style Active Alphabet IDs & User Profile */}
            <div className="flex items-center gap-3 shrink-0">
              {/* GOOGLE SHEETS STYLE COLLABORATOR ALPHABET CIRCLES (M, T, D, L, V) */}
              <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200/90 shadow-2xs">
                <span className="hidden lg:inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 mr-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>Active IDs:</span>
                </span>

                <div className="flex items-center -space-x-1.5">
                  {connectedUsers.map((u, idx) => {
                    const initial = getProperInitial(u.name.replace(' (You)', ''), u.email);
                    const isYou = u.id === 'usr_active_you' || u.email.toLowerCase() === currentUser.email.toLowerCase();

                    return (
                      <div
                        key={u.id}
                        className="relative"
                        onMouseEnter={() => setHoveredAvatarId(u.id)}
                        onMouseLeave={() => setHoveredAvatarId(null)}
                      >
                        <button
                          type="button"
                          onClick={() => setShowConnectedUsersModal(true)}
                          className={`w-7 h-7 rounded-full ${u.avatarColor} text-white font-extrabold text-xs flex items-center justify-center transition-transform hover:scale-110 hover:z-30 cursor-pointer shadow-xs ${
                            isYou
                              ? 'ring-2 ring-emerald-400 ring-offset-1 z-20'
                              : 'ring-2 ring-white'
                          }`}
                          style={{ zIndex: isYou ? 25 : 20 - idx }}
                          title={`${initial} — ${u.name} (${u.email})`}
                        >
                          {initial}
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                              isYou ? 'bg-emerald-400' : u.status === 'editing' ? 'bg-amber-400' : 'bg-emerald-500'
                            }`}
                          />
                        </button>

                        {/* Google Sheets Hover Card */}
                        {hoveredAvatarId === u.id && (
                          <div className="absolute right-0 top-full mt-2 w-60 bg-slate-900 text-white rounded-xl p-2.5 shadow-xl border border-slate-700 z-50 text-xs pointer-events-none animate-in fade-in duration-100">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-full ${u.avatarColor} text-white font-extrabold text-sm flex items-center justify-center shrink-0 ring-2 ring-white/40`}>
                                {initial}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-white truncate flex items-center gap-1">
                                  <span>{u.name}</span>
                                  {isYou && (
                                    <span className="text-[9px] px-1 py-0.1 rounded bg-emerald-500/30 text-emerald-300 border border-emerald-400/40">
                                      ACTIVE
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-300 font-mono truncate">{u.email}</div>
                              </div>
                            </div>
                            <div className="mt-2 pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-300">
                              <span>{u.branch}</span>
                              <span className="text-emerald-400 font-mono">{u.activeCell}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Add / View All Connected IDs Button */}
                <button
                  type="button"
                  onClick={() => setShowConnectedUsersModal(true)}
                  className="ml-1 px-1.5 py-0.5 rounded-full bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 text-[10px] font-bold transition-colors cursor-pointer"
                  title="View all active Google Sheet IDs or add team member"
                >
                  +{connectedUsers.length}
                </button>
              </div>

              {/* CURRENT LOGGED-IN USER PILL (Shows Active Alphabet + Name + Switch Login Button) */}
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2 px-2 py-1 rounded-xl border border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50 transition-colors text-left cursor-pointer shadow-2xs"
                  title="Active Logged-in Google ID — Click to Switch User or Sign Out"
                >
                  <div
                    className={`w-8 h-8 rounded-full ${currentUser.avatarColor || 'bg-teal-600'} text-white flex items-center justify-center font-extrabold text-sm shadow-xs ring-2 ring-emerald-500 ring-offset-1`}
                  >
                    {activeInitial}
                  </div>
                  <div className="hidden md:block">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-extrabold text-slate-900 leading-tight">
                        {currentUser.name}
                      </span>
                      <span className="text-[9px] font-mono font-extrabold px-1 py-0.1 rounded bg-emerald-600 text-white">
                        ID: {activeInitial}
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-800 font-mono block leading-tight">
                      {currentUser.email}
                    </span>
                  </div>
                </button>

                {/* Profile Dropdown */}
                {showProfileMenu && (
                  <div className="absolute right-0 mt-1.5 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3.5 z-50 text-xs space-y-2.5">
                    <div className="pb-2.5 border-b border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-10 h-10 rounded-full ${currentUser.avatarColor || 'bg-teal-600'} text-white flex items-center justify-center font-extrabold text-base shadow-sm ring-2 ring-emerald-500`}
                        >
                          {activeInitial}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-slate-900 truncate">{currentUser.name}</span>
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                              {activeInitial}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono truncate">{currentUser.email}</div>
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between text-[11px] bg-emerald-50/70 px-2.5 py-1.5 rounded-lg border border-emerald-200/80">
                        <span className="text-emerald-800 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Active Sheet ID:
                        </span>
                        <span className="font-bold text-emerald-950">{currentUser.branch}</span>
                      </div>
                    </div>

                    {/* Quick Switch Preset IDs inside menu */}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1 mb-1">
                        Quick Switch Active ID (M, T, D, L, V):
                      </span>
                      <div className="space-y-1">
                        {PRESET_GINZA_ACCOUNTS.map((acc) => {
                          const letter = getProperInitial(acc.name, acc.email);
                          const isCurrent = acc.email.toLowerCase() === currentUser.email.toLowerCase();
                          return (
                            <button
                              key={acc.email}
                              type="button"
                              onClick={() => handleCompleteLogin(acc)}
                              className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                                isCurrent ? 'bg-emerald-50 font-bold text-emerald-950 border border-emerald-200' : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className={`w-6 h-6 rounded-full ${acc.avatarColor} text-white font-extrabold text-[11px] flex items-center justify-center shrink-0`}>
                                  {letter}
                                </div>
                                <div className="truncate">
                                  <span className="block text-xs leading-tight truncate">{acc.name}</span>
                                  <span className="block text-[10px] text-slate-400 font-mono truncate">{acc.email}</span>
                                </div>
                              </div>
                              {isCurrent && (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                                  Active
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-1 border-t border-slate-100 space-y-1">
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          setShowConnectedUsersModal(true);
                        }}
                        className="w-full text-left px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded-lg font-medium flex items-center gap-1.5 cursor-pointer"
                      >
                        <Users className="w-3.5 h-3.5 text-emerald-600" />
                        <span>View All Connected IDs ({connectedUsers.length})</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          setShowVercelFixModal(true);
                        }}
                        className="w-full text-left px-2 py-1.5 text-xs text-amber-700 hover:bg-amber-50 rounded-lg font-medium flex items-center gap-1.5 cursor-pointer"
                      >
                        <Terminal className="w-3.5 h-3.5 text-amber-600" />
                        <span>Vercel Build Fix Guide</span>
                      </button>

                      <button
                        onClick={handleSignOutOrSwitchUser}
                        className="w-full text-left px-2 py-1.5 text-xs text-rose-700 hover:bg-rose-50 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5 text-rose-600" />
                        <span>Open Login Box / Switch Custom ID</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Copy Script CTA */}
              <button
                onClick={onCopyCode}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap shadow-xs cursor-pointer ${
                  copied
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-emerald-700 text-white hover:bg-emerald-800'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Script</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* MODAL: LIVE CONNECTED USERS LIST & INVITE */}
      {showConnectedUsersModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 text-slate-900 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Google Sheet Active Collaborator IDs ({connectedUsers.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Proper Alphabet Avatars (M, T, D, L, V) showing who is currently active on the sheet
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowConnectedUsersModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* List of Connected Users */}
            <div className="space-y-2">
              {connectedUsers.map(u => {
                const initial = getProperInitial(u.name.replace(' (You)', ''), u.email);
                const isYou = u.id === 'usr_active_you' || u.email.toLowerCase() === currentUser.email.toLowerCase();
                return (
                  <div
                    key={u.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                      isYou
                        ? 'bg-emerald-50/70 border-emerald-300'
                        : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full ${u.avatarColor} text-white flex items-center justify-center font-extrabold text-sm shadow-xs ring-2 ring-white`}>
                        {initial}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-slate-900">{u.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-800 font-mono font-bold">
                            Alphabet: {initial}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-semibold">
                            {u.branch}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">{u.email}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        {isYou ? 'Active (You)' : u.status === 'editing' ? 'Live Editing' : 'Online'}
                      </span>
                      <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                        {u.activeCell}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add / Invite Google ID form */}
            <form onSubmit={handleAddConnectedUser} className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Add Team Colleague's Google Account ID:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={newInviteEmail}
                  onChange={e => setNewInviteEmail(e.target.value)}
                  placeholder="e.g. colleague@ginzalimited.com"
                  className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors whitespace-nowrap shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Connect ID</span>
                </button>
              </div>
            </form>

            <div className="bg-slate-100 p-3 rounded-xl text-xs text-slate-600 flex items-center justify-between gap-2">
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Just like Google Sheets, the top bar displays the first alphabet letter (M, T, D, L, V) of every active user ID.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowConnectedUsersModal(false);
                  handleSignOutOrSwitchUser();
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shrink-0 cursor-pointer"
              >
                Switch My Login ID
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VERCEL ERESOLVE BUILD FIX DETAILS */}
      {showVercelFixModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 text-slate-900 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Vercel Build Error Fix Applied!
                  </h3>
                  <p className="text-xs text-slate-500">
                    Solving: <code className="text-rose-600 font-mono text-[11px]">ERESOLVE esbuild@0.25 vs vite@8.3</code>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowVercelFixModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-xs text-rose-900 space-y-1">
              <span className="font-bold block">Kyun aaya yeh error Vercel par?</span>
              <p>
                Aapke Vercel build log me:
                <br />
                <code className="bg-rose-100 px-1 py-0.5 rounded text-[11px] font-mono">
                  Could not resolve dependency: peerOptional esbuild@"^0.27.0 || ^0.28.0" from vite@8.3.5
                </code>
              </p>
              <p>
                Vercel ka default npm strict peer dependency check karta hai. Root devDependencies me purana <code>esbuild 0.25</code> tha jabki Vite 8 ko esbuild 0.27+ chahiye.
              </p>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Hamne Codebase me Yeh 3 Fixes Kar Diye Hain:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
                  <span className="font-bold text-emerald-900 block">1. package.json</span>
                  <span className="text-[11px] text-emerald-700">Conflicting esbuild devDependency hata di gayi</span>
                </div>
                <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
                  <span className="font-bold text-emerald-900 block">2. .npmrc</span>
                  <span className="text-[11px] text-emerald-700"><code>legacy-peer-deps=true</code> add kiya gaya</span>
                </div>
                <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
                  <span className="font-bold text-emerald-900 block">3. vercel.json</span>
                  <span className="text-[11px] text-emerald-700">Vite build &amp; dist directory lock kar di</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-mono text-[11px]">
                  Apne terminal par yeh 3 lines run karein aur push karein:
                </span>
                <button
                  onClick={handleCopyGitCommand}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copiedGitCmd ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedGitCmd ? 'Copied Command!' : 'Copy Git Commands'}</span>
                </button>
              </div>
              <pre className="font-mono text-emerald-400 text-xs overflow-x-auto p-2 bg-slate-950 rounded">
                git add package.json .npmrc vercel.json
                <br />
                git commit -m "fix: resolve vercel esbuild peer dependency"
                <br />
                git push origin main
              </pre>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
