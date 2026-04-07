import * as React from "react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Briefcase, MapPin, DollarSign, Building, Image as ImageIcon, Calendar, Plus, Search } from "lucide-react"

export function PostJob() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [categorySearch, setCategorySearch] = useState("")
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  
  const [formData, setFormData] = useState({
    title: "",
    company_name: "",
    location: "",
    salary_range: "",
    job_type: "Full-time",
    experience: "No experience",
    urgency: "Flexible",
    description: "",
    requirements: "",
    category_id: "",
    image_url: "",
    expires_in_days: "30"
  })

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        toast.error("Please log in to post a job")
        window.dispatchEvent(new CustomEvent('open-login'));
        navigate("/")
        return
      }

      if (session.user.user_metadata?.role !== "employer") {
        toast.error("Only employers can post jobs")
        navigate("/")
        return
      }

      fetchCategories()
    }

    checkAuthAndLoadData()
  }, [navigate])

  const fetchCategories = async () => {
    const { data: cats } = await supabase.from("categories").select("*").order("name")
    if (cats) setCategories(cats)
  }

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return
    
    const slug = newCategoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    
    const { data, error } = await supabase.from("categories").insert([{
      name: newCategoryName.trim(),
      slug: slug,
      order: 99
    }]).select().single()

    if (error) {
      toast.error("Failed to create category: " + error.message)
    } else if (data) {
      toast.success("Category created successfully!")
      setCategories([...categories, data].sort((a, b) => a.name.localeCompare(b.name)))
      setFormData({ ...formData, category_id: data.id })
      setIsCreatingCategory(false)
      setNewCategoryName("")
      setCategorySearch("")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error("You must be logged in to post a job")
        setLoading(false)
        return
      }

      const expirationDate = new Date()
      expirationDate.setDate(expirationDate.getDate() + parseInt(formData.expires_in_days || "30"))

      const { data: jobData, error } = await supabase.from("jobs").insert([{
        title: formData.title,
        company_name: formData.company_name,
        category_id: formData.category_id || null,
        is_verified: false,
        featured: false,
        expires_at: expirationDate.toISOString()
      }]).select().single()

      if (error) {
        console.error("Error creating job:", error)
        toast.error("Failed to post job: " + error.message)
        setLoading(false)
        return
      }

      if (jobData) {
        // Update user role to employer and mark as verified
        try {
          const currentMetadata = session.user.user_metadata || {};
          await supabase.auth.updateUser({
            data: {
              ...currentMetadata,
              role: 'employer',
              is_verified: true
            }
          });
        } catch (authError) {
          console.error("Error updating user metadata:", authError)
        }

        // Update user profile in content_blocks
        try {
          const { data: profileData } = await supabase
            .from('content_blocks')
            .select('*')
            .eq('key', `user_profile_${session.user.id}`)
            .single();
          
          if (profileData) {
            const content = JSON.parse(profileData.content);
            content.role = 'employer';
            content.is_verified = true;
            await supabase.from('content_blocks').update({
              content: JSON.stringify(content)
            }).eq('id', profileData.id);
          }
        } catch (profileError) {
          console.error("Error updating user profile block:", profileError)
        }

        // Store extra details in content_blocks
        try {
          const { error: detailsError } = await supabase.from("content_blocks").insert([{
            key: `job_details_${jobData.id}`,
            title: "Job Details",
            content: JSON.stringify({
              location: formData.location,
              salary_range: formData.salary_range,
              job_type: formData.job_type,
              experience: formData.experience,
              urgency: formData.urgency,
              description: formData.description,
              requirements: formData.requirements,
              image_url: formData.image_url,
              posted_by: session.user.id,
              email: session.user.email
            })
          }])
          if (detailsError) console.error("Error inserting job details block:", detailsError)
        } catch (detailsError) {
          console.error("Unexpected error inserting job details block:", detailsError)
        }

        toast.success("Job posted successfully! It will be visible once verified by an admin.")
        navigate("/search")
      }
    } catch (err) {
      console.error("Unexpected error in handleSubmit:", err)
      toast.error("An unexpected error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(categorySearch.toLowerCase())
  )

  return (
    <div className="min-h-screen pt-24 pb-12 bg-zinc-950 text-white">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Post a New Job</h1>
          <p className="text-zinc-400">Fill out the details below to find your next great hire.</p>
        </div>

        <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-zinc-300">Job Title</Label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                <Input 
                  id="title" 
                  required
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="pl-9 bg-zinc-950 border-white/10 text-white focus:ring-green-500"
                  placeholder="e.g. Senior React Developer"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="company" className="text-zinc-300">Company Name</Label>
                <div className="relative">
                  <Building className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                  <Input 
                    id="company" 
                    required
                    value={formData.company_name}
                    onChange={e => setFormData({...formData, company_name: e.target.value})}
                    className="pl-9 bg-zinc-950 border-white/10 text-white focus:ring-green-500"
                    placeholder="Your Company Inc."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="text-zinc-300">Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                  <Input 
                    id="location" 
                    required
                    value={formData.location}
                    onChange={e => setFormData({...formData, location: e.target.value})}
                    className="pl-9 bg-zinc-950 border-white/10 text-white focus:ring-green-500"
                    placeholder="e.g. Addis Ababa, Remote"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="salary" className="text-zinc-300">Salary Range / Pay Rate (Optional)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                  <Input 
                    id="salary" 
                    value={formData.salary_range}
                    onChange={e => setFormData({...formData, salary_range: e.target.value})}
                    className="pl-9 bg-zinc-950 border-white/10 text-white focus:ring-green-500"
                    placeholder="e.g. 15,000 - 25,000 ETB or $20/hr"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expires" className="text-zinc-300">Job Expiration (Days)</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                  <Input 
                    id="expires" 
                    type="number"
                    min="1"
                    max="365"
                    value={formData.expires_in_days}
                    onChange={e => setFormData({...formData, expires_in_days: e.target.value})}
                    className="pl-9 bg-zinc-950 border-white/10 text-white focus:ring-green-500"
                    placeholder="30"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="job_type" className="text-zinc-300">Job Type</Label>
                <select
                  id="job_type"
                  value={formData.job_type}
                  onChange={e => setFormData({...formData, job_type: e.target.value})}
                  className="w-full h-10 px-3 py-2 bg-zinc-950 border border-white/10 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Gig">Gig</option>
                  <option value="Daily">Daily</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="experience" className="text-zinc-300">Experience Level</Label>
                <select
                  id="experience"
                  value={formData.experience}
                  onChange={e => setFormData({...formData, experience: e.target.value})}
                  className="w-full h-10 px-3 py-2 bg-zinc-950 border border-white/10 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="No experience">No experience</option>
                  <option value="1-2 years">1-2 years</option>
                  <option value="3+ years">3+ years</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="urgency" className="text-zinc-300">Urgency</Label>
                <select
                  id="urgency"
                  value={formData.urgency}
                  onChange={e => setFormData({...formData, urgency: e.target.value})}
                  className="w-full h-10 px-3 py-2 bg-zinc-950 border border-white/10 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="Flexible">Flexible</option>
                  <option value="This week">This week</option>
                  <option value="Start today">Start today</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="image_file" className="text-zinc-300">Job/Company Image (Optional)</Label>
              <div className="relative">
                <ImageIcon className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                <Input 
                  id="image_file" 
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) {
                      const reader = new FileReader()
                      reader.onloadend = () => {
                        setFormData({...formData, image_url: reader.result as string})
                      }
                      reader.readAsDataURL(file)
                    }
                  }}
                  className="pl-9 bg-zinc-950 border-white/10 text-white focus:ring-green-500 pt-1.5"
                />
              </div>
              {formData.image_url && (
                <div className="mt-2 rounded-lg overflow-hidden border border-white/10 h-32 w-32 bg-zinc-950">
                  <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Category</Label>
              <div className="bg-zinc-950 border border-white/10 rounded-md p-3 space-y-3">
                {!isCreatingCategory ? (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                      <Input 
                        placeholder="Search categories..."
                        value={categorySearch}
                        onChange={(e) => setCategorySearch(e.target.value)}
                        className="pl-9 bg-zinc-900 border-white/10 text-white h-9 text-sm"
                      />
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                      {filteredCategories.length > 0 ? (
                        filteredCategories.map(cat => (
                          <div 
                            key={cat.id}
                            onClick={() => setFormData({...formData, category_id: cat.id})}
                            className={`px-3 py-2 rounded-md cursor-pointer text-sm transition-colors ${
                              formData.category_id === cat.id 
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                : 'hover:bg-zinc-800 text-zinc-300 border border-transparent'
                            }`}
                          >
                            {cat.name}
                          </div>
                        ))
                      ) : (
                        <div className="text-zinc-500 text-sm py-2 text-center">No categories found.</div>
                      )}
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsCreatingCategory(true)}
                      className="w-full border-dashed border-white/20 text-zinc-400 hover:text-white hover:border-white/40"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Custom Category
                    </Button>
                  </>
                ) : (
                  <div className="space-y-3">
                    <Input 
                      placeholder="Enter new category name..."
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="bg-zinc-900 border-white/10 text-white"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        onClick={handleCreateCategory}
                        className="flex-1 bg-green-600 hover:bg-green-500 text-white"
                        disabled={!newCategoryName.trim()}
                      >
                        Save Category
                      </Button>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        onClick={() => {
                          setIsCreatingCategory(false)
                          setNewCategoryName("")
                        }}
                        className="text-zinc-400 hover:text-white"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-zinc-300">Job Description</Label>
              <Textarea 
                id="description" 
                required
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="bg-zinc-950 border-white/10 text-white min-h-[150px] focus:ring-green-500"
                placeholder="Describe the role, responsibilities, and what you're looking for..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="requirements" className="text-zinc-300">Requirements (Optional)</Label>
              <Textarea 
                id="requirements" 
                value={formData.requirements}
                onChange={e => setFormData({...formData, requirements: e.target.value})}
                className="bg-zinc-950 border-white/10 text-white min-h-[100px] focus:ring-green-500"
                placeholder="List any specific skills, experience, or qualifications needed..."
              />
            </div>

            <div className="pt-4 border-t border-white/10">
              <Button 
                type="submit" 
                disabled={loading || (!formData.category_id && !isCreatingCategory)}
                className="w-full bg-green-600 hover:bg-green-500 text-white py-6 text-lg font-medium disabled:opacity-50"
              >
                {loading ? "Posting Job..." : "Post Job for Review"}
              </Button>
              <p className="text-center text-zinc-500 text-sm mt-4">
                All jobs are reviewed by our moderation team before going live.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
