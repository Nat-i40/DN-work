import * as React from "react"
import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Briefcase, User, Home, UserPlus, LogIn, Search as SearchIcon, LogOut, Settings, MessageSquare, LayoutDashboard, Menu, X, Check, Star } from "lucide-react"
import { VerificationBadge } from '@/components/ui/VerificationBadge';
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"

const PasswordRequirements = ({ password }: { password: string }) => {
  const requirements = [
    { label: "Min 6 characters", test: (p: string) => p.length >= 6 },
    { label: "1 uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
    { label: "1 lowercase letter", test: (p: string) => /[a-z]/.test(p) },
    { label: "1 number", test: (p: string) => /[0-9]/.test(p) },
    { label: "1 symbol", test: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
  ];

  return (
    <div className="space-y-1 mt-2">
      {requirements.map((req, i) => (
        <div key={i} className={`text-xs flex items-center ${req.test(password) ? "text-green-500" : "text-zinc-500"}`}>
          {req.test(password) ? <Check className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
          {req.label}
        </div>
      ))}
    </div>
  );
};

export function Navbar() {
  const navigate = useNavigate()
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [contactOpen, setContactOpen] = useState(false)
  const [contactMessage, setContactMessage] = useState("")
  const [sendingMessage, setSendingMessage] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [navItems, setNavItems] = useState<any[]>([])
  const [siteName, setSiteName] = useState("DN-Gigs")
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const [seekerName, setSeekerName] = useState("")
  const [seekerEmail, setSeekerEmail] = useState("")
  const [seekerPassword, setSeekerPassword] = useState("")
  const [seekerConfirmPassword, setSeekerConfirmPassword] = useState("")
  const [seekerLoading, setSeekerLoading] = useState(false)
  const [seekerAgreed, setSeekerAgreed] = useState(false)

  const [employerCompany, setEmployerCompany] = useState("")
  const [employerEmail, setEmployerEmail] = useState("")
  const [employerPassword, setEmployerPassword] = useState("")
  const [employerConfirmPassword, setEmployerConfirmPassword] = useState("")
  const [employerLoading, setEmployerLoading] = useState(false)
  const [employerAgreed, setEmployerAgreed] = useState(false)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [rememberMe, setRememberMe] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    const fetchSettings = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "global_settings")
        .single()
      
      if (data?.value) {
        setSiteName(data.value.site_name || "DN-Gigs")
        setLogoUrl(data.value.logo_url || null)
      }
    }

    fetchSettings()

    const settingsSubscription = supabase
      .channel('site_settings_navbar')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings', filter: "key=eq.global_settings" }, fetchSettings)
      .subscribe()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        // Check if profile exists
        const { data: profile } = await supabase
          .from('content_blocks')
          .select('*')
          .eq('key', `user_profile_${session.user.id}`)
          .single();
        
        if (!profile) {
          // Create default profile for OAuth users
          await supabase.from('content_blocks').insert({
            key: `user_profile_${session.user.id}`,
            title: 'user_profile',
            content: JSON.stringify({
              id: session.user.id,
              email: session.user.email,
              name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
              role: session.user.user_metadata?.role || 'seeker',
              is_verified: false,
              is_banned: false,
              avatar_url: session.user.user_metadata?.avatar_url || null,
              created_at: new Date().toISOString()
            })
          });
        }
      }
    })

    fetchNavItems()

    const handleOpenLogin = () => setLoginOpen(true);
    const handleOpenRegister = () => setRegisterOpen(true);
    
    window.addEventListener('open-login', handleOpenLogin);
    window.addEventListener('open-register', handleOpenRegister);

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(settingsSubscription);
      window.removeEventListener('open-login', handleOpenLogin);
      window.removeEventListener('open-register', handleOpenRegister);
    }
  }, [])

  const fetchNavItems = async () => {
    const [navRes, settingsRes] = await Promise.all([
      supabase.from("site_settings").select("value").eq("key", "navbar").single(),
      supabase.from("site_settings").select("value").eq("key", "global_settings").single()
    ])
    
    if (navRes.data?.value) {
      setNavItems(navRes.data.value)
    }
    if (settingsRes.data?.value?.site_name) {
      setSiteName(settingsRes.data.value.site_name)
    }
  }

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Logout error:', error)
        toast.error(error.message)
      }
      
      // Manual cleanup as a fallback
      const projectId = 'qilcijfxtgssleccvmzy'
      localStorage.removeItem(`sb-${projectId}-auth-token`)
      sessionStorage.clear()
      
      toast.success("Logged out successfully")
      
      // Use window.location.href to force a full reload and clear any stale state
      window.location.href = '/'
    } catch (err) {
      console.error('Unexpected logout error:', err)
      window.location.href = '/'
    }
  }

  const handleContactAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    
    setSendingMessage(true)
    const { error } = await supabase.from("content_blocks").insert([{
      key: `msg_${Date.now()}_${user.id}`,
      title: `Message from ${user.email}`,
      content: contactMessage
    }])
    
    setSendingMessage(false)
    if (error) {
      toast.error("Failed to send message")
    } else {
      toast.success("Message sent to admin")
      setContactOpen(false)
      setContactMessage("")
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    })
    
    if (error) {
      toast.error(error.message)
    } else {
      toast.success("Logged in successfully")
      setLoginOpen(false)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.user_metadata?.role === 'admin' || user?.email === 'natifreak0@gmail.com') {
        navigate("/admin/dashboard")
      } else {
        navigate("/")
      }
    }
    setLoginLoading(false)
  }

  const validatePassword = (password: string) => {
    if (password.length < 6) return "Password must be at least 6 characters long.";
    if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter.";
    if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter.";
    if (!/[0-9]/.test(password)) return "Password must contain at least one number.";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return "Password must contain at least one symbol.";
    return null;
  }

  const handleSeekerRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!seekerAgreed) {
      toast.error("You must agree to the Privacy Policy and Terms of Use.");
      return;
    }
    if (seekerPassword !== seekerConfirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    const passwordError = validatePassword(seekerPassword);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }
    setSeekerLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email: seekerEmail,
      password: seekerPassword,
      options: {
        data: {
          full_name: seekerName,
          role: 'seeker'
        }
      }
    })
    
    if (error) {
      toast.error(error.message)
    } else {
      if (data.user) {
        await supabase.from('content_blocks').insert({
          key: `user_profile_${data.user.id}`,
          title: 'user_profile',
          content: JSON.stringify({
            id: data.user.id,
            email: seekerEmail,
            name: seekerName,
            role: 'seeker',
            is_verified: false,
            is_banned: false,
            created_at: new Date().toISOString()
          })
        });
      }
      toast.success("Registration successful! Please login.")
      setRegisterOpen(false)
    }
    setSeekerLoading(false)
  }

  const handleEmployerRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employerAgreed) {
      toast.error("You must agree to the Privacy Policy and Terms of Use.");
      return;
    }
    if (employerPassword !== employerConfirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    const passwordError = validatePassword(employerPassword);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }
    setEmployerLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email: employerEmail,
      password: employerPassword,
      options: {
        data: {
          company_name: employerCompany,
          role: 'employer'
        }
      }
    })
    
    if (error) {
      toast.error(error.message)
    } else {
      if (data.user) {
        await supabase.from('content_blocks').insert({
          key: `user_profile_${data.user.id}`,
          title: 'user_profile',
          content: JSON.stringify({
            id: data.user.id,
            email: employerEmail,
            name: employerCompany,
            role: 'employer',
            is_verified: false,
            is_banned: false,
            created_at: new Date().toISOString()
          })
        });
      }
      toast.success("Registration successful! Please login.")
      setRegisterOpen(false)
    }
    setEmployerLoading(false)
  }

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    })
    if (error) {
      toast.error(error.message)
    }
  }

  const isAdmin = user?.user_metadata?.role === 'admin' || user?.email === 'natifreak0@gmail.com'

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 cursor-pointer group">
            <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform overflow-hidden">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <Briefcase className="w-4 h-4 text-white" />
              )}
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              {siteName.split('-')[0]}<span className="text-green-400">{siteName.split('-')[1] ? `-${siteName.split('-')[1]}` : ''}</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navItems.map((item, i) => (
              <Link 
                key={i} 
                to={item.url}
                className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger render={
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full bg-zinc-900 border border-zinc-800 p-0 overflow-hidden hover:border-zinc-700 transition-colors">
                    {user.user_metadata?.avatar_url ? (
                      <img src={user.user_metadata.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-4 w-4 text-zinc-400" />
                    )}
                  </Button>
                } />
                <DropdownMenuContent className="w-56 bg-zinc-950 border-zinc-800 text-white shadow-2xl" align="end">
                  <div className="flex items-center justify-start gap-2 p-3">
                    <div className="flex flex-col space-y-1 leading-none">
                      {user.user_metadata?.username ? (
                        <div className="flex items-center">
                          <p className="font-medium text-sm text-green-400">@{user.user_metadata.username}</p>
                          <VerificationBadge role={user.user_metadata?.role} />
                        </div>
                      ) : (user.user_metadata?.full_name || user.user_metadata?.name) && (
                        <div className="flex items-center">
                          <p className="font-medium text-sm">{user.user_metadata.full_name || user.user_metadata.name}</p>
                          <VerificationBadge role={user.user_metadata?.role} />
                        </div>
                      )}
                      <p className="w-[200px] truncate text-xs text-zinc-500">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator className="bg-zinc-800" />
                  <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer hover:bg-zinc-900 focus:bg-zinc-900 focus:text-white w-full flex items-center text-sm">
                      <User className="mr-2 h-4 w-4 text-zinc-400" />
                      <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer hover:bg-zinc-900 focus:bg-zinc-900 focus:text-white w-full flex items-center text-sm">
                      <Settings className="mr-2 h-4 w-4 text-zinc-400" />
                      <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setContactOpen(true)} className="cursor-pointer hover:bg-zinc-900 focus:bg-zinc-900 focus:text-white w-full flex items-center text-sm">
                      <MessageSquare className="mr-2 h-4 w-4 text-zinc-400" />
                      <span>Contact Admin</span>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate("/admin/dashboard")} className="cursor-pointer hover:bg-zinc-900 focus:bg-zinc-900 focus:text-white w-full flex items-center text-sm text-green-400">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        <span>Admin Dashboard</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-zinc-800" />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-400 hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-400 text-sm">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden md:flex items-center gap-3">
                <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
                  <DialogTrigger render={
                    <Button variant="ghost" className="text-zinc-400 hover:text-white hover:bg-zinc-900 text-sm font-medium">
                      Log in
                    </Button>
                  } />
                  <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-zinc-800 text-white">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-bold">Welcome back</DialogTitle>
                      <DialogDescription className="text-zinc-400">
                        Enter your credentials to access your account
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleLogin} className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-zinc-300">Email</Label>
                        <Input 
                          id="email" 
                          type="email" 
                          required 
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          className="bg-zinc-900 border-zinc-800 text-white focus-visible:ring-green-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-zinc-300">Password</Label>
                        <Input 
                          id="password" 
                          type="password" 
                          required 
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="bg-zinc-900 border-zinc-800 text-white focus-visible:ring-green-500"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <input 
                          type="checkbox" 
                          id="remember-me" 
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="rounded border-zinc-800 bg-zinc-900 text-green-500 focus:ring-green-500"
                        />
                        <Label htmlFor="remember-me" className="text-sm text-zinc-400">Remember me</Label>
                      </div>
                      <Button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white" disabled={loginLoading}>
                        {loginLoading ? "Logging in..." : "Log in"}
                      </Button>
                      <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t border-zinc-800" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-zinc-950 px-2 text-zinc-500">Or continue with</span>
                        </div>
                      </div>
                      <Button type="button" variant="outline" className="w-full border-zinc-800 bg-zinc-900 text-white hover:bg-zinc-800" onClick={handleGoogleLogin}>
                        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                          <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            fill="#4285F4"
                          />
                          <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                          />
                          <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            fill="#FBBC05"
                          />
                          <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            fill="#EA4335"
                          />
                        </svg>
                        Google
                      </Button>
                      <p className="text-center text-sm text-zinc-500 mt-4">
                        Don't have an account?{" "}
                        <button 
                          type="button"
                          onClick={() => {
                            setLoginOpen(false);
                            setRegisterOpen(true);
                          }}
                          className="text-green-500 hover:underline font-medium"
                        >
                          Sign up
                        </button>
                      </p>
                    </form>
                  </DialogContent>
                </Dialog>

                <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
                  <DialogTrigger render={
                    <Button className="bg-white text-black hover:bg-zinc-200 text-sm font-medium rounded-full px-6">
                      Sign up
                    </Button>
                  } />
                  <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-zinc-800 text-white">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-bold">Create an account</DialogTitle>
                      <DialogDescription className="text-zinc-400">
                        Choose your account type to get started
                      </DialogDescription>
                    </DialogHeader>
                    <Tabs defaultValue="seeker" className="w-full mt-4">
                      <TabsList className="grid w-full grid-cols-2 bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
                        <TabsTrigger value="seeker" className="rounded-lg data-[state=active]:bg-zinc-800 data-[state=active]:text-white">Job Seeker</TabsTrigger>
                        <TabsTrigger value="employer" className="rounded-lg data-[state=active]:bg-zinc-800 data-[state=active]:text-white">Employer</TabsTrigger>
                      </TabsList>
                      <TabsContent value="seeker">
                        <form onSubmit={handleSeekerRegister} className="space-y-4 mt-4">
                          <div className="space-y-2">
                            <Label htmlFor="seeker-name" className="text-zinc-300">Full Name</Label>
                            <Input 
                              id="seeker-name" 
                              required 
                              value={seekerName}
                              onChange={(e) => setSeekerName(e.target.value)}
                              className="bg-zinc-900 border-zinc-800 text-white focus-visible:ring-green-500"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="seeker-email" className="text-zinc-300">Email</Label>
                            <Input 
                              id="seeker-email" 
                              type="email" 
                              required 
                              value={seekerEmail}
                              onChange={(e) => setSeekerEmail(e.target.value)}
                              className="bg-zinc-900 border-zinc-800 text-white focus-visible:ring-green-500"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="seeker-password" className="text-zinc-300">Password</Label>
                            <Input 
                              id="seeker-password" 
                              type="password" 
                              required 
                              value={seekerPassword}
                              onChange={(e) => setSeekerPassword(e.target.value)}
                              className="bg-zinc-900 border-zinc-800 text-white focus-visible:ring-green-500"
                            />
                            <PasswordRequirements password={seekerPassword} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="seeker-confirm-password" className="text-zinc-300">Confirm Password</Label>
                            <Input 
                              id="seeker-confirm-password" 
                              type="password" 
                              required 
                              value={seekerConfirmPassword}
                              onChange={(e) => setSeekerConfirmPassword(e.target.value)}
                              className="bg-zinc-900 border-zinc-800 text-white focus-visible:ring-green-500"
                            />
                          </div>
                          <div className="flex items-start space-x-2 mt-2">
                            <input 
                              type="checkbox" 
                              id="seeker-agree" 
                              checked={seekerAgreed}
                              onChange={(e) => setSeekerAgreed(e.target.checked)}
                              className="mt-1 rounded border-zinc-800 bg-zinc-900 text-green-500 focus:ring-green-500"
                            />
                            <Label htmlFor="seeker-agree" className="text-sm text-zinc-400 leading-tight">
                              I agree to the <Link to="/privacy" className="text-green-400 hover:underline" onClick={() => setRegisterOpen(false)}>Privacy Policy</Link> and <Link to="/terms" className="text-green-400 hover:underline" onClick={() => setRegisterOpen(false)}>Terms of Use</Link>.
                            </Label>
                          </div>
                          <Button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white" disabled={seekerLoading}>
                            {seekerLoading ? "Creating account..." : "Create Seeker Account"}
                          </Button>
                        </form>
                      </TabsContent>
                      <TabsContent value="employer">
                        <form onSubmit={handleEmployerRegister} className="space-y-4 mt-4">
                          <div className="space-y-2">
                            <Label htmlFor="employer-company" className="text-zinc-300">Company / Business Name</Label>
                            <Input 
                              id="employer-company" 
                              required 
                              value={employerCompany}
                              onChange={(e) => setEmployerCompany(e.target.value)}
                              className="bg-zinc-900 border-zinc-800 text-white focus-visible:ring-green-500"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="employer-email" className="text-zinc-300">Work Email</Label>
                            <Input 
                              id="employer-email" 
                              type="email" 
                              required 
                              value={employerEmail}
                              onChange={(e) => setEmployerEmail(e.target.value)}
                              className="bg-zinc-900 border-zinc-800 text-white focus-visible:ring-green-500"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="employer-password" className="text-zinc-300">Password</Label>
                            <Input 
                              id="employer-password" 
                              type="password" 
                              required 
                              value={employerPassword}
                              onChange={(e) => setEmployerPassword(e.target.value)}
                              className="bg-zinc-900 border-zinc-800 text-white focus-visible:ring-green-500"
                            />
                            <PasswordRequirements password={employerPassword} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="employer-confirm-password" className="text-zinc-300">Confirm Password</Label>
                            <Input 
                              id="employer-confirm-password" 
                              type="password" 
                              required 
                              value={employerConfirmPassword}
                              onChange={(e) => setEmployerConfirmPassword(e.target.value)}
                              className="bg-zinc-900 border-zinc-800 text-white focus-visible:ring-green-500"
                            />
                          </div>
                          <div className="flex items-start space-x-2 mt-2">
                            <input 
                              type="checkbox" 
                              id="employer-agree" 
                              checked={employerAgreed}
                              onChange={(e) => setEmployerAgreed(e.target.checked)}
                              className="mt-1 rounded border-zinc-800 bg-zinc-900 text-green-500 focus:ring-green-500"
                            />
                            <Label htmlFor="employer-agree" className="text-sm text-zinc-400 leading-tight">
                              I agree to the <Link to="/privacy" className="text-green-400 hover:underline" onClick={() => setRegisterOpen(false)}>Privacy Policy</Link> and <Link to="/terms" className="text-green-400 hover:underline" onClick={() => setRegisterOpen(false)}>Terms of Use</Link>.
                            </Label>
                          </div>
                          <Button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white" disabled={employerLoading}>
                            {employerLoading ? "Creating account..." : "Create Employer Account"}
                          </Button>
                        </form>
                      </TabsContent>
                    </Tabs>
                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-zinc-800" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-zinc-950 px-2 text-zinc-500">Or continue with</span>
                      </div>
                    </div>
                    <Button type="button" variant="outline" className="w-full border-zinc-800 bg-zinc-900 text-white hover:bg-zinc-800" onClick={handleGoogleLogin}>
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                      Google
                    </Button>
                    <p className="text-center text-sm text-zinc-500 mt-4">
                      Already have an account?{" "}
                      <button 
                        type="button"
                        onClick={() => {
                          setRegisterOpen(false);
                          setLoginOpen(true);
                        }}
                        className="text-green-500 hover:underline font-medium"
                      >
                        Log in
                      </button>
                    </p>
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {/* Mobile Menu Button */}
            <Button 
              variant="ghost" 
              size="icon"
              className="md:hidden text-zinc-400 hover:text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-zinc-800/50">
            <div className="flex flex-col space-y-4">
              {navItems.map((item, i) => (
                <Link 
                  key={i} 
                  to={item.url}
                  className="text-sm font-medium text-zinc-400 hover:text-white transition-colors px-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              {!user && (
                <div className="flex flex-col gap-2 pt-4 border-t border-zinc-800/50">
                  <Button variant="outline" className="w-full border-zinc-800 bg-zinc-900 text-white" onClick={() => { setLoginOpen(true); setMobileMenuOpen(false); }}>
                    Log in
                  </Button>
                  <Button className="w-full bg-white text-black hover:bg-zinc-200" onClick={() => { setRegisterOpen(true); setMobileMenuOpen(false); }}>
                    Sign up
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Contact Admin Dialog */}

      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Contact Admin</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Send a message directly to the site administrator.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleContactAdmin} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="message" className="text-zinc-300">Message</Label>
              <Textarea 
                id="message" 
                required 
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="How can we help you?"
                className="min-h-[120px] bg-zinc-900 border-zinc-800 text-white focus-visible:ring-green-500"
              />
            </div>
            <Button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white" disabled={sendingMessage}>
              {sendingMessage ? "Sending..." : "Send Message"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </nav>
  )
}
