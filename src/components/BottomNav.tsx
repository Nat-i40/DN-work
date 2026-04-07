import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, User, Settings, MessageCircle, HelpCircle, PlusCircle, LayoutDashboard, Briefcase, Headset } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function BottomNav() {
  const location = useLocation();
  const [role, setRole] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        const userRole = session.user.user_metadata?.role || 'seeker';
        const isAdmin = userRole === 'admin' || session.user.email === 'natifreak0@gmail.com';
        setRole(isAdmin ? 'admin' : userRole);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        const userRole = session.user.user_metadata?.role || 'seeker';
        const isAdmin = userRole === 'admin' || session.user.email === 'natifreak0@gmail.com';
        setRole(isAdmin ? 'admin' : userRole);
      } else {
        setRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const getLinks = () => {
    if (role === 'admin') {
      return [
        { name: 'Home', path: '/', icon: Home },
        { name: 'Jobs', path: '/admin/dashboard/jobs', icon: Briefcase },
        { name: 'Support', path: '/admin/dashboard/support', icon: Headset },
        { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
        { name: 'Profile', path: '/profile', icon: User },
        { name: 'Settings', path: '/settings', icon: Settings },
      ];
    }
    if (role === 'employer') {
      return [
        { name: 'Home', path: '/', icon: Home },
        { name: 'Post Job', path: '/post-job', icon: PlusCircle },
        { name: 'Dashboard', path: '/employer/dashboard', icon: LayoutDashboard },
        { name: 'Chat', path: '/chat', icon: MessageCircle },
        { name: 'Support', path: '/support', icon: HelpCircle },
        { name: 'Profile', path: '/profile', icon: User },
        { name: 'Settings', path: '/settings', icon: Settings },
      ];
    }
    // Seeker
    return [
      { name: 'Home', path: '/', icon: Home },
      { name: 'Search', path: '/search', icon: Search },
      { name: 'Chat', path: '/chat', icon: MessageCircle },
      { name: 'Support', path: '/support', icon: HelpCircle },
      { name: 'Profile', path: '/profile', icon: User },
      { name: 'Settings', path: '/settings', icon: Settings },
    ];
  };

  if (!session) {
    return (
      <footer className="fixed bottom-0 left-0 right-0 z-50 py-6 bg-zinc-950/80 backdrop-blur-xl border-t border-zinc-800/50 text-center">
        <p className="text-zinc-500 text-sm font-medium tracking-wide">
          All rights reserved © {new Date().getFullYear()} DN Corporation
        </p>
      </footer>
    );
  }

  const links = getLinks();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 pb-2 sm:pb-4">
      <div className="flex items-center justify-between px-2 py-2 overflow-x-auto no-scrollbar max-w-md mx-auto">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.path || (link.path !== '/' && location.pathname.startsWith(link.path));
          return (
            <Link
              key={link.name}
              to={link.path}
              className={`flex flex-col items-center justify-center min-w-[4rem] p-2 rounded-xl transition-colors ${
                isActive ? 'text-green-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-medium tracking-wide whitespace-nowrap">{link.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
