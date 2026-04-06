import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Briefcase, DollarSign, MessageSquare, Activity, Reply } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

export function DashboardOverview() {
  const [stats, setStats] = useState({
    users: 0,
    jobs: 0,
    applications: 0,
    messages: 0,
    profitableAmount: 0
  })
  const [recentMessages, setRecentMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")
  const [sendingReply, setSendingReply] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    
    // Fetch counts
    const [usersRes, jobsRes, appsRes, messagesRes] = await Promise.all([
      supabase.from("content_blocks").select("id", { count: 'exact', head: true }).eq("title", "user_profile"),
      supabase.from("jobs").select("id", { count: 'exact', head: true }),
      supabase.from("applications").select("id", { count: 'exact', head: true }),
      supabase.from("content_blocks").select("*").ilike("key", "msg_%").order("created_at", { ascending: false })
    ])

    const messages = messagesRes.data || []
    
    // Mock profitable amount based on jobs count (e.g. $50 per job posting)
    const jobsCount = jobsRes.count || 0
    const profitableAmount = jobsCount * 50

    setStats({
      users: usersRes.count || 0,
      jobs: jobsCount,
      applications: appsRes.count || 0,
      messages: messages.length,
      profitableAmount
    })

    setRecentMessages(messages.slice(0, 5))
    setLoading(false)
  }

  const handleReply = async (msg: any) => {
    if (!replyText.trim()) return

    setSendingReply(true)
    const updatedContent = `${msg.content}\n\n--- Admin Reply ---\n${replyText}`

    const { error } = await supabase
      .from("content_blocks")
      .update({ content: updatedContent })
      .eq("id", msg.id)

    if (error) {
      toast.error("Failed to send reply")
    } else {
      toast.success("Reply sent successfully")
      setReplyText("")
      setReplyingTo(null)
      fetchDashboardData()
    }
    setSendingReply(false)
  }

  if (loading) {
    return <div className="text-zinc-500 py-8">Loading dashboard...</div>
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard Overview</h1>
        <p className="text-zinc-400">Statistical analysis and recent activity.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-zinc-900 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Total Users</CardTitle>
            <Users className="w-4 h-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.users}</div>
            <p className="text-xs text-zinc-500 mt-1">Registered accounts</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Profitable Amount</CardTitle>
            <DollarSign className="w-4 h-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">${stats.profitableAmount}</div>
            <p className="text-xs text-zinc-500 mt-1">Estimated revenue</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">User Connections</CardTitle>
            <Activity className="w-4 h-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.applications}</div>
            <p className="text-xs text-zinc-500 mt-1">Total job applications</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Admin Messages</CardTitle>
            <MessageSquare className="w-4 h-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.messages}</div>
            <p className="text-xs text-zinc-500 mt-1">Contact requests</p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-zinc-900 border border-white/10 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
          <MessageSquare className="w-5 h-5 mr-2 text-zinc-400" />
          Recent Contact Messages
        </h2>
        
        {recentMessages.length === 0 ? (
          <p className="text-zinc-500 text-center py-8">No messages received yet.</p>
        ) : (
          <div className="space-y-4">
            {recentMessages.map((msg) => (
              <div key={msg.id} className="bg-zinc-950 border border-white/5 p-4 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-white">{msg.title}</h3>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-zinc-500">{new Date(msg.created_at).toLocaleString()}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setReplyingTo(replyingTo === msg.id ? null : msg.id)}
                      className="text-zinc-400 hover:text-white h-8"
                    >
                      <Reply className="w-4 h-4 mr-2" />
                      Reply
                    </Button>
                  </div>
                </div>
                <p className="text-zinc-300 text-sm whitespace-pre-wrap">{msg.content}</p>
                
                {replyingTo === msg.id && (
                  <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                    <Textarea 
                      placeholder="Type your reply here..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="bg-zinc-900 border-white/10 text-white min-h-[100px]"
                    />
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        onClick={() => { setReplyingTo(null); setReplyText(""); }}
                        className="text-zinc-400 hover:text-white"
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={() => handleReply(msg)}
                        disabled={sendingReply || !replyText.trim()}
                        className="bg-green-600 hover:bg-green-500 text-white"
                      >
                        {sendingReply ? "Sending..." : "Send Reply"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
