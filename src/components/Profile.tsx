import * as React from "react"
import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { User as UserIcon, Lock, Mail, Camera, ShieldCheck, BadgeCheck, MessageSquare, Briefcase, Search as SearchIcon } from "lucide-react"
import { motion } from "motion/react"

const RoleBadge = ({ role }: { role: string }) => {
  if (role === 'admin') {
    return (
      <div className="relative flex items-center justify-center gap-2 mb-6 text-red-400 bg-red-500/10 py-3 px-6 rounded-lg border border-red-500/20 overflow-hidden">
        {/* Particle Animation */}
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 bg-red-500 rounded-full"
            initial={{ 
              x: 0, 
              y: 0, 
              opacity: 1 
            }}
            animate={{ 
              x: (Math.random() - 0.5) * 400, 
              y: (Math.random() - 0.5) * 100, 
              opacity: [1, 0.8, 0] 
            }}
            transition={{ 
              duration: Math.random() * 2 + 1.5, 
              repeat: Infinity, 
              ease: "easeOut",
              delay: Math.random() * 2
            }}
          />
        ))}
        <ShieldCheck className="w-5 h-5 z-10" />
        <span className="text-sm font-bold tracking-wider uppercase z-10">Role: Admin</span>
      </div>
    )
  }

  if (role === 'employer') {
    return (
      <div className="flex items-center justify-center gap-2 mb-6 text-blue-400 bg-blue-500/10 py-3 px-6 rounded-lg border border-blue-500/20">
        <BadgeCheck className="w-5 h-5" />
        <span className="text-sm font-bold tracking-wider uppercase">Verified Employer</span>
      </div>
    )
  }

  // Seeker / Finder
  return (
    <motion.div 
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, type: "spring", bounce: 0.5 }}
      className="flex items-center justify-center gap-2 mb-6 text-green-400 bg-green-500/10 py-3 px-6 rounded-lg border border-green-500/20"
    >
      <SearchIcon className="w-5 h-5" />
      <span className="text-sm font-bold tracking-wider uppercase">Role: {role === 'finder' ? 'Finder' : 'Seeker'}</span>
    </motion.div>
  )
}

export function Profile() {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Profile state
  const [fullName, setFullName] = useState("")
  const [username, setUsername] = useState("")
  const [lastUsernameChange, setLastUsernameChange] = useState<string | null>(null)
  const [isVerified, setIsVerified] = useState(false)
  const [updatingProfile, setUpdatingProfile] = useState(false)
  
  // Password state
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [updatingPassword, setUpdatingPassword] = useState(false)

  // Messages state
  const [myMessages, setMyMessages] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  useEffect(() => {
    const getProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        navigate("/")
        return
      }
      
      setUser(session.user)
      setFullName(session.user.user_metadata?.full_name || "")
      setUsername(session.user.user_metadata?.username || "")
      setLastUsernameChange(session.user.user_metadata?.last_username_change || null)
      setIsVerified(session.user.user_metadata?.is_verified || false)

      // Fetch user's messages
      const { data: messages } = await supabase
        .from("content_blocks")
        .select("*")
        .eq("title", "support_ticket")
        .like("key", `support_${session.user.id}_%`)
      
      if (messages) {
        const parsed = messages.map(m => {
          try {
            return { id: m.id, ...JSON.parse(m.content) };
          } catch(e) { return null; }
        }).filter(Boolean);
        setMyMessages(parsed);
      }

      setLoading(false)
    }

    getProfile()
  }, [navigate])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check username cooldown
    if (username !== (user?.user_metadata?.username || "")) {
      if (lastUsernameChange) {
        const lastChange = new Date(lastUsernameChange)
        const now = new Date()
        const diffDays = Math.ceil(Math.abs(now.getTime() - lastChange.getTime()) / (1000 * 60 * 60 * 24))
        
        if (diffDays < 7) {
          toast.error(`You can only change your username once every 7 days. Please wait ${7 - diffDays} more days.`)
          return
        }
      }
    }

    setUpdatingProfile(true)
    
    const updates: any = { 
      full_name: fullName,
      username: username
    }

    if (username !== (user?.user_metadata?.username || "")) {
      updates.last_username_change = new Date().toISOString()
    }

    const { error } = await supabase.auth.updateUser({
      data: updates
    })
    
    if (error) {
      toast.error(error.message)
    } else {
      // Update content_blocks as well
      const { data: profileData } = await supabase
        .from('content_blocks')
        .select('*')
        .eq('key', `user_profile_${user?.id}`)
        .single();
      
      if (profileData) {
        const content = JSON.parse(profileData.content);
        content.username = username;
        content.full_name = fullName;
        await supabase.from('content_blocks').update({
          content: JSON.stringify(content)
        }).eq('id', profileData.id);

        // Also update all jobs posted by this user to reflect the new company name
        const newCompanyName = username || fullName;
        if (newCompanyName) {
          await supabase.from('jobs').update({
            company_name: newCompanyName
          }).eq('posted_by', user?.id);

          // And update job_details content_blocks
          const { data: jobDetailsBlocks } = await supabase
            .from('content_blocks')
            .select('*')
            .like('key', 'job_details_%')
            .ilike('content', `%${user?.id}%`);
          
          if (jobDetailsBlocks) {
            for (const block of jobDetailsBlocks) {
              try {
                const blockContent = JSON.parse(block.content);
                if (blockContent.posted_by === user?.id) {
                  blockContent.company_name = newCompanyName;
                  await supabase.from('content_blocks').update({
                    content: JSON.stringify(blockContent)
                  }).eq('id', block.id);
                }
              } catch(e) {}
            }
          }
        }
      }

      toast.success("Profile updated successfully")
      setLastUsernameChange(updates.last_username_change || lastUsernameChange)
    }
    
    setUpdatingProfile(false)
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }
    
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }
    
    setUpdatingPassword(true)
    
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })
    
    if (error) {
      toast.error(error.message)
    } else {
      toast.success("Password updated successfully")
      setNewPassword("")
      setConfirmPassword("")
    }
    
    setUpdatingPassword(false)
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size must be less than 2MB")
      return
    }

    setUploadingAvatar(true)
    const reader = new FileReader()
    reader.onloadend = async () => {
      const base64 = reader.result as string
      
      const { error: authError } = await supabase.auth.updateUser({
        data: { avatar_url: base64 }
      })

      if (authError) {
        toast.error(authError.message)
      } else {
        const { data: profileData } = await supabase
          .from('content_blocks')
          .select('*')
          .eq('key', `user_profile_${user?.id}`)
          .single();
        
        if (profileData) {
          const content = JSON.parse(profileData.content);
          content.avatar_url = base64;
          await supabase.from('content_blocks').update({
            content: JSON.stringify(content)
          }).eq('id', profileData.id);
        }

        const { data: { user: updatedUser } } = await supabase.auth.getUser()
        setUser(updatedUser)
        toast.success("Profile picture updated")
      }
      setUploadingAvatar(false)
    }
    reader.readAsDataURL(file)
  }

  const isAdmin = user?.user_metadata?.role === 'admin' || user?.email === 'natifreak0@gmail.com'

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-12 flex items-center justify-center bg-zinc-950">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-24 pb-12 bg-zinc-950 text-white">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Account Settings</h1>
        
        <div className="grid gap-8 md:grid-cols-2">
          {/* Profile Settings */}
          <Card className="bg-zinc-900 border-white/10 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-green-400" />
                Profile Information
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Update your account profile details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleAvatarUpload} 
                      className="hidden" 
                      accept="image/*" 
                    />
                    <div className="w-24 h-24 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center overflow-hidden">
                      {uploadingAvatar ? (
                        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-green-500"></div>
                      ) : user?.user_metadata?.avatar_url ? (
                        <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-10 h-10 text-zinc-500" />
                      )}
                    </div>
                    <button 
                      type="button" 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="absolute bottom-0 right-0 bg-green-600 p-2 rounded-full hover:bg-green-500 transition-colors disabled:opacity-50"
                    >
                      <Camera className="w-4 h-4 text-white" />
                    </button>
                    {user?.user_metadata?.role === 'employer' && (
                      <div className="absolute -top-2 -right-2 bg-blue-500 text-white p-1 rounded-full shadow-lg" title="Verified Employer">
                        <BadgeCheck className="w-5 h-5" />
                      </div>
                    )}
                    {isAdmin && (
                      <div className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg" title="Admin Account">
                        <BadgeCheck className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                </div>
                
                <RoleBadge role={isAdmin ? 'admin' : (user?.user_metadata?.role || 'seeker')} />
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-zinc-300">Email Address (Cannot be changed)</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                    <Input 
                      id="email" 
                      value={user?.email || ""} 
                      disabled 
                      className="pl-9 bg-zinc-950/50 border-white/10 text-zinc-400"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username" className="text-zinc-300">Username (Can be changed every 7 days)</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                    <Input 
                      id="username" 
                      value={username} 
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-9 bg-zinc-950 border-white/10 text-white focus:ring-green-500"
                      placeholder="Choose a professional username"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-zinc-300">Full Name</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                    <Input 
                      id="fullName" 
                      value={fullName} 
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-9 bg-zinc-950 border-white/10 text-white focus:ring-green-500"
                      placeholder="Your full name"
                    />
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  disabled={updatingProfile}
                  className="w-full bg-green-600 hover:bg-green-500 text-white"
                >
                  {updatingProfile ? "Saving..." : "Save Profile"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card className="bg-zinc-900 border-white/10 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-green-400" />
                Security
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Update your password to keep your account secure.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-zinc-300">New Password</Label>
                  <Input 
                    id="newPassword" 
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-zinc-950 border-white/10 text-white focus:ring-green-500"
                    placeholder="Enter new password"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-zinc-300">Confirm New Password</Label>
                  <Input 
                    id="confirmPassword" 
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-zinc-950 border-white/10 text-white focus:ring-green-500"
                    placeholder="Confirm new password"
                  />
                </div>
                
                <Button 
                  type="submit" 
                  disabled={updatingPassword || !newPassword || !confirmPassword}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10"
                >
                  {updatingPassword ? "Updating..." : "Update Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* User Messages */}
        {!isAdmin && (
          <div className="mt-8">
            <Card className="bg-zinc-900 border-white/10 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-green-400" />
                  My Messages & Support
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  View your past messages to the admin and their replies.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {myMessages.length === 0 ? (
                  <p className="text-zinc-500 text-center py-8">You haven't sent any messages yet.</p>
                ) : (
                  <div className="space-y-4">
                    {myMessages.map((msg) => (
                      <div key={msg.id} className="bg-zinc-950 border border-white/5 p-4 rounded-lg">
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="font-medium text-white">{msg.subject}</h3>
                          <span className="text-xs text-zinc-500">{new Date(msg.messages?.[0]?.timestamp || Date.now()).toLocaleDateString()}</span>
                        </div>
                        <div className="space-y-4">
                          {msg.messages?.map((m: any, idx: number) => (
                            <div key={idx} className={`flex ${m.sender === 'admin' ? 'justify-start' : 'justify-end'}`}>
                              <div className={`max-w-[80%] rounded-xl p-3 ${m.sender === 'admin' ? 'bg-zinc-800 text-zinc-200' : 'bg-green-600/20 border border-green-500/30 text-white'}`}>
                                {m.sender === 'admin' && (
                                  <div className="flex items-center gap-2 mb-1 text-green-400 text-xs font-semibold">
                                    <ShieldCheck className="w-3 h-3" />
                                    {m.admin_name} (Admin)
                                  </div>
                                )}
                                <p className="whitespace-pre-wrap text-sm">{m.text}</p>
                                <span className="text-[10px] text-zinc-500 mt-2 block">
                                  {new Date(m.timestamp).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
