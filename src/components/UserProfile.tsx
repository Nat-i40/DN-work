import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { User as UserIcon, Star, Briefcase, ArrowLeft, MessageCircle, Check } from 'lucide-react';
import { VerificationBadge } from '@/components/ui/VerificationBadge';

export function UserProfile() {
  const { userId } = useParams();
  const [user, setUser] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Rating form
  const [newRating, setNewRating] = useState(5);
  const [newReview, setNewReview] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    checkAuth();
    if (userId) {
      fetchUserData();
      fetchUserJobs();
      fetchRatings();
    }
  }, [userId]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) setCurrentUser(session.user);
  };

  const fetchUserData = async () => {
    // Try to get user profile from content_blocks
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
        role = parsed.role || "seeker";
        avatarUrl = parsed.avatar_url || null;
        // Override verification based on role as requested
        isVerified = role === 'employer' || role === 'admin' || parsed.is_verified || false;
      } catch(e) {}
    }
    setUser({ id: userId, name, isVerified, role, avatarUrl });
  };

  const fetchUserJobs = async () => {
    const { data: detailsData } = await supabase
      .from("content_blocks")
      .select("*")
      .like("key", "job_details_%")
      .ilike("content", `%${userId}%`);

    if (!detailsData || detailsData.length === 0) {
      setJobs([]);
      return;
    }

    const jobIds: string[] = [];
    detailsData.forEach(d => {
      const jobId = d.key.replace("job_details_", "");
      try {
        const parsed = JSON.parse(d.content);
        if (parsed.posted_by === userId) {
          jobIds.push(jobId);
        }
      } catch(e) {}
    });

    if (jobIds.length === 0) {
      setJobs([]);
      return;
    }

    const { data } = await supabase
      .from('jobs')
      .select('*')
      .in('id', jobIds)
      .order('created_at', { ascending: false });
    
    if (data) setJobs(data);
  };

  const fetchRatings = async () => {
    console.log("Fetching ratings for userId:", userId);
    const { data, error } = await supabase
      .from('content_blocks')
      .select('*')
      .eq('title', 'user_rating');
      
    if (error) {
      console.error("Error fetching ratings:", error);
    }
    
    if (data) {
      console.log("Ratings data:", data);
      const parsed = data.map(d => {
        try {
          const content = JSON.parse(d.content);
          // Filter by to_id (either from Chat or UserProfile submission)
          if (content.to_id === userId || content.receiver_id === userId) {
            return content;
          }
          return null;
        } catch(e) { return null; }
      }).filter(Boolean);
      console.log("Parsed ratings:", parsed);
      setRatings(parsed);
    }
    setLoading(false);
  };

  const submitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !userId) return;
    setSubmitting(true);

    const ratingData = {
      from_id: currentUser.id,
      from_name: currentUser.user_metadata?.username || currentUser.user_metadata?.full_name || currentUser.email,
      to_id: userId,
      rating: newRating,
      review: newReview,
      timestamp: new Date().toISOString()
    };

    const { error } = await supabase.from('content_blocks').insert([{
      key: `rating_${userId}_${currentUser.id}_${Date.now()}`,
      title: 'user_rating',
      content: JSON.stringify(ratingData)
    }]);

    if (error) {
      toast.error("Failed to submit rating");
    } else {
      toast.success("Rating submitted successfully");
      setNewReview("");
      setNewRating(5);
      fetchRatings();
    }
    setSubmitting(false);
  };

  const averageRating = ratings.length > 0 
    ? (ratings.reduce((acc, r) => acc + r.rating, 0) / ratings.length).toFixed(1) 
    : "No ratings yet";

  if (loading) {
    return <div className="min-h-screen pt-24 pb-32 bg-zinc-950 text-white flex justify-center items-center">Loading profile...</div>;
  }

  return (
    <div className="min-h-screen pt-24 pb-32 bg-zinc-950 text-white">
      <div className="container mx-auto px-4 max-w-4xl">
        <Link to={-1 as any} className="inline-flex items-center text-zinc-400 hover:text-white mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Link>

        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-8 mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="w-24 h-24 bg-zinc-800 rounded-full flex items-center justify-center border-4 border-zinc-950 shadow-xl relative overflow-hidden">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-10 h-10 text-zinc-400" />
              )}
              {user?.role === 'employer' && (
                <div className="absolute -top-1 -right-1 bg-blue-600 rounded-full p-1.5 shadow-lg border-2 border-zinc-950">
                  <Check className="w-4 h-4 text-white stroke-[3px]" />
                </div>
              )}
              {user?.role === 'admin' && (
                <div className="absolute -top-1 -right-1 bg-red-600 rounded-full p-1.5 shadow-lg border-2 border-zinc-950">
                  <Check className="w-4 h-4 text-white stroke-[3px]" />
                </div>
              )}
            </div>
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-2 mb-2">
                <h1 className="text-3xl font-bold flex items-center">
                  {user?.name}
                  <VerificationBadge role={user?.role} size="lg" />
                </h1>
                <span className={`px-3 py-1 rounded-full text-xs font-medium border border-white/5 capitalize mt-1 ${
                  user?.role === 'admin' ? 'bg-red-500/10 text-red-400' : 
                  user?.role === 'employer' ? 'bg-blue-500/10 text-blue-400' : 
                  'bg-zinc-800 text-zinc-400'
                }`}>
                  {user?.role}
                </span>
              </div>
              <div className="flex items-center justify-center md:justify-start gap-2 text-yellow-500 mb-4">
                <Star className="w-5 h-5 fill-current" />
                <span className="font-semibold text-lg">{averageRating}</span>
                <span className="text-zinc-400 text-sm">({ratings.length} reviews)</span>
              </div>
              {currentUser && currentUser.id !== userId && (
                <Link to={`/chat/${userId}`}>
                  <Button className="bg-green-600 hover:bg-green-500 text-white">
                    <MessageCircle className="w-4 h-4 mr-2" /> Message User
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Job History */}
          <div>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-blue-400" />
              Job History
            </h2>
            {jobs.length === 0 ? (
              <p className="text-zinc-500 bg-zinc-900/50 p-6 rounded-xl border border-white/5">No jobs posted yet.</p>
            ) : (
              <div className="space-y-4">
                {jobs.map(job => (
                  <Link key={job.id} to={`/jobs/${job.id}`} className="block bg-zinc-900 border border-white/10 p-4 rounded-xl hover:border-blue-500/50 transition-colors">
                    <h3 className="font-semibold text-lg mb-1">{job.title}</h3>
                    <div className="text-sm text-zinc-400 flex justify-between">
                      <span>{job.company_name || 'Independent'}</span>
                      <span>{new Date(job.created_at).toLocaleDateString()}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Ratings & Reviews */}
          <div>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Star className="w-6 h-6 text-yellow-500" />
              Reviews
            </h2>
            
            {currentUser && currentUser.id !== userId && (
              <form onSubmit={submitRating} className="bg-zinc-900 border border-white/10 p-6 rounded-xl mb-6">
                <h3 className="font-semibold mb-4">Leave a Review</h3>
                <div className="flex gap-2 mb-4">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button 
                      key={star} 
                      type="button"
                      onClick={() => setNewRating(star)}
                      className="focus:outline-none"
                    >
                      <Star className={`w-8 h-8 ${star <= newRating ? 'text-yellow-500 fill-current' : 'text-zinc-700'}`} />
                    </button>
                  ))}
                </div>
                <Textarea 
                  value={newReview}
                  onChange={(e) => setNewReview(e.target.value)}
                  placeholder="Write your experience with this user..."
                  className="bg-zinc-950 border-white/10 mb-4 min-h-[100px]"
                  required
                />
                <Button type="submit" disabled={submitting} className="w-full bg-yellow-600 hover:bg-yellow-500 text-white">
                  {submitting ? "Submitting..." : "Submit Review"}
                </Button>
              </form>
            )}

            {ratings.length === 0 ? (
              <p className="text-zinc-500 bg-zinc-900/50 p-6 rounded-xl border border-white/5">No reviews yet.</p>
            ) : (
              <div className="space-y-4">
                {ratings.map((rating, idx) => (
                  <div key={idx} className="bg-zinc-900 border border-white/10 p-4 rounded-xl">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium">{rating.from_name || rating.reviewer_name || "Anonymous User"}</div>
                      <div className="flex text-yellow-500">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-3 h-3 ${i < rating.rating ? 'fill-current' : 'text-zinc-700'}`} />
                        ))}
                      </div>
                    </div>
                    <p className="text-zinc-300 text-sm">{rating.review || rating.comment}</p>
                    <div className="text-xs text-zinc-500 mt-2">
                      {new Date(rating.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
