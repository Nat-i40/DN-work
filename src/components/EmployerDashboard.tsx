import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Briefcase, Trash2, Edit, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

export function EmployerDashboard() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyJobs();
  }, []);

  const fetchMyJobs = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Fetch job details from content_blocks where posted_by is the current user
    const { data: detailsData } = await supabase
      .from("content_blocks")
      .select("*")
      .like("key", "job_details_%")
      .ilike("content", `%${session.user.id}%`);

    if (!detailsData || detailsData.length === 0) {
      setJobs([]);
      setLoading(false);
      return;
    }

    const detailsMap: Record<string, any> = {};
    const jobIds: string[] = [];

    detailsData.forEach(d => {
      const jobId = d.key.replace("job_details_", "");
      try {
        const parsed = JSON.parse(d.content);
        if (parsed.posted_by === session.user.id) {
          detailsMap[jobId] = parsed;
          jobIds.push(jobId);
        }
      } catch(e) {}
    });

    if (jobIds.length === 0) {
      setJobs([]);
      setLoading(false);
      return;
    }

    // Fetch the actual jobs
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .in('id', jobIds)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error("Failed to load your jobs");
    } else if (data) {
      const merged = data.map(job => ({
        ...job,
        ...(detailsMap[job.id] || {})
      }));
      
      setJobs(merged);
    } else {
      setJobs([]);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error("Failed to delete job");
    } else {
      toast.success("Job deleted successfully");
      fetchMyJobs();
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-32 bg-zinc-950 text-white">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="w-8 h-8 text-blue-500" />
            <h1 className="text-3xl font-bold">Employer Dashboard</h1>
          </div>
          <Link to="/post-job">
            <Button className="bg-blue-600 hover:bg-blue-500 text-white">Post New Job</Button>
          </Link>
        </div>
        
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-zinc-400" />
            Manage Your Jobs
          </h2>
          
          {loading ? (
            <div className="text-center py-12 text-zinc-500">Loading your jobs...</div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-400 mb-6 max-w-md mx-auto">
                You haven't posted any jobs yet. Create your first job posting to start finding candidates.
              </p>
              <Link to="/post-job">
                <Button variant="outline" className="border-zinc-700 text-white hover:bg-zinc-800">
                  Post a Job Now
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <div key={job.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-zinc-950/50 border border-zinc-800 rounded-lg gap-4">
                  <div>
                    <h3 className="font-medium text-lg">{job.title}</h3>
                    <div className="flex items-center gap-3 text-sm text-zinc-400 mt-1">
                      <span>{job.location}</span>
                      <span>•</span>
                      <span>{job.job_type}</span>
                      <span>•</span>
                      <span className={job.is_verified ? "text-green-400" : "text-yellow-400"}>
                        {job.is_verified ? "Verified" : "Pending Verification"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Link to={`/jobs/${job.id}`} className="flex-1 sm:flex-none">
                      <Button variant="outline" size="sm" className="w-full border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800">
                        <Eye className="w-4 h-4 mr-2" /> View
                      </Button>
                    </Link>
                    <Button variant="outline" size="sm" className="flex-1 sm:flex-none border-zinc-700 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10">
                      <Edit className="w-4 h-4 mr-2" /> Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDelete(job.id)}
                      className="flex-1 sm:flex-none border-zinc-700 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
