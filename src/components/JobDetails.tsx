import { useState, useEffect } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { MapPin, Briefcase, Clock, ArrowLeft, Star, Check } from "lucide-react"
import { VerificationBadge } from '@/components/ui/VerificationBadge';
import { toast } from "sonner"

export function JobDetails() {
  const { id } = useParams()
  const [job, setJob] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      fetchJob()
      incrementViewCount()
    }
  }, [id])

  const fetchJob = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("jobs")
      .select("*, categories(name)")
      .eq("id", id)
      .single()

    if (error) {
      toast.error("Failed to load job details")
    } else if (data) {
      // Fetch extra details from content_blocks
      const { data: detailsData } = await supabase
        .from("content_blocks")
        .select("content")
        .eq("key", `job_details_${id}`)
        .single()

      let details: any = {}
      if (detailsData) {
        try {
          details = JSON.parse(detailsData.content)
        } catch(e) {}
      }

      let employerVerified = false
      let employerRole = 'employer'
      if (details.posted_by) {
        const { data: employerData } = await supabase
          .from("content_blocks")
          .select("content")
          .eq("key", `user_profile_${details.posted_by}`)
          .single()
        
        if (employerData) {
          try {
            const emp = JSON.parse(employerData.content)
            employerRole = emp.role || 'employer'
            employerVerified = employerRole === 'employer' || employerRole === 'admin' || emp.is_verified || false
            
            // Override company name from profile if available
            if (emp.username || emp.full_name || emp.name) {
              details.company_name = emp.username || emp.full_name || emp.name;
            }
          } catch(e) {}
        }
      }

      setJob({ ...data, ...details, employer_verified: employerVerified, role: employerRole })
    }
    setLoading(false)
  }

  const incrementViewCount = async () => {
    // We use a simple update for now. In a real app, you'd use an RPC function to avoid race conditions.
    const { data } = await supabase
      .from("jobs")
      .select("views_count")
      .eq("id", id)
      .single()
      
    if (data) {
      await supabase
        .from("jobs")
        .update({ views_count: (data.views_count || 0) + 1 })
        .eq("id", id)
    }
  }

  const navigate = useNavigate()
  
  const handleApply = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      toast.error("Please log in to apply for this job.")
      window.dispatchEvent(new CustomEvent('open-login'));
      return
    }

    // We removed the applications_count increment as it might be causing issues if the column doesn't exist.
    // The main goal is to redirect to chat with the employer.
    toast.success("Redirecting to chat with employer...")
    if (job.posted_by) {
      const params = new URLSearchParams();
      params.set('jobTitle', job.title);
      params.set('jobId', job.id);
      navigate(`/chat/${job.posted_by}?${params.toString()}`);
    } else {
      toast.error("Employer contact information not found.")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white pt-32 pb-12 flex items-center justify-center">
        <p className="text-zinc-400">Loading job details...</p>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white pt-32 pb-12 flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold mb-4">Job Not Found</h2>
        <Link to="/search">
          <Button variant="outline" className="border-white/10 text-white hover:bg-white/5">
            Back to Search
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 pt-32 pb-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        <Link to="/search" className="inline-flex items-center text-zinc-400 hover:text-white mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Search
        </Link>

        <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-8 md:p-12">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
            <div className="flex flex-col md:flex-row gap-6">
              {job.image_url && (
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-xl overflow-hidden shrink-0 bg-zinc-900 border border-zinc-800">
                  <img src={job.image_url} alt={job.title} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                </div>
              )}
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">{job.title}</h1>
                <div className="flex flex-wrap items-center gap-3 text-zinc-400 text-lg">
                  <span className="font-medium text-zinc-300 flex items-center">
                    {job.company_name || 'Independent Employer'}
                    {job.employer_verified && (
                      <VerificationBadge role={job.role || 'employer'} />
                    )}
                  </span>
                  {job.location && (
                    <>
                      <span className="hidden sm:inline">•</span>
                      <span className="flex items-center"><MapPin className="w-4 h-4 mr-1.5" /> {job.location}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-start md:items-end gap-3">
              {job.salary_range && (
                <span className="text-2xl font-semibold text-green-400">{job.salary_range}</span>
              )}
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <Button onClick={handleApply} className="flex-1 sm:flex-none bg-green-600 hover:bg-green-500 text-white px-8 py-6 text-lg rounded-xl">
                  Apply Now
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mb-12 pb-12 border-b border-white/10">
            {job.categories?.name && (
              <span className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-300 border border-white/5">
                {job.categories.name}
              </span>
            )}
            {job.job_type && (
              <span className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-300 border border-white/5">
                <Briefcase className="w-4 h-4 mr-2" />
                {job.job_type}
              </span>
            )}
            {job.urgency && (
              <span className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20">
                <Clock className="w-4 h-4 mr-2" />
                {job.urgency}
              </span>
            )}
          </div>

          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Job Description</h2>
              <div className="prose prose-invert max-w-none text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {job.description || "No description provided."}
              </div>
            </section>

            {job.requirements && (
              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Requirements</h2>
                <div className="prose prose-invert max-w-none text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {job.requirements}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
