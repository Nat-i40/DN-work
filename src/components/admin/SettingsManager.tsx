import * as React from "react"
import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Save, Upload, Loader2 } from "lucide-react"

export function SettingsManager() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    site_name: "",
    primary_color: "",
    footer_text: "",
    logo_url: ""
  })

  // Update ref when state changes
  useEffect(() => {
    savingRef.current = saving
  }, [saving])

  useEffect(() => {
    fetchSettings(true)
    
    const subscription = supabase
      .channel('site_settings_global')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings', filter: "key=eq.global_settings" }, () => fetchSettings(false))
      .subscribe()

    return () => { supabase.removeChannel(subscription) }
  }, [])

  const fetchSettings = async (isInitial = false, ignoreSaving = false) => {
    if (!ignoreSaving && savingRef.current) return
    if (isInitial) setLoading(true)
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
    if (isInitial) setLoading(false)
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
    savingRef.current = false
    fetchSettings(false, true)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file")
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be less than 2MB")
      return
    }

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `logo-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `site-assets/${fileName}`

      // Upload to Supabase Storage (using 'assets' bucket)
      const { data, error } = await supabase.storage
        .from('assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        if (error.message.includes('bucket not found')) {
          toast.error("Storage bucket 'assets' not found. Please create it in Supabase dashboard.")
        } else {
          toast.error(`Upload failed: ${error.message}`)
        }
        return
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('assets')
        .getPublicUrl(filePath)

      setFormData(prev => ({ ...prev, logo_url: publicUrl }))
      toast.success("Logo uploaded successfully!")
    } catch (err) {
      toast.error("An unexpected error occurred during upload")
    } finally {
      setUploading(false)
    }
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
            <Label htmlFor="logo_url" className="text-zinc-300">Site Logo</Label>
            <div className="flex flex-col gap-4">
              <div className="flex gap-4 items-center">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-xl bg-zinc-950 border border-white/10 overflow-hidden flex items-center justify-center p-2 shadow-inner">
                    {formData.logo_url ? (
                      <img src={formData.logo_url} alt="Logo Preview" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="text-zinc-700 text-xs text-center px-2">No Logo</div>
                    )}
                  </div>
                  {uploading && (
                    <div className="absolute inset-0 bg-zinc-950/60 flex items-center justify-center rounded-xl">
                      <Loader2 className="w-6 h-6 text-green-500 animate-spin" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 space-y-3">
                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="border-white/10 text-zinc-300 hover:bg-white/5 relative"
                      disabled={uploading}
                      onClick={() => document.getElementById('logo-upload')?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading ? "Uploading..." : "Browse Files"}
                      <input 
                        id="logo-upload"
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleFileUpload}
                      />
                    </Button>
                    {formData.logo_url && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                        onClick={() => setFormData(prev => ({ ...prev, logo_url: "" }))}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500">Recommended: SVG or transparent PNG (Max 2MB)</p>
                </div>
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="logo_url_manual" className="text-[10px] uppercase tracking-widest text-zinc-500">Or enter URL manually</Label>
                <Input 
                  id="logo_url_manual" 
                  value={formData.logo_url} 
                  onChange={e => setFormData({...formData, logo_url: e.target.value})} 
                  className="bg-zinc-950/50 border-white/5 text-white text-xs h-8" 
                  placeholder="https://example.com/logo.png"
                />
              </div>
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
