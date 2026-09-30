import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const animeData = [
  {
    title: "Solo Leveling",
    description: "In a world where hunters with magical powers must battle deadly monsters to protect the human race from certain annihilation, a notoriously weak hunter named Sung Jinwoo finds himself in a seemingly endless struggle for survival.",
    poster_url: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx151807-m1gX3iqITqHn.png",
    banner_url: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/151807-37Hg8CiaR5K1.jpg",
    genres: ["Action", "Adventure", "Fantasy"],
    language: "Dub",
    status: "Ongoing",
    featured: true,
    trending: true,
  },
  {
    title: "Jujutsu Kaisen",
    description: "Idly indulging in baseless paranormal activities with the Occult Club, high schooler Yuuji Itadori spends his days at either the clubroom or the hospital, where he visits his bedridden grandfather.",
    poster_url: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx113415-bbBWj4pEFseh.jpg",
    banner_url: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/113415-jQBSkxWAAk83.jpg",
    genres: ["Action", "Supernatural", "Fantasy"],
    language: "Dub",
    status: "Completed",
    featured: true,
    trending: true,
  },
  {
    title: "Demon Slayer",
    description: "It is the Taisho Period in Japan. Tanjiro, a kindhearted boy who sells charcoal for a living, finds his family slaughtered by a demon.",
    poster_url: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx101922-PEn1CTc93DQl.jpg",
    banner_url: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/101922-YlzXGqKZXKPV.jpg",
    genres: ["Action", "Fantasy", "Historical"],
    language: "Dub",
    status: "Completed",
    featured: false,
    trending: true,
  },
  {
    title: "Attack on Titan",
    description: "Centuries ago, mankind was slaughtered to near extinction by monstrous humanoid creatures called titans.",
    poster_url: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx16498-73IhOXpJZiMF.jpg",
    banner_url: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/16498-8jpFCOcDmnei.jpg",
    genres: ["Action", "Drama", "Fantasy", "Mystery"],
    language: "Dub",
    status: "Completed",
    featured: true,
    trending: false,
  },
  {
    title: "One Piece",
    description: "Gol D. Roger was known as the 'Pirate King,' the strongest and most infamous being to have sailed the Grand Line.",
    poster_url: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21-YCDignzjGW8z.jpg",
    banner_url: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/21-wf37VakJmZqs.jpg",
    genres: ["Action", "Adventure", "Comedy", "Fantasy"],
    language: "Dub",
    status: "Ongoing",
    featured: false,
    trending: true,
  }
];

async function seed() {
  console.log("Seeding Supabase...");
  
  await supabase.from('watchhistory').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('episodes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('seasons').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('anime').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  // Wait a second for deletes to process
  await new Promise(r => setTimeout(r, 1000));
  
  for (const a of animeData) {
    const { data: anime, error: aErr } = await supabase.from('anime').insert(a).select().single();
    if (aErr || !anime) {
        console.error("Error inserting anime:", aErr, "Data:", a);
        continue;
    }
    console.log(`Inserted Anime: ${anime.title}`);
    
    for (let s = 1; s <= 2; s++) {
      const { data: season, error: sErr } = await supabase.from('seasons').insert({
        anime_id: anime.id,
        season_number: s
      }).select().single();
      
      if (sErr || !season) {
         console.error("Error inserting season:", sErr);
         continue;
      }
      
      for (let e = 1; e <= 5; e++) {
         await supabase.from('episodes').insert({
            anime_id: anime.id,
            season_id: season.id,
            episode_number: e,
            episode_title: `Episode ${e}`,
            thumbnail_url: anime.banner_url,
            filemoon_url: "https://filemoon.sx/e/placeholder",
            archive_url: "https://archive.org/embed/placeholder",
            dailymotion_url: "https://www.dailymotion.com/embed/video/placeholder"
         });
      }
      console.log(` Inserted Season ${s} with 5 episodes for ${anime.title}`);
    }
  }
  console.log("Seeding complete!");
}

seed();
