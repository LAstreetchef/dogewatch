// User / Researcher Profile
export interface Profile {
  id: string;
  handle: string;
  displayName: string;
  bio: string;
  avatarEmoji: string;
  tier: 'Pup' | 'Scout' | 'Tracker' | 'Bloodhound' | 'Alpha';
  xp: number;
  verifiedReports: number;
  accuracyRate: number;
  badges: string[];
  followerCount: number;
  xHandle?: string;
  website?: string;
  createdAt: string;
}

// DOGE Wallet
export interface Wallet {
  id: string;
  userId: string;
  dogeAddress: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  createdAt: string;
}

// Wallet Transaction
export interface Transaction {
  id: string;
  walletId: string;
  type: 'deposit' | 'withdrawal' | 'bounty_payout' | 'tip_sent' | 'tip_received' | 'stake' | 'stake_return' | 'subscription';
  amount: number;
  dogeTxHash?: string;
  description?: string;
  relatedCaseId?: string;
  relatedUserId?: string;
  status: 'pending' | 'confirmed' | 'failed';
  createdAt: string;
}

// Provider (from HHS data)
export interface Provider {
  id: string;
  npi: string;
  name: string;
  state: string;
  specialty?: string;
  anomalyScore: number;
  isFlagged: boolean;
  totalBilled: number;
  totalClaims: number;
  avgMonthly: number;
  dataUpdatedAt?: string;
  createdAt: string;
}

// Provider Billing Record
export interface ProviderBilling {
  id: string;
  providerId: string;
  year: number;
  month: number;
  procedureCode?: string;
  amount: number;
  claims: number;
  beneficiaries: number;
}

// Community Feed Post
export interface Post {
  id: string;
  authorId: string;
  author?: Profile;
  type: 'finding' | 'analysis' | 'tool' | 'bounty' | 'discussion';
  title: string;
  body: string;
  tags: string[];
  bountyAmount: number;
  hasChart: boolean;
  relatedProviderId?: string;
  relatedProvider?: Provider;
  relatedCaseId?: string;
  likeCount: number;
  commentCount: number;
  repostCount: number;
  shareCount: number;
  createdAt: string;
}

// Post Comment
export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  author?: Profile;
  body: string;
  likeCount: number;
  createdAt: string;
}

// Case File
export interface CaseFile {
  id: string;
  authorId: string;
  author?: Profile;
  providerId?: string;
  provider?: Provider;
  title: string;
  summary?: string;
  evidence: CaseEvidence[];
  status: 'draft' | 'submitted' | 'under_review' | 'verified' | 'rejected';
  bountyAmount: number;
  bountyPool: number;
  verifierCount: number;
  createdAt: string;
  submittedAt?: string;
  verifiedAt?: string;
}

// Case Evidence Item
export interface CaseEvidence {
  id: string;
  type: 'data_point' | 'chart_config' | 'note' | 'screenshot' | 'external_link';
  title: string;
  content: string | Record<string, any>;
  createdAt: string;
}

// Case Verification Vote
export interface CaseVote {
  id: string;
  caseId: string;
  voterId: string;
  voter?: Profile;
  vote: 'verify' | 'reject';
  stakeAmount: number;
  createdAt: string;
}

// Share Event (for tracking viral spread)
export interface ShareEvent {
  id: string;
  userId?: string;
  contentType: 'post' | 'case_file' | 'provider' | 'profile' | 'ai_result';
  contentId: string;
  platform: 'x' | 'link' | 'embed';
  createdAt: string;
}

// Bloodhound AI Query Result
export interface BloodhoundResult {
  id: string;
  query: string;
  summary: string;
  flaggedProviders: Provider[];
  patternInsight?: string;
  confidenceScore: number;
  createdAt: string;
}
