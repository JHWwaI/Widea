export interface ProjectSummary {
  id: string;
  title: string;
  targetMarket: string;
  budgetLimit: string | null;
  targetDuration: string | null;
  coreCompetencies?: unknown;
  blueprintCount?: number;
  ideaSessionCount?: number;
  createdAt: string;
}

export interface ProjectListResponse {
  projects: ProjectSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ProjectBlueprintSummary {
  id: string;
  feasibilityScore: number;
  globalCase: {
    companyName: string;
    industry: string | null;
  };
  localizationSummary?: string | null;
  regulationSummary?: string | null;
  altDesign?: string | null;
  riskCount?: number;
  channelCount?: number;
  createdAt: string;
}

export interface ProjectDetailResponse extends ProjectSummary {
  updatedAt?: string;
  industries?: unknown;
  problemKeywords?: string | null;
  revenueModelPref?: unknown;
  targetCustomerAge?: string | null;
  blueprints: ProjectBlueprintSummary[];
}

export interface SyncProjectBriefResponse {
  project: ProjectDetailResponse;
  sourceIdea: {
    id: string;
    titleKo: string;
    status: string;
  };
}

export interface CreditLedgerEntry {
  id: string;
  action: string;
  amount: number;
  balanceAfter: number;
  reason: string;
  createdAt: string;
}

export interface PlanRecord {
  planType: string;
  label: string;
  price: number;
  credits: number;
}

export interface DiscoveryCase {
  rank: number;
  similarityScore: number;
  caseId?: string;
  companyName: string;
  shortDescription?: string | null;
  industry?: string;
  targetMarket?: string;
  /** true: 잠긴 케이스 (블러 처리), false: 공개 */
  locked?: boolean;
  // 공개 케이스에만 포함되는 필드들
  foundedYear?: number | null;
  fundingStage?: string | null;
  revenueModel?: string | null;
  geographicOrigin?: string | null;
  growthStage?: string | null;
  isActive?: boolean;
  koreaPresence?: string | null;
  estimatedARR?: string | null;
  targetCustomerProfile?: string | null;
  teamSizeAtLaunch?: number | null;
  regulatoryComplexity?: string | null;
  tags?: unknown;
  difficultyLevel?: string | null;
  minCapitalKRW?: string | null;
  dataQualityScore?: number;
  companySource?: string | null;
  analysis?: Record<string, unknown> | null;
  // 기존 호환성용 (이전 버전에서 사용)
  businessModel?: string;
}

export interface DiscoveryUnlockResponse {
  caseId: string;
  companyName: string;
  shortDescription?: string | null;
  industry?: string;
  targetMarket?: string;
  foundedYear?: number | null;
  fundingStage?: string | null;
  revenueModel?: string | null;
  geographicOrigin?: string | null;
  growthStage?: string | null;
  isActive?: boolean;
  koreaPresence?: string | null;
  estimatedARR?: string | null;
  targetCustomerProfile?: string | null;
  teamSizeAtLaunch?: number | null;
  regulatoryComplexity?: string | null;
  tags?: unknown;
  difficultyLevel?: string | null;
  minCapitalKRW?: string | null;
  dataQualityScore?: number;
  companySource?: string | null;
  analysis?: Record<string, unknown> | null;
  alreadyUnlocked?: boolean;
  credit: { balance: number; used: number };
}

export interface IdeaMatchCase {
  globalCaseMetaId?: string | null;
  companyName?: string;
  industry?: string | null;
  foundedYear?: number | null;
  fundingStage?: string | null;
  revenueModel?: string | null;
  targetMarket?: string | null;
  score?: number;
}

export interface DiscoveryResponse {
  keyword: string;
  matchCount: number;
  totalCasesInDB: number;
  results: DiscoveryCase[];
  credit: {
    used: number;
    balance: number;
  };
}

export const DISCOVERY_CREDIT_COST = 1;
export const UNLOCK_CREDIT_COST = 2;

export interface BlueprintResponse {
  blueprintId: string;
  feasibilityScore: number;
  benchmarkCase: {
    companyName: string;
    industry: string | null;
    revenueModel: string | null;
  };
  creditUsed: number;
  creditBalance: number;
  analysis: Record<string, unknown>;
}

export interface IdeaCard {
  title?: string;
  summary?: string;
  whyKorea?: string;
  whyNowInKorea?: string;
  sourceBenchmark?: string;
  feasibilityScore?: number;
  confidenceScore?: number;
  businessModel?:
    | string
    | {
        type?: string;
        pricing?: string;
        estimatedMRR?: string;
      };
  revenueModel?:
    | string
    | {
        type?: string;
        pricing?: string;
        estimatedMRR?: string;
      };
  targetCustomer?:
    | string
    | {
        persona?: string;
        age?: string;
        pain?: string;
      };
  roadmap?: Array<{
    phase?: string;
    title?: string;
    duration?: string;
    actions?: string[];
    cost?: string;
    kpi?: string;
  }>;
  estimatedCost?:
    | string
    | {
        total?: string;
        breakdown?: Array<{ item?: string; amount?: string }>;
      };
  risks?: Array<{
    risk?: string;
    impact?: string;
    mitigation?: string;
  }>;
  goToMarket?:
    | string
    | {
        primaryChannelKo?: string;
        secondaryChannelsKo?: string[];
        first10CustomersKo?: string;
      };
  executionPlan?: unknown;
  [key: string]: unknown;
}

export interface GeneratedIdeaSourceBenchmark {
  globalCaseId?: string;
  companyName?: string;
  whyReferencedKo?: string;
}

export interface GeneratedIdeaTargetCustomer {
  personaKo?: string;
  ageGroupKo?: string;
  corePainKo?: string;
  urgencyKo?: string;
  buyingTriggerKo?: string;
  persona?: string;
  age?: string;
  pain?: string;
}

export interface GeneratedIdeaProblemDetail {
  currentWorkflowKo?: string;
  failureCostKo?: string;
}

export interface GeneratedIdeaBusinessModel {
  modelKo?: string;
  pricingKo?: string;
  expansionKo?: string;
  type?: string;
  pricing?: string;
  estimatedMRR?: string;
}

export interface GeneratedIdeaMvpScope {
  coreFeatures?: string[];
  excludeForNow?: string[];
}

export interface GeneratedIdeaGoToMarket {
  primaryChannelKo?: string;
  secondaryChannelsKo?: string[];
  first10CustomersKo?: string;
}

export interface GeneratedIdeaExecutionStep {
  phase?: string;
  title?: string;
  goalKo?: string;
  actionsKo?: string[];
  kpiKo?: string;
  duration?: string;
  actions?: string[];
  cost?: string;
  kpi?: string;
}

export interface GeneratedIdeaEstimatedCost {
  buildKo?: string;
  opsKo?: string;
  notesKo?: string;
  total?: string;
  breakdown?: Array<{ item?: string; amount?: string }>;
}

export interface GeneratedIdeaRisk {
  riskKo?: string;
  risk?: string;
  impact?: string;
  mitigationKo?: string;
  mitigation?: string;
}

export interface GeneratedIdea {
  id: string;
  rank: number;
  status: string;
  titleKo: string;
  oneLinerKo?: string | null;
  summaryKo?: string | null;
  whyNowInKoreaKo?: string | null;
  marketFitScore?: number | null;
  confidenceScore?: number | null;
  sourceBenchmarks?: GeneratedIdeaSourceBenchmark[] | string[] | null;
  targetCustomer?: GeneratedIdeaTargetCustomer | string | null;
  problemDetail?: GeneratedIdeaProblemDetail | string | null;
  businessModel?: GeneratedIdeaBusinessModel | string | null;
  mvpScope?: GeneratedIdeaMvpScope | string | null;
  goToMarket?: GeneratedIdeaGoToMarket | string | null;
  executionPlan?: GeneratedIdeaExecutionStep[] | null;
  estimatedCost?: GeneratedIdeaEstimatedCost | string | null;
  risks?: GeneratedIdeaRisk[] | null;
  rawIdea?: unknown;
  requiresCredit?: boolean;
  planData?: {
    plan?: Record<string, string>;
    customSections?: Array<{ id: string; title: string; content: string }>;
    checked?: Record<string, boolean>;
  } | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface GeneratedIdeaSummary {
  id: string;
  rank: number;
  status: string;
  titleKo: string;
  oneLinerKo?: string | null;
  marketFitScore?: number | null;
  sourceBenchmarks?: GeneratedIdeaSourceBenchmark[] | string[] | null;
  updatedAt?: string;
}

export interface IdeaMatchResponse {
  sessionId: string;
  projectPolicyId?: string;
  matchedCasesCount: number;
  localizedIdeas: {
    ideas?: IdeaCard[];
    [key: string]: unknown;
  };
  generatedIdeas?: GeneratedIdea[];
  creditUsed: number;
  creditBalance: number;
}

export interface IdeaMatchSessionSummary {
  id: string;
  searchQuery: string;
  matchedCases: IdeaMatchCase[] | unknown;
  locale?: string;
  generationVersion?: string | null;
  createdAt: string;
  generatedIdeas?: GeneratedIdeaSummary[];
  _count?: {
    generatedIdeas: number;
  };
  projectPolicy: {
    id: string;
    title: string;
    budgetRange?: string | null;
    industries?: unknown;
    targetCustomerAge?: string | null;
  };
}

export interface IdeaMatchSessionListResponse {
  total: number;
  limit: number;
  offset: number;
  sessions: IdeaMatchSessionSummary[];
}

export interface IdeaMatchSessionDetailResponse {
  id: string;
  searchQuery: string;
  matchedCases: IdeaMatchCase[] | unknown;
  localizedIdeas: {
    ideas?: IdeaCard[];
    [key: string]: unknown;
  };
  generatedIdeas?: GeneratedIdea[];
  createdAt: string;
  locale?: string;
  generationVersion?: string | null;
  projectPolicy?: {
    id: string;
    title: string;
  };
}

export interface UpdateGeneratedIdeaStatusResponse {
  idea: GeneratedIdea;
  sessionId: string;
  projectPolicy: {
    id: string;
    title: string;
  };
}

export interface CommunityPost {
  id: string;
  title: string;
  content: string;
  category: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: string;
    name: string | null;
    email: string;
  };
  _count?: {
    comments: number;
    likes: number;
  };
  bookmarked?: boolean;
}

export interface CommunityListResponse {
  posts: CommunityPost[];
  total: number;
  page: number;
  totalPages: number;
}

export interface PostComment {
  id: string;
  content: string;
  createdAt: string;
  author?: {
    id: string;
    name: string | null;
    email: string;
  };
}

export interface CommunityPostDetail extends CommunityPost {
  comments: PostComment[];
}

export type DecisionStatus = "PENDING" | "GO" | "PIVOT" | "HOLD";

export interface ValidationLedgerEntry {
  id: string;
  sprintRound: number;
  hypothesis: string;
  actionItem: string | null;
  decisionStatus: DecisionStatus;
  resultData: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  kBlueprintId: string;
}

export interface ValidationLedgerListResponse {
  validations: ValidationLedgerEntry[];
}

export type TeamMemberRole = "OWNER" | "DEVELOPER" | "DESIGNER" | "MARKETER" | "ADVISOR" | "MEMBER";
export type TeamMemberStatus = "INVITED" | "ACTIVE" | "LEFT";

export interface TeamMember {
  id: string;
  email: string;
  role: TeamMemberRole;
  status: TeamMemberStatus;
  bio: string | null;
  inviteToken: string | null;
  createdAt: string;
  user?: { id: string; name: string | null; email: string } | null;
}

export interface TeamListResponse {
  members: TeamMember[];
}

export interface ProjectMeeting {
  id: string;
  title: string;
  roomId: string;
  roomUrl: string;
  agenda: string | null;
  scheduledAt: string | null;
  createdAt: string;
  createdBy?: { id: string; name: string | null; email: string };
}

export interface MeetingListResponse {
  meetings: ProjectMeeting[];
}

export interface IdeaDetailResponse extends GeneratedIdea {
  sessionId: string;
  projectPolicy: {
    id: string;
    title: string;
    targetMarket: string;
  };
  matchedCases: IdeaMatchCase[] | unknown;
}
