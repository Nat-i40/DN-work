import * as React from "react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings as SettingsIcon, Bell, Moon, Globe } from "lucide-react"

export function Settings() {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Preferences state
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [marketingEmails, setMarketingEmails] = useState(false)
  const [theme, setTheme] = useState("dark")
  const [saving, setSaving] = useState(false)
  
  useEffect(() => {
    const getProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        navigate("/")
        return
      }
      
      setUser(session.user)
      
      // Load preferences from local storage or database
      const savedTheme = localStorage.getItem("app-theme") || "dark"
      setTheme(savedTheme)
      applyTheme(savedTheme)
      
      setLoading(false)
    }

    getProfile()
  }, [navigate])

  const applyTheme = (newTheme: string) => {
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    // In a real app, we'd save this to a user_preferences table
    localStorage.setItem("app-theme", theme)
    applyTheme(theme)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800))
    
    toast.success("Preferences saved successfully")
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-12 flex items-center justify-center bg-zinc-950">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-24 pb-12 bg-zinc-950 text-white">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">App Settings</h1>
        
        <div className="grid gap-8 md:grid-cols-2">
          {/* Notifications Settings */}
          <Card className="bg-zinc-900 border-white/10 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-green-400" />
                Notifications
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Manage how we contact you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSavePreferences} className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base text-zinc-200">Email Notifications</Label>
                    <p className="text-sm text-zinc-500">Receive emails about your account activity.</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setEmailNotifications(!emailNotifications)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${emailNotifications ? 'bg-green-500' : 'bg-zinc-700'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${emailNotifications ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base text-zinc-200">Marketing Emails</Label>
                    <p className="text-sm text-zinc-500">Receive emails about new features and offers.</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setMarketingEmails(!marketingEmails)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${marketingEmails ? 'bg-green-500' : 'bg-zinc-700'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${marketingEmails ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Appearance Settings */}
          <Card className="bg-zinc-900 border-white/10 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Moon className="w-5 h-5 text-green-400" />
                Appearance
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Customize how the app looks.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-base text-zinc-200">Theme</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      type="button"
                      onClick={() => setTheme("dark")}
                      className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg border transition-all ${theme === 'dark' ? 'bg-green-500/10 border-green-500 text-green-400' : 'bg-zinc-950 border-white/10 text-zinc-400 hover:bg-white/5'}`}
                    >
                      <Moon className="w-4 h-4" />
                      Dark
                    </button>
                    <button 
                      type="button"
                      onClick={() => setTheme("light")}
                      className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg border transition-all ${theme === 'light' ? 'bg-green-500/10 border-green-500 text-green-400' : 'bg-zinc-950 border-white/10 text-zinc-400 hover:bg-white/5'}`}
                    >
                      <Globe className="w-4 h-4" />
                      Light
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="mt-8 flex justify-end">
          <Button 
            onClick={handleSavePreferences}
            disabled={saving}
            className="bg-green-600 hover:bg-green-500 text-white px-8"
          >
            {saving ? "Saving..." : "Save All Settings"}
          </Button>
        </div>
      </div>
    </div>
  )
}
