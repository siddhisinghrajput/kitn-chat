import { useState, useEffect, useRef } from 'react';
import { 
  Ghost, 
  Play, 
  Send, 
  Check, 
  Bell, 
  Search, 
  Headphones, 
  MoreHorizontal, 
  Sparkles,
  ArrowLeft,
  AlertTriangle,
  ShieldAlert,
  UserCheck
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: {
    id: string | null;
    username: string;
    avatarUrl: string | null;
    isAnonymousMode: boolean;
    anonymousAlias?: string;
  };
  content: string;
  type: 'text' | 'voice' | 'poll_ref';
  voiceUrl?: string;
  voiceDurationSeconds?: number;
  isAnonymous?: boolean;
  createdAt: Date;
  tone?: string;
  toneSeverity?: 'warning' | 'alert' | 'good';
  poll?: {
    id: number;
    question: string;
    options: { id: number; text: string; votes: number }[];
  };
}

export default function App() {
  // Navigation states
  const [currentView, setCurrentView] = useState<'chats' | 'chat-thread' | 'moods' | 'schedule'>('chats');
  const [activeChat, setActiveChat] = useState<{ name: string; avatar: string; subtitle?: string; type: 'dm' | 'group' } | null>(null);

  // App settings & mood states
  const [selectedMood, setSelectedMood] = useState('Deep Flow');
  const [ghostMode, setGhostMode] = useState(true);
  const [disappearingHours, setDisappearingHours] = useState(1);
  const [customVibeText, setCustomVibeText] = useState("listening to 'Low-fi Morning'");

  // User input states
  const [textInput, setTextInput] = useState('');
  const [isAnonSend, setIsAnonSend] = useState(false);
  const [detectedTone, setDetectedTone] = useState<{ text: string; severity: 'warning' | 'alert' | 'good' } | null>(null);

  // Active voice player state
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [voiceProgress, setVoiceProgress] = useState(0);

  // Database / state stores
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({
    'Sarah Miller': [
      {
        id: 'msg-1',
        sender: { id: 'sarah', username: 'Sarah Miller', avatarUrl: '👩🏼', isAnonymousMode: false },
        content: 'I think we should lean into the tactile paper feel. It feels more human than just another glass UI.',
        type: 'text',
        createdAt: new Date(Date.now() - 1000 * 60 * 5)
      },
      {
        id: 'msg-2',
        sender: { id: 'me', username: 'You', avatarUrl: 'ME', isAnonymousMode: false },
        content: "Agreed. I'm adding a slight texture to the clay surfaces now.",
        type: 'text',
        createdAt: new Date(Date.now() - 1000 * 60 * 4),
        tone: 'Confident & Warm',
        toneSeverity: 'good'
      },
      {
        id: 'msg-3',
        sender: { id: 'sarah', username: 'Sarah Miller', avatarUrl: '👩🏼', isAnonymousMode: false },
        content: '[Voice Note: 12s]',
        type: 'voice',
        voiceDurationSeconds: 12,
        createdAt: new Date(Date.now() - 1000 * 60 * 2)
      }
    ],
    'Design Collective': [
      {
        id: 'msg-dc-1',
        sender: { id: 'marcus', username: 'Marcus', avatarUrl: '🧔🏻', isAnonymousMode: false },
        content: "Let's try the clay palette for our buttons.",
        type: 'text',
        createdAt: new Date(Date.now() - 1000 * 60 * 30)
      },
      {
        id: 'msg-dc-2',
        sender: { id: 'system', username: 'Kith Bot', avatarUrl: '🤖', isAnonymousMode: false },
        content: '📊 Poll: Which button radius should we lock in?',
        type: 'poll_ref',
        createdAt: new Date(Date.now() - 1000 * 60 * 20),
        poll: {
          id: 101,
          question: 'Which button radius should we lock in?',
          options: [
            { id: 1, text: '8px (Compact)', votes: 2 },
            { id: 2, text: '12px (Kith Theme)', votes: 6 },
            { id: 3, text: '16px (Puffy)', votes: 1 }
          ]
        }
      }
    ],
    'Garden Club': [
      {
        id: 'msg-gc-1',
        sender: { id: 'system', username: 'Garden Bot', avatarUrl: '🌱', isAnonymousMode: false },
        content: '📊 Poll: Which seeds for Spring planting?',
        type: 'poll_ref',
        createdAt: new Date(Date.now() - 1000 * 60 * 120),
        poll: {
          id: 102,
          question: 'Which seeds for Spring planting?',
          options: [
            { id: 10, text: 'Lavender 🌱', votes: 5 },
            { id: 11, text: 'Sunflower 🌻', votes: 12 },
            { id: 12, text: 'Rosemary 🌿', votes: 3 }
          ]
        }
      }
    ]
  });

  // Scheduled tasks/reminders state
  const [reminders, setReminders] = useState([
    { id: 1, title: 'Review parchment mocks', from: 'Sarah Miller', time: 'Today · 3:00 PM', completed: false, isAiDetected: true },
    { id: 2, title: 'Send seed list for spring', from: 'Garden Club', time: 'Tomorrow · 9:00 AM', completed: false, isAiDetected: false },
    { id: 3, title: 'Pay Marcus for coffee run', from: 'Design Collective', time: 'Fri · 6:00 PM', completed: true, isAiDetected: false }
  ]);

  // Scroll anchor for messages
  const messageEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll messages view on update
  useEffect(() => {
    if (currentView === 'chat-thread') {
      messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, currentView]);

  // Local rule-based Tone checking simulator (Wow factor)
  useEffect(() => {
    if (!textInput.trim()) {
      setDetectedTone(null);
      return;
    }

    const lowerInput = textInput.toLowerCase();
    
    // Simple tone rules simulating our Claude AI checks
    if (lowerInput.includes('hurry') || lowerInput.includes('now!') || lowerInput.includes('immediately') || lowerInput.includes('do this')) {
      setDetectedTone({ text: 'Tone: Demanding / Harsh', severity: 'alert' });
    } else if (lowerInput.includes('whatever') || lowerInput.includes('stupid') || lowerInput.includes('nonsense') || lowerInput.includes('worst')) {
      setDetectedTone({ text: 'Tone: Aggressive / Passive-Aggressive', severity: 'warning' });
    } else if (lowerInput.includes('please') || lowerInput.includes('thanks') || lowerInput.includes('great') || lowerInput.includes('love') || lowerInput.includes('perfect')) {
      setDetectedTone({ text: 'Tone: Polite & Positive', severity: 'good' });
    } else {
      setDetectedTone({ text: 'Tone: Neutral', severity: 'good' });
    }
  }, [textInput]);

  // Simulates playing a voice note
  useEffect(() => {
    let interval: any;
    if (isPlayingVoice) {
      interval = setInterval(() => {
        setVoiceProgress(prev => {
          if (prev >= 100) {
            setIsPlayingVoice(false);
            return 0;
          }
          return prev + 8;
        });
      }, 500);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isPlayingVoice]);

  // Opens a DM or group chat
  const handleOpenChat = (chatName: string, avatar: string, subtitle?: string, type: 'dm' | 'group' = 'dm') => {
    setActiveChat({ name: chatName, avatar, subtitle, type });
    setCurrentView('chat-thread');
  };

  // Casts a vote in a poll
  const handleVote = (pollId: number, optionId: number) => {
    if (!activeChat) return;
    const roomMessages = messages[activeChat.name] || [];
    const updated = roomMessages.map(m => {
      if (m.type === 'poll_ref' && m.poll?.id === pollId) {
        return {
          ...m,
          poll: {
            ...m.poll,
            options: m.poll.options.map(o => {
              if (o.id === optionId) {
                return { ...o, votes: o.votes + 1 };
              }
              return o;
            })
          }
        };
      }
      return m;
    });

    setMessages({
      ...messages,
      [activeChat.name]: updated
    });
  };

  // Sends a message
  const handleSendMessage = (contentStr?: string) => {
    const textToSend = contentStr || textInput;
    if (!textToSend.trim() || !activeChat) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: isAnonSend 
        ? { id: null, username: 'Shadow42', avatarUrl: '👻', isAnonymousMode: true, anonymousAlias: 'Shadow42' }
        : { id: 'me', username: 'You', avatarUrl: 'ME', isAnonymousMode: false },
      content: textToSend,
      type: 'text',
      createdAt: new Date(),
      isAnonymous: isAnonSend,
      tone: detectedTone ? detectedTone.text.replace('Tone: ', '') : undefined,
      toneSeverity: detectedTone?.severity
    };

    const currentChatName = activeChat.name;

    // Append user message
    setMessages(prev => ({
      ...prev,
      [currentChatName]: [...(prev[currentChatName] || []), newMsg]
    }));

    setTextInput('');
    
    // Simulate smart AI response after 1.5 seconds to make it a fully alive "app"
    setTimeout(() => {
      const replyMsg: ChatMessage = {
        id: `msg-reply-${Date.now()}`,
        sender: { id: 'system', username: activeChat.name === 'Design Collective' ? 'Marcus' : 'Sarah Miller', avatarUrl: activeChat.name === 'Design Collective' ? '🧔🏻' : '👩🏼', isAnonymousMode: false },
        content: `Thanks for the input! That fits our design vibe perfectly. Let's run a test in the staging sandbox.`,
        type: 'text',
        createdAt: new Date()
      };

      setMessages(prev => ({
        ...prev,
        [currentChatName]: [...(prev[currentChatName] || []), replyMsg]
      }));
    }, 1500);
  };

  // Toggle tasks completion status
  const handleToggleReminder = (id: number) => {
    setReminders(prev => prev.map(r => r.id === id ? { ...r, completed: !r.completed } : r));
  };

  return (
    <div className="min-h-screen bg-[#ecebe5] p-2 md:p-6 lg:p-10 flex flex-col items-center justify-start paper-texture">
      
      {/* Title */}
      <div className="text-center max-w-2xl mx-auto mb-6 space-y-1">
        <span className="text-xs uppercase tracking-widest font-bold text-clay">
          📱 LIVE CHAT PROTOTYPE
        </span>
        <h1 className="text-3xl md:text-4xl font-bold font-serif text-[#0f0f0f]">
          Kith Interactive
        </h1>
        <p className="text-xs text-[#706c60] max-w-md mx-auto">
          Click the screen list, toggle tabs, type, or configure moods. This is a fully functional client prototype container.
        </p>
      </div>

      {/* Outer Phone Mockup Frame Container */}
      <div className="relative w-full max-w-[375px] h-[780px] bg-charcoal border-[12px] border-charcoal rounded-[56px] shadow-2xl overflow-hidden flex flex-col ring-8 ring-neutral-800/40">
        
        {/* Notch / Speaker block */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-36 h-6 bg-charcoal rounded-b-2xl z-30 flex items-center justify-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-neutral-900 border border-neutral-800"></div>
          <div className="w-14 h-1 bg-neutral-950 rounded-full"></div>
        </div>

        {/* Home Screen Indicator bar at bottom */}
        <div className="absolute bottom-1.5 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-charcoal/40 rounded-full z-20"></div>

        {/* View Switcher Main Panel */}
        <div className="flex-1 bg-parchment flex flex-col overflow-hidden relative pt-6 pb-2.5">
          
          {/* ================= VIEW: CHATS (CHAT LIST) ================= */}
          {currentView === 'chats' && (
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="px-5 pt-3 pb-3 flex items-center justify-between border-b border-[#ebdcb9]/40 bg-parchment/80 backdrop-blur-sm">
                <h2 className="text-3xl font-bold font-serif text-charcoal">Kith</h2>
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-clay/10 border border-clay/30 flex items-center justify-center font-bold text-clay text-xs">
                    ME
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-parchment"></div>
                </div>
              </div>

              {/* Vibe Status preview banner */}
              <div className="px-4 py-2">
                <div className="bg-[#faede2] border border-clay/15 rounded-xl px-3 py-2 flex items-center justify-between text-xs text-clay font-medium">
                  <span className="truncate">Vibe: <strong>{selectedMood}</strong> · <em>{customVibeText}</em></span>
                  <button onClick={() => setCurrentView('moods')} className="text-[10px] font-bold underline shrink-0 ml-1">Change</button>
                </div>
              </div>

              {/* Search */}
              <div className="px-4 py-1.5">
                <div className="relative flex items-center bg-[#f2edd8]/45 border border-[#e0dcd3]/80 rounded-full px-3.5 py-1.5">
                  <Search className="w-4 h-4 text-[#8a857b] mr-2" />
                  <input 
                    type="text" 
                    placeholder="Search whispers..." 
                    className="bg-transparent text-xs w-full focus:outline-none text-charcoal placeholder-[#a19c90]"
                  />
                </div>
              </div>

              {/* Chat log list */}
              <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-16 pt-1">
                {/* AI Pulse Alert */}
                <div className="bg-amber-tint border border-[#f5e4bd] p-3.5 rounded-2xl space-y-1.5 relative overflow-hidden">
                  <div className="absolute right-3 top-3 w-2.5 h-2.5 rounded-full bg-clay animate-pulse"></div>
                  <div className="flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-clay" />
                    <span className="text-[10px] font-bold tracking-widest text-clay uppercase">AI PULSE</span>
                  </div>
                  <p className="text-[11px] text-[#524e45] leading-relaxed font-medium">
                    Design Collective had a debate on button corners. Decision: <strong className="text-clay">12px radius wins</strong>.
                  </p>
                </div>

                <div className="space-y-1">
                  {/* Chat Item: Sarah Miller */}
                  <div 
                    onClick={() => handleOpenChat('Sarah Miller', '👩🏼', "listening to 'Low-fi Morning'", 'dm')}
                    className="flex items-center p-3 rounded-2xl hover:bg-[#ebdcb9]/25 transition cursor-pointer active:bg-[#ebdcb9]/40"
                  >
                    <div className="relative mr-3 shrink-0">
                      <div className="w-11 h-11 rounded-full bg-[#fae8d7] border border-clay/10 flex items-center justify-center text-lg">
                        👩🏼
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-clay flex items-center justify-center text-white border-2 border-parchment">
                        <Headphones className="w-2.5 h-2.5" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <h4 className="text-xs font-bold text-charcoal truncate">Sarah Miller</h4>
                        <span className="text-[10px] text-[#9c9689] font-medium">2m ago</span>
                      </div>
                      <p className="text-xs text-[#706c60] truncate font-medium">
                        {messages['Sarah Miller']?.[messages['Sarah Miller'].length - 1]?.content || 'Voice message note...'}
                      </p>
                    </div>
                  </div>

                  {/* Chat Item: Design Collective */}
                  <div 
                    onClick={() => handleOpenChat('Design Collective', '🧔🏻', 'Group Chat', 'group')}
                    className="flex items-center p-3 rounded-2xl hover:bg-[#ebdcb9]/25 transition cursor-pointer active:bg-[#ebdcb9]/40"
                  >
                    <div className="w-11 h-11 rounded-full bg-charcoal flex items-center justify-center text-white text-xs font-bold mr-3 border border-charcoal shrink-0">
                      PS
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <h4 className="text-xs font-bold text-charcoal truncate">Design Collective</h4>
                        <span className="text-[10px] text-[#9c9689] font-medium">14m ago</span>
                      </div>
                      <p className="text-xs text-clay truncate font-medium">
                        {messages['Design Collective']?.[messages['Design Collective'].length - 1]?.content || 'Interactive poll inside...'}
                      </p>
                    </div>
                  </div>

                  {/* Chat Item: Garden Club */}
                  <div 
                    onClick={() => handleOpenChat('Garden Club', '🌱', 'Seeds Club', 'group')}
                    className="flex items-center p-3 rounded-2xl hover:bg-[#ebdcb9]/25 transition cursor-pointer active:bg-[#ebdcb9]/40"
                  >
                    <div className="w-11 h-11 rounded-full bg-[#e8eed9] border border-[#d2dfb9] flex items-center justify-center text-lg mr-3 shrink-0">
                      🌱
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <h4 className="text-xs font-bold text-charcoal truncate">Garden Club</h4>
                        <span className="text-[10px] text-[#9c9689] font-medium">1h ago</span>
                      </div>
                      <p className="text-xs text-[#706c60] truncate font-medium">
                        Poll: which seeds for spring? 🌱
                      </p>
                    </div>
                  </div>

                  {/* Chat Item: Ghost User */}
                  <div className="flex items-center p-3 rounded-2xl opacity-75 mr-3">
                    <div className="w-11 h-11 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center text-lg mr-3 shrink-0">
                      👻
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <h4 className="text-xs font-bold text-purple-700 truncate">Ghost-User_42</h4>
                        <span className="text-[10px] text-[#9c9689] font-medium">3h ago</span>
                      </div>
                      <p className="text-xs text-purple-600 italic truncate font-medium">
                        Anonymous · disappearing in 23h
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= VIEW: CHAT THREAD ================= */}
          {currentView === 'chat-thread' && activeChat && (
            <div className="flex flex-col h-full bg-[#faf9f5]">
              {/* Header */}
              <div className="px-3 pt-3 pb-3 flex items-center justify-between border-b border-[#ebdcb9]/40 bg-parchment/90 backdrop-blur-sm shrink-0">
                <div className="flex items-center space-x-2 min-w-0">
                  <button onClick={() => setCurrentView('chats')} className="p-1 rounded-full hover:bg-neutral-200 transition">
                    <ArrowLeft className="w-4 h-4 text-charcoal" />
                  </button>
                  <div className="w-8 h-8 rounded-full bg-[#fae8d7] border border-clay/10 flex items-center justify-center text-base shrink-0">
                    {activeChat.avatar}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-charcoal truncate">{activeChat.name}</h3>
                    {activeChat.subtitle && (
                      <p className="text-[9px] text-clay italic font-medium truncate">{activeChat.subtitle}</p>
                    )}
                  </div>
                </div>
                <MoreHorizontal className="w-4 h-4 text-[#8a857b] shrink-0" />
              </div>

              {/* Message Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                
                {/* Catch Up Info Banner */}
                {activeChat.name === 'Sarah Miller' && (
                  <div className="bg-amber-tint border border-[#f5e4bd] p-3 rounded-xl space-y-1">
                    <div className="flex items-center space-x-1">
                      <Sparkles className="w-3 h-3 text-clay animate-pulse" />
                      <span className="text-[9px] font-bold tracking-widest text-clay uppercase">CATCH-UP SUMMARY</span>
                    </div>
                    <p className="text-[10px] text-[#524e45] leading-normal font-medium">
                      You missed 12 messages. Sarah finalized the parchment mockup; the collective aligned.
                    </p>
                  </div>
                )}

                {/* Rendered Messages */}
                {(messages[activeChat.name] || []).map((msg) => {
                  const isMe = msg.sender.id === 'me';
                  
                  if (msg.type === 'poll_ref' && msg.poll) {
                    // Poll template render
                    const totalVotes = msg.poll.options.reduce((sum, o) => sum + o.votes, 0);
                    return (
                      <div key={msg.id} className="bg-white border border-[#ebdcb9]/80 rounded-2xl p-4 space-y-3 shadow-sm max-w-[90%]">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-lg">📊</span>
                          <h4 className="text-xs font-bold text-charcoal leading-snug">{msg.poll.question}</h4>
                        </div>
                        <div className="space-y-2">
                          {msg.poll.options.map((opt) => {
                            const pct = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
                            return (
                              <button 
                                key={opt.id}
                                onClick={() => handleVote(msg.poll!.id, opt.id)}
                                className="w-full text-left relative overflow-hidden rounded-xl border border-[#e2decb] p-2 hover:bg-[#faede2]/20 active:bg-[#faede2]/40 transition flex items-center justify-between text-xs"
                              >
                                {/* Animated percentage bar bg */}
                                <div 
                                  className="absolute left-0 top-0 bottom-0 bg-[#e07a3c]/10 transition-all duration-500 ease-out" 
                                  style={{ width: `${pct}%` }}
                                ></div>
                                <span className="font-bold relative z-10 text-charcoal">{opt.text}</span>
                                <span className="text-[10px] font-bold text-clay relative z-10">{opt.votes} ({pct}%)</span>
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-[9px] text-[#9c9689] font-bold text-right italic">Click option to test vote</p>
                      </div>
                    );
                  }

                  if (msg.type === 'voice') {
                    // Voice Player template
                    return (
                      <div key={msg.id} className="flex flex-col space-y-0.5 max-w-[85%]">
                        <div className="bg-white border border-[#ebdcb9]/60 rounded-2xl rounded-tl-none p-3 shadow-sm flex items-center space-x-3">
                          <button 
                            onClick={() => {
                              setIsPlayingVoice(!isPlayingVoice);
                              if(!isPlayingVoice) setVoiceProgress(0);
                            }}
                            className="w-7 h-7 rounded-full bg-clay flex items-center justify-center text-white shrink-0 hover:bg-clay-hover active:scale-95 transition"
                          >
                            {isPlayingVoice ? (
                              <div className="flex items-center space-x-0.5">
                                <div className="w-1 h-3 bg-white animate-pulse"></div>
                                <div className="w-1 h-3 bg-white animate-pulse"></div>
                              </div>
                            ) : (
                              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                            )}
                          </button>
                          
                          {/* Animated Waveform Progress bar */}
                          <div className="flex-1 flex items-end space-x-1 h-6">
                            {[12, 24, 8, 16, 22, 10, 18, 4, 15, 7].map((h, index) => {
                              // color active bars based on mock voiceProgress percentage
                              const activeBarIdx = Math.floor((voiceProgress / 100) * 10);
                              const isActive = isPlayingVoice && index <= activeBarIdx;
                              return (
                                <div 
                                  key={index} 
                                  className="w-[3px] rounded-full transition-all duration-300"
                                  style={{ 
                                    height: `${h}px`, 
                                    backgroundColor: isActive ? '#e07a3c' : '#ebdcb9' 
                                  }}
                                ></div>
                              );
                            })}
                          </div>
                          <span className="text-[9px] font-bold text-clay shrink-0">
                            {isPlayingVoice ? `0:0${Math.floor((100 - voiceProgress)/10)}` : "0:12"}
                          </span>
                        </div>
                        <span className="text-[9px] text-[#a19c90] ml-1">10:05 AM</span>
                      </div>
                    );
                  }

                  return (
                    <div 
                      key={msg.id}
                      className={`flex flex-col space-y-0.5 max-w-[85%] ${isMe ? 'self-end items-end' : 'items-start'}`}
                    >
                      <div className={`p-3 rounded-2xl shadow-sm leading-relaxed ${
                        isMe 
                          ? 'bg-clay text-white rounded-tr-none' 
                          : 'bg-white text-charcoal border border-[#ebdcb9]/60 rounded-tl-none'
                      }`}>
                        <div className="text-[10px] opacity-75 font-bold mb-0.5">
                          {msg.sender.username}
                        </div>
                        <p className="text-xs font-medium">{msg.content}</p>
                      </div>

                      {/* Display Tone labels and timestamp */}
                      <div className="flex items-center space-x-1.5 mt-0.5">
                        {msg.tone && (
                          <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full border ${
                            msg.toneSeverity === 'alert' 
                              ? 'bg-red-50 text-red-600 border-red-200' 
                              : msg.toneSeverity === 'warning'
                              ? 'bg-amber-50 text-amber-600 border-amber-200'
                              : 'bg-[#faede2] text-clay border-clay/10'
                          }`}>
                            Tone: {msg.tone}
                          </span>
                        )}
                        <span className="text-[8px] text-[#a19c90]">
                          {msg.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })}

                <div ref={messageEndRef} />
              </div>

              {/* Message Typing Panel */}
              <div className="bg-parchment/95 backdrop-blur-sm border-t border-[#ebdcb9]/30 p-3 shrink-0 space-y-2">
                
                {/* Tone Alert Banner inside input */}
                {detectedTone && (
                  <div className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg border text-[10px] font-bold transition-all ${
                    detectedTone.severity === 'alert'
                      ? 'bg-red-50 border-red-100 text-red-700'
                      : detectedTone.severity === 'warning'
                      ? 'bg-amber-50 border-amber-100 text-amber-700'
                      : 'bg-green-50 border-green-100 text-green-700'
                  }`}>
                    {detectedTone.severity === 'alert' && <ShieldAlert className="w-3.5 h-3.5 text-red-600 animate-bounce" />}
                    {detectedTone.severity === 'warning' && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                    {detectedTone.severity === 'good' && <UserCheck className="w-3.5 h-3.5 text-green-600" />}
                    <span>{detectedTone.text}</span>
                  </div>
                )}

                {/* Smart Reply suggestion chips */}
                <div className="flex space-x-1.5 overflow-x-auto pb-1">
                  {["Ship it 🚀", "Let's check details", "Looks perfect", "Tell me more"].map((text, i) => (
                    <button 
                      key={i} 
                      onClick={() => handleSendMessage(text)}
                      className="bg-[#faede2] border border-clay/10 text-[9px] font-bold text-clay px-3 py-1 rounded-full whitespace-nowrap hover:bg-clay hover:text-white transition cursor-pointer"
                    >
                      {text}
                    </button>
                  ))}
                </div>

                {/* Text input, Anonymous toggle, Send btn */}
                <div className="flex items-center space-x-2">
                  {/* Anonymous sender toggle */}
                  <button 
                    onClick={() => setIsAnonSend(!isAnonSend)}
                    className={`p-2 rounded-full border transition shrink-0 cursor-pointer ${
                      isAnonSend 
                        ? 'bg-purple-100 border-purple-300 text-purple-700' 
                        : 'bg-white border-[#e2decb] text-[#8a857b] hover:bg-neutral-50'
                    }`}
                    title="Send anonymously as alias"
                  >
                    <Ghost className="w-4.5 h-4.5" />
                  </button>

                  <div className="flex-1 flex items-center bg-[#f2edd8]/45 border border-[#e0dcd3]/80 rounded-full p-1.5">
                    <input 
                      type="text" 
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder={isAnonSend ? "Type a ghost whisper..." : "Type a whisper..."}
                      className="bg-transparent text-xs w-full focus:outline-none pl-3 text-charcoal placeholder-[#a19c90]"
                    />
                    <button 
                      onClick={() => handleSendMessage()}
                      className="w-8 h-8 rounded-full bg-charcoal flex items-center justify-center text-white hover:bg-neutral-800 active:scale-90 transition shrink-0 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= VIEW: MOODS ================= */}
          {currentView === 'moods' && (
            <div className="flex flex-col h-full pt-4 px-5 space-y-5 overflow-y-auto pb-16">
              <div className="space-y-1">
                <h3 className="text-2xl font-bold font-serif text-charcoal">Vibe Status</h3>
                <p className="text-xs text-[#827e74] font-medium leading-relaxed">
                  Your mood status and vibe text updates instantly in all chat lists.
                </p>
              </div>

              {/* Mood Vibe input text */}
              <div className="space-y-1 bg-white border border-[#ebdcb9]/60 p-3.5 rounded-2xl shadow-sm">
                <label className="text-[9px] font-bold tracking-widest text-[#706c60] uppercase">VIBE STATUS TEXT</label>
                <input 
                  type="text"
                  value={customVibeText}
                  onChange={(e) => setCustomVibeText(e.target.value)}
                  className="w-full bg-[#f2edd8]/20 border border-[#e0dcd3]/80 rounded-lg px-2.5 py-1.5 text-xs text-charcoal focus:outline-none font-medium"
                />
              </div>

              {/* Mood Grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Focusing', status: 'AVAILABLE', emoji: '🧠' },
                  { label: 'Deep Flow', status: 'SILENT', emoji: '🪐' },
                  { label: 'At Cafe', status: 'VIBE', emoji: '☕' },
                  { label: 'Traveling', status: 'MOBILE', emoji: '✈️' }
                ].map((mood, idx) => {
                  const isSelected = selectedMood === mood.label;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedMood(mood.label)}
                      className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center space-y-1 transition cursor-pointer shadow-sm ${
                        isSelected ? 'bg-clay border-clay text-parchment' : 'bg-white border-[#ebdcb9]/70 hover:bg-[#faede2]/20'
                      }`}
                    >
                      <span className="text-2xl">{mood.emoji}</span>
                      <span className="text-xs font-bold">{mood.label}</span>
                      <span className={`text-[9px] font-bold tracking-widest ${
                        isSelected ? 'text-orange-200' : 'text-[#9c9689]'
                      }`}>
                        {mood.status}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Disappearing Messages Slider */}
              <div className="bg-white border border-[#ebdcb9]/60 p-4 rounded-2xl space-y-3 shadow-sm">
                <div className="flex justify-between items-baseline">
                  <span className="text-[10px] font-bold tracking-widest text-[#706c60] uppercase">DISAPPEARING MESSAGES</span>
                  <span className="text-xs font-bold text-clay">{disappearingHours} HOUR</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="24" 
                  value={disappearingHours}
                  onChange={(e) => setDisappearingHours(Number(e.target.value))}
                  className="w-full accent-clay cursor-pointer h-1 bg-[#faede2] rounded-lg appearance-none"
                />
                <p className="text-[10px] text-[#9c9689] font-medium leading-normal">
                  All messages sent after enabling will dissolve from client histories once the timer expires.
                </p>
              </div>

              {/* Ghost Mode Card */}
              <div className="bg-charcoal text-white p-4.5 rounded-3xl space-y-2.5 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Ghost className="w-4 h-4 text-purple-400" />
                    <h4 className="text-xs font-bold tracking-wide">Ghost Mode</h4>
                  </div>
                  {/* Custom Toggle Switch */}
                  <button 
                    onClick={() => setGhostMode(!ghostMode)}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out cursor-pointer ${
                      ghostMode ? 'bg-clay' : 'bg-neutral-700'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ease-in-out ${
                      ghostMode ? 'transform translate-x-4' : ''
                    }`}></div>
                  </button>
                </div>
                <p className="text-[10px] text-neutral-400 leading-normal font-medium">
                  Chat in public rooms without revealing your identity. Generates a randomized alias, leaving no traces behind.
                </p>
              </div>
            </div>
          )}

          {/* ================= VIEW: SCHEDULE (REMINDERS) ================= */}
          {currentView === 'schedule' && (
            <div className="flex flex-col h-full pt-4 px-4 space-y-4 overflow-y-auto pb-16">
              
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold tracking-widest text-clay uppercase">AI REMINDERS</span>
                  <h3 className="text-2xl font-bold font-serif text-charcoal">Schedule it</h3>
                </div>
                <div className="w-8 h-8 rounded-full bg-amber-tint border border-[#f5e4bd] flex items-center justify-center text-clay">
                  <Bell className="w-4 h-4 fill-current" />
                </div>
              </div>

              {/* AI Auto-Detected Reminder prompt (Interactive mock) */}
              <div className="bg-white border border-[#ebdcb9]/60 rounded-2xl p-4 space-y-3 shadow-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-full bg-[#fae8d7] flex items-center justify-center text-xs">
                    👩🏼
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-charcoal truncate">Sarah Miller</span>
                      <span className="text-[8px] text-[#9c9689] font-bold">DETECTED TIME</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-[#524e45] leading-normal font-medium">
                  "Can you review the parchment mockups by <span className="bg-[#faede2] text-clay font-bold px-2 py-0.5 rounded-full border border-clay/10 mx-0.5">3pm today</span> ?"
                </p>
                
                {/* Click to add task button */}
                <button 
                  onClick={() => {
                    const newTask = {
                      id: Date.now(),
                      title: 'Review parchment mockups',
                      from: 'Sarah Miller',
                      time: 'Today · 3:00 PM',
                      completed: false,
                      isAiDetected: true
                    };
                    setReminders([newTask, ...reminders]);
                  }}
                  className="w-full bg-clay text-white text-[10px] font-bold py-2 rounded-xl hover:bg-clay-hover active:scale-95 transition cursor-pointer"
                >
                  ➕ ADD DETECTED TASK TO REMINDERS
                </button>
              </div>

              {/* Reminder List */}
              <div className="space-y-2">
                <span className="text-[9px] font-bold tracking-widest text-[#706c60] uppercase">UPCOMING WORKSPACE REMINDERS</span>
                
                <div className="space-y-2">
                  {reminders.map((item) => (
                    <div 
                      key={item.id}
                      className={`bg-white border p-3 rounded-2xl flex items-center justify-between shadow-sm transition ${
                        item.completed ? 'border-[#ebdcb9]/40 opacity-60' : 'border-[#ebdcb9]/70'
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="flex items-center space-x-1.5">
                          {item.isAiDetected && <Sparkles className="w-3 h-3 text-clay shrink-0" />}
                          <h5 className={`text-xs font-bold text-charcoal truncate ${item.completed ? 'line-through text-neutral-400' : ''}`}>
                            {item.title}
                          </h5>
                        </div>
                        <div className="flex items-center space-x-1.5 text-[9px] text-[#9c9689] font-bold mt-0.5">
                          <span>From: {item.from}</span>
                          <span>•</span>
                          <span className="text-clay">{item.time}</span>
                        </div>
                      </div>
                      
                      {/* Checkbox button */}
                      <button 
                        onClick={() => handleToggleReminder(item.id)}
                        className={`w-5 h-5 rounded-full border flex items-center justify-center cursor-pointer shrink-0 transition ${
                          item.completed ? 'bg-clay border-clay text-white' : 'border-[#e2decb] bg-neutral-50 hover:bg-[#faede2]/50'
                        }`}
                      >
                        {item.completed && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= FIXED BOTTOM TAB NAVIGATION ================= */}
          <div className="absolute bottom-3 left-0 right-0 px-6 z-20 shrink-0">
            <div className="bg-charcoal text-white rounded-full p-1.5 flex justify-between items-center shadow-lg">
              <button 
                onClick={() => {
                  setCurrentView('chats');
                  setActiveChat(null);
                }}
                className={`flex-1 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                  (currentView === 'chats' || currentView === 'chat-thread') ? 'bg-[#262626] text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Chats
              </button>
              <button 
                onClick={() => setCurrentView('moods')}
                className={`flex-1 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                  currentView === 'moods' ? 'bg-[#262626] text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Moods
              </button>
              <button 
                onClick={() => setCurrentView('schedule')}
                className={`flex-1 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                  currentView === 'schedule' ? 'bg-[#262626] text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Schedule
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
