import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  Send, Search, Plus, User, LogOut, Sparkles, MessageSquare, PlusCircle, AlertCircle, RefreshCw, Users, ShieldAlert, Ghost, Smile, X, ArrowLeft
} from 'lucide-react';

// Dynamic API URL Helper
const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  const origin = window.location.origin;
  if (origin.includes('localhost:5173') || origin.includes('127.0.0.1:5173')) {
    return 'http://localhost:3000';
  }
  return origin;
};

const API_URL = getApiUrl();

interface UserProfile {
  id: number;
  username: string;
  email: string;
  avatarUrl: string | null;
  moodEmoji: string | null;
  moodText: string | null;
  isAnonymousMode: boolean;
  anonymousAlias: string | null;
}

interface ChatRoom {
  id: number;
  name: string | null;
  type: 'group' | 'dm';
  isPublic: boolean;
  createdBy: number;
  members: {
    role: 'admin' | 'member';
    user: UserProfile;
  }[];
}

interface ChatMessage {
  id: string;
  roomId: number;
  content: string;
  type: 'text' | 'voice' | 'poll_ref';
  isAnonymous: boolean;
  createdAt: string;
  sender: {
    id: number | null;
    username: string;
    avatarUrl: string | null;
    isAnonymousMode: boolean;
    anonymousAlias: string | null;
  };
}

export default function App() {
  // Auth states
  const [token, setToken] = useState<string | null>(localStorage.getItem('kith_token'));
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  
  // Auth Form Input
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // App Dashboard states
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [contacts, setContacts] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals & Panel Toggles
  const [newChatModalOpen, setNewChatModalOpen] = useState(false);
  const [newGroupModalOpen, setNewGroupModalOpen] = useState(false);
  const [moodModalOpen, setMoodModalOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);

  // Input states
  const [messageInput, setMessageInput] = useState('');
  const [sendAnonymously, setSendAnonymously] = useState(false);
  
  // Group creation selections
  const [groupName, setGroupName] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);

  // Mood update inputs
  const [selectedEmoji, setSelectedEmoji] = useState('😊');
  const [customVibeText, setCustomVibeText] = useState('');

  // AI & Typing States
  const [toneResult, setToneResult] = useState<{ tone: string; severity: 'warning' | 'alert' | 'good'; explanation?: string } | null>(null);
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<{ userId: number; username: string }[]>([]);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Ref handles
  const socketRef = useRef<Socket | null>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  // 1. Fetch Current Profile if Token Exists
  useEffect(() => {
    if (token) {
      fetch(`${API_URL}/api/users/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(async (res) => {
        if (res.ok) {
          const profile = await res.json();
          setUser(profile);
        } else {
          handleLogout();
        }
      })
      .catch(() => handleLogout());
    } else {
      setUser(null);
    }
  }, [token]);

  // 2. Fetch Dashboard Data (Rooms & Contacts)
  const fetchDashboardData = async () => {
    if (!token) return;
    try {
      // Fetch Rooms
      const roomsRes = await fetch(`${API_URL}/api/rooms`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (roomsRes.ok) {
        const roomsData = await roomsRes.json();
        setRooms(roomsData);
      }
      
      // Fetch Contacts
      const contactsRes = await fetch(`${API_URL}/api/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (contactsRes.ok) {
        const contactsData = await contactsRes.json();
        setContacts(contactsData);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    }
  };

  useEffect(() => {
    if (token && user) {
      fetchDashboardData();
    }
  }, [token, user]);

  // 3. Socket.IO Connection & Setup
  useEffect(() => {
    if (!token || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Connect to WebSocket Server
    const socket = io(API_URL, {
      auth: { token }
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 Socket connected successfully');
      // Rejoin rooms on connect
      rooms.forEach((r) => socket.emit('join_room', { roomId: r.id }));
    });

    // Handle Incoming Messages
    socket.on('new_message', (msg: ChatMessage) => {
      setMessages((prev) => {
        // Avoid duplicate rendering
        if (prev.some((m) => m.id === msg.id)) return prev;
        if (msg.roomId === activeRoom?.id) {
          return [...prev, msg];
        }
        return prev;
      });

      // Update last message in the room list locally
      setRooms((prevRooms) => {
        return prevRooms.map((room) => {
          if (room.id === msg.roomId) {
            // We store the message content for preview
            return {
              ...room,
              lastMessage: msg
            } as any;
          }
          return room;
        });
      });
    });

    // Handle Typing Indicators
    socket.on('typing_indicator', (data: { userId: number; username: string; roomId: number; isTyping: boolean }) => {
      if (data.roomId !== activeRoom?.id) return;
      
      setTypingUsers((prev) => {
        if (data.isTyping) {
          if (prev.some((u) => u.userId === data.userId)) return prev;
          return [...prev, { userId: data.userId, username: data.username }];
        } else {
          return prev.filter((u) => u.userId !== data.userId);
        }
      });
    });

    // Handle Mood Updates Live
    socket.on('mood_updated', (data: { userId: number; moodEmoji: string | null; moodText: string | null }) => {
      // Update room member list moods live
      setRooms((prevRooms) => {
        return prevRooms.map((room) => {
          const updatedMembers = room.members.map((m) => {
            if (m.user.id === data.userId) {
              return {
                ...m,
                user: {
                  ...m.user,
                  moodEmoji: data.moodEmoji,
                  moodText: data.moodText
                }
              };
            }
            return m;
          });
          return { ...room, members: updatedMembers };
        });
      });

      if (activeRoom) {
        const updatedMembers = activeRoom.members.map((m) => {
          if (m.user.id === data.userId) {
            return {
              ...m,
              user: {
                ...m.user,
                moodEmoji: data.moodEmoji,
                moodText: data.moodText
              }
            };
          }
          return m;
        });
        setActiveRoom({ ...activeRoom, members: updatedMembers });
      }
    });

    // Handle AI Summaries
    socket.on('ai_summary_ready', (data: { roomId: number; summary: string }) => {
      if (data.roomId === activeRoom?.id) {
        setAiSummary(data.summary);
        setSummaryLoading(false);
      }
    });

    // Handle AI Smart Replies
    socket.on('smart_replies_ready', (data: { messageId: string; suggestions: string[] }) => {
      // Only set smart replies if they relate to the last message in active room
      setSmartReplies(data.suggestions);
    });

    // Join all rooms
    rooms.forEach((r) => {
      socket.emit('join_room', { roomId: r.id });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, user, rooms, activeRoom]);

  // 4. Fetch Message History when room changes
  useEffect(() => {
    if (!token || !activeRoom) {
      setMessages([]);
      setSmartReplies([]);
      setAiSummary(null);
      return;
    }

    // Load message history from DB
    fetch(`${API_URL}/api/rooms/${activeRoom.id}/messages`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(async (res) => {
      if (res.ok) {
        const result = await res.json();
        // Backend returns Paginated result: { data: ChatMessage[], nextCursor: string | null }
        setMessages(result.data.reverse());
      }
    })
    .catch((err) => console.error('Error fetching messages:', err));

    // Clear typing states
    setTypingUsers([]);
    setSmartReplies([]);
    setAiSummary(null);

    // Join socket room explicitly
    if (socketRef.current) {
      socketRef.current.emit('join_room', { roomId: activeRoom.id });
    }
  }, [activeRoom, token]);

  // 5. Scroll chat to bottom on new messages
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  // 6. Debounced Real-Time AI Tone Checker
  useEffect(() => {
    if (!messageInput.trim() || !token) {
      setToneResult(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/api/ai/tone-check`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ content: messageInput })
        });
        if (res.ok) {
          const result = await res.json();
          setToneResult(result);
        }
      } catch (err) {
        console.error('Error checking tone:', err);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [messageInput, token]);

  // 7. Handles user typing broadcast
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);

    if (socketRef.current && activeRoom) {
      // Start typing broadcast
      socketRef.current.emit('typing_start', { roomId: activeRoom.id });

      // Debounce typing stop
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current?.emit('typing_stop', { roomId: activeRoom.id });
      }, 2000);
    }
  };

  // 8. Auth Operations
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const body = authMode === 'login' 
      ? { email: emailInput, password: passwordInput }
      : { username: usernameInput, email: emailInput, password: passwordInput };

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Success: Save token & setup state
      if (authMode === 'login') {
        localStorage.setItem('kith_token', data.accessToken);
        setToken(data.accessToken);
      } else {
        // After register, automatically switch to login page
        setAuthMode('login');
        setAuthError('Registration successful! Please log in.');
      }
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('kith_token');
    setToken(null);
    setUser(null);
    setActiveRoom(null);
    setRooms([]);
    setMessages([]);
  };

  // 9. Send Message Action
  const handleSendMessage = (content: string) => {
    if (!content.trim() || !socketRef.current || !activeRoom) return;

    // Send via WebSockets
    socketRef.current.emit('send_message', {
      roomId: activeRoom.id,
      content,
      type: 'text',
      isAnonymous: sendAnonymously,
      expiresIn: null // Disappearing message support
    });

    setMessageInput('');
    setSendAnonymously(false);
    setToneResult(null);
    setSmartReplies([]);
    
    // Stop typing indicator
    socketRef.current.emit('typing_stop', { roomId: activeRoom.id });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  // 10. Start a DM with a Contact
  const startDM = async (partner: UserProfile) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: 'dm',
          memberIds: [partner.id]
        })
      });

      if (res.ok) {
        const room = await res.json();
        // Re-fetch rooms to ensure list is in sync, then activate room
        await fetchDashboardData();
        setActiveRoom(room);
        setNewChatModalOpen(false);
      }
    } catch (err) {
      console.error('Error starting DM:', err);
    }
  };

  // 11. Create a new Group Chat
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !groupName.trim() || selectedMemberIds.length === 0) return;

    try {
      const res = await fetch(`${API_URL}/api/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: groupName,
          type: 'group',
          memberIds: selectedMemberIds
        })
      });

      if (res.ok) {
        const room = await res.json();
        await fetchDashboardData();
        setActiveRoom(room);
        setGroupName('');
        setSelectedMemberIds([]);
        setNewGroupModalOpen(false);
      }
    } catch (err) {
      console.error('Error creating group:', err);
    }
  };

  // 12. Toggle Anonymous Mode on Profile
  const toggleAnonymousMode = async () => {
    if (!token || !user) return;
    try {
      const res = await fetch(`${API_URL}/api/users/me/anonymous`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const updated = await res.json();
        setUser({ ...user, isAnonymousMode: updated.isAnonymousMode, anonymousAlias: updated.anonymousAlias });
      }
    } catch (err) {
      console.error('Error toggling anonymous mode:', err);
    }
  };

  // 13. Update Mood Emoji/Text
  const handleUpdateMood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !user) return;
    try {
      const res = await fetch(`${API_URL}/api/users/me/mood`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          moodEmoji: selectedEmoji,
          moodText: customVibeText
        })
      });

      if (res.ok) {
        setUser({ ...user, moodEmoji: selectedEmoji, moodText: customVibeText });
        setMoodModalOpen(false);
      }
    } catch (err) {
      console.error('Error updating mood:', err);
    }
  };

  // 14. Request AI Chat Summary from Claude
  const requestSummary = async () => {
    if (!token || !activeRoom) return;
    setSummaryLoading(true);
    setSummaryOpen(true);
    setAiSummary(null);

    try {
      await fetch(`${API_URL}/api/rooms/${activeRoom.id}/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
      });
      // The worker will build the summary and push it over Socket.io ('ai_summary_ready')
    } catch (err) {
      console.error('Error requesting summary:', err);
      setSummaryLoading(false);
    }
  };

  // Get display details for a room (handling DM partner name resolution)
  const getRoomDisplayDetails = (room: ChatRoom) => {
    if (room.type === 'group') {
      return {
        name: room.name || 'Group Chat',
        avatar: '👥',
        statusText: `${room.members.length} members`
      };
    }

    // It's a DM, find the other member
    const partnerMember = room.members.find((m) => m.user.id !== user?.id);
    if (!partnerMember) {
      return {
        name: 'Saved Messages (You)',
        avatar: '👤',
        statusText: 'Personal Notes'
      };
    }

    const partner = partnerMember.user;
    const displayName = partner.isAnonymousMode 
      ? partner.anonymousAlias || 'Anonymous Partner'
      : partner.username;

    const statusText = partner.moodEmoji 
      ? `${partner.moodEmoji} ${partner.moodText || ''}` 
      : 'Active Now';

    return {
      name: displayName,
      avatar: partner.avatarUrl || '👤',
      statusText: statusText
    };
  };

  // Render Login / Register screen if not authenticated
  if (!token || !user) {
    return (
      <div className="h-screen w-screen bg-charcoal paper-texture flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-parchment rounded-2xl shadow-xl border border-clay/10 p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-clay"></div>
          
          <div className="text-center mb-8">
            <h1 className="font-serif text-4xl text-charcoal font-bold flex items-center justify-center gap-2">
              <Sparkles className="text-clay w-7 h-7" /> Kith
            </h1>
            <p className="text-charcoal/60 mt-2 font-sans">
              Humanist real-time chat with AI Tone and Summaries
            </p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4 font-sans">
            {authError && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm border border-red-200">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {authMode === 'register' && (
              <div>
                <label className="block text-sm font-semibold text-charcoal/70 mb-1">Username</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alexis"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-clay/50 bg-white text-charcoal"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-charcoal/70 mb-1">Email Address</label>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-clay/50 bg-white text-charcoal"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-charcoal/70 mb-1">Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-clay/50 bg-white text-charcoal"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-clay hover:bg-clay-hover text-white rounded-lg font-bold transition duration-200 flex items-center justify-center gap-2 mt-4 shadow-sm"
            >
              {authMode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="text-center mt-6 text-sm text-charcoal/60 font-sans">
            {authMode === 'login' ? (
              <span>
                New to Kith?{' '}
                <button onClick={() => { setAuthMode('register'); setAuthError(null); }} className="text-clay font-semibold hover:underline">
                  Create an account
                </button>
              </span>
            ) : (
              <span>
                Already have an account?{' '}
                <button onClick={() => { setAuthMode('login'); setAuthError(null); }} className="text-clay font-semibold hover:underline">
                  Sign in
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Filter rooms based on search query
  const filteredRooms = rooms.filter((r) => {
    const details = getRoomDisplayDetails(r);
    return details.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="h-screen w-screen bg-slate-100 flex overflow-hidden paper-texture">
      {/* 1. LEFT SIDEBAR PANEL (WhatsApp style list) */}
      <div className="w-80 md:w-96 border-r border-slate-200/80 bg-parchment flex flex-col h-full flex-shrink-0">
        {/* User Profile Header */}
        <div className="p-4 border-b border-slate-200/80 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMoodModalOpen(true)}
              className="w-10 h-10 rounded-full bg-clay-tint hover:bg-clay/15 border border-clay/10 flex items-center justify-center text-xl transition-all shadow-inner relative group"
              title="Update your Vibe/Mood"
            >
              {user.moodEmoji || '👋'}
              <span className="absolute -bottom-1 -right-1 bg-clay text-white rounded-full p-0.5 text-[8px]">
                ⚡
              </span>
            </button>
            <div className="leading-tight text-left">
              <h3 className="font-bold text-charcoal text-sm flex items-center gap-1.5">
                {user.isAnonymousMode ? user.anonymousAlias || 'Anonymous' : user.username}
                {user.isAnonymousMode && <Ghost className="w-3.5 h-3.5 text-clay animate-pulse" />}
              </h3>
              <p className="text-xs text-charcoal/50 max-w-[140px] truncate">
                {user.moodText || 'No vibe set'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Toggle Anonymous */}
            <button
              onClick={toggleAnonymousMode}
              className={`p-2 rounded-lg border transition-all ${user.isAnonymousMode ? 'bg-clay text-white border-clay shadow-sm' : 'bg-white text-charcoal/60 hover:text-charcoal border-slate-200'}`}
              title={user.isAnonymousMode ? "Disable Ghost/Anon mode" : "Enable Ghost/Anon mode"}
            >
              <Ghost className="w-4 h-4" />
            </button>
            
            {/* New Chat */}
            <button
              onClick={() => setNewChatModalOpen(true)}
              className="p-2 rounded-lg bg-white border border-slate-200 text-charcoal/60 hover:text-charcoal hover:border-slate-300 transition-all"
              title="Start New DM"
            >
              <MessageSquare className="w-4 h-4" />
            </button>

            {/* New Group */}
            <button
              onClick={() => setNewGroupModalOpen(true)}
              className="p-2 rounded-lg bg-white border border-slate-200 text-charcoal/60 hover:text-charcoal hover:border-slate-300 transition-all"
              title="Create Group"
            >
              <Users className="w-4 h-4" />
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg bg-red-50/50 hover:bg-red-50 border border-red-100 text-red-600 transition-all"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Chats */}
        <div className="p-3 border-b border-slate-100 bg-slate-50/50">
          <div className="relative">
            <Search className="w-4 h-4 text-charcoal/40 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search or start new chat"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-clay/50 bg-white text-sm text-charcoal"
            />
          </div>
        </div>

        {/* Rooms List */}
        <div className="flex-1 overflow-y-auto">
          {filteredRooms.length === 0 ? (
            <div className="text-center py-8 text-charcoal/40 text-sm font-sans">
              No chats found. Click the message icon to start a DM!
            </div>
          ) : (
            filteredRooms.map((room) => {
              const details = getRoomDisplayDetails(room);
              const isActive = activeRoom?.id === room.id;
              const lastMsg = (room as any).lastMessage;

              return (
                <button
                  key={room.id}
                  onClick={() => setActiveRoom(room)}
                  className={`w-full p-4 flex items-center gap-3 border-b border-slate-100 text-left transition-all relative ${isActive ? 'bg-clay-tint border-l-4 border-l-clay' : 'bg-parchment hover:bg-slate-50'}`}
                >
                  <div className="w-11 h-11 rounded-full bg-clay/10 border border-clay/5 flex items-center justify-center text-xl shadow-inner">
                    {details.avatar.startsWith('http') ? (
                      <img src={details.avatar} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      details.avatar
                    )}
                  </div>
                  <div className="flex-1 min-w-0 leading-tight">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h4 className="font-bold text-charcoal truncate text-sm">
                        {details.name}
                      </h4>
                      {lastMsg && (
                        <span className="text-[10px] text-charcoal/40">
                          {new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-charcoal/50 truncate font-sans">
                      {lastMsg 
                        ? `${lastMsg.sender.username}: ${lastMsg.content}` 
                        : details.statusText}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 2. RIGHT CHAT WINDOW (WhatsApp style pane) */}
      <div className="flex-1 bg-white flex flex-col h-full relative">
        {activeRoom ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-slate-200/80 bg-white flex items-center justify-between shadow-sm z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-clay/10 flex items-center justify-center text-xl">
                  {getRoomDisplayDetails(activeRoom).avatar.startsWith('http') ? (
                    <img 
                      src={getRoomDisplayDetails(activeRoom).avatar} 
                      alt="Avatar" 
                      className="w-full h-full rounded-full object-cover" 
                    />
                  ) : (
                    getRoomDisplayDetails(activeRoom).avatar
                  )}
                </div>
                <div className="text-left leading-tight">
                  <h3 className="font-bold text-charcoal text-sm">
                    {getRoomDisplayDetails(activeRoom).name}
                  </h3>
                  <p className="text-[11px] text-charcoal/45 font-sans">
                    {typingUsers.length > 0 
                      ? `${typingUsers.map((u) => u.username).join(', ')} typing...`
                      : getRoomDisplayDetails(activeRoom).statusText}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={requestSummary}
                  className="px-3 py-1.5 rounded-lg bg-clay/10 hover:bg-clay/20 text-clay font-bold text-xs flex items-center gap-1.5 transition-all"
                  title="Generate Claude Summary"
                >
                  <Sparkles className="w-3.5 h-3.5" /> AI Pulse
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-4 relative">
              {messages.length === 0 ? (
                <div className="text-center py-12 text-charcoal/40 text-sm font-sans">
                  No messages yet. Send a message to start the conversation!
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender.id === user.id;
                  
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div 
                        className={`max-w-[70%] px-4 py-2.5 rounded-2xl shadow-sm leading-snug text-sm relative ${isMe ? 'bg-clay text-white rounded-tr-none' : 'bg-white text-charcoal border border-slate-200/50 rounded-tl-none'}`}
                      >
                        {/* Sender info (for group rooms or other users DMs) */}
                        {!isMe && (
                          <div className={`text-[10px] font-bold mb-0.5 ${msg.isAnonymous ? 'text-purple-600' : 'text-clay-hover'}`}>
                            {msg.sender.username} {msg.isAnonymous && '(Anonymous Mode)'}
                          </div>
                        )}
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        <div className={`text-[9px] text-right mt-1.5 ${isMe ? 'text-white/60' : 'text-charcoal/40'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              
              {/* Typing indicators */}
              {typingUsers.map((tu) => (
                <div key={tu.userId} className="flex justify-start items-center gap-1.5 text-xs text-charcoal/40 italic font-sans pl-2">
                  <span className="w-1.5 h-1.5 bg-clay/55 rounded-full animate-bounce"></span>
                  <span>{tu.username} is typing...</span>
                </div>
              ))}
              <div ref={messageEndRef} />
            </div>

            {/* Smart Replies Suggestions */}
            {smartReplies.length > 0 && (
              <div className="px-6 py-2 border-t border-slate-100 bg-slate-50/70 flex flex-wrap gap-2 items-center">
                <span className="text-[10px] text-charcoal/40 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Bot className="w-3.5 h-3.5 text-clay" /> Smart Replies:
                </span>
                {smartReplies.map((reply, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(reply)}
                    className="px-3 py-1 bg-white hover:bg-clay-tint border border-slate-200 hover:border-clay/30 text-charcoal text-xs rounded-full shadow-sm hover:text-clay transition-all"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            )}

            {/* Input Bar */}
            <div className="p-4 border-t border-slate-200 bg-white flex flex-col gap-2 relative">
              
              {/* AI Tone check warning banner */}
              {toneResult && toneResult.severity !== 'good' && (
                <div className="absolute -top-12 left-4 right-4 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700 shadow-md z-20">
                  <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span className="font-sans">
                    <strong>{toneResult.tone}</strong>: {toneResult.explanation || 'Tone might feel demanding. Consider softening it.'}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3">
                {/* Anonymous send checkbox */}
                <button
                  onClick={() => setSendAnonymously(!sendAnonymously)}
                  className={`p-2 rounded-lg border transition-all ${sendAnonymously ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-slate-50 text-charcoal/45 hover:text-charcoal hover:bg-slate-100 border-slate-200'}`}
                  title="Toggle Send Anonymously"
                >
                  <Ghost className="w-4 h-4" />
                </button>

                {/* Main text input */}
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={handleInputChange}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(messageInput); }}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-clay/50 bg-white text-charcoal"
                />

                <button
                  onClick={() => handleSendMessage(messageInput)}
                  disabled={!messageInput.trim()}
                  className="p-2.5 rounded-lg bg-clay hover:bg-clay-hover text-white disabled:bg-slate-200 disabled:text-slate-400 transition-all shadow-sm"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              {/* Input helpers row */}
              <div className="flex justify-between items-center px-1">
                <div className="flex gap-2">
                  {toneResult && (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${toneResult.severity === 'good' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                      {toneResult.tone}
                    </span>
                  )}
                  {sendAnonymously && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                      Sending Anonymously
                    </span>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50">
            <div className="w-full max-w-md text-center space-y-6">
              <div className="w-20 h-20 rounded-2xl bg-clay-tint border border-clay/10 flex items-center justify-center mx-auto shadow-md">
                <Sparkles className="w-10 h-10 text-clay" />
              </div>
              <h2 className="font-serif text-3xl text-charcoal font-bold">
                Welcome to Kith Chat
              </h2>
              <p className="text-charcoal/50 text-sm font-sans leading-relaxed">
                Connect and chat in real-time. Use the sidebar to update your vibe, enable ghost mode, or start a new direct message conversation with your friends.
              </p>
              <div className="flex justify-center">
                <button
                  onClick={() => setNewChatModalOpen(true)}
                  className="px-4 py-2 bg-clay hover:bg-clay-hover text-white rounded-lg font-bold text-sm transition shadow-sm flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" /> Start chatting now
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. MODALS & SLIDE-OUT PANELS */}

      {/* A. Mood / Vibe Setup Modal */}
      {moodModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-sm bg-parchment rounded-xl shadow-xl border border-clay/10 p-6 relative">
            <button 
              onClick={() => setMoodModalOpen(false)}
              className="absolute top-4 right-4 text-charcoal/40 hover:text-charcoal"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-serif text-lg text-charcoal font-bold mb-4">Update Your Vibe</h3>
            
            <form onSubmit={handleUpdateMood} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-charcoal/60 mb-1">Select Emoji</label>
                <div className="flex gap-2 justify-between">
                  {['😊', '🎧', '☕', '🚀', '🔥', '📚', '🌱', '🍿'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setSelectedEmoji(emoji)}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl border ${selectedEmoji === emoji ? 'bg-clay text-white border-clay' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-charcoal/60 mb-1">Custom Status Text</label>
                <input
                  type="text"
                  placeholder="What are you up to?"
                  value={customVibeText}
                  onChange={(e) => setCustomVibeText(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-clay/50 bg-white text-charcoal text-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-clay hover:bg-clay-hover text-white rounded-lg font-bold text-sm transition shadow-sm"
              >
                Save Vibe Status
              </button>
            </form>
          </div>
        </div>
      )}

      {/* B. New DM Modal */}
      {newChatModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-sm bg-parchment rounded-xl shadow-xl border border-clay/10 p-6 max-h-[80vh] flex flex-col relative">
            <button 
              onClick={() => setNewChatModalOpen(false)}
              className="absolute top-4 right-4 text-charcoal/40 hover:text-charcoal"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-serif text-lg text-charcoal font-bold mb-4">Start a DM</h3>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {contacts.length === 0 ? (
                <div className="text-center py-8 text-charcoal/40 text-sm">
                  No contacts found. Register another user to start a DM!
                </div>
              ) : (
                contacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => startDM(contact)}
                    className="w-full p-3 bg-white hover:bg-clay-tint border border-slate-200 hover:border-clay/20 rounded-lg text-left flex items-center gap-3 transition-all"
                  >
                    <div className="w-8 h-8 rounded-full bg-clay/10 flex items-center justify-center text-sm font-bold text-clay">
                      {contact.moodEmoji || '👤'}
                    </div>
                    <div>
                      <h4 className="font-bold text-charcoal text-sm">
                        {contact.isAnonymousMode ? contact.anonymousAlias || 'Anonymous' : contact.username}
                      </h4>
                      <p className="text-[10px] text-charcoal/40">
                        {contact.email}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* C. Create Group Modal */}
      {newGroupModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-sm bg-parchment rounded-xl shadow-xl border border-clay/10 p-6 max-h-[80vh] flex flex-col relative">
            <button 
              onClick={() => setNewGroupModalOpen(false)}
              className="absolute top-4 right-4 text-charcoal/40 hover:text-charcoal"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-serif text-lg text-charcoal font-bold mb-3">Create Group</h3>

            <form onSubmit={handleCreateGroup} className="space-y-4 flex flex-col flex-1 overflow-hidden">
              <div>
                <label className="block text-xs font-bold text-charcoal/60 mb-1">Group Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Design Team"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-clay/50 bg-white text-charcoal text-sm"
                />
              </div>

              <div className="flex-1 flex flex-col overflow-hidden">
                <label className="block text-xs font-bold text-charcoal/60 mb-1">Select Members</label>
                <div className="flex-1 overflow-y-auto space-y-1 bg-white border border-slate-200 rounded-lg p-2 max-h-48">
                  {contacts.length === 0 ? (
                    <div className="text-center py-4 text-charcoal/40 text-xs">
                      No contacts found.
                    </div>
                  ) : (
                    contacts.map((contact) => {
                      const isSelected = selectedMemberIds.includes(contact.id);
                      return (
                        <label
                          key={contact.id}
                          className="flex items-center justify-between p-2 hover:bg-slate-50 rounded cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs">{contact.moodEmoji || '👤'}</span>
                            <span className="text-sm text-charcoal font-semibold">{contact.username}</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setSelectedMemberIds((prev) =>
                                isSelected 
                                  ? prev.filter((id) => id !== contact.id)
                                  : [...prev, contact.id]
                              );
                            }}
                            className="accent-clay"
                          />
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={!groupName.trim() || selectedMemberIds.length === 0}
                className="w-full py-2 bg-clay hover:bg-clay-hover text-white rounded-lg font-bold text-sm transition shadow-sm disabled:bg-slate-200 disabled:text-slate-400"
              >
                Create Group Chat
              </button>
            </form>
          </div>
        </div>
      )}

      {/* D. AI Chat Summary Slide-out / Modal */}
      {summaryOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-end z-50">
          <div className="w-full max-w-md bg-parchment h-full shadow-2xl border-l border-slate-200 p-6 flex flex-col relative animate-slide-in">
            <button 
              onClick={() => setSummaryOpen(false)}
              className="absolute top-6 right-6 text-charcoal/40 hover:text-charcoal"
            >
              <X className="w-6 h-6" />
            </button>

            <h2 className="font-serif text-2xl text-charcoal font-bold mb-2 flex items-center gap-2">
              <Sparkles className="text-clay w-6 h-6" /> AI Pulse Summary
            </h2>
            <p className="text-xs text-charcoal/50 mb-6 font-sans">
              Powered by Claude—generates a brief summary of key discussion points in this chat room.
            </p>

            <div className="flex-1 overflow-y-auto bg-white border border-slate-200/50 rounded-xl p-4 shadow-inner">
              {summaryLoading ? (
                <div className="flex flex-col items-center justify-center h-full space-y-3">
                  <RefreshCw className="w-8 h-8 text-clay animate-spin" />
                  <span className="text-xs text-charcoal/50 font-bold">Claude is analyzing messages...</span>
                </div>
              ) : aiSummary ? (
                <div className="prose text-charcoal/80 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                  {aiSummary}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <Sparkles className="w-10 h-10 text-clay/30 mb-2" />
                  <span className="text-sm text-charcoal/40 font-semibold">Failed to load summary. Try typing more messages first!</span>
                </div>
              )}
            </div>

            <button
              onClick={requestSummary}
              className="w-full mt-6 py-2.5 bg-clay hover:bg-clay-hover text-white rounded-lg font-bold text-sm transition shadow-sm flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Refresh Summary
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
