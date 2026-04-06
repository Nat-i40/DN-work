import * as React from "react"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Save } from "lucide-react"

export function SettingsManager() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    site_name: "",
    primary_color: "",
    footer_text: ""
  })

  useEffect(() => {
    fetchSettings()
    
    const subscription = supabase
      .channel('site_settings_global')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings', filter: "key=eq.global_settings" }, fetchSettings)
      .subscribe()

    return () => { supabase.removeChannel(subscription) }
  }, [])

  const fetchSettings = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "global_settings")
      .single()

    if (error && error.code !== "PGRST116") {
      toast.error("Failed to load settings")
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
      .upsert({ key: "global_settings", value: formData })

    if (error) {
      toast.error("Failed to save changes")
    } else {
      toast.success("Settings updated successfully")
    }
    setSaving(false)
  }

  if (loading) {
    return <div className="text-zinc-500 py-8">Loading...</div>
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Global Settings</h1>
        <p className="text-zinc-400">Manage site-wide configuration and branding.</p>
      </div>

      <div className="bg-zinc-900 border border-white/10 rounded-xl p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="site_name" className="text-zinc-300">Site Name</Label>
            <Input 
              id="site_name" 
              value={formData.site_name} 
              onChange={e => setFormData({...formData, site_name: e.target.value})} 
              className="bg-zinc-950 border-white/10 text-white" 
              placeholder="e.g., DN-Gigs"
              required 
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="primary_color" className="text-zinc-300">Primary Color (Hex)</Label>
            <div className="flex gap-4">
              <Input 
                id="primary_color" 
                value={formData.primary_color} 
                onChange={e => setFormData({...formData, primary_color: e.target.value})} 
                className="bg-zinc-950 border-white/10 text-white font-mono flex-1" 
                placeholder="#16a34a"
                required 
              />
              <div 
                className="w-10 h-10 rounded border border-white/10" 
                style={{ backgroundColor: formData.primary_color || '#16a34a' }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="footer_text" className="text-zinc-300">Footer Text</Label>
            <Textarea 
              id="footer_text" 
              value={formData.footer_text} 
              onChange={e => setFormData({...formData, footer_text: e.target.value})} 
              className="bg-zinc-950 border-white/10 text-white min-h-[100px]" 
              placeholder="e.g., © 2026 DN-Gigs. All rights reserved."
              required 
            />
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
