import { useState, useEffect, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { Trash2, ShieldAlert, ShieldCheck, CheckCircle, XCircle, Search, Star, Check } from "lucide-react"
import { VerificationBadge } from '@/components/ui/VerificationBadge';

export function UsersManager() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    fetchUsers()
    
    const subscription = supabase
      .channel('users_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'content_blocks', filter: "title=eq.user_profile" }, fetchUsers)
      .subscribe()

    return () => { supabase.removeChannel(subscription) }
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("content_blocks")
      .select("*")

    if (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users: " + error.message)
    } else {
      console.log("Fetched users raw data:", data);
      const parsedUsers = data?.filter(d => d.title === "user_profile").map(d => {
        try {
          return { ...JSON.parse(d.content), _block_id: d.id, created_at: d.created_at }
        } catch (e) {
          console.error("Error parsing user profile:", e, d.content);
          return null
        }
      }).filter(Boolean) || []
      console.log("Parsed users:", parsedUsers);
      setUsers(parsedUsers)
    }
    setLoading(false)
  }

  const handleToggleBan = async (id: string, currentStatus: boolean, blockId: string, userObj: any) => {
    if (userObj.email === 'natifreak0@gmail.com') { // Prevent banning the main admin
      toast.error("Cannot ban the primary administrator")
      return
    }

    const updatedUser = { ...userObj, is_banned: !currentStatus }
    const { error } = await supabase
      .from("content_blocks")
      .update({ content: JSON.stringify(updatedUser) })
      .eq("id", blockId)

    if (error) toast.error("Failed to update user status")
    else toast.success(`User ${!currentStatus ? 'banned' : 'unbanned'}`)
  }

  const handleToggleVerify = async (id: string, currentStatus: boolean, blockId: string, userObj: any) => {
    const updatedUser = { ...userObj, is_verified: !currentStatus }
    const { error } = await supabase
      .from("content_blocks")
      .update({ content: JSON.stringify(updatedUser) })
      .eq("id", blockId)

    if (error) toast.error("Failed to update verification status")
    else toast.success(`User ${!currentStatus ? 'verified' : 'unverified'}`)
  }

  const handleDelete = async (id: string, email: string, blockId: string) => {
    if (email === 'natifreak0@gmail.com') {
      toast.error("Cannot delete the primary administrator")
      return
    }
    
    const { error } = await supabase
      .from("content_blocks")
      .delete()
      .eq("id", blockId)

    if (error) toast.error("Failed to delete user")
    else toast.success("User deleted")
  }

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = (user.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
                            (user.name?.toLowerCase() || '').includes(searchQuery.toLowerCase())
      
      const matchesRole = roleFilter === 'all' ? true : user.role === roleFilter
      
      const matchesStatus = statusFilter === 'all' ? true : 
                            statusFilter === 'banned' ? user.is_banned : !user.is_banned

      return matchesSearch && matchesRole && matchesStatus
    })
  }, [users, searchQuery, roleFilter, statusFilter])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Users Manager</h1>
        <p className="text-zinc-400">Manage user accounts, roles, verification, and access.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 bg-zinc-900 p-4 rounded-xl border border-white/10">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input 
            placeholder="Search by name or email..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-zinc-950 border-white/10 text-white"
          />
        </div>
        <select 
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-zinc-950 border border-white/10 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="employer">Employer</option>
          <option value="seeker">Seeker</option>
        </select>
        <select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-zinc-950 border border-white/10 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="banned">Banned</option>
        </select>
      </div>

      <div className="bg-zinc-900 border border-white/10 rounded-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-zinc-950/50">
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-zinc-400">Email</TableHead>
              <TableHead className="text-zinc-400">Name</TableHead>
              <TableHead className="text-zinc-400">Role</TableHead>
              <TableHead className="text-zinc-400">Status</TableHead>
              <TableHead className="text-zinc-400">Joined</TableHead>
              <TableHead className="text-right text-zinc-400">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="border-white/10"><TableCell colSpan={6} className="text-center text-zinc-500 py-8">Loading...</TableCell></TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow className="border-white/10"><TableCell colSpan={6} className="text-center text-zinc-500 py-8">No users found.</TableCell></TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id} className="border-white/10 hover:bg-white/5">
                  <TableCell className="font-medium text-white">
                    {user.email}
                    <VerificationBadge role={user.role} size="sm" />
                  </TableCell>
                  <TableCell className="text-zinc-300">
                    {user.username ? (
                      <span className="text-green-400 font-medium">@{user.username}</span>
                    ) : (
                      user.name || 'N/A'
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300 border border-white/10 capitalize">
                      {user.role}
                    </span>
                  </TableCell>
                  <TableCell>
                    {user.is_banned ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">Banned</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">Active</span>
                    )}
                  </TableCell>
                  <TableCell className="text-zinc-400 text-sm">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleToggleVerify(user.id, user.is_verified, user._block_id, user)} 
                      className={user.is_verified ? "text-blue-400 hover:text-blue-300 hover:bg-blue-400/10" : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-400/10"}
                      title={user.is_verified ? "Remove Verification" : "Verify User"}
                    >
                      {user.is_verified ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleToggleBan(user.id, user.is_banned, user._block_id, user)} 
                      className={user.is_banned ? "text-green-400 hover:text-green-300 hover:bg-green-400/10" : "text-orange-400 hover:text-orange-300 hover:bg-orange-400/10"}
                      title={user.is_banned ? "Unban" : "Ban"}
                      disabled={user.email === 'natifreak0@gmail.com'}
                    >
                      {user.is_banned ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(user.id, user.email, user._block_id)} 
                      className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                      title="Delete"
                      disabled={user.email === 'natifreak0@gmail.com'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
