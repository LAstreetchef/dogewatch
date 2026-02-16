-- Inscriptions table for blockchain-recorded fraud tips
CREATE TABLE IF NOT EXISTS inscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tip_id TEXT NOT NULL UNIQUE,
  provider_npi TEXT NOT NULL,
  provider_name TEXT,
  anomaly_score INTEGER,
  ipfs_hash TEXT NOT NULL,
  tx_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  user_id UUID REFERENCES auth.users(id),
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User badges table
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  badge_type TEXT NOT NULL,
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inscriptions_tip_id ON inscriptions(tip_id);
CREATE INDEX IF NOT EXISTS idx_inscriptions_provider_npi ON inscriptions(provider_npi);
CREATE INDEX IF NOT EXISTS idx_inscriptions_user_id ON inscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_inscriptions_status ON inscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);

-- RLS policies
ALTER TABLE inscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Anyone can read inscriptions (they're public blockchain records)
CREATE POLICY "Inscriptions are viewable by everyone" ON inscriptions
  FOR SELECT USING (true);

-- Only authenticated users can create inscriptions
CREATE POLICY "Authenticated users can create inscriptions" ON inscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can view their own badges
CREATE POLICY "Users can view their own badges" ON user_badges
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage badges (for system-awarded badges)
CREATE POLICY "Service role can manage badges" ON user_badges
  FOR ALL USING (true);

-- Helper function to increment badge count (if profile table has badge_count)
CREATE OR REPLACE FUNCTION increment_badge_count(uid UUID)
RETURNS void AS $$
BEGIN
  UPDATE profiles 
  SET badge_count = COALESCE(badge_count, 0) + 1,
      updated_at = NOW()
  WHERE id = uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to add user points
CREATE OR REPLACE FUNCTION add_user_points(uid UUID, points INTEGER, reason TEXT)
RETURNS void AS $$
BEGIN
  -- Update total points in profile
  UPDATE profiles 
  SET total_points = COALESCE(total_points, 0) + points,
      updated_at = NOW()
  WHERE id = uid;
  
  -- Log the points transaction
  INSERT INTO point_transactions (user_id, points, reason, created_at)
  VALUES (uid, points, reason, NOW());
EXCEPTION
  WHEN undefined_table THEN
    -- point_transactions table doesn't exist, just update profile
    NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Point transactions log (optional)
CREATE TABLE IF NOT EXISTS point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  points INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id ON point_transactions(user_id);
