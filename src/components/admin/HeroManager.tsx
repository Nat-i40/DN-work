import * as React from "react"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Save } from "lucide-react"

export function HeroManager() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    tagline: "",
    subtitle: "",
    cta_label: "",
    cta_link: ""
  })

  useEffect(() => {
    fetchHeroContent()
    
    const subscription = supabase
      .channel('site_settings_hero')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings', filter: "key=eq.hero_content" }, fetchHeroContent)
      .subscribe()

    return () => { supabase.removeChannel(subscription) }
  }, [])

  const fetchHeroContent = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "hero_content")
      .single()

    if (error && error.code !== "PGRST116") {
      toast.error("Failed to load hero content")
    } else if (data?.value) {
      setFormData(data.value)
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: "hero_content", value: formData })

    if (error) {
      toast.error("Failed to save changes")
    } else {
      toast.success("Hero section updated successfully")
    }
    setSaving(false)
  }

  if (loading) {
    return <div className="text-zinc-500 py-8">Loading...</div>
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Hero Section Manager</h1>
        <p className="text-zinc-400">Update the main headline and call-to-action on the homepage.</p>
      </div>

      <div className="bg-zinc-900 border border-white/10 rounded-xl p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="tagline" className="text-zinc-300">Main Tagline (Headline)</Label>
            <Input 
              id="tagline" 
              value={formData.tagline} 
              onChange={e => setFormData({...formData, tagline: e.target.value})} 
              className="bg-zinc-950 border-white/10 text-white text-lg py-6" 
              placeholder="e.g., Find Your Next Gig in DN-Gigs"
              required 
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="subtitle" className="text-zinc-300">Subtitle (Description)</Label>
            <Textarea 
              id="subtitle" 
              value={formData.subtitle} 
              onChange={e => setFormData({...formData, subtitle: e.target.value})} 
              className="bg-zinc-950 border-white/10 text-white min-h-[100px]" 
              placeholder="e.g., Connect with top employers and find flexible work opportunities across the country."
              required 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="cta_label" className="text-zinc-300">Primary Button Label</Label>
              <Input 
                id="cta_label" 
                value={formData.cta_label} 
                onChange={e => setFormData({...formData, cta_label: e.target.value})} 
                className="bg-zinc-950 border-white/10 text-white" 
                placeholder="e.g., Start Searching"
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cta_link" className="text-zinc-300">Primary Button Link</Label>
              <Input 
                id="cta_link" 
                value={formData.cta_link} 
                onChange={e => setFormData({...formData, cta_link: e.target.value})} 
                className="bg-zinc-950 border-white/10 text-white" 
                placeholder="e.g., /jobs"
                required 
              />
            </div>
          </div>

          <div className="pt-4 border-t border-white/10">
            <Button 
              type="submit" 
              disabled={saving}
              className="bg-green-600 hover:bg-green-500 text-white w-full md:w-auto px-8"
            >
              {saving ? "Saving..." : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
