import { useEffect, useState } from "react"
import { useNavigate, Outlet, Link, useLocation } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { 
  LayoutDashboard, 
  Menu, 
  Image as ImageIcon, 
  Settings, 
  Tags, 
  FileText, 
  Briefcase, 
  BarChart3,
  Users, 
  LogOut,
  Palette,
  Headset
} from "lucide-react"

export function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState<'dark' | 'green'>(() => {
    return (localStorage.getItem('admin-theme') as 'dark' | 'green') || 'dark'
  })

  useEffect(() => {
    const checkSession = async () => {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Admin session check timed out')), 5000)
      );

      try {
        const { data: { session } } = await Promise.race([
          supabase.auth.getSession(),
          timeoutPromise as Promise<any>
        ]);

        if (!session || (session.user.user_metadata?.role !== "admin" && session.user.email !== "natifreak0@gmail.com")) {
          navigate("/")
        } else {
          setLoading(false)
        }
      } catch (err) {
        console.error('Admin session check failed or timed out:', err);
        navigate("/"); // Redirect to home on failure
      }
    };

    checkSession();
  }, [navigate])

  useEffect(() => {
    if (theme === 'green') {
      document.documentElement.classList.add('theme-green')
    } else {
      document.documentElement.classList.remove('theme-green')
    }
    localStorage.setItem('admin-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'green' : 'dark')
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      
      // Manual cleanup as a fallback
      const projectId = 'qilcijfxtgssleccvmzy'
      localStorage.removeItem(`sb-${projectId}-auth-token`)
      sessionStorage.clear()
      
      window.location.href = '/'
    } catch (err) {
      console.error('Logout error:', err)
      window.location.href = '/'
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-green-400">Loading...</div>
  }

  const navItems = [
    { name: "Overview", path: "/admin/dashboard/overview", icon: LayoutDashboard },
    { name: "Navigation", path: "/admin/dashboard/nav", icon: Menu },
    { name: "Hero Section", path: "/admin/dashboard/hero", icon: ImageIcon },
    { name: "Global Settings", path: "/admin/dashboard/settings", icon: Settings },
    { name: "Categories", path: "/admin/dashboard/categories", icon: Tags },
    { name: "Content", path: "/admin/dashboard/content", icon: FileText },
    { name: "Jobs", path: "/admin/dashboard/jobs", icon: Briefcase },
    { name: "Job Analytics", path: "/admin/dashboard/analytics", icon: BarChart3 },
    { name: "Users", path: "/admin/dashboard/users", icon: Users },
    { name: "Support", path: "/admin/dashboard/support", icon: Headset },
  ]

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex pb-20">
      {/* Sidebar */}
      <aside className="w-64 bg-zinc-900 border-r border-white/10 flex flex-col">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold text-green-400">Admin Panel</h2>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link 
                key={item.name} 
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive 
                    ? "bg-green-600/20 text-green-400 border border-green-500/30" 
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-white/10 space-y-2">
          <Button 
            variant="ghost" 
            onClick={toggleTheme}
            className="w-full justify-start text-zinc-400 hover:text-white hover:bg-white/5"
          >
            <Palette className="w-5 h-5 mr-3" />
            {theme === 'dark' ? 'Green Theme' : 'Dark Theme'}
          </Button>
          <Button 
            variant="ghost" 
            onClick={handleLogout}
            className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-400/10"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
