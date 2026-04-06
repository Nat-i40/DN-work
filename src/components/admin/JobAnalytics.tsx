import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { BarChart3, Eye, FileText } from "lucide-react"

export function JobAnalytics() {
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
    
    const subscription = supabase
      .channel('jobs_analytics_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, fetchAnalytics)
      .subscribe()

    return () => { supabase.removeChannel(subscription) }
  }, [])

  const fetchAnalytics = async () => {
    setLoading(true)
    console.log("Fetching job analytics...");
    const { data, error } = await supabase
      .from("jobs")
      .select("id, title, company_name, created_at")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching job analytics:", error);
      toast.error("Failed to load job analytics: " + error.message)
    } else {
      console.log("Fetched job analytics data:", data);
      setJobs(data || [])
    }
    setLoading(false)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Job Analytics</h1>
        <p className="text-zinc-400">Track views and applications for all posted jobs.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
        <div className="bg-zinc-900 border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white">Active Jobs</h3>
            <BarChart3 className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-3xl font-bold text-white">
            {jobs.length}
          </p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-white/10 rounded-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-zinc-950/50">
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-zinc-400">Job Title</TableHead>
              <TableHead className="text-zinc-400">Company</TableHead>
              <TableHead className="text-zinc-400">Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="border-white/10"><TableCell colSpan={3} className="text-center text-zinc-500 py-8">Loading...</TableCell></TableRow>
            ) : jobs.length === 0 ? (
              <TableRow className="border-white/10"><TableCell colSpan={3} className="text-center text-zinc-500 py-8">No jobs found.</TableCell></TableRow>
            ) : (
              jobs.map((job) => {
                return (
                  <TableRow key={job.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="font-medium text-white">{job.title}</TableCell>
                    <TableCell className="text-zinc-300">{job.company_name || 'N/A'}</TableCell>
                    <TableCell className="text-zinc-300">{new Date(job.created_at).toLocaleDateString()}</TableCell>
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
