-- Cases table - fraud findings submitted for community verification
CREATE TABLE IF NOT EXISTS cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Submitter
  submitter_id UUID REFERENCES auth.users(id) NOT NULL,
  
  -- Finding details
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  evidence TEXT, -- Detailed evidence/analysis
  provider_npi TEXT, -- Optional: linked provider
  provider_name TEXT,
  
  -- Bounty
  bounty_amount DECIMAL(18, 8) DEFAULT 0, -- DOGE bounty pool
  
  -- Verification status
  status TEXT NOT NULL DEFAULT 'open', -- 'open' | 'verified' | 'rejected' | 'disputed'
  
  -- Voting window
  verification_opens_at TIMESTAMPTZ DEFAULT NOW(),
  verification_closes_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '72 hours'),
  
  -- Vote tallies (cached for performance)
  valid_votes_count INTEGER DEFAULT 0,
  invalid_votes_count INTEGER DEFAULT 0,
  valid_stake_total DECIMAL(18, 8) DEFAULT 0,
  invalid_stake_total DECIMAL(18, 8) DEFAULT 0,
  
  -- Resolution
  resolved_at TIMESTAMPTZ,
  resolution_tx_hash TEXT, -- On-chain record of resolution
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Verification votes - community members stake to verify
CREATE TABLE IF NOT EXISTS verification_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  case_id UUID REFERENCES cases(id) NOT NULL,
  voter_id UUID REFERENCES auth.users(id) NOT NULL,
  
  -- Vote
  vote TEXT NOT NULL CHECK (vote IN ('valid', 'invalid')),
  stake_amount DECIMAL(18, 8) NOT NULL,
  
  -- Optional comment/evidence
  comment TEXT,
  
  -- Payout tracking
  payout_amount DECIMAL(18, 8), -- Filled after resolution
  payout_status TEXT DEFAULT 'pending', -- 'pending' | 'won' | 'lost' | 'paid'
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One vote per user per case
  UNIQUE(case_id, voter_id)
);

-- Case responses - allow accused parties or others to respond
CREATE TABLE IF NOT EXISTS case_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  case_id UUID REFERENCES cases(id) NOT NULL,
  responder_id UUID REFERENCES auth.users(id),
  
  -- Response type
  response_type TEXT NOT NULL DEFAULT 'comment', -- 'comment' | 'defense' | 'evidence' | 'official'
  
  -- Content
  content TEXT NOT NULL,
  evidence_urls TEXT[], -- Supporting links
  
  -- Verification (for official responses)
  is_verified_party BOOLEAN DEFAULT FALSE, -- True if responder is the accused provider
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_submitter ON cases(submitter_id);
CREATE INDEX IF NOT EXISTS idx_cases_closes_at ON cases(verification_closes_at);
CREATE INDEX IF NOT EXISTS idx_cases_provider ON cases(provider_npi) WHERE provider_npi IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_votes_case ON verification_votes(case_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter ON verification_votes(voter_id);

CREATE INDEX IF NOT EXISTS idx_responses_case ON case_responses(case_id);

-- RLS policies
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_responses ENABLE ROW LEVEL SECURITY;

-- Cases are publicly viewable
CREATE POLICY "Cases are viewable by everyone" ON cases
  FOR SELECT USING (true);

-- Authenticated users can create cases
CREATE POLICY "Authenticated users can create cases" ON cases
  FOR INSERT WITH CHECK (auth.uid() = submitter_id);

-- Votes are publicly viewable
CREATE POLICY "Votes are viewable by everyone" ON verification_votes
  FOR SELECT USING (true);

-- Authenticated users can vote
CREATE POLICY "Authenticated users can vote" ON verification_votes
  FOR INSERT WITH CHECK (auth.uid() = voter_id);

-- Responses are publicly viewable
CREATE POLICY "Responses are viewable by everyone" ON case_responses
  FOR SELECT USING (true);

-- Authenticated users can respond
CREATE POLICY "Authenticated users can respond" ON case_responses
  FOR INSERT WITH CHECK (auth.uid() = responder_id);

-- Service role can manage all
CREATE POLICY "Service role manages cases" ON cases FOR ALL USING (true);
CREATE POLICY "Service role manages votes" ON verification_votes FOR ALL USING (true);
CREATE POLICY "Service role manages responses" ON case_responses FOR ALL USING (true);

-- Function to update vote tallies
CREATE OR REPLACE FUNCTION update_case_vote_tallies()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE cases SET
    valid_votes_count = (SELECT COUNT(*) FROM verification_votes WHERE case_id = NEW.case_id AND vote = 'valid'),
    invalid_votes_count = (SELECT COUNT(*) FROM verification_votes WHERE case_id = NEW.case_id AND vote = 'invalid'),
    valid_stake_total = (SELECT COALESCE(SUM(stake_amount), 0) FROM verification_votes WHERE case_id = NEW.case_id AND vote = 'valid'),
    invalid_stake_total = (SELECT COALESCE(SUM(stake_amount), 0) FROM verification_votes WHERE case_id = NEW.case_id AND vote = 'invalid'),
    updated_at = NOW()
  WHERE id = NEW.case_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update tallies on vote
CREATE TRIGGER trigger_update_vote_tallies
  AFTER INSERT OR UPDATE ON verification_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_case_vote_tallies();
