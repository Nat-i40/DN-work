import { useState, useEffect, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { Trash2, CheckCircle, XCircle, Star, StarOff, Search, Calendar } from "lucide-react"

export function JobsModerator() {
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [featuredFilter, setFeaturedFilter] = useState("all")

  useEffect(() => {
    fetchJobs()
    
    const subscription = supabase
      .channel('jobs_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, fetchJobs)
      .subscribe()

    return () => { supabase.removeChannel(subscription) }
  }, [])

  const fetchJobs = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("jobs")
      .select("*, categories!left(name)")
      .order("created_at", { ascending: false })

    if (error) {
      toast.error("Failed to load jobs")
    } else if (data) {
      const { data: detailsData } = await supabase
        .from("content_blocks")
        .select("*")
        .like("key", "job_details_%");

      const detailsMap: Record<string, any> = {};
      if (detailsData) {
        detailsData.forEach(d => {
          const jobId = d.key.replace("job_details_", "");
          try {
            detailsMap[jobId] = JSON.parse(d.content);
          } catch(e) {}
        });
      }

      const merged = data.map(job => ({
        ...job,
        users: { email: detailsMap[job.id]?.email || 'Unknown' }
      }));
      setJobs(merged)
    }
    setLoading(false)
  }

  const handleToggleVerify = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("jobs")
      .update({ is_verified: !currentStatus })
      .eq("id", id)

    if (error) toast.error("Failed to update verification status")
    else toast.success(`Job ${!currentStatus ? 'verified' : 'unverified'}`)
  }

  const handleToggleFeatured = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("jobs")
      .update({ featured: !currentStatus })
      .eq("id", id)

    if (error) toast.error("Failed to update featured status")
    else toast.success(`Job ${!currentStatus ? 'featured' : 'unfeatured'}`)
  }

  const handleUpdateExpiration = async (id: string, date: string) => {
    const { error } = await supabase
      .from("jobs")
      .update({ expires_at: date ? new Date(date).toISOString() : null })
      .eq("id", id)

    if (error) toast.error("Failed to update expiration date")
    else toast.success("Expiration date updated")
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("jobs")
      .delete()
      .eq("id", id)

    if (error) toast.error("Failed to delete job")
    else toast.success("Job deleted")
  }

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchesSearch = (job.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
                            (job.company_name?.toLowerCase() || '').includes(searchQuery.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' ? true : 
                            statusFilter === 'verified' ? job.is_verified : !job.is_verified
      
      const matchesFeatured = featuredFilter === 'all' ? true :
                              featuredFilter === 'featured' ? job.featured : !job.featured

      return matchesSearch && matchesStatus && matchesFeatured
    })
  }, [jobs, searchQuery, statusFilter, featuredFilter])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Jobs Moderator</h1>
        <p className="text-zinc-400">Review, verify, feature, or remove job postings. Set expiration dates.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 bg-zinc-900 p-4 rounded-xl border border-white/10">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input 
            placeholder="Search by title or company..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-zinc-950 border-white/10 text-white"
          />
        </div>
        <select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-zinc-950 border border-white/10 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="all">All Statuses</option>
          <option value="verified">Verified</option>
          <option value="pending">Pending</option>
        </select>
        <select 
          value={featuredFilter}
          onChange={(e) => setFeaturedFilter(e.target.value)}
          className="bg-zinc-950 border border-white/10 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="all">All Featured</option>
          <option value="featured">Featured</option>
          <option value="standard">Standard</option>
        </select>
      </div>

      <div className="bg-zinc-900 border border-white/10 rounded-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-zinc-950/50">
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-zinc-400">Title</TableHead>
              <TableHead className="text-zinc-400">Company</TableHead>
              <TableHead className="text-zinc-400">Status</TableHead>
              <TableHead className="text-zinc-400">Expires At</TableHead>
              <TableHead className="text-right text-zinc-400">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="border-white/10"><TableCell colSpan={5} className="text-center text-zinc-500 py-8">Loading...</TableCell></TableRow>
            ) : filteredJobs.length === 0 ? (
              <TableRow className="border-white/10"><TableCell colSpan={5} className="text-center text-zinc-500 py-8">No jobs found.</TableCell></TableRow>
            ) : (
              filteredJobs.map((job) => {
                const isExpired = job.expires_at && new Date(job.expires_at) < new Date()
                return (
                <TableRow key={job.id} className={`border-white/10 hover:bg-white/5 ${isExpired ? 'opacity-50' : ''}`}>
                  <TableCell className="font-medium text-white">
                    {job.title}
                    {isExpired && <span className="ml-2 text-xs text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full">Expired</span>}
                  </TableCell>
                  <TableCell className="text-zinc-300">
                    <div className="flex flex-col">
                      <span className="font-medium">{job.company_name || 'N/A'}</span>
                      <span className="text-xs text-zinc-500 flex items-center gap-1">
                        by {job.users?.email || 'Unknown'}
                        {job.is_verified && <CheckCircle className="w-3 h-3 text-blue-400" title="Verified Employer" />}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {job.is_verified ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">Verified</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">Pending</span>
                      )}
                      {job.featured && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">Featured</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-zinc-500" />
                      <input 
                        type="date" 
                        className="bg-transparent text-sm text-zinc-300 border-b border-transparent hover:border-white/20 focus:border-green-500 focus:outline-none"
                        value={job.expires_at ? new Date(job.expires_at).toISOString().split('T')[0] : ''}
                        onChange={(e) => handleUpdateExpiration(job.id, e.target.value)}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleToggleVerify(job.id, job.is_verified)} 
                      className={job.is_verified ? "text-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/10" : "text-green-400 hover:text-green-300 hover:bg-green-400/10"}
                      title={job.is_verified ? "Unverify" : "Verify"}
                    >
                      {job.is_verified ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleToggleFeatured(job.id, job.featured)} 
                      className={job.featured ? "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-400/10" : "text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"}
                      title={job.featured ? "Remove Featured" : "Feature"}
                    >
                      {job.featured ? <StarOff className="w-4 h-4" /> : <Star className="w-4 h-4" />}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(job.id)} 
                      className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
