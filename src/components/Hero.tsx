import * as React from "react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Search, MapPin, Briefcase, ArrowRight, Sparkles, Building, Code, Globe, Zap } from "lucide-react"
import { motion } from "motion/react"

export function Hero() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState("")
  const [location, setLocation] = useState("")
  const [categories, setCategories] = useState<any[]>([])
  const [heroContent, setHeroContent] = useState({
    tagline: "A fast, brutal search engine for jobs that actually matter.",
    subtitle: "Built to solve real unemployment and side-hustle pain in Ethiopia right now. No corporate bloat, just remote gigs, local side hustles, and daily labor.",
    cta_label: "Search Jobs",
    cta_link: "/search"
  })
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const [catsRes, heroRes] = await Promise.all([
        supabase.from("categories").select("*").order("order", { ascending: true }).limit(6),
        supabase.from("site_settings").select("value").eq("key", "hero_content").single()
      ])
      
      if (catsRes.data) setCategories(catsRes.data)
      if (heroRes.data?.value) setHeroContent(heroRes.data.value)
    }
    fetchData()
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (searchTerm) params.set("q", searchTerm)
    if (location) params.set("location", location)
    navigate(`/search?${params.toString()}`)
  }

  const handleCategoryClick = (category: string) => {
    navigate(`/search?q=${encodeURIComponent(category)}`)
  }

  // Background animation variants
  const bgVariants = {
    animate: {
      backgroundPosition: ["0% 0%", "100% 100%"],
      transition: {
        duration: 20,
        ease: "linear",
        repeat: Infinity,
        repeatType: "reverse" as const
      }
    }
  }

  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden bg-zinc-950 text-zinc-50 font-sans selection:bg-green-500/30 pt-24 pb-8">
      {/* Subtle Animated Background */}
      <motion.div 
        className="absolute inset-0 z-0 opacity-20"
        style={{
          backgroundImage: "radial-gradient(circle at center, rgba(34,197,94,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(16,185,129,0.1) 0%, transparent 40%)",
          backgroundSize: "200% 200%"
        }}
        variants={bgVariants}
        animate="animate"
      />
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 z-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom,white,transparent)] pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/50 border border-zinc-800 text-sm text-zinc-400 mb-8 backdrop-blur-sm"
        >
          <Sparkles className="w-4 h-4 text-green-400" />
          <span>Smart Job Matching for Ethiopia</span>
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-6 max-w-4xl leading-[1.1] text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-400"
        >
          {heroContent.tagline}
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          className="text-lg sm:text-xl text-zinc-400 mb-12 max-w-2xl font-light"
        >
          {heroContent.subtitle}
        </motion.p>

        {/* Categories - Clean Pills */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-10 flex flex-col items-center gap-4 w-full max-w-4xl"
        >
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            <button onClick={() => handleCategoryClick("Remote")} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
              <Globe className="w-4 h-4" /> Remote Gigs
            </button>
            <button onClick={() => handleCategoryClick("AI")} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
              <Sparkles className="w-4 h-4" /> AI Work
            </button>
            <button onClick={() => handleCategoryClick("Side Hustle")} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
              <Briefcase className="w-4 h-4" /> Side Hustles
            </button>
            <button onClick={() => handleCategoryClick("Farm")} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
              <Building className="w-4 h-4" /> Farm Work
            </button>
            <button onClick={() => handleCategoryClick("Daily Labor")} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
              <Zap className="w-4 h-4" /> Daily Labor
            </button>
            <button onClick={() => handleCategoryClick("Tech")} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
              <Code className="w-4 h-4" /> Tech Freelance
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
