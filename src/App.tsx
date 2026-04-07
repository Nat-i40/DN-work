/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Search } from './components/Search';
import { JobDetails } from './components/JobDetails';
import { Settings } from './components/Settings';
import { Profile } from './components/Profile';
import { PostJob } from './components/PostJob';
import { BottomNav } from './components/BottomNav';
import { Chat } from './components/Chat';
import { UserProfile } from './components/UserProfile';
import { Support } from './components/Support';
import { EmployerDashboard } from './components/EmployerDashboard';
import { AdminSupport } from './components/AdminSupport';
import { AdminLayout } from './components/admin/AdminLayout';
import { DashboardOverview } from './components/admin/DashboardOverview';
import { NavManager } from './components/admin/NavManager';
import { HeroManager } from './components/admin/HeroManager';
import { SettingsManager } from './components/admin/SettingsManager';
import { CategoriesManager } from './components/admin/CategoriesManager';
import { ContentManager } from './components/admin/ContentManager';
import { JobsModerator } from './components/admin/JobsModerator';
import { JobAnalytics } from './components/admin/JobAnalytics';
import { UsersManager } from './components/admin/UsersManager';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { TermsOfUse } from './components/TermsOfUse';
import { supabase } from '@/lib/supabase';

function PublicLayout({ session }: { session: any }) {
  const [features, setFeatures] = useState<any[]>([]);

  useEffect(() => {
    const fetchFeatures = async () => {
      const { data } = await supabase
        .from('content_blocks')
        .select('*')
        .in('key', [
          'feature_1_title', 'feature_1_content',
          'feature_2_title', 'feature_2_content',
          'feature_3_title', 'feature_3_content'
        ]);
      
      if (data) {
        const featureMap = data.reduce((acc: any, block: any) => {
          acc[block.key] = block.content;
          return acc;
        }, {});
        setFeatures([
          {
            title: featureMap['feature_1_title'] || 'Fast & Brutal Search',
            content: featureMap['feature_1_content'] || 'Type what you want, get it instantly. No bloated profiles, no endless networking. Just jobs that matter.',
            icon: (
              <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            ),
            color: 'green'
          },
          {
            title: featureMap['feature_2_title'] || 'Ethiopian Context',
            content: featureMap['feature_2_content'] || 'AI that understands local nuance, from Sodo to Addis. Search in Amharic or English, find local side hustles and remote gigs.',
            icon: (
              <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
            color: 'blue'
          },
          {
            title: featureMap['feature_3_title'] || 'Verified Employers',
            content: featureMap['feature_3_content'] || "Real jobs from real people. We verify employers to ensure you get paid for your hard work, whether it's farm labor or AI prompt engineering.",
            icon: (
              <svg className="w-6 h-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
            color: 'orange'
          }
        ]);
      }
    };

    fetchFeatures();
  }, []);

  return (
    <main className="min-h-screen bg-zinc-950 font-sans antialiased pb-20">
      <Navbar />
      <Routes>
        <Route path="/" element={
          <>
            <Hero />
            <Search isHome={true} />
            <section className="py-24 bg-zinc-950 border-t border-zinc-900">
              <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
                <div className="grid md:grid-cols-3 gap-12">
                  {features.length > 0 ? features.map((feature, i) => (
                    <div key={i} className="space-y-4">
                      <div className={`w-12 h-12 bg-${feature.color}-500/10 rounded-xl flex items-center justify-center border border-${feature.color}-500/20`}>
                        {feature.icon}
                      </div>
                      <h3 className="text-xl font-bold text-white">{feature.title}</h3>
                      <p className="text-zinc-400 leading-relaxed">{feature.content}</p>
                    </div>
                  )) : (
                    <>
                      <div className="space-y-4">
                        <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center border border-green-500/20">
                          <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-bold text-white">Fast & Brutal Search</h3>
                        <p className="text-zinc-400 leading-relaxed">Type what you want, get it instantly. No bloated profiles, no endless networking. Just jobs that matter.</p>
                      </div>
                      <div className="space-y-4">
                        <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
                          <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-bold text-white">Ethiopian Context</h3>
                        <p className="text-zinc-400 leading-relaxed">AI that understands local nuance, from Sodo to Addis. Search in Amharic or English, find local side hustles and remote gigs.</p>
                      </div>
                      <div className="space-y-4">
                        <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center border border-orange-500/20">
                          <svg className="w-6 h-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-bold text-white">Verified Employers</h3>
                        <p className="text-zinc-400 leading-relaxed">Real jobs from real people. We verify employers to ensure you get paid for your hard work, whether it's farm labor or AI prompt engineering.</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </section>
          </>
        } />
        <Route path="/search" element={<Search />} />
        <Route path="/jobs/:id" element={<JobDetails />} />
        <Route path="/post-job" element={<PostJob />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/chat/:userId" element={<Chat />} />
        <Route path="/user/:userId" element={<UserProfile />} />
        <Route path="/support" element={<Support />} />
        <Route path="/employer/dashboard" element={<EmployerDashboard />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfUse />} />
      </Routes>
    </main>
  );
}

export default function App() {
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    const getSessionWithTimeout = async () => {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Session fetch timed out')), 5000)
      );

      try {
        const { data: { session }, error } = await Promise.race([
          supabase.auth.getSession(),
          timeoutPromise as Promise<any>
        ]);
        
        if (error) {
          console.error('Error getting session:', error);
        }
        setSession(session);
      } catch (err) {
        console.error('Session fetch failed or timed out:', err);
        setSession(null); // Fallback to null session
      }
    };

    getSessionWithTimeout();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <>
      <Routes>
        <Route path="/*" element={<PublicLayout session={session} />} />
        <Route path="/admin/dashboard" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard/overview" replace />} />
          <Route path="overview" element={<DashboardOverview />} />
          <Route path="nav" element={<NavManager />} />
          <Route path="hero" element={<HeroManager />} />
          <Route path="settings" element={<SettingsManager />} />
          <Route path="categories" element={<CategoriesManager />} />
          <Route path="content" element={<ContentManager />} />
          <Route path="jobs" element={<JobsModerator />} />
          <Route path="analytics" element={<JobAnalytics />} />
          <Route path="users" element={<UsersManager />} />
          <Route path="support" element={<AdminSupport />} />
        </Route>
      </Routes>
      <BottomNav />
      <Toaster />
    </>
  );
}
