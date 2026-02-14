-- DogeWatch Schema - Phase 2
-- Run this in Supabase SQL Editor

-- Users / Researchers
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  handle TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  bio TEXT DEFAULT '',
  avatar_emoji TEXT DEFAULT '🐕',
  tier TEXT DEFAULT 'Pup' CHECK (tier IN ('Pup','Scout','Tracker','Bloodhound','Alpha')),
  xp INTEGER DEFAULT 0,
  verified_reports INTEGER DEFAULT 0,
  accuracy_rate NUMERIC(5,2) DEFAULT 0,
  badges TEXT[] DEFAULT '{}',
  follower_count INTEGER DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  x_handle TEXT,
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DOGE Wallets (custodial)
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  doge_address TEXT UNIQUE NOT NULL,
  balance NUMERIC(18,8) DEFAULT 0,
  total_earned NUMERIC(18,8) DEFAULT 0,
  total_spent NUMERIC(18,8) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wallet Transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES wallets(id),
  type TEXT NOT NULL CHECK (type IN ('deposit','withdrawal','bounty_payout','tip_sent','tip_received','stake','stake_return','subscription')),
  amount NUMERIC(18,8) NOT NULL,
  doge_tx_hash TEXT,
  description TEXT,
  related_case_id UUID,
  related_user_id UUID,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Provider Data (ingested from HHS dataset)
CREATE TABLE providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  npi TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  specialty TEXT,
  anomaly_score NUMERIC(5,4) DEFAULT 0,
  is_flagged BOOLEAN DEFAULT FALSE,
  total_billed NUMERIC(14,2) DEFAULT 0,
  total_claims INTEGER DEFAULT 0,
  avg_monthly NUMERIC(12,2) DEFAULT 0,
  data_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Provider Monthly Billing Data
CREATE TABLE provider_billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  procedure_code TEXT,
  amount NUMERIC(12,2) NOT NULL,
  claims INTEGER NOT NULL,
  beneficiaries INTEGER DEFAULT 0,
  UNIQUE(provider_id, year, month, procedure_code)
);

-- Community Feed Posts
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('finding','analysis','tool','bounty','discussion')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  bounty_amount NUMERIC(18,8) DEFAULT 0,
  has_chart BOOLEAN DEFAULT FALSE,
  related_provider_id UUID REFERENCES providers(id),
  related_case_id UUID,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  repost_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Post Likes
CREATE TABLE post_likes (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

-- Post Comments
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reposts
CREATE TABLE reposts (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

-- Case Files
CREATE TABLE case_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES providers(id),
  title TEXT NOT NULL,
  summary TEXT,
  evidence JSONB DEFAULT '[]',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','submitted','under_review','verified','rejected')),
  bounty_amount NUMERIC(18,8) DEFAULT 0,
  bounty_pool NUMERIC(18,8) DEFAULT 0,
  verifier_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ
);

-- Case Verification Votes
CREATE TABLE case_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES case_files(id) ON DELETE CASCADE,
  voter_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  vote TEXT CHECK (vote IN ('verify','reject')),
  stake_amount NUMERIC(18,8) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(case_id, voter_id)
);

-- Follows
CREATE TABLE follows (
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);

-- Provider Watchlist
CREATE TABLE watchlist (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
  alert_threshold NUMERIC(5,4) DEFAULT 0.7,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, provider_id)
);

-- Share Tracking (for viral metrics)
CREATE TABLE share_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  content_type TEXT NOT NULL CHECK (content_type IN ('post','case_file','provider','profile','ai_result')),
  content_id UUID NOT NULL,
  platform TEXT DEFAULT 'x' CHECK (platform IN ('x','link','embed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_providers_state ON providers(state);
CREATE INDEX idx_providers_anomaly ON providers(anomaly_score DESC);
CREATE INDEX idx_providers_flagged ON providers(is_flagged) WHERE is_flagged = TRUE;
CREATE INDEX idx_posts_type ON posts(type);
CREATE INDEX idx_posts_created ON posts(created_at DESC);
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_billing_provider ON provider_billing(provider_id);
CREATE INDEX idx_transactions_wallet ON transactions(wallet_id);
CREATE INDEX idx_case_files_status ON case_files(status);
CREATE INDEX idx_case_files_author ON case_files(author_id);
CREATE INDEX idx_share_events_content ON share_events(content_type, content_id);
CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_wallets_user ON wallets(user_id);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reposts ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_billing ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles: public read, users update own
CREATE POLICY "Profiles are public" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Wallets: users see/manage own only
CREATE POLICY "Users view own wallet" ON wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own wallet" ON wallets FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Transactions: users see own wallet transactions
CREATE POLICY "Users view own transactions" ON transactions FOR SELECT 
  USING (wallet_id IN (SELECT id FROM wallets WHERE user_id = auth.uid()));

-- Posts: public read, users create/update own
CREATE POLICY "Posts are public" ON posts FOR SELECT USING (true);
CREATE POLICY "Users create posts" ON posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users update own posts" ON posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Users delete own posts" ON posts FOR DELETE USING (auth.uid() = author_id);

-- Post Likes: users manage own likes
CREATE POLICY "Likes are public" ON post_likes FOR SELECT USING (true);
CREATE POLICY "Users can like" ON post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike" ON post_likes FOR DELETE USING (auth.uid() = user_id);

-- Comments: public read, users create/delete own
CREATE POLICY "Comments are public" ON comments FOR SELECT USING (true);
CREATE POLICY "Users create comments" ON comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users delete own comments" ON comments FOR DELETE USING (auth.uid() = author_id);

-- Reposts: users manage own
CREATE POLICY "Reposts are public" ON reposts FOR SELECT USING (true);
CREATE POLICY "Users can repost" ON reposts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unrepost" ON reposts FOR DELETE USING (auth.uid() = user_id);

-- Case Files: public read, users manage own
CREATE POLICY "Case files are public" ON case_files FOR SELECT USING (true);
CREATE POLICY "Users create case files" ON case_files FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users update own case files" ON case_files FOR UPDATE USING (auth.uid() = author_id);

-- Case Votes: users manage own votes
CREATE POLICY "Votes are public" ON case_votes FOR SELECT USING (true);
CREATE POLICY "Users can vote" ON case_votes FOR INSERT WITH CHECK (auth.uid() = voter_id);
CREATE POLICY "Users can change vote" ON case_votes FOR UPDATE USING (auth.uid() = voter_id);

-- Follows: public read, users manage own
CREATE POLICY "Follows are public" ON follows FOR SELECT USING (true);
CREATE POLICY "Users can follow" ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON follows FOR DELETE USING (auth.uid() = follower_id);

-- Watchlist: users manage own
CREATE POLICY "Users view own watchlist" ON watchlist FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage watchlist" ON watchlist FOR ALL USING (auth.uid() = user_id);

-- Share Events: public insert for tracking, users see own
CREATE POLICY "Anyone can log share" ON share_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Users see own shares" ON share_events FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- Providers: public read (HHS data is public)
CREATE POLICY "Providers are public" ON providers FOR SELECT USING (true);

-- Provider Billing: public read
CREATE POLICY "Billing data is public" ON provider_billing FOR SELECT USING (true);

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, handle, display_name)
  VALUES (
    NEW.id,
    LOWER(SPLIT_PART(NEW.email, '@', 1) || '_' || SUBSTRING(NEW.id::TEXT, 1, 4)),
    SPLIT_PART(NEW.email, '@', 1)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto profile creation
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to generate DOGE wallet address (placeholder - real impl would use HD wallet)
CREATE OR REPLACE FUNCTION generate_doge_address()
RETURNS TEXT AS $$
BEGIN
  RETURN 'D' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 33));
END;
$$ LANGUAGE plpgsql;

-- Function to auto-create wallet on profile creation
CREATE OR REPLACE FUNCTION handle_new_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO wallets (user_id, doge_address)
  VALUES (NEW.id, generate_doge_address());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto wallet creation
CREATE OR REPLACE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_new_profile();
