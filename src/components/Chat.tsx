import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { MessageCircle, Send, ArrowLeft, User as UserIcon, Star, Plus, MoreVertical, Bell, CheckCircle2, Image as ImageIcon, Check } from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { VerificationBadge } from '@/components/ui/VerificationBadge';

export function Chat() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [otherUser, setOtherUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get job context from URL if available
  const queryParams = new URLSearchParams(location.search);
  const jobTitle = queryParams.get('jobTitle');
  const jobId = queryParams.get('jobId');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (currentUser) {
      if (userId) {
        fetchOtherUser();
        fetchMessages();
        const interval = setInterval(fetchMessages, 3000);
        return () => clearInterval(interval);
      } else {
        fetchConversations();
      }
    }
  }, [currentUser, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/");
    } else {
      setCurrentUser(session.user);
    }
  };

  const getConversationId = (id1: string, id2: string) => {
    return [id1, id2].sort().join('_');
  };

  const fetchConversations = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('content_blocks')
      .select('*')
      .like('title', 'chat_%')
      .ilike('content', `%${currentUser.id}%`)

    if (data) {
      // Group by conversation
      const convos = new Map();
      const otherIds = new Set<string>();
      data.forEach(msg => {
        try {
          const content = JSON.parse(msg.content);
          if (content.sender_id === currentUser.id || content.receiver_id === currentUser.id) {
            const otherId = content.sender_id === currentUser.id ? content.receiver_id : content.sender_id;
            otherIds.add(otherId);
            if (!convos.has(otherId)) {
              convos.set(otherId, {
                otherId,
                lastMessage: content.text,
                timestamp: content.timestamp,
                otherName: content.sender_id === currentUser.id ? content.receiver_name : content.sender_name,
                isCompleted: content.isCompleted || false
              });
            }
          }
        } catch(e) {}
      });

      // Fetch avatars for these users
      if (otherIds.size > 0) {
        const { data: profiles } = await supabase
          .from('content_blocks')
          .select('*')
          .in('key', Array.from(otherIds).map(id => `user_profile_${id}`));
        
        if (profiles) {
          profiles.forEach(p => {
            try {
              const parsed = JSON.parse(p.content);
              const userId = p.key.replace('user_profile_', '');
              if (convos.has(userId)) {
                const convo = convos.get(userId);
                convo.otherAvatar = parsed.avatar_url;
                convo.otherName = parsed.username || parsed.full_name || parsed.name || convo.otherName;
              }
            } catch(e) {}
          });
        }
      }

      setConversations(Array.from(convos.values()));
    }
    setLoading(false);
  };

  const fetchOtherUser = async () => {
    if (!userId) return;
    // Try to get user metadata from content_blocks
    const { data } = await supabase
      .from('content_blocks')
      .select('content')
      .eq('key', `user_profile_${userId}`)
      .single();
      
    let name = "User";
    let isVerified = false;
    let role = "seeker";
    let avatarUrl = null;
    if (data) {
      try {
        const parsed = JSON.parse(data.content);
        name = parsed.username || parsed.full_name || parsed.name || "User";
        role = (parsed.role || "seeker").toLowerCase();
        avatarUrl = parsed.avatar_url || null;
        isVerified = role === 'employer' || role === 'admin' || parsed.is_verified || false;
      } catch(e) {}
    }
    setOtherUser({ id: userId, name, isVerified, role, avatarUrl });
  };

  const fetchMessages = async () => {
    if (!currentUser || !userId) return;
    const convId = getConversationId(currentUser.id, userId);
    
    const { data, error } = await supabase
      .from('content_blocks')
      .select('*')
      .eq('title', `chat_${convId}`)

    if (data) {
      const parsed = data.map(d => {
        try {
          return { id: d.id, ...JSON.parse(d.content) };
        } catch(e) { return null; }
      }).filter(Boolean);
      
      // Sort manually since created_at is missing
      parsed.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      setMessages(parsed);
      
      // Check if conversation is completed
      const lastMsg = parsed[parsed.length - 1];
      if (lastMsg?.isCompleted) {
        setIsCompleted(true);
      }
    }
    setLoading(false);
  };

  const sendMessage = async (e?: React.FormEvent, textOverride?: string, isCompletedFlag?: boolean, imageUrl?: string) => {
    if (e) e.preventDefault();
    const text = textOverride || newMessage;
    if (!text.trim() && !imageUrl || !currentUser || !userId) return;

    const convId = getConversationId(currentUser.id, userId);
    const msgData = {
      sender_id: currentUser.id,
      sender_name: currentUser.user_metadata?.username || currentUser.user_metadata?.full_name || currentUser.email,
      receiver_id: userId,
      receiver_name: otherUser?.name || 'User',
      text: text.trim(),
      imageUrl,
      timestamp: new Date().toISOString(),
      isCompleted: isCompletedFlag || false,
      jobContext: jobTitle ? { id: jobId, title: jobTitle } : null
    };

    const { error } = await supabase.from('content_blocks').insert([{
      key: `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      title: `chat_${convId}`,
      content: JSON.stringify(msgData)
    }]);

    if (error) {
      toast.error("Failed to send message");
    } else {
      setNewMessage("");
      if (isCompletedFlag) setIsCompleted(true);
      fetchMessages();
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Simulate image upload with base64 for demo
    const reader = new FileReader();
    reader.onloadend = () => {
      sendMessage(undefined, "Sent an image", false, reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleMarkCompleted = () => {
    sendMessage(undefined, "Conversation marked as completed. Please rate the experience.", true);
    setShowRating(true);
  };

  const submitRating = async () => {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    const ratingData = {
      from_id: currentUser.id,
      from_name: currentUser.user_metadata?.username || currentUser.user_metadata?.full_name || currentUser.email,
      to_id: userId,
      rating,
      comment: ratingComment,
      timestamp: new Date().toISOString()
    };

    const { error } = await supabase.from('content_blocks').insert([{
      key: `rating_${currentUser.id}_${userId}_${Date.now()}`,
      title: 'user_rating',
      content: JSON.stringify(ratingData)
    }]);

    if (error) {
      toast.error("Failed to submit rating");
    } else {
      toast.success("Thank you for your feedback!");
      setShowRating(false);
    }
  };

  if (loading && !userId && conversations.length === 0) {
    return <div className="min-h-screen pt-24 pb-32 bg-zinc-950 text-white flex justify-center items-center">Loading...</div>;
  }

  if (!userId) {
    return (
      <div className="min-h-screen pt-24 pb-32 bg-zinc-950 text-white">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <MessageCircle className="w-8 h-8 text-green-500" />
              Messages
            </h1>
            <Button variant="ghost" className="text-zinc-400 hover:text-white">
              <Bell className="w-6 h-6" />
            </Button>
          </div>
          
          {conversations.length === 0 ? (
            <div className="text-center py-16 bg-zinc-900/50 rounded-2xl border border-white/5">
              <MessageCircle className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">No messages yet</h2>
              <p className="text-zinc-400">When you contact employers or seekers, your conversations will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {conversations.map((conv, idx) => (
                <Link key={idx} to={`/chat/${conv.otherId}`} className="block bg-zinc-900 border border-white/10 hover:border-green-500/50 rounded-xl p-4 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center relative overflow-hidden">
                      {conv.otherAvatar ? (
                        <img src={conv.otherAvatar} alt={conv.otherName} className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-6 h-6 text-zinc-400" />
                      )}
                      {conv.isCompleted && (
                        <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5">
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate">{conv.otherName || 'User'}</h3>
                      <p className="text-zinc-400 text-sm truncate">{conv.lastMessage}</p>
                    </div>
                    <div className="text-xs text-zinc-500 whitespace-nowrap">
                      {new Date(conv.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-20 bg-zinc-950 text-white flex flex-col">
      {/* Chat Header */}
      <div className="bg-zinc-900 border-b border-white/10 p-4 sticky top-16 z-10">
        <div className="container mx-auto max-w-3xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/chat" className="text-zinc-400 hover:text-white">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <Link to={`/user/${userId}`} className="flex items-center gap-3 hover:bg-white/5 p-2 rounded-lg transition-colors">
              <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center relative overflow-hidden">
                {otherUser?.avatarUrl ? (
                  <img src={otherUser.avatarUrl} alt={otherUser.name} className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-5 h-5 text-zinc-400" />
                )}
                {otherUser?.role === 'employer' && (
                  <div className="absolute -top-1 -right-1 bg-blue-600 rounded-full p-1 shadow-lg border-2 border-zinc-900">
                    <Check className="w-2.5 h-2.5 text-white stroke-[3px]" />
                  </div>
                )}
                {otherUser?.role === 'admin' && (
                  <div className="absolute -top-1 -right-1 bg-red-600 rounded-full p-1 shadow-lg border-2 border-zinc-900">
                    <Check className="w-2.5 h-2.5 text-white stroke-[3px]" />
                  </div>
                )}
              </div>
              <div>
                <h2 className="font-semibold flex items-center">
                  {otherUser?.name || 'Loading...'}
                  <VerificationBadge role={otherUser?.role} />
                </h2>
                <p className="text-xs text-zinc-400">
                  {isCompleted ? 'Conversation Completed' : 'Active Conversation'}
                </p>
              </div>
            </Link>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger render={
              <Button variant="ghost" className="text-zinc-400 hover:text-white">
                <MoreVertical className="w-6 h-6" />
              </Button>
            } />
            <DropdownMenuContent className="bg-zinc-900 border-white/10 text-white">
              <DropdownMenuItem onClick={handleMarkCompleted} className="hover:bg-white/5 cursor-pointer">
                <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                Mark as Completed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowRating(true)} className="hover:bg-white/5 cursor-pointer">
                <Star className="w-4 h-4 mr-2 text-yellow-500" />
                Rate User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Rating Modal Overlay */}
      {showRating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-6">
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-2">Rate your experience</h3>
              <p className="text-zinc-400">How would you rate your interaction with {otherUser?.name}?</p>
            </div>
            
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button 
                  key={star} 
                  onClick={() => setRating(star)}
                  className={`p-2 transition-transform hover:scale-110 ${rating >= star ? 'text-yellow-500' : 'text-zinc-700'}`}
                >
                  <Star className={`w-10 h-10 ${rating >= star ? 'fill-current' : ''}`} />
                </button>
              ))}
            </div>
            
            <textarea 
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              placeholder="Add a comment (optional)..."
              className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-green-500 outline-none h-24 resize-none"
            />
            
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setShowRating(false)} className="flex-1 text-zinc-400">Cancel</Button>
              <Button onClick={submitRating} className="flex-1 bg-green-600 hover:bg-green-500 text-white">Submit Rating</Button>
            </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 container mx-auto max-w-3xl p-4 overflow-y-auto flex flex-col gap-4">
        {jobTitle && (
          <div className="bg-green-600/10 border border-green-500/20 rounded-xl p-4 mb-4 text-center">
            <p className="text-sm text-zinc-400">Applying for:</p>
            <h3 className="font-bold text-green-400">{jobTitle}</h3>
          </div>
        )}
        
        {messages.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            Send a message to start the conversation.
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.sender_id === currentUser?.id;
            return (
              <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${isMe ? 'bg-green-600 text-white rounded-br-sm' : 'bg-zinc-800 text-zinc-100 rounded-bl-sm'} ${msg.isCompleted ? 'border-2 border-yellow-500/50' : ''}`}>
                  {msg.imageUrl && (
                    <img src={msg.imageUrl} alt="Shared" className="rounded-lg mb-2 max-h-60 w-full object-cover border border-white/10" />
                  )}
                  <p className="whitespace-pre-wrap break-words text-sm sm:text-base">{msg.text}</p>
                  <div className="flex items-center justify-between gap-4 mt-1">
                    <span className={`text-[10px] ${isMe ? 'text-green-200' : 'text-zinc-400'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {msg.isCompleted && (
                      <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-tighter">Completed</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-zinc-900 border-t border-white/10 p-4 sticky bottom-16 z-10">
        <div className="container mx-auto max-w-3xl">
          <form onSubmit={(e) => sendMessage(e)} className="flex gap-2 items-center">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              className="hidden" 
              accept="image/*" 
            />
            <Button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              variant="ghost" 
              className="text-zinc-400 hover:text-white p-2"
            >
              <Plus className="w-6 h-6" />
            </Button>
            <Input 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={isCompleted ? "Conversation completed" : "Type a professional message..."}
              disabled={isCompleted}
              className="flex-1 bg-zinc-950 border-white/10 focus-visible:ring-green-500"
            />
            <Button type="submit" disabled={(!newMessage.trim()) || isCompleted} className="bg-green-600 hover:bg-green-500 text-white px-4">
              <Send className="w-5 h-5" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
