
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { supabase } from './lib/supabase';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';


import { useAuthStore } from './store/authStore';
import { User } from './types';

import RootLayout from './layouts/RootLayout';
import AdminLayout from './layouts/AdminLayout';

import Home from './pages/Home';
import AnimeDetails from './pages/AnimeDetails';
import SeasonDetails from './pages/SeasonDetails';
import WatchPage from './pages/WatchPage';
import Search from './pages/Search';
import Profile from './pages/Profile';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminAnime from './pages/admin/AdminAnime';
import AdminSeasons from './pages/admin/AdminSeasons';
import AdminEpisodes from './pages/admin/AdminEpisodes';
import AdminUsers from './pages/admin/AdminUsers';
import AdminMedia from './pages/admin/AdminMedia';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminSettings from './pages/admin/AdminSettings';
import AdminSecurity from './pages/admin/AdminSecurity';

import SettingsPage from './pages/Settings';

export default function App() {
  const { setFirebaseUser, setUser, setLoading } = useAuthStore();


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setLoading(true);
        setFirebaseUser(firebaseUser);
        
        try {
          const { data: userSnap, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', firebaseUser.uid)
            .single();
            
          if (userSnap) {
            setUser({
              uid: userSnap.id,
              email: userSnap.email,
              displayName: userSnap.username,
              photoURL: firebaseUser.photoURL || '',
              role: userSnap.role,
              createdAt: userSnap.created_at ? new Date(userSnap.created_at).getTime() : Date.now(),
              settings: userSnap.settings
            });
          } else {
            const newUser = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              username: firebaseUser.displayName || 'Anime Fan',
              role: firebaseUser.email === 'zkdubbingstudio@gmail.com' ? 'admin' : 'user',
              created_at: new Date().toISOString()
            };
            
            await supabase.from('users').insert([newUser]);
            setUser({ 
              uid: newUser.id, 
              email: newUser.email,
              displayName: newUser.username, 
              photoURL: firebaseUser.photoURL || '', 
              role: newUser.role as 'user' | 'admin',
              createdAt: Date.now() 
            });
          }
        } catch (error) {
          console.warn("Could not fetch user profile from Supabase.");
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || 'Anime Fan',
            photoURL: firebaseUser.photoURL || '',
            role: firebaseUser.email === 'zkdubbingstudio@gmail.com' ? 'admin' : 'user',
            createdAt: Date.now(),
          });
        }
        setLoading(false);
      } else {
        setFirebaseUser(null);
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [setFirebaseUser, setUser, setLoading]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootLayout />}>
          <Route index element={<Home />} />
          <Route path="search" element={<Search />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="anime/:id" element={<AnimeDetails />} />
          <Route path="anime/:id/season/:seasonId" element={<SeasonDetails />} />
        </Route>
        
        <Route path="/" element={<RootLayout />}>
          <Route path="watch/:id" element={<WatchPage />} />
          <Route path="watch/:animeId/:seasonId" element={<WatchPage />} />
          <Route path="watch/:animeId/:seasonId/:id" element={<WatchPage />} />
        </Route>

        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="anime" element={<AdminAnime />} />
          <Route path="seasons" element={<AdminSeasons />} />
          <Route path="episodes" element={<AdminEpisodes />} />
          <Route path="media" element={<AdminMedia />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="security" element={<AdminSecurity />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
