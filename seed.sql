-- Add missing columns to anime table
ALTER TABLE IF EXISTS anime ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE IF EXISTS anime ADD COLUMN IF NOT EXISTS poster_url TEXT;
ALTER TABLE IF EXISTS anime ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE IF EXISTS anime ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'Dub';
ALTER TABLE IF EXISTS anime ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS anime ADD COLUMN IF NOT EXISTS trending BOOLEAN DEFAULT false;

-- Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Anime is viewable by everyone." ON anime;
DROP POLICY IF EXISTS "All users can manage anime." ON anime;
DROP POLICY IF EXISTS "Seasons are viewable by everyone." ON seasons;
DROP POLICY IF EXISTS "All users can manage seasons." ON seasons;
DROP POLICY IF EXISTS "Episodes are viewable by everyone." ON episodes;
DROP POLICY IF EXISTS "All users can manage episodes." ON episodes;

-- Create correct SELECT policies (Allow anyone to read)
CREATE POLICY "Enable read access for all users" ON anime FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON seasons FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON episodes FOR SELECT USING (true);

-- Create correct INSERT/UPDATE policies (For prototype seeding)
CREATE POLICY "Enable insert for all users" ON anime FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable insert for all users" ON seasons FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable insert for all users" ON episodes FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON anime FOR UPDATE USING (true);
CREATE POLICY "Enable update for all users" ON seasons FOR UPDATE USING (true);
CREATE POLICY "Enable update for all users" ON episodes FOR UPDATE USING (true);

-- Truncate existing data to start fresh
TRUNCATE TABLE episodes, seasons, anime CASCADE;

-- Insert Anime
INSERT INTO anime (id, title, description, poster_url, banner_url, genres, language, status, featured, trending) VALUES
('11111111-1111-1111-1111-111111111111', 'Solo Leveling', 'In a world where hunters with magical powers must battle deadly monsters to protect the human race from certain annihilation, a notoriously weak hunter named Sung Jinwoo finds himself in a seemingly endless struggle for survival.', 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx151807-m1gX3iqITqHn.png', 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/151807-37Hg8CiaR5K1.jpg', ARRAY['Action', 'Adventure', 'Fantasy'], 'Dub', 'Ongoing', true, true),
('22222222-2222-2222-2222-222222222222', 'Jujutsu Kaisen', 'Idly indulging in baseless paranormal activities with the Occult Club, high schooler Yuuji Itadori spends his days at either the clubroom or the hospital, where he visits his bedridden grandfather.', 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx113415-bbBWj4pEFseh.jpg', 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/113415-jQBSkxWAAk83.jpg', ARRAY['Action', 'Supernatural', 'Fantasy'], 'Dub', 'Completed', true, true),
('33333333-3333-3333-3333-333333333333', 'Demon Slayer', 'It is the Taisho Period in Japan. Tanjiro, a kindhearted boy who sells charcoal for a living, finds his family slaughtered by a demon.', 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx101922-PEn1CTc93DQl.jpg', 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/101922-YlzXGqKZXKPV.jpg', ARRAY['Action', 'Fantasy', 'Historical'], 'Dub', 'Completed', false, true);

-- Insert Seasons
INSERT INTO seasons (id, anime_id, season_number) VALUES
('11111111-1111-1111-1111-000000000001', '11111111-1111-1111-1111-111111111111', 1),
('22222222-2222-2222-2222-000000000001', '22222222-2222-2222-2222-222222222222', 1),
('33333333-3333-3333-3333-000000000001', '33333333-3333-3333-3333-333333333333', 1);

-- Insert Episodes
INSERT INTO episodes (id, anime_id, season_id, episode_number, episode_title, thumbnail_url, filemoon_url) VALUES
('11111111-1111-1111-1111-000000000002', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-000000000001', 1, 'Episode 1', 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/151807-37Hg8CiaR5K1.jpg', 'https://filemoon.sx/e/placeholder'),
('22222222-2222-2222-2222-000000000002', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-000000000001', 1, 'Ryomen Sukuna', 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/113415-jQBSkxWAAk83.jpg', 'https://filemoon.sx/e/placeholder'),
('33333333-3333-3333-3333-000000000002', '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-000000000001', 1, 'Cruelty', 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/101922-YlzXGqKZXKPV.jpg', 'https://filemoon.sx/e/placeholder');

