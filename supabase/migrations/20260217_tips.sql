-- Wallet transactions table (if not exists)
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  amount DECIMAL(18, 8) NOT NULL,
  description TEXT,
  reference_id TEXT,
  tip_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);

-- Tips table for user-to-user tipping with platform fee
-- Note: to_user_id can be 'platform' for tip jar donations
CREATE TABLE IF NOT EXISTS tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL,
  to_user_id TEXT NOT NULL, -- TEXT to allow 'platform' as recipient
  amount DECIMAL(18, 8) NOT NULL,           -- Total tip amount
  platform_fee DECIMAL(18, 8) NOT NULL,     -- Platform cut
  net_amount DECIMAL(18, 8) NOT NULL,       -- Amount recipient receives
  fee_percentage DECIMAL(5, 2) NOT NULL,    -- Fee % at time of tip (for history)
  tip_type TEXT NOT NULL DEFAULT 'general', -- 'fraud_tip' | 'comment' | 'profile' | 'general'
  reference_id TEXT,                        -- Optional: links to tip/post/comment being rewarded
  message TEXT,                             -- Optional tip message
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform settings table (for configurable fee, etc.)
CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default platform fee (10%)
INSERT INTO platform_settings (key, value) 
VALUES ('tip_fee_percentage', '10'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Insert platform wallet user_id (treasury at index 0)
-- UUID 00000000-0000-0000-0000-000000000000 is reserved for platform treasury
INSERT INTO platform_settings (key, value)
VALUES ('platform_wallet_user_id', '"00000000-0000-0000-0000-000000000000"'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Insert treasury index setting
INSERT INTO platform_settings (key, value)
VALUES ('treasury_derivation_index', '0'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tips_from_user ON tips(from_user_id);
CREATE INDEX IF NOT EXISTS idx_tips_to_user ON tips(to_user_id);
CREATE INDEX IF NOT EXISTS idx_tips_created_at ON tips(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tips_reference ON tips(reference_id) WHERE reference_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tips_type ON tips(tip_type);

-- RLS policies
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Users can see tips they sent or received
CREATE POLICY "Users can view their own tips" ON tips
  FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- Service role can manage all tips
CREATE POLICY "Service role can manage tips" ON tips
  FOR ALL USING (true);

-- Platform settings readable by authenticated users
CREATE POLICY "Authenticated users can read settings" ON platform_settings
  FOR SELECT USING (auth.role() = 'authenticated');

-- Leaderboard view: top tippers and tip receivers
CREATE OR REPLACE VIEW tip_leaderboard AS
SELECT 
  to_user_id as user_id,
  COUNT(*) as tips_received_count,
  SUM(net_amount) as total_tips_received,
  'receiver' as leaderboard_type
FROM tips
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY to_user_id
UNION ALL
SELECT 
  from_user_id as user_id,
  COUNT(*) as tips_sent_count,
  SUM(amount) as total_tips_sent,
  'sender' as leaderboard_type
FROM tips
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY from_user_id;

-- Stats function for platform revenue
CREATE OR REPLACE FUNCTION get_platform_tip_stats(days INTEGER DEFAULT 30)
RETURNS TABLE (
  total_tips BIGINT,
  total_volume DECIMAL,
  total_fees DECIMAL,
  unique_tippers BIGINT,
  unique_recipients BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_tips,
    COALESCE(SUM(amount), 0) as total_volume,
    COALESCE(SUM(platform_fee), 0) as total_fees,
    COUNT(DISTINCT from_user_id)::BIGINT as unique_tippers,
    COUNT(DISTINCT to_user_id)::BIGINT as unique_recipients
  FROM tips
  WHERE created_at > NOW() - (days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
