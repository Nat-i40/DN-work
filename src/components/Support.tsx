import React, { useState, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

export function Support() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUser(session.user);
      else navigate("/");
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const supportData = {
      subject,
      user_id: user.id,
      user_email: user.email,
      messages: [
        {
          sender: "user",
          text: message,
          timestamp: new Date().toISOString()
        }
      ]
    };

    const { error } = await supabase.from('content_blocks').insert([{
      key: `support_${user.id}_${Date.now()}`,
      title: `support_ticket`,
      content: JSON.stringify(supportData)
    }]);

    if (error) {
      toast.error("Failed to send message");
    } else {
      toast.success("Message sent to admin. We will get back to you soon.");
      setSubject("");
      setMessage("");
      navigate("/profile");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen pt-24 pb-32 bg-zinc-950 text-white flex flex-col items-center">
      <div className="max-w-md w-full px-4">
        <div className="flex items-center gap-3 mb-8">
          <HelpCircle className="w-8 h-8 text-green-500" />
          <h1 className="text-2xl font-bold">Contact Admin</h1>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Subject</label>
            <Input 
              required 
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What do you need help with?" 
              className="bg-zinc-900 border-zinc-800 text-white" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Message</label>
            <textarea 
              required 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="Describe your issue..." 
              className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-green-600 hover:bg-green-500 text-white">
            {loading ? "Sending..." : "Send Message"}
          </Button>
        </form>
      </div>
    </div>
  );
}
