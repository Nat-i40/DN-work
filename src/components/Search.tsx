import * as React from "react"
import { useState, useEffect } from "react"
import { useSearchParams, Link } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Search as SearchIcon, MapPin, Briefcase, Clock, Filter, X, ChevronRight, Building2, DollarSign, Check } from "lucide-react"
import { VerificationBadge } from '@/components/ui/VerificationBadge';
import { motion, AnimatePresence } from "motion/react"

export function Search({ isHome = false }: { isHome?: boolean }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [jobs, setJobs] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false)

  // Filter states
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "")
  const [location, setLocation] = useState(searchParams.get("location") || "")
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    searchParams.getAll("category")
  )
  const [selectedUrgency, setSelectedUrgency] = useState<string[]>(
    searchParams.getAll("urgency")
  )
  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>(
    searchParams.getAll("type")
  )

  const [selectedPayTypes, setSelectedPayTypes] = useState<string[]>(
    searchParams.getAll("pay_type")
  )
  const [selectedExperience, setSelectedExperience] = useState<string[]>(
    searchParams.getAll("experience")
  )

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    fetchJobs()
  }, [searchParams])

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("order", { ascending: true })
    if (data) setCategories(data)
  }

  const fetchJobs = async () => {
    setLoading(true)
    
    let query = supabase
      .from("jobs")
      .select("*, categories!left(name)")
      .eq("is_verified", true)
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false })

    const cats = searchParams.getAll("category")
    if (cats.length > 0) {
      query = query.in("category_id", cats)
    }

    const q = searchParams.get("q")
    const loc = searchParams.get("location")
    const urgencies = searchParams.getAll("urgency")
    const types = searchParams.getAll("type")
    const payTypes = searchParams.getAll("pay_type")
    const experiences = searchParams.getAll("experience")

    const { data, error } = await query

    if (error) {
      console.error("Search error:", error)
      toast.error("Failed to load jobs: " + error.message)
      setJobs([])
    } else if (data) {
      // Fetch extra details from content_blocks
      const { data: detailsData } = await supabase
        .from("content_blocks")
        .select("*")
        .or("key.ilike.job_details_%,title.eq.user_profile")

      const detailsMap: Record<string, any> = {}
      const usersMap: Record<string, any> = {}
      
      if (detailsData) {
        detailsData.forEach(d => {
          if (d.key.startsWith("job_details_")) {
            const jobId = d.key.replace("job_details_", "")
            try {
              detailsMap[jobId] = JSON.parse(d.content)
            } catch(e) {}
          } else if (d.title === "user_profile") {
            try {
              const user = JSON.parse(d.content)
              usersMap[user.id] = user
            } catch(e) {}
          }
        })
      }

      let merged = data.map(job => {
        const details = detailsMap[job.id] || {}
        const employer = usersMap[details.posted_by] || {}
        return {
          ...job,
          ...details,
          employer_verified: employer.is_verified || false,
          employer_name: employer.name || details.email || 'Unknown'
        }
      })

      // Apply client-side filters
      if (q) {
        const lowerQ = q.toLowerCase()
        merged = merged.filter(j => 
          j.title?.toLowerCase().includes(lowerQ) || 
          j.description?.toLowerCase().includes(lowerQ) ||
          j.company_name?.toLowerCase().includes(lowerQ) ||
          j.categories?.name?.toLowerCase().includes(lowerQ) ||
          j.email?.toLowerCase().includes(lowerQ) ||
          j.employer_name?.toLowerCase().includes(lowerQ)
        )
      }
      if (loc) {
        merged = merged.filter(j => j.location?.toLowerCase().includes(loc.toLowerCase()))
      }
      if (urgencies.length > 0) {
        merged = merged.filter(j => urgencies.includes(j.urgency))
      }
      if (types.length > 0) {
        merged = merged.filter(j => types.includes(j.job_type))
      }
      if (payTypes.length > 0) {
        merged = merged.filter(j => payTypes.some(pt => j.salary_range?.toLowerCase().includes(pt)))
      }
      if (experiences.length > 0) {
        merged = merged.filter(j => experiences.some(exp => j.requirements?.toLowerCase().includes(exp)))
      }

      setJobs(merged)
    } else {
      setJobs([])
    }
    
    setLoading(false)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    updateParams()
  }

  const updateParams = () => {
    const params = new URLSearchParams()
    if (searchTerm) params.set("q", searchTerm)
    if (location) params.set("location", location)
    selectedCategories.forEach(c => params.append("category", c))
    selectedUrgency.forEach(u => params.append("urgency", u))
    selectedJobTypes.forEach(t => params.append("type", t))
    selectedPayTypes.forEach(p => params.append("pay_type", p))
    selectedExperience.forEach(e => params.append("experience", e))
    setSearchParams(params)
  }

  const toggleCategory = (id: string) => {
    setSelectedCategories(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  const toggleUrgency = (urgency: string) => {
    setSelectedUrgency(prev => 
      prev.includes(urgency) ? prev.filter(u => u !== urgency) : [...prev, urgency]
    )
  }

  const toggleJobType = (type: string) => {
    setSelectedJobTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
  }

  const togglePayType = (type: string) => {
    setSelectedPayTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
  }

  const toggleExperience = (exp: string) => {
    setSelectedExperience(prev => 
      prev.includes(exp) ? prev.filter(e => e !== exp) : [...prev, exp]
    )
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      updateParams()
    }, 300)
    return () => clearTimeout(timeout)
  }, [selectedCategories, selectedUrgency, selectedJobTypes, selectedPayTypes, selectedExperience])

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  }

  return (
    <div className={`min-h-screen bg-zinc-950 text-zinc-50 pb-12 font-sans ${isHome ? 'pt-0' : 'pt-24'}`}>
      
      {/* Sticky Search Header */}
      <div className={`sticky z-40 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/50 py-4 mb-8 shadow-sm ${isHome ? 'top-16' : 'top-16'}`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3 max-w-5xl mx-auto">
            <div className="relative flex-[2]">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <Input 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Job title, keywords, or company..." 
                className="pl-12 bg-zinc-900/50 border-zinc-800 text-white h-12 rounded-xl focus-visible:ring-green-500/50 focus-visible:border-green-500/50 transition-all text-base"
              />
            </div>
            <div className="relative flex-1">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <Input 
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="Location..." 
                className="pl-12 bg-zinc-900/50 border-zinc-800 text-white h-12 rounded-xl focus-visible:ring-green-500/50 focus-visible:border-green-500/50 transition-all text-base"
              />
            </div>
            <Button type="submit" className="h-12 px-8 bg-white text-black hover:bg-zinc-200 rounded-xl font-medium transition-colors">
              Search
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              className="h-12 md:hidden border-zinc-800 bg-zinc-900/50 text-white rounded-xl"
              onClick={() => setIsMobileFiltersOpen(true)}
            >
              <Filter className="w-5 h-5" />
            </Button>
          </form>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex flex-col lg:flex-row gap-10">
          
          {/* Sidebar Filters */}
          <div className={`
            fixed inset-0 z-50 bg-zinc-950 p-6 overflow-y-auto lg:static lg:block lg:w-64 lg:p-0 lg:bg-transparent lg:z-auto
            ${isMobileFiltersOpen ? 'block' : 'hidden'}
          `}>
            <div className="flex items-center justify-between lg:hidden mb-8">
              <h2 className="text-2xl font-bold tracking-tight">Filters</h2>
              <Button variant="ghost" size="icon" onClick={() => setIsMobileFiltersOpen(false)} className="rounded-full">
                <X className="w-6 h-6" />
              </Button>
            </div>

            <div className="space-y-10">
              {/* Categories */}
              <div>
                <h3 className="text-sm font-semibold mb-4 text-zinc-400 uppercase tracking-wider">Category</h3>
                <div className="space-y-3">
                  {categories.map(category => (
                    <div key={category.id} className="flex items-center space-x-3 group">
                      <Checkbox 
                        id={`cat-${category.id}`} 
                        checked={selectedCategories.includes(category.id)}
                        onCheckedChange={() => toggleCategory(category.id)}
                        className="border-zinc-700 data-[state=checked]:bg-white data-[state=checked]:border-white data-[state=checked]:text-black rounded-[4px] transition-all"
                      />
                      <Label htmlFor={`cat-${category.id}`} className="text-zinc-300 font-medium cursor-pointer group-hover:text-white transition-colors">
                        {category.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Job Type */}
              <div>
                <h3 className="text-sm font-semibold mb-4 text-zinc-400 uppercase tracking-wider">Job Type</h3>
                <div className="space-y-3">
                  {['Full-time', 'Part-time', 'Gig', 'Daily'].map(type => (
                    <div key={type} className="flex items-center space-x-3 group">
                      <Checkbox 
                        id={`type-${type}`} 
                        checked={selectedJobTypes.includes(type)}
                        onCheckedChange={() => toggleJobType(type)}
                        className="border-zinc-700 data-[state=checked]:bg-white data-[state=checked]:border-white data-[state=checked]:text-black rounded-[4px] transition-all"
                      />
                      <Label htmlFor={`type-${type}`} className="text-zinc-300 font-medium cursor-pointer group-hover:text-white transition-colors">
                        {type}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pay Type */}
              <div>
                <h3 className="text-sm font-semibold mb-4 text-zinc-400 uppercase tracking-wider">Pay Rate</h3>
                <div className="space-y-3">
                  {['Hourly', 'Daily', 'Monthly'].map(type => (
                    <div key={type} className="flex items-center space-x-3 group">
                      <Checkbox 
                        id={`pay-${type}`} 
                        checked={selectedPayTypes.includes(type.toLowerCase())}
                        onCheckedChange={() => togglePayType(type.toLowerCase())}
                        className="border-zinc-700 data-[state=checked]:bg-white data-[state=checked]:border-white data-[state=checked]:text-black rounded-[4px] transition-all"
                      />
                      <Label htmlFor={`pay-${type}`} className="text-zinc-300 font-medium cursor-pointer group-hover:text-white transition-colors">
                        {type}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Experience */}
              <div>
                <h3 className="text-sm font-semibold mb-4 text-zinc-400 uppercase tracking-wider">Experience</h3>
                <div className="space-y-3">
                  {['No experience', '1-2 years', '3+ years'].map(exp => (
                    <div key={exp} className="flex items-center space-x-3 group">
                      <Checkbox 
                        id={`exp-${exp}`} 
                        checked={selectedExperience.includes(exp.toLowerCase())}
                        onCheckedChange={() => toggleExperience(exp.toLowerCase())}
                        className="border-zinc-700 data-[state=checked]:bg-white data-[state=checked]:border-white data-[state=checked]:text-black rounded-[4px] transition-all"
                      />
                      <Label htmlFor={`exp-${exp}`} className="text-zinc-300 font-medium cursor-pointer group-hover:text-white transition-colors">
                        {exp}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Urgency */}
              <div>
                <h3 className="text-sm font-semibold mb-4 text-zinc-400 uppercase tracking-wider">Urgency</h3>
                <div className="space-y-3">
                  {['Flexible', 'This week', 'Start today'].map(urgency => (
                    <div key={urgency} className="flex items-center space-x-3 group">
                      <Checkbox 
                        id={`urgency-${urgency}`} 
                        checked={selectedUrgency.includes(urgency)}
                        onCheckedChange={() => toggleUrgency(urgency)}
                        className="border-zinc-700 data-[state=checked]:bg-white data-[state=checked]:border-white data-[state=checked]:text-black rounded-[4px] transition-all"
                      />
                      <Label htmlFor={`urgency-${urgency}`} className="text-zinc-300 font-medium cursor-pointer group-hover:text-white transition-colors">
                        {urgency}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="mt-10 lg:hidden">
              <Button className="w-full bg-white text-black hover:bg-zinc-200 h-12 rounded-xl font-medium" onClick={() => setIsMobileFiltersOpen(false)}>
                Show Results
              </Button>
            </div>
          </div>

          {/* Results */}
          <div className="flex-1">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-medium text-zinc-300">
                {loading ? "Searching..." : <><span className="text-white font-bold">{jobs.length}</span> jobs found</>}
              </h2>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6 h-36 animate-pulse"></div>
                ))}
              </div>
            ) : jobs.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-zinc-900/20 border border-zinc-800/50 rounded-3xl p-16 text-center flex flex-col items-center"
              >
                <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-6 shadow-inner">
                  <SearchIcon className="w-10 h-10 text-zinc-600" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-3 tracking-tight">No jobs found</h3>
                <p className="text-zinc-400 max-w-md mb-8 text-lg">We couldn't find any jobs matching your current filters. Try adjusting your search criteria.</p>
                <Button 
                  className="bg-white text-black hover:bg-zinc-200 rounded-xl px-8 h-12 font-medium"
                  onClick={() => {
                    setSearchTerm("")
                    setLocation("")
                    setSelectedCategories([])
                    setSelectedJobTypes([])
                    setSelectedUrgency([])
                  }}
                >
                  Clear all filters
                </Button>
              </motion.div>
            ) : (
              <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="space-y-4"
              >
                {jobs.map(job => (
                  <motion.div key={job.id} variants={itemVariants}>
                    <Link 
                      to={`/jobs/${job.id}`}
                      className="block bg-zinc-900/40 border border-zinc-800/60 hover:border-zinc-600 hover:bg-zinc-800/40 rounded-2xl p-5 sm:p-6 transition-all duration-200 group relative overflow-hidden"
                    >
                      {job.featured && (
                        <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
                      )}
                      
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
                        {job.image_url && (
                          <div className="w-full sm:w-24 h-24 rounded-lg overflow-hidden shrink-0 bg-zinc-900 border border-zinc-800">
                            <img src={job.image_url} alt={job.title} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1.5">
                            <h3 className="text-xl font-bold text-white group-hover:text-green-400 transition-colors tracking-tight">
                              {job.title}
                            </h3>
                            {job.featured && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-green-500/10 text-green-400 border border-green-500/20">
                                Featured
                              </span>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-zinc-400 mb-5 text-sm font-medium">
                            <span className="flex items-center text-zinc-300">
                              <Building2 className="w-4 h-4 mr-1.5 text-zinc-500" />
                              {job.company_name || 'Independent Employer'}
                              {job.employer_verified && (
                                <VerificationBadge role="employer" size="sm" />
                              )}
                            </span>
                            {job.location && (
                              <span className="flex items-center">
                                <MapPin className="w-4 h-4 mr-1.5 text-zinc-500" /> 
                                {job.location}
                              </span>
                            )}
                            {job.salary_range && (
                              <span className="flex items-center text-green-400/90">
                                <DollarSign className="w-4 h-4 mr-1 text-green-500/70" />
                                {job.salary_range}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap gap-2">
                            {job.categories?.name && (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-zinc-800/80 text-zinc-300 border border-zinc-700/50">
                                {job.categories.name}
                              </span>
                            )}
                            {job.job_type && (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-zinc-800/80 text-zinc-300 border border-zinc-700/50">
                                <Briefcase className="w-3 h-3 mr-1.5 text-zinc-400" />
                                {job.job_type}
                              </span>
                            )}
                            {job.urgency && (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-500/10 text-orange-400/90 border border-orange-500/20">
                                <Clock className="w-3 h-3 mr-1.5" />
                                {job.urgency}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 mt-4 sm:mt-0">
                          <span className="text-xs font-medium text-zinc-500 bg-zinc-900 px-2.5 py-1 rounded-md border border-zinc-800">
                            {new Date(job.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                          <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-zinc-800/50 group-hover:bg-white group-hover:text-black transition-colors border border-zinc-700/50 group-hover:border-white">
                            <ChevronRight className="w-5 h-5" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
