import React, { useState, useEffect } from 'react';
import { Headset, MessageSquare, Send, User as UserIcon, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';

export function AdminSupport() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replyText, setReplyText] = useState("");
  const [adminUser, setAdminUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setAdminUser(session.user);
    });
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    console.log("Fetching tickets...");
    const { data, error } = await supabase
      .from('content_blocks')
      .select('*')
      .eq('title', 'support_ticket');

    if (error) {
      console.error("Error fetching tickets:", error);
      toast.error("Failed to load tickets: " + error.message);
    } else if (data) {
      console.log("Fetched tickets raw data:", data);
      const parsed = data.map(d => {
        try {
          const content = JSON.parse(d.content);
          return { id: d.id, key: d.key, created_at: d.created_at, ...content };
        } catch(e) { 
          console.error("Error parsing ticket content:", e, d.content);
          return null; 
        }
      }).filter(Boolean);
      console.log("Parsed tickets:", parsed);
      setTickets(parsed);
    }
    setLoading(false);
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim() || !adminUser) return;

    const newMsg = {
      sender: "admin",
      admin_id: adminUser.id,
      admin_name: adminUser.user_metadata?.full_name || "Admin",
      text: replyText.trim(),
      timestamp: new Date().toISOString()
    };

    const updatedData = {
      ...selectedTicket,
      messages: [...(selectedTicket.messages || []), newMsg]
    };

    const { error } = await supabase
      .from('content_blocks')
      .update({ content: JSON.stringify(updatedData) })
      .eq('id', selectedTicket.id);

    if (error) {
      toast.error("Failed to send reply");
    } else {
      toast.success("Reply sent");
      setReplyText("");
      setSelectedTicket(updatedData);
      fetchTickets();
    }
  };

  return (
    <div className="text-white">
      <h1>Support</h1>
      <div className="max-w-5xl">
        <div className="flex items-center gap-3 mb-8">
          <Headset className="w-8 h-8 text-red-500" />
          <h1 className="text-3xl font-bold">Support Requests</h1>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          {/* Ticket List */}
          <div className="md:col-span-1 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-zinc-800 bg-zinc-950/50">
              <h2 className="font-semibold">Tickets</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-zinc-500">Loading...</div>
              ) : tickets.length === 0 ? (
                <div className="p-4 text-center text-zinc-500">No pending requests.</div>
              ) : (
                tickets.map(ticket => (
                  <button
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`w-full text-left p-4 border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors ${selectedTicket?.id === ticket.id ? 'bg-zinc-800/80 border-l-2 border-l-red-500' : ''}`}
                  >
                    <h3 className="font-medium truncate">{ticket.subject}</h3>
                    <p className="text-xs text-zinc-400 truncate">{ticket.user_email}</p>
                    <p className="text-xs text-zinc-500 mt-1">{new Date(ticket.messages?.[0]?.timestamp || ticket.created_at || Date.now()).toLocaleDateString()}</p>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Ticket Details */}
          <div className="md:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col h-[600px]">
            {selectedTicket ? (
              <>
                <div className="p-4 border-b border-zinc-800 bg-zinc-950/50">
                  <h2 className="font-semibold text-lg">{selectedTicket.subject}</h2>
                  <p className="text-sm text-zinc-400">From: {selectedTicket.user_email}</p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {(selectedTicket.messages || []).map((msg: any, idx: number) => (
                    <div key={idx} className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-xl p-3 ${msg.sender === 'admin' ? 'bg-red-600/20 border border-red-500/30 text-white' : 'bg-zinc-800 text-zinc-200'}`}>
                        {msg.sender === 'admin' && (
                          <div className="flex items-center gap-2 mb-1 text-red-400 text-xs font-semibold">
                            <ShieldCheck className="w-3 h-3" />
                            {msg.admin_name} (Admin)
                          </div>
                        )}
                        <p className="whitespace-pre-wrap text-sm">{msg.text}</p>
                        <span className="text-[10px] text-zinc-500 mt-2 block">
                          {new Date(msg.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t border-zinc-800 bg-zinc-950/50">
                  <form onSubmit={handleReply} className="flex gap-2">
                    <Input 
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your reply..."
                      className="flex-1 bg-zinc-900 border-zinc-700 focus-visible:ring-red-500"
                    />
                    <Button type="submit" disabled={!replyText.trim()} className="bg-red-600 hover:bg-red-500 text-white">
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 p-8 text-center">
                <MessageSquare className="w-12 h-12 mb-4 opacity-50" />
                <p>Select a ticket to view details and reply.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
