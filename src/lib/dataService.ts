import { supabase } from './supabase';
import { db } from './firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp, 
  DocumentData 
} from 'firebase/firestore';

export interface AnimeItem {
  id: string;
  title: string;
  description?: string;
  synopsis?: string;
  posterUrl?: string;
  poster_url?: string;
  bannerUrl?: string;
  banner_url?: string;
  releaseYear?: number | string;
  release_year?: number | string;
  featured?: boolean;
  trending?: boolean;
  genres?: string[];
  rating?: string | number;
  status?: string;
  dubbedBy?: string;
  views?: number;
  type?: string;
  totalEpisodes?: number;
  seasonNumber?: number;
  SeasonNumber?: number;
  latestSeason?: string;
  latestEpisodeRange?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface SeasonItem {
  id: string;
  animeId: string;
  seasonNumber: number;
  title?: string;
  description?: string;
  bannerUrl?: string;
  posterUrl?: string;
  order?: number;
  createdAt?: any;
}

export interface EpisodeItem {
  id: string;
  animeId: string;
  seasonId: string;
  season_id?: string;
  seasonNumber?: number;
  episodeNumber: number;
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  duration?: string;
  releaseDate?: string;
  server1Url?: string;
  server1_url?: string;
  server2Url?: string;
  server2_url?: string;
  filemoonUrl?: string;
  filemoon_url?: string;
  vdohideUrl?: string;
  vdohide_url?: string;
  videoUrl?: string;
  views?: number;
  createdAt?: any;
  published?: boolean;
}

// Timeout constants: 3.5s for primary Firestore, 3.0s for fallback Supabase
const FIRESTORE_TIMEOUT_MS = 3500;
const SUPABASE_TIMEOUT_MS = 3000;

// Timeout wrapper that guarantees promise rejection if it takes too long
function withTimeout<T>(promise: Promise<T> | PromiseLike<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error('timeout'));
      }
    }, ms);

    Promise.resolve(promise).then(
      (val) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(val);
        }
      },
      (err) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(err);
        }
      }
    );
  });
}

// In-memory and localStorage cache layer to prevent infinite loading
const CACHE_PREFIX = 'zk_db_cache_';
const memoryCache = new Map<string, any>();

function getCached<T>(key: string): T | null {
  if (memoryCache.has(key)) {
    return memoryCache.get(key) as T;
  }
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (raw) {
      const parsed = JSON.parse(raw);
      memoryCache.set(key, parsed);
      return parsed as T;
    }
  } catch {}
  return null;
}

function setCache<T>(key: string, value: T): void {
  if (value === undefined || value === null) return;
  // If value is empty array, do not override previous non-empty cache
  if (Array.isArray(value) && value.length === 0) {
    if (getCached(key)) return;
  }
  memoryCache.set(key, value);
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(value));
  } catch {}
}

export function invalidateCache(pattern?: string): void {
  if (!pattern) {
    memoryCache.clear();
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith(CACHE_PREFIX))
        .forEach(k => localStorage.removeItem(k));
    } catch {}
    return;
  }
  for (const k of Array.from(memoryCache.keys())) {
    if (k.includes(pattern)) {
      memoryCache.delete(k);
    }
  }
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith(CACHE_PREFIX) && k.includes(pattern))
      .forEach(k => localStorage.removeItem(k));
  } catch {}
}

// Helper to extract clean FileMoon embed URL from input (URL or <iframe> embed code)
export function extractFileMoonUrl(input?: string): string {
  if (!input) return '';
  let url = input.trim();
  
  const iframeMatch = url.match(/src=["']([^"']+)["']/i);
  if (iframeMatch && iframeMatch[1]) {
    url = iframeMatch[1].trim();
  }
  
  if (url.includes('filemoon.') && url.includes('/d/')) {
    url = url.replace('/d/', '/e/');
  }

  if (url.startsWith('//')) {
    url = `https:${url}`;
  }

  return url;
}

// Helper to extract clean VDOHide embed URL from input (URL or <iframe> embed code)
export function extractVDOHideUrl(input?: string): string {
  if (!input) return '';
  let url = input.trim();

  const iframeMatch = url.match(/src=["']([^"']+)["']/i);
  if (iframeMatch && iframeMatch[1]) {
    url = iframeMatch[1].trim();
  }

  // Convert download or watch paths to embed format (/d/ or /w/ -> /e/)
  if ((url.includes('vdohide.') || url.includes('streamhide.') || url.includes('vidhide.')) && url.includes('/d/')) {
    url = url.replace('/d/', '/e/');
  } else if ((url.includes('vdohide.') || url.includes('streamhide.') || url.includes('vidhide.')) && url.includes('/w/')) {
    url = url.replace('/w/', '/e/');
  }

  if (url.startsWith('//')) {
    url = `https:${url}`;
  }

  return url;
}

export function normalizeAnime(item: any, id?: string): AnimeItem {
  const genres = Array.isArray(item.genres)
    ? item.genres
    : typeof item.genres === 'string'
    ? item.genres.split(',').map((g: string) => g.trim()).filter(Boolean)
    : [];

  return {
    ...item,
    id: id || item.id,
    title: item.title || 'Untitled Anime',
    description: item.description || item.synopsis || '',
    synopsis: item.synopsis || item.description || '',
    posterUrl: item.posterUrl || item.poster_url || '',
    poster_url: item.poster_url || item.posterUrl || '',
    bannerUrl: item.bannerUrl || item.banner_url || item.posterUrl || item.poster_url || '',
    banner_url: item.banner_url || item.bannerUrl || item.poster_url || item.posterUrl || '',
    releaseYear: item.releaseYear || item.release_year || '',
    release_year: item.release_year || item.releaseYear || '',
    genres,
    rating: item.rating || '',
    status: item.status || 'Ongoing',
    dubbedBy: item.dubbedBy || item.dubbed_by || 'ZK Dubbing Studio',
    featured: Boolean(item.featured),
    trending: Boolean(item.trending),
    views: typeof item.views === 'number' ? item.views : 0,
  };
}

// Auto-sync an anime from Firestore to Supabase in background
export async function syncAnimeWithSupabase(anime: AnimeItem): Promise<void> {
  if (!anime || !anime.title) return;
  try {
    const { data: byId } = await supabase
      .from('anime')
      .select('id, title, views')
      .eq('id', anime.id)
      .maybeSingle();

    let targetId = byId?.id;
    if (!targetId) {
      const { data: byTitle } = await supabase
        .from('anime')
        .select('id, title, views')
        .ilike('title', anime.title.trim())
        .maybeSingle();
      targetId = byTitle?.id;
    }

    const payload: any = {
      title: anime.title,
      description: anime.description || anime.synopsis || '',
      poster_url: anime.posterUrl || anime.poster_url || '',
      banner_url: anime.bannerUrl || anime.banner_url || '',
      genres: anime.genres || [],
      rating: String(anime.rating || ''),
      release_year: String(anime.releaseYear || anime.release_year || ''),
      status: anime.status || 'Ongoing',
      dubbed_by: anime.dubbedBy || 'ZK Dubbing Studio',
      featured: Boolean(anime.featured),
      trending: Boolean(anime.trending),
      views: anime.views || byId?.views || 0,
      updated_at: new Date().toISOString(),
    };

    if (targetId) {
      await supabase.from('anime').update(payload).eq('id', targetId);
    } else {
      await supabase.from('anime').upsert([{ id: anime.id, ...payload, created_at: new Date().toISOString() }]);
    }
  } catch {}
}

// 1. Featured Anime (Firestore Primary -> Supabase Fallback -> Cache Fallback)
export async function getFeaturedAnime(): Promise<AnimeItem[]> {
  const cacheKey = 'anime_featured';

  // Step 1: Firestore Primary (3.5s timeout)
  try {
    const q = query(collection(db, 'anime'), where('featured', '==', true), limit(8));
    const snap = await withTimeout(getDocs(q), FIRESTORE_TIMEOUT_MS);
    if (snap.size > 0) {
      const list = snap.docs.map(d => normalizeAnime(d.data(), d.id));
      setCache(cacheKey, list);
      list.forEach(item => syncAnimeWithSupabase(item).catch(() => {}));
      return list;
    }

    const snapAll = await withTimeout(getDocs(query(collection(db, 'anime'), limit(6))), FIRESTORE_TIMEOUT_MS);
    if (snapAll.size > 0) {
      const list = snapAll.docs.map(d => normalizeAnime(d.data(), d.id));
      setCache(cacheKey, list);
      list.forEach(item => syncAnimeWithSupabase(item).catch(() => {}));
      return list;
    }
  } catch {}

  // Step 2: Supabase Fallback (3.0s timeout)
  try {
    const res = await withTimeout(
      supabase.from('anime').select('*').eq('featured', true).limit(6),
      SUPABASE_TIMEOUT_MS
    ) as any;
    if (res?.data && res.data.length > 0) {
      const list = res.data.map((item: any) => normalizeAnime(item));
      setCache(cacheKey, list);
      return list;
    }
    const resAll = await withTimeout(
      supabase.from('anime').select('*').limit(6),
      SUPABASE_TIMEOUT_MS
    ) as any;
    if (resAll?.data && resAll.data.length > 0) {
      const list = resAll.data.map((item: any) => normalizeAnime(item));
      setCache(cacheKey, list);
      return list;
    }
  } catch {}

  // Step 3: Cache Fallback
  return getCached<AnimeItem[]>(cacheKey) || getCached<AnimeItem[]>('anime_all')?.slice(0, 6) || [];
}

// 2. Trending Anime (Firestore Primary -> Supabase Fallback -> Cache Fallback)
export async function getTrendingAnime(): Promise<AnimeItem[]> {
  const cacheKey = 'anime_trending';

  // Step 1: Firestore Primary (3.5s timeout)
  try {
    const q = query(collection(db, 'anime'), where('trending', '==', true), limit(10));
    const snap = await withTimeout(getDocs(q), FIRESTORE_TIMEOUT_MS);
    if (snap.size > 0) {
      const list = snap.docs.map(d => normalizeAnime(d.data(), d.id));
      setCache(cacheKey, list);
      list.forEach(item => syncAnimeWithSupabase(item).catch(() => {}));
      return list;
    }

    const snapAll = await withTimeout(getDocs(query(collection(db, 'anime'), limit(10))), FIRESTORE_TIMEOUT_MS);
    if (snapAll.size > 0) {
      const list = snapAll.docs.map(d => normalizeAnime(d.data(), d.id));
      setCache(cacheKey, list);
      list.forEach(item => syncAnimeWithSupabase(item).catch(() => {}));
      return list;
    }
  } catch {}

  // Step 2: Supabase Fallback (3.0s timeout)
  try {
    const res = await withTimeout(
      supabase.from('anime').select('*').order('created_at', { ascending: false }).limit(10),
      SUPABASE_TIMEOUT_MS
    ) as any;
    if (res?.data && res.data.length > 0) {
      const list = res.data.map((item: any) => normalizeAnime(item));
      setCache(cacheKey, list);
      return list;
    }
  } catch {}

  // Step 3: Cache Fallback
  return getCached<AnimeItem[]>(cacheKey) || getCached<AnimeItem[]>('anime_all')?.slice(0, 10) || [];
}

// 3. New Drops (Firestore Primary -> Supabase Fallback -> Cache Fallback)
export async function getNewDrops(): Promise<any[]> {
  const cacheKey = 'anime_new_drops';

  // Step 1: Firestore Primary (3.5s timeout)
  try {
    let episodeDocs: DocumentData[] = [];
    try {
      const q = query(collection(db, 'episodes'), orderBy('createdAt', 'desc'), limit(12));
      const snap = await withTimeout(getDocs(q), FIRESTORE_TIMEOUT_MS);
      episodeDocs = snap.docs.map(d => ({ ...d.data(), id: d.id }));
    } catch {
      const snap = await withTimeout(getDocs(collection(db, 'episodes')), FIRESTORE_TIMEOUT_MS);
      episodeDocs = snap.docs.map(d => ({ ...d.data(), id: d.id }));
    }

    const animeSnap = await withTimeout(getDocs(collection(db, 'anime')), FIRESTORE_TIMEOUT_MS);
    const animeMap: Record<string, any> = {};
    animeSnap.docs.forEach(d => {
      animeMap[d.id] = { ...d.data(), id: d.id };
    });

    if (episodeDocs.length > 0) {
      const seenAnime = new Set<string>();
      const uniqueEpisodes = episodeDocs.filter(ep => {
        const targetId = ep.animeId || ep.id;
        if (seenAnime.has(targetId)) return false;
        seenAnime.add(targetId);
        return true;
      });

      const list = uniqueEpisodes.map(ep => {
        const parentAnime = animeMap[ep.animeId] || {};
        return {
          ...ep,
          id: ep.animeId || ep.id,
          dropId: ep.id,
          episodeId: ep.id,
          title: parentAnime.title || ep.title || ep.episodeTitle,
          posterUrl: parentAnime.posterUrl || parentAnime.poster_url || ep.thumbnailUrl,
          bannerUrl: parentAnime.bannerUrl || parentAnime.banner_url,
          seasonNumber: ep.seasonNumber || 1,
          latestEpisodeRange: `EP ${ep.episodeNumber || 1}`,
          type: parentAnime.type || 'Anime',
        };
      });
      setCache(cacheKey, list);
      return list;
    }

    if (animeSnap.size > 0) {
      const list = animeSnap.docs.map(d => {
        const data = d.data();
        return {
          ...data,
          id: d.id,
          dropId: d.id,
          episodeId: d.id,
          title: data.title,
          posterUrl: data.posterUrl || data.poster_url,
          bannerUrl: data.bannerUrl || data.banner_url,
          seasonNumber: data.seasonNumber || 1,
          latestEpisodeRange: data.latestEpisodeRange || 'Latest',
          type: data.type || 'Anime',
        };
      });
      setCache(cacheKey, list);
      return list;
    }
  } catch {}

  // Step 2: Supabase Fallback (3.0s timeout)
  try {
    const res = await withTimeout(
      supabase.from('episodes').select('*, anime:anime_id(*)').order('created_at', { ascending: false }).limit(12),
      SUPABASE_TIMEOUT_MS
    ) as any;
    const sData = res?.data;

    if (sData && sData.length > 0) {
      const list = sData.map((item: any) => ({
        ...item,
        animeId: item.anime_id,
        seasonId: item.season_id,
        episodeNumber: item.episode_number,
        title: item.anime?.title || item.episode_title,
        posterUrl: item.anime?.poster_url || item.thumbnail_url,
        thumbnailUrl: item.thumbnail_url,
        latestEpisodeRange: `EP ${item.episode_number}`,
      }));
      setCache(cacheKey, list);
      return list;
    }
  } catch {}

  // Step 3: Cache Fallback
  return getCached<any[]>(cacheKey) || [];
}

// 4. Single Anime Details (Firestore Primary -> Supabase Fallback -> Cache Fallback)
export async function getAnimeById(id: string): Promise<AnimeItem | null> {
  if (!id) return null;
  const cacheKey = 'anime_detail_' + id;

  // Step 1: Firestore Primary (3.5s timeout)
  try {
    const snap = await withTimeout(getDoc(doc(db, 'anime', id)), FIRESTORE_TIMEOUT_MS);
    if (snap.exists()) {
      const anime = normalizeAnime(snap.data(), snap.id);
      setCache(cacheKey, anime);
      syncAnimeWithSupabase(anime).catch(() => {});
      return anime;
    }

    const q = query(collection(db, 'anime'), where('title', '==', id), limit(1));
    const snapTitle = await withTimeout(getDocs(q), FIRESTORE_TIMEOUT_MS);
    if (snapTitle.size > 0) {
      const docData = snapTitle.docs[0];
      const anime = normalizeAnime(docData.data(), docData.id);
      setCache(cacheKey, anime);
      syncAnimeWithSupabase(anime).catch(() => {});
      return anime;
    }
  } catch {}

  // Step 2: Supabase Fallback (3.0s timeout)
  try {
    const res = await withTimeout(
      supabase.from('anime').select('*').eq('id', id).maybeSingle(),
      SUPABASE_TIMEOUT_MS
    ) as any;
    const sAnime = res?.data;

    if (sAnime && (sAnime.poster_url || sAnime.title)) {
      const anime = normalizeAnime(sAnime);
      setCache(cacheKey, anime);
      return anime;
    }

    const resTitle = await withTimeout(
      supabase.from('anime').select('*').ilike('title', id.trim()).maybeSingle(),
      SUPABASE_TIMEOUT_MS
    ) as any;
    if (resTitle?.data && (resTitle.data.poster_url || resTitle.data.title)) {
      const anime = normalizeAnime(resTitle.data);
      setCache(cacheKey, anime);
      return anime;
    }
  } catch {}

  // Step 3: Cache Fallback
  const cached = getCached<AnimeItem>(cacheKey);
  if (cached) return cached;
  const allCached = getCached<AnimeItem[]>('anime_all');
  if (allCached) {
    const found = allCached.find(a => a.id === id || a.title?.toLowerCase() === id.toLowerCase());
    if (found) return found;
  }

  return null;
}

// 5. Seasons for Anime (Firestore Primary -> Supabase Fallback -> Cache Fallback)
export async function getSeasonsByAnimeId(animeId: string): Promise<SeasonItem[]> {
  if (!animeId) return [];
  const cacheKey = 'seasons_anime_' + animeId;

  // Step 1: Firestore Primary (3.5s timeout)
  try {
    const q = query(collection(db, 'seasons'), where('animeId', '==', animeId));
    const snap = await withTimeout(getDocs(q), FIRESTORE_TIMEOUT_MS);
    if (snap.size > 0) {
      const seasons = snap.docs.map(d => {
        const data = d.data();
        return {
          ...data,
          id: d.id,
          animeId: data.animeId || data.anime_id || animeId,
          seasonNumber: Number(data.seasonNumber || data.season_number) || 1,
          title: data.title || `Season ${data.seasonNumber || 1}`,
          order: Number(data.order ?? (data.seasonNumber || 1)),
        };
      }) as SeasonItem[];
      seasons.sort((a, b) => (a.order || a.seasonNumber || 0) - (b.order || b.seasonNumber || 0));
      setCache(cacheKey, seasons);
      return seasons;
    }

    const qSnake = query(collection(db, 'seasons'), where('anime_id', '==', animeId));
    const snapSnake = await withTimeout(getDocs(qSnake), FIRESTORE_TIMEOUT_MS);
    if (snapSnake.size > 0) {
      const seasons = snapSnake.docs.map(d => {
        const data = d.data();
        return {
          ...data,
          id: d.id,
          animeId: data.animeId || data.anime_id || animeId,
          seasonNumber: Number(data.seasonNumber || data.season_number) || 1,
          title: data.title || `Season ${data.seasonNumber || 1}`,
          order: Number(data.order ?? (data.seasonNumber || 1)),
        };
      }) as SeasonItem[];
      seasons.sort((a, b) => (a.order || a.seasonNumber || 0) - (b.order || b.seasonNumber || 0));
      setCache(cacheKey, seasons);
      return seasons;
    }

    const snapAll = await withTimeout(getDocs(collection(db, 'seasons')), FIRESTORE_TIMEOUT_MS);
    const matched = snapAll.docs
      .map(d => {
        const data = d.data();
        return {
          ...data,
          id: d.id,
          animeId: data.animeId || data.anime_id || animeId,
          seasonNumber: Number(data.seasonNumber || data.season_number) || 1,
          title: data.title || `Season ${data.seasonNumber || 1}`,
          order: Number(data.order ?? (data.seasonNumber || 1)),
        };
      })
      .filter((s: any) => s.animeId === animeId || s.anime_id === animeId) as SeasonItem[];
    if (matched.length > 0) {
      matched.sort((a, b) => (a.order || a.seasonNumber || 0) - (b.order || b.seasonNumber || 0));
      setCache(cacheKey, matched);
      return matched;
    }
  } catch {}

  // Step 2: Supabase Fallback (3.0s timeout)
  try {
    const res = await withTimeout(
      supabase.from('seasons').select('*').or(`anime_id.eq.${animeId},animeId.eq.${animeId}`).order('season_number', { ascending: true }),
      SUPABASE_TIMEOUT_MS
    ) as any;
    const sSeasons = res?.data;

    if (sSeasons && sSeasons.length > 0) {
      const mapped = sSeasons.map((item: any) => ({
        ...item,
        animeId: item.anime_id || item.animeId || animeId,
        seasonNumber: Number(item.season_number || item.seasonNumber) || 1,
        title: item.title || `Season ${item.season_number || 1}`,
        bannerUrl: item.banner_url || item.bannerUrl,
        order: Number(item.order ?? (item.season_number || 1)),
      }));
      setCache(cacheKey, mapped);
      return mapped;
    }
  } catch {}

  // Step 3: Cache Fallback
  const cached = getCached<SeasonItem[]>(cacheKey);
  if (cached && cached.length > 0) return cached;

  const allCached = getCached<SeasonItem[]>('seasons_all');
  if (allCached && allCached.length > 0) {
    const matched = allCached.filter((s: any) => s.animeId === animeId || s.anime_id === animeId);
    if (matched.length > 0) {
      setCache(cacheKey, matched);
      return matched;
    }
  }

  // Synthesize Season 1 if episodes exist for this anime in cache
  const cachedEpisodes = getCached<EpisodeItem[]>(`episodes_anime_${animeId}_all`) || 
    (getCached<EpisodeItem[]>('episodes_all') || []).filter((e: any) => (e.animeId || e.anime_id) === animeId);
  if (cachedEpisodes && cachedEpisodes.length > 0) {
    const defaultSeason: SeasonItem[] = [{
      id: 's1',
      animeId,
      seasonNumber: 1,
      title: 'Season 1',
      order: 1,
    }];
    setCache(cacheKey, defaultSeason);
    return defaultSeason;
  }

  return [];
}

// Helper to match an episode to a target season (supports seasonId, seasonNumber, s1/s2, and fallback)
export function matchEpisodeToSeason(
  ep: any,
  selectedSeasonId: string,
  seasons: any[] = [],
  allEpisodes: any[] = []
): boolean {
  if (!selectedSeasonId) return true;

  const selectedSeasonObj = seasons.find((s) => s.id === selectedSeasonId);
  const targetSeasonNum = selectedSeasonObj?.seasonNumber != null 
    ? Number(selectedSeasonObj.seasonNumber) 
    : undefined;

  const epSeasonId = ep.seasonId || ep.season_id;
  const epSeasonNum = (ep.seasonNumber != null && ep.seasonNumber !== '') 
    ? Number(ep.seasonNumber) 
    : (ep.season_number != null && ep.season_number !== '') 
    ? Number(ep.season_number) 
    : undefined;

  // 1. Direct seasonId match with selectedSeasonId
  if (epSeasonId && String(epSeasonId).trim() === String(selectedSeasonId).trim()) {
    return true;
  }

  // 2. Direct seasonId match with selectedSeasonObj.id
  if (selectedSeasonObj?.id && epSeasonId && String(epSeasonId).trim() === String(selectedSeasonObj.id).trim()) {
    return true;
  }

  // 3. Match by seasonNumber if both are known
  if (epSeasonNum !== undefined && targetSeasonNum !== undefined) {
    if (epSeasonNum === targetSeasonNum) return true;
  }

  // 4. Match string patterns in epSeasonId (e.g., 's1', 'season 1', 'season-1', 'season_1', '1')
  if (targetSeasonNum !== undefined && epSeasonId) {
    const clean = String(epSeasonId).toLowerCase().trim();
    if (
      clean === `s${targetSeasonNum}` ||
      clean === String(targetSeasonNum) ||
      clean === `season ${targetSeasonNum}` ||
      clean === `season_${targetSeasonNum}` ||
      clean === `season-${targetSeasonNum}` ||
      clean === `season${targetSeasonNum}`
    ) {
      return true;
    }
  }

  // 5. If selected season is Season 1 (or the first season in list):
  // Episodes without any seasonId or with default values belong to Season 1
  const isFirstSeason = selectedSeasonObj 
    ? targetSeasonNum === 1 || seasons[0]?.id === selectedSeasonId 
    : true;

  if (isFirstSeason) {
    // If episode specifically belongs to another season number, do NOT match season 1
    if (epSeasonNum !== undefined && targetSeasonNum !== undefined && epSeasonNum !== targetSeasonNum) {
      return false;
    }
    if (epSeasonId) {
      const clean = String(epSeasonId).toLowerCase().trim();
      if (clean === 's2' || clean === '2' || clean === 'season 2' || clean === 'season_2' || clean === 'season-2' ||
          clean === 's3' || clean === '3' || clean === 'season 3' || clean === 'season_3' || clean === 'season-3' ||
          clean === 's4' || clean === '4' || clean === 's5' || clean === '5') {
        return false;
      }
    }
    if (
      !epSeasonId ||
      epSeasonId === 'default' ||
      epSeasonId === 's1' ||
      epSeasonId === '1' ||
      epSeasonId === 'season 1' ||
      epSeasonId === 'season-1' ||
      epSeasonId === 'season_1' ||
      (epSeasonNum === undefined && !epSeasonId) ||
      epSeasonNum === 1
    ) {
      return true;
    }
  }

  // 6. If anime has only 1 season in total, all episodes of this anime belong to it
  if (seasons.length <= 1) {
    return true;
  }

  return false;
}

// 6. Episodes for Anime / Season (Firestore Primary -> Supabase Fallback -> Cache Fallback)
export async function getEpisodesByAnimeId(animeId: string, seasonId?: string): Promise<EpisodeItem[]> {
  if (!animeId) return [];
  const cacheKey = `episodes_anime_${animeId}_${seasonId || 'all'}`;

  const normalizeEpisodeDoc = (dId: string, data: any): EpisodeItem => {
    const server1 = extractFileMoonUrl(data.server1Url || data.server1_url || data.filemoonUrl || data.filemoon_url || data.videoUrl || data.video_url || '');
    const server2 = extractVDOHideUrl(data.server2Url || data.server2_url || data.vdohideUrl || data.vdohide_url || '');
    const epSeason = data.seasonId || data.season_id || 's1';
    let epSeasonNum = Number(data.seasonNumber || data.season_number);
    if (!epSeasonNum || isNaN(epSeasonNum)) {
      if (epSeason === 's2' || epSeason === '2' || epSeason === 'season 2') epSeasonNum = 2;
      else epSeasonNum = 1;
    }

    return {
      ...data,
      id: dId,
      animeId: data.animeId || data.anime_id || animeId,
      anime_id: data.animeId || data.anime_id || animeId,
      seasonId: epSeason,
      season_id: epSeason,
      seasonNumber: epSeasonNum,
      season_number: epSeasonNum,
      episodeNumber: Number(data.episodeNumber || data.episode_number) || 1,
      episode_number: Number(data.episodeNumber || data.episode_number) || 1,
      title: data.title || data.episode_title || `Episode ${data.episodeNumber || 1}`,
      thumbnailUrl: data.thumbnailUrl || data.thumbnail_url || '',
      server1Url: server1,
      server1_url: server1,
      server2Url: server2,
      server2_url: server2,
      filemoonUrl: server1,
      filemoon_url: server1,
      vdohideUrl: server2,
      vdohide_url: server2,
      videoUrl: server1,
      published: data.published !== false,
    };
  };

  let allAnimeEpisodes: EpisodeItem[] = [];

  // Step 1: Firestore Primary (3.5s timeout)
  try {
    const q1 = query(collection(db, 'episodes'), where('animeId', '==', animeId));
    const snap1 = await withTimeout(getDocs(q1), FIRESTORE_TIMEOUT_MS);
    if (snap1.size > 0) {
      allAnimeEpisodes = snap1.docs.map(d => normalizeEpisodeDoc(d.id, d.data()));
    } else {
      const q2 = query(collection(db, 'episodes'), where('anime_id', '==', animeId));
      const snap2 = await withTimeout(getDocs(q2), FIRESTORE_TIMEOUT_MS);
      if (snap2.size > 0) {
        allAnimeEpisodes = snap2.docs.map(d => normalizeEpisodeDoc(d.id, d.data()));
      } else {
        const snapAll = await withTimeout(getDocs(collection(db, 'episodes')), FIRESTORE_TIMEOUT_MS);
        if (snapAll.size > 0) {
          allAnimeEpisodes = snapAll.docs
            .map(d => normalizeEpisodeDoc(d.id, d.data()))
            .filter(e => e.animeId === animeId);
        }
      }
    }
  } catch {}

  // Step 2: Supabase Fallback (3.0s timeout)
  if (allAnimeEpisodes.length === 0) {
    try {
      const res = await withTimeout(
        supabase.from('episodes').select('*').or(`anime_id.eq.${animeId},animeId.eq.${animeId}`).order('episode_number', { ascending: true }),
        SUPABASE_TIMEOUT_MS
      ) as any;
      if (res?.data && res.data.length > 0) {
        allAnimeEpisodes = res.data.map((item: any) => normalizeEpisodeDoc(item.id, item));
      }
    } catch {}
  }

  // Step 3: Cache Fallback
  if (allAnimeEpisodes.length === 0) {
    const cachedAnimeEpisodes = getCached<EpisodeItem[]>(`episodes_anime_${animeId}_all`) || 
      getCached<EpisodeItem[]>(cacheKey);
    if (cachedAnimeEpisodes && cachedAnimeEpisodes.length > 0) {
      allAnimeEpisodes = cachedAnimeEpisodes;
    } else {
      const allCached = getCached<EpisodeItem[]>('episodes_all');
      if (allCached && allCached.length > 0) {
        allAnimeEpisodes = allCached.filter(e => (e.animeId || (e as any).anime_id) === animeId);
      }
    }
  }

  // Sort episodes in ascending order (Episode 1, 2, 3...)
  allAnimeEpisodes.sort((a, b) => (a.episodeNumber || 0) - (b.episodeNumber || 0));

  // Cache all anime episodes
  if (allAnimeEpisodes.length > 0) {
    setCache(`episodes_anime_${animeId}_all`, allAnimeEpisodes);
  }

  // If filtered by seasonId, apply matching logic
  if (seasonId) {
    const seasonsList = getCached<SeasonItem[]>('seasons_anime_' + animeId) || [];
    const matched = allAnimeEpisodes.filter(ep => matchEpisodeToSeason(ep, seasonId, seasonsList, allAnimeEpisodes));
    
    // Requirement 3: Do not show "No episodes found" if episodes exist
    const finalResult = matched.length > 0 ? matched : allAnimeEpisodes;
    setCache(cacheKey, finalResult);
    return finalResult;
  }

  setCache(cacheKey, allAnimeEpisodes);
  return allAnimeEpisodes;
}

// 7. Single Episode by ID (Firestore Primary -> Supabase Fallback -> Cache Fallback)
export async function getEpisodeById(id: string): Promise<EpisodeItem | null> {
  if (!id) return null;
  const cacheKey = 'episode_detail_' + id;

  // Check cache first
  const cached = getCached<EpisodeItem>(cacheKey);
  if (cached) return cached;

  // Step 1: Firestore Primary (3.5s timeout)
  try {
    const snap = await withTimeout(getDoc(doc(db, 'episodes', id)), FIRESTORE_TIMEOUT_MS);
    if (snap.exists()) {
      const data = snap.data();
      const server1 = extractFileMoonUrl(data.server1Url || data.server1_url || data.filemoonUrl || data.filemoon_url || data.videoUrl || data.video_url || '');
      const server2 = extractVDOHideUrl(data.server2Url || data.server2_url || data.vdohideUrl || data.vdohide_url || '');
      const ep = {
        ...data,
        id: snap.id,
        animeId: data.animeId || data.anime_id,
        seasonId: data.seasonId || data.season_id,
        episodeNumber: data.episodeNumber || data.episode_number || 1,
        title: data.title || data.episode_title || `Episode ${data.episodeNumber || 1}`,
        thumbnailUrl: data.thumbnailUrl || data.thumbnail_url || '',
        server1Url: server1,
        server1_url: server1,
        server2Url: server2,
        server2_url: server2,
        filemoonUrl: server1,
        filemoon_url: server1,
        vdohideUrl: server2,
        vdohide_url: server2,
        videoUrl: server1,
      } as EpisodeItem;
      setCache(cacheKey, ep);
      return ep;
    }
  } catch {}

  // Step 1b: Firestore query by id field
  try {
    const q = query(collection(db, 'episodes'), where('id', '==', id), limit(1));
    const snap = await withTimeout(getDocs(q), FIRESTORE_TIMEOUT_MS);
    if (!snap.empty) {
      const d = snap.docs[0];
      const data = d.data();
      const server1 = extractFileMoonUrl(data.server1Url || data.server1_url || data.filemoonUrl || data.filemoon_url || data.videoUrl || data.video_url || '');
      const server2 = extractVDOHideUrl(data.server2Url || data.server2_url || data.vdohideUrl || data.vdohide_url || '');
      const ep = {
        ...data,
        id: d.id,
        animeId: data.animeId || data.anime_id,
        seasonId: data.seasonId || data.season_id,
        episodeNumber: data.episodeNumber || data.episode_number || 1,
        title: data.title || data.episode_title || `Episode ${data.episodeNumber || 1}`,
        thumbnailUrl: data.thumbnailUrl || data.thumbnail_url || '',
        server1Url: server1,
        server1_url: server1,
        server2Url: server2,
        server2_url: server2,
        filemoonUrl: server1,
        filemoon_url: server1,
        vdohideUrl: server2,
        vdohide_url: server2,
        videoUrl: server1,
      } as EpisodeItem;
      setCache(cacheKey, ep);
      return ep;
    }
  } catch {}

  // Step 2: Supabase Fallback (3.0s timeout)
  try {
    const res = await withTimeout(
      supabase.from('episodes').select('*').eq('id', id).maybeSingle(),
      SUPABASE_TIMEOUT_MS
    ) as any;
    const sEp = res?.data;

    if (sEp) {
      const server1 = extractFileMoonUrl(sEp.server1_url || sEp.server1Url || sEp.filemoon_url || sEp.filemoonUrl || sEp.video_url || sEp.videoUrl || '');
      const server2 = extractVDOHideUrl(sEp.server2_url || sEp.server2Url || sEp.vdohide_url || sEp.vdohideUrl || '');
      const ep = {
        ...sEp,
        id: sEp.id,
        animeId: sEp.anime_id || sEp.animeId,
        seasonId: sEp.season_id || sEp.seasonId,
        episodeNumber: sEp.episode_number || sEp.episodeNumber || 1,
        title: sEp.episode_title || sEp.title || `Episode ${sEp.episode_number || 1}`,
        thumbnailUrl: sEp.thumbnail_url || sEp.thumbnailUrl || '',
        server1Url: server1,
        server1_url: server1,
        server2Url: server2,
        server2_url: server2,
        filemoonUrl: server1,
        filemoon_url: server1,
        vdohideUrl: server2,
        vdohide_url: server2,
        videoUrl: server1,
      };
      setCache(cacheKey, ep);
      return ep;
    }
  } catch {}

  // Step 2c: Search across all cached/fetched episodes
  try {
    const allEps = await getAllEpisodes();
    const found = allEps.find(e => 
      e.id === id || 
      (e as any).episodeId === id
    );
    if (found) {
      setCache(cacheKey, found);
      return found;
    }
  } catch {}

  // Step 3: Cache Fallback
  return getCached<EpisodeItem>(cacheKey) || null;
}

// 8. All Anime (Firestore Primary -> Supabase Fallback -> Cache Fallback)
export async function getAllAnime(): Promise<AnimeItem[]> {
  const cacheKey = 'anime_all';

  // Step 1: Firestore Primary (3.5s timeout)
  try {
    const snap = await withTimeout(getDocs(collection(db, 'anime')), FIRESTORE_TIMEOUT_MS);
    if (snap.size > 0) {
      const list = snap.docs.map(d => normalizeAnime(d.data(), d.id));
      setCache(cacheKey, list);
      list.forEach(item => {
        syncAnimeWithSupabase(item).catch(() => {});
      });
      return list;
    }
  } catch {}

  // Step 2: Supabase Fallback (3.0s timeout)
  try {
    const res = await withTimeout(supabase.from('anime').select('*'), SUPABASE_TIMEOUT_MS) as any;
    const sAnime = res?.data;
    if (sAnime && sAnime.length > 0) {
      const list = sAnime.map((item: any) => normalizeAnime(item));
      setCache(cacheKey, list);
      return list;
    }
  } catch {}

  // Step 3: Cache Fallback
  return getCached<AnimeItem[]>(cacheKey) || [];
}

// 9. All Seasons (Firestore Primary -> Supabase Fallback -> Cache Fallback)
export async function getAllSeasons(): Promise<SeasonItem[]> {
  const cacheKey = 'seasons_all';

  // Step 1: Firestore Primary (3.5s timeout)
  try {
    const snap = await withTimeout(getDocs(collection(db, 'seasons')), FIRESTORE_TIMEOUT_MS);
    if (snap.size > 0) {
      const list = snap.docs.map(d => {
        const data = d.data();
        return {
          ...data,
          id: d.id,
          animeId: data.animeId || data.anime_id,
          seasonNumber: data.seasonNumber || data.season_number || 1,
          title: data.title || '',
          description: data.description || '',
          posterUrl: data.posterUrl || data.poster_url || '',
          bannerUrl: data.bannerUrl || data.banner_url || '',
          order: data.order ?? 0,
        };
      }) as SeasonItem[];
      list.sort((a, b) => (a.order || a.seasonNumber || 0) - (b.order || b.seasonNumber || 0));
      setCache(cacheKey, list);
      return list;
    }
  } catch {}

  // Step 2: Supabase Fallback (3.0s timeout)
  try {
    const res = await withTimeout(supabase.from('seasons').select('*'), SUPABASE_TIMEOUT_MS) as any;
    if (res?.data && res.data.length > 0) {
      const list = res.data.map((item: any) => ({
        ...item,
        id: item.id,
        animeId: item.anime_id,
        seasonNumber: item.season_number || 1,
        title: item.title || '',
        description: item.description || '',
        posterUrl: item.poster_url || '',
        bannerUrl: item.banner_url || '',
        order: item.order ?? 0,
      }));
      list.sort((a: any, b: any) => (a.order || a.seasonNumber || 0) - (b.order || b.seasonNumber || 0));
      setCache(cacheKey, list);
      return list;
    }
  } catch {}

  // Step 3: Cache Fallback
  return getCached<SeasonItem[]>(cacheKey) || [];
}

// 10. All Episodes (Firestore Primary -> Supabase Fallback -> Cache Fallback)
export async function getAllEpisodes(): Promise<EpisodeItem[]> {
  const cacheKey = 'episodes_all';

  const normalizeAllEp = (id: string, data: any): EpisodeItem => {
    const server1 = extractFileMoonUrl(data.server1Url || data.server1_url || data.filemoonUrl || data.filemoon_url || data.videoUrl || data.video_url || '');
    const server2 = extractVDOHideUrl(data.server2Url || data.server2_url || data.vdohideUrl || data.vdohide_url || '');
    const epSeason = data.seasonId || data.season_id || 's1';
    let epSeasonNum = Number(data.seasonNumber || data.season_number);
    if (!epSeasonNum || isNaN(epSeasonNum)) {
      if (epSeason === 's2' || epSeason === '2' || epSeason === 'season 2') epSeasonNum = 2;
      else epSeasonNum = 1;
    }
    return {
      ...data,
      id,
      animeId: data.animeId || data.anime_id,
      anime_id: data.animeId || data.anime_id,
      seasonId: epSeason,
      season_id: epSeason,
      seasonNumber: epSeasonNum,
      season_number: epSeasonNum,
      episodeNumber: Number(data.episodeNumber || data.episode_number) || 1,
      episode_number: Number(data.episodeNumber || data.episode_number) || 1,
      title: data.title || data.episode_title || `Episode ${data.episodeNumber || 1}`,
      thumbnailUrl: data.thumbnailUrl || data.thumbnail_url || '',
      server1Url: server1,
      server1_url: server1,
      server2Url: server2,
      server2_url: server2,
      filemoonUrl: server1,
      filemoon_url: server1,
      vdohideUrl: server2,
      vdohide_url: server2,
      videoUrl: server1,
      published: data.published !== false,
    };
  };

  // Step 1: Firestore Primary (3.5s timeout)
  try {
    const snap = await withTimeout(getDocs(collection(db, 'episodes')), FIRESTORE_TIMEOUT_MS);
    if (snap.size > 0) {
      const list = snap.docs.map(d => normalizeAllEp(d.id, d.data())) as EpisodeItem[];
      list.sort((a, b) => (b.episodeNumber || 0) - (a.episodeNumber || 0));
      setCache(cacheKey, list);

      // Also hydrate per-anime cache
      const byAnime = new Map<string, EpisodeItem[]>();
      list.forEach(ep => {
        const aId = ep.animeId;
        if (aId) {
          if (!byAnime.has(aId)) byAnime.set(aId, []);
          byAnime.get(aId)!.push(ep);
        }
      });
      byAnime.forEach((eps, aId) => {
        eps.sort((a, b) => (a.episodeNumber || 0) - (b.episodeNumber || 0));
        setCache(`episodes_anime_${aId}_all`, eps);
      });

      return list;
    }
  } catch {}

  // Step 2: Supabase Fallback (3.0s timeout)
  try {
    const res = await withTimeout(supabase.from('episodes').select('*'), SUPABASE_TIMEOUT_MS) as any;
    if (res?.data && res.data.length > 0) {
      const list = res.data.map((item: any) => normalizeAllEp(item.id, item));
      list.sort((a: any, b: any) => (b.episodeNumber || 0) - (a.episodeNumber || 0));
      setCache(cacheKey, list);

      // Also hydrate per-anime cache
      const byAnime = new Map<string, EpisodeItem[]>();
      list.forEach((ep: EpisodeItem) => {
        const aId = ep.animeId;
        if (aId) {
          if (!byAnime.has(aId)) byAnime.set(aId, []);
          byAnime.get(aId)!.push(ep);
        }
      });
      byAnime.forEach((eps, aId) => {
        eps.sort((a, b) => (a.episodeNumber || 0) - (b.episodeNumber || 0));
        setCache(`episodes_anime_${aId}_all`, eps);
      });

      return list;
    }
  } catch {}

  // Step 3: Cache Fallback
  return getCached<EpisodeItem[]>(cacheKey) || [];
}

// 11. Save Anime to BOTH Firestore and Supabase
export async function saveAnimeBoth(animeData: any, id?: string): Promise<string> {
  const genres = Array.isArray(animeData.genres)
    ? animeData.genres
    : typeof animeData.genres === 'string'
    ? animeData.genres.split(',').map((g: string) => g.trim()).filter(Boolean)
    : [];

  const poster = animeData.posterUrl || animeData.poster_url || '';
  const banner = animeData.bannerUrl || animeData.banner_url || poster;
  const rating = String(animeData.rating || '');
  const releaseYear = String(animeData.releaseYear || animeData.release_year || '');
  const status = animeData.status || 'Ongoing';
  const dubbedBy = animeData.dubbedBy || animeData.dubbed_by || 'ZK Dubbing Studio';
  const featured = Boolean(animeData.featured);
  const trending = Boolean(animeData.trending);

  const firestorePayload: any = {
    title: animeData.title,
    description: animeData.description || '',
    posterUrl: poster,
    poster_url: poster,
    bannerUrl: banner,
    banner_url: banner,
    genres,
    rating,
    releaseYear,
    release_year: releaseYear,
    status,
    dubbedBy,
    featured,
    trending,
    updatedAt: serverTimestamp(),
  };

  const supabasePayload: any = {
    title: animeData.title,
    description: animeData.description || '',
    poster_url: poster,
    banner_url: banner,
    genres,
    rating,
    release_year: releaseYear,
    status,
    dubbed_by: dubbedBy,
    featured,
    trending,
    updated_at: new Date().toISOString(),
  };

  let targetId = id;

  if (targetId) {
    await setDoc(doc(db, 'anime', targetId), firestorePayload, { merge: true });
    try {
      await supabase.from('anime').upsert({ id: targetId, ...supabasePayload });
    } catch {}
  } else {
    const docRef = await addDoc(collection(db, 'anime'), {
      ...firestorePayload,
      createdAt: serverTimestamp(),
    });
    targetId = docRef.id;

    try {
      await supabase.from('anime').upsert([{ id: targetId, ...supabasePayload, created_at: new Date().toISOString() }]);
    } catch {}
  }

  // Invalidate anime caches
  invalidateCache('anime');

  return targetId;
}

// 12. Delete Anime from BOTH Firestore and Supabase
export async function deleteAnimeBoth(id: string): Promise<void> {
  if (!id) return;
  try {
    await deleteDoc(doc(db, 'anime', id));
  } catch (err) {
    throw err;
  }
  try {
    await supabase.from('anime').delete().eq('id', id);
  } catch {}

  invalidateCache('anime');
}

// 13. Save Season to BOTH Firestore and Supabase
export async function saveSeasonBoth(seasonData: any, id?: string): Promise<string> {
  const firestorePayload: any = {
    animeId: seasonData.animeId || seasonData.anime_id,
    seasonNumber: Number(seasonData.seasonNumber || seasonData.season_number) || 1,
    title: seasonData.title || `Season ${seasonData.seasonNumber || 1}`,
    description: seasonData.description || '',
    posterUrl: seasonData.posterUrl || seasonData.poster_url || '',
    bannerUrl: seasonData.bannerUrl || seasonData.banner_url || '',
    order: Number(seasonData.order || seasonData.seasonNumber) || 0,
    updatedAt: serverTimestamp(),
  };

  const supabasePayload: any = {
    anime_id: firestorePayload.animeId,
    season_number: firestorePayload.seasonNumber,
    title: firestorePayload.title,
    description: firestorePayload.description,
    poster_url: firestorePayload.posterUrl,
    banner_url: firestorePayload.bannerUrl,
    order: firestorePayload.order,
  };

  let targetId = id;
  if (targetId) {
    await setDoc(doc(db, 'seasons', targetId), firestorePayload, { merge: true });
    try {
      await supabase.from('seasons').upsert({ id: targetId, ...supabasePayload });
    } catch {}
  } else {
    const docRef = await addDoc(collection(db, 'seasons'), {
      ...firestorePayload,
      createdAt: serverTimestamp(),
    });
    targetId = docRef.id;
    try {
      await supabase.from('seasons').upsert([{ id: targetId, ...supabasePayload, created_at: new Date().toISOString() }]);
    } catch {}
  }

  invalidateCache('seasons');

  return targetId;
}

// 14. Delete Season from BOTH Firestore and Supabase
export async function deleteSeasonBoth(id: string): Promise<void> {
  if (!id) return;
  try {
    await deleteDoc(doc(db, 'seasons', id));
  } catch (err) {
    throw err;
  }
  try {
    await supabase.from('seasons').delete().eq('id', id);
  } catch {}

  invalidateCache('seasons');
}

// 15. Save Episode with Server 1 (FileMoon) and Server 2 (VDOHide) streaming providers
export async function saveEpisodeBoth(epData: any, id?: string): Promise<string> {
  const server1 = extractFileMoonUrl(epData.server1Url || epData.server1_url || epData.filemoonUrl || epData.filemoon_url || epData.videoUrl || epData.video_url || '');
  const server2 = extractVDOHideUrl(epData.server2Url || epData.server2_url || epData.vdohideUrl || epData.vdohide_url || '');

  // Pre-determine document reference and ID for exact Firestore + Supabase matching
  const docRef = id ? doc(db, 'episodes', id) : doc(collection(db, 'episodes'));
  const targetId = docRef.id;

  const targetAnimeId = epData.animeId || epData.anime_id || '';
  const targetSeasonId = epData.seasonId || epData.season_id || 's1';
  let targetSeasonNumber = Number(epData.seasonNumber || epData.season_number);
  if (!targetSeasonNumber || isNaN(targetSeasonNumber)) {
    if (targetSeasonId === 's2' || targetSeasonId === '2' || targetSeasonId === 'season 2') targetSeasonNumber = 2;
    else targetSeasonNumber = 1;
  }

  const firestorePayload: any = {
    id: targetId,
    animeId: targetAnimeId,
    anime_id: targetAnimeId,
    seasonId: targetSeasonId,
    season_id: targetSeasonId,
    seasonNumber: targetSeasonNumber,
    season_number: targetSeasonNumber,
    episodeNumber: Number(epData.episodeNumber || epData.episode_number) || 1,
    episode_number: Number(epData.episodeNumber || epData.episode_number) || 1,
    title: epData.title || epData.episode_title || `Episode ${epData.episodeNumber || 1}`,
    description: epData.description || '',
    thumbnailUrl: epData.thumbnailUrl || epData.thumbnail_url || '',
    duration: epData.duration || '24m',
    releaseDate: epData.releaseDate || epData.release_date || '',
    server1Url: server1,
    server1_url: server1,
    server2Url: server2,
    server2_url: server2,
    filemoonUrl: server1,
    filemoon_url: server1,
    vdohideUrl: server2,
    vdohide_url: server2,
    videoUrl: server1,
    published: epData.published !== false,
    updatedAt: serverTimestamp(),
  };

  if (!id) {
    firestorePayload.createdAt = serverTimestamp();
  }

  // 1. Save to Firestore
  await setDoc(docRef, firestorePayload, { merge: true });

  // 2. Save to Supabase with identical targetId
  const supabasePayload: any = {
    id: targetId,
    anime_id: firestorePayload.animeId,
    season_id: firestorePayload.seasonId,
    season_number: firestorePayload.seasonNumber,
    episode_number: firestorePayload.episodeNumber,
    episode_title: firestorePayload.title,
    title: firestorePayload.title,
    description: firestorePayload.description,
    thumbnail_url: firestorePayload.thumbnailUrl,
    duration: firestorePayload.duration,
    release_date: firestorePayload.releaseDate,
    filemoon_url: server1,
    video_url: server1,
    published: firestorePayload.published,
    created_at: new Date().toISOString(),
  };

  try {
    await supabase.from('episodes').upsert({
      ...supabasePayload,
      server1_url: server1,
      server2_url: server2,
      vdohide_url: server2,
    });
  } catch {
    try {
      await supabase.from('episodes').upsert(supabasePayload);
    } catch {}
  }

  invalidateCache('episodes');
  invalidateCache('episode_detail_' + targetId);
  invalidateCache('anime_new_drops');

  return targetId;
}

// 16. Delete Episode from BOTH Firestore and Supabase and purge related server URLs
export async function deleteEpisodeBoth(id: string): Promise<void> {
  if (!id) return;

  // 1. Delete from Firestore
  try {
    await deleteDoc(doc(db, 'episodes', id));
  } catch (err: any) {
    console.error("Firestore delete error:", err);
    throw new Error(`Firestore delete failed: ${err?.message || err}`);
  }

  // 2. Delete from Supabase
  try {
    const { error } = await supabase.from('episodes').delete().eq('id', id);
    if (error) {
      console.warn("Supabase episode delete warning:", error.message);
    }
  } catch (err: any) {
    console.warn("Supabase episode delete error:", err?.message || err);
  }

  // 3. Remove all related server URLs and purge caches immediately
  invalidateCache('episode');
  invalidateCache('episodes');
  invalidateCache('anime_new_drops');
  invalidateCache('episode_detail_' + id);

  try {
    if (typeof localStorage !== 'undefined') {
      Object.keys(localStorage).forEach(key => {
        if (key.includes(id) || key.includes('episode') || key.includes('episodes')) {
          localStorage.removeItem(key);
        }
      });
      // Also purge watch history entry if this episode was watched
      try {
        const histRaw = localStorage.getItem('zk_watch_history');
        if (histRaw) {
          const list = JSON.parse(histRaw);
          if (Array.isArray(list)) {
            const filtered = list.filter((h: any) => h.episodeId !== id && h.id !== id);
            localStorage.setItem('zk_watch_history', JSON.stringify(filtered));
          }
        }
      } catch {}
    }
  } catch {}

  // 4. Dispatch events to refresh public website instantly
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('zk_episode_deleted', { detail: { id } }));
      window.dispatchEvent(new Event('storage'));
    }
  } catch {}
}
