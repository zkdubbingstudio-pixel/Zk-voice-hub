import { supabase } from './supabase';

export const fallbackAnime = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    title: "Solo Leveling",
    description: "In a world where hunters with magical powers must battle deadly monsters to protect the human race from certain annihilation, a notoriously weak hunter named Sung Jinwoo finds himself in a seemingly endless struggle for survival.",
    poster_url: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx151807-m1gX3iqITqHn.png",
    posterUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx151807-m1gX3iqITqHn.png",
    bannerUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/151807-37Hg8CiaR5K1.jpg",
    genres: ["Action", "Adventure", "Fantasy"],
    language: "Dub",
    status: "Ongoing"
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    title: "Jujutsu Kaisen",
    description: "Idly indulging in baseless paranormal activities with the Occult Club, high schooler Yuuji Itadori spends his days at either the clubroom or the hospital, where he visits his bedridden grandfather.",
    poster_url: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx113415-bbBWj4pEFseh.jpg",
    posterUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx113415-bbBWj4pEFseh.jpg",
    bannerUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/113415-jQBSkxWAAk83.jpg",
    genres: ["Action", "Supernatural", "Fantasy"],
    language: "Dub",
    status: "Completed"
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    title: "Demon Slayer",
    description: "It is the Taisho Period in Japan. Tanjiro, a kindhearted boy who sells charcoal for a living, finds his family slaughtered by a demon.",
    poster_url: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx101922-PEn1CTc93DQl.jpg",
    posterUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx101922-PEn1CTc93DQl.jpg",
    bannerUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/101922-YlzXGqKZXKPV.jpg",
    genres: ["Action", "Fantasy", "Historical"],
    language: "Dub",
    status: "Completed"
  }
];

export const fallbackSeasons = [
  { id: '11111111-1111-1111-1111-000000000001', anime_id: '11111111-1111-1111-1111-111111111111', season_number: 1, seasonNumber: 1, title: 'Season 1' }
];

export const fallbackEpisodes = [
  {
    id: '11111111-1111-1111-1111-000000000001',
    anime_id: '11111111-1111-1111-1111-111111111111',
    season_id: '11111111-1111-1111-1111-000000000001',
    animeId: '11111111-1111-1111-1111-111111111111',
    seasonId: '11111111-1111-1111-1111-000000000001',
    episode_number: 1,
    episodeNumber: 1,
    episode_title: "Episode 1",
    title: "Episode 1",
    thumbnail_url: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/151807-37Hg8CiaR5K1.jpg",
    thumbnailUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/151807-37Hg8CiaR5K1.jpg",
    filemoon_url: "https://filemoon.sx/e/placeholder",
    filemoonUrl: "https://filemoon.sx/e/placeholder",
  }
];

export async function seedSupabase() {
    try {
        console.log("Attempting to automatically insert sample data into Supabase...");
        
        // We exclude 'featured', 'trending', and 'banner_url' from the insert because the user's schema might not have them
        const { error: aErr } = await supabase.from('anime').insert(
            fallbackAnime.map(a => ({
                id: a.id,
                title: a.title,
                description: a.description,
                poster_url: a.poster_url,
                genres: a.genres,
                language: a.language,
                status: a.status
            }))
        );
        if (aErr) console.warn("Failed to insert anime. RLS might be active:", aErr.message);

        const { error: sErr } = await supabase.from('seasons').insert(
            fallbackSeasons.map(s => ({
                id: s.id,
                anime_id: s.anime_id,
                season_number: s.season_number
            }))
        );
        if (sErr) console.warn("Failed to insert seasons:", sErr.message);

        const { error: eErr } = await supabase.from('episodes').insert(
            fallbackEpisodes.map(e => ({
                id: e.id,
                anime_id: e.anime_id,
                season_id: e.season_id,
                episode_number: e.episode_number,
                episode_title: e.episode_title,
                thumbnail_url: e.thumbnail_url,
                filemoon_url: e.filemoon_url
            }))
        );
        if (eErr) console.warn("Failed to insert episodes:", eErr.message);

    } catch (e) {
        console.error("Seed error:", e);
    }
}
