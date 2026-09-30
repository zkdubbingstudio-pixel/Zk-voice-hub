import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Firebase config (The one that was previously in src/lib/firebase.ts)
const firebaseConfig = {
  projectId: "ai-studio-zkvoicehub-573c9508-5f55-4fa8-929b-89c914e96817",
  authDomain: "gen-lang-client-0843629033.firebaseapp.com",
  storageBucket: "gen-lang-client-0843629033.firebasestorage.app",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  console.log("Starting migration...");
  
  // Migrate Anime
  console.log("Migrating Anime...");
  const animeSnap = await getDocs(collection(db, 'anime'));
  for (const doc of animeSnap.docs) {
    const data = doc.data();
    await supabase.from('anime').upsert({
      id: doc.id,
      title: data.title,
      description: data.description,
      poster_url: data.posterUrl || data.poster_url,
      banner_url: data.bannerUrl || data.banner_url,
      genres: data.genres || [],
      status: data.status,
      featured: data.featured,
      trending: data.trending,
      language: data.language || 'Dub',
    });
  }
  
  // Migrate Seasons
  console.log("Migrating Seasons...");
  const seasonsSnap = await getDocs(collection(db, 'seasons'));
  for (const doc of seasonsSnap.docs) {
    const data = doc.data();
    await supabase.from('seasons').upsert({
      id: doc.id,
      anime_id: data.animeId,
      season_number: data.seasonNumber,
    });
  }
  
  // Migrate Episodes
  console.log("Migrating Episodes...");
  const episodesSnap = await getDocs(collection(db, 'episodes'));
  for (const doc of episodesSnap.docs) {
    const data = doc.data();
    await supabase.from('episodes').upsert({
      id: doc.id,
      anime_id: data.animeId,
      season_id: data.seasonId,
      episode_number: data.episodeNumber,
      episode_title: data.title || data.episode_title,
      thumbnail_url: data.thumbnailUrl || data.thumbnail_url,
      filemoon_url: data.filemoonUrl || data.filemoon_url,
      archive_url: data.archiveOrgUrl || data.archive_url,
      dailymotion_url: data.dailymotionUrl || data.dailymotion_url,
    });
  }
  
  // Migrate Users (Using ID as string from Firebase)
  console.log("Migrating Users...");
  const usersSnap = await getDocs(collection(db, 'users'));
  for (const doc of usersSnap.docs) {
    const data = doc.data();
    await supabase.from('users').upsert({
      id: doc.id,
      email: data.email,
      username: data.displayName || data.username,
      role: data.role,
      settings: data.settings,
    });
  }
  
  console.log("Migration completed successfully!");
}

migrate().catch(console.error);
