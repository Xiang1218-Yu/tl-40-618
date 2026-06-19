export type DebateFormat = 'parliamentary' | 'mandarin' | 'moot_court' | 'british_parliamentary';
export type TournamentType = 'single_elimination' | 'swiss' | 'round_robin';
export type MatchStatus = 'pending' | 'ongoing' | 'finished';
export type Side = 'pro' | 'con' | 'both' | 'judge';
export type Winner = 'pro' | 'con' | 'draw';

export type BPRole = 'og' | 'oo' | 'cg' | 'co'; // 正方上院/反方上院/正方下院/反方下院

export interface BPTeamAssignment {
  og: string; // 正方上院 teamId
  oo: string; // 反方上院 teamId
  cg: string; // 正方下院 teamId
  co: string; // 反方下院 teamId
}

export interface Player {
  id: string;
  name: string;
  role: '一辩' | '二辩' | '三辩' | '四辩' | '替补';
  contact?: string;
  scores: PlayerScoreRecord[];
}

export interface Team {
  id: string;
  name: string;
  institution: string;
  players: Player[];
  seed: number;
  createdAt: number;
}

export interface Judge {
  id: string;
  name: string;
  institution: string;
  title?: string;
  avoidTeams: string[];
  avoidInstitutions: string[];
  avoidPlayers: string[];
}

export type TopicCategory = '政策' | '价值' | '事实' | '模拟法庭';

export interface Topic {
  id: string;
  title: string;
  proSide: string;
  conSide: string;
  category: TopicCategory[];
  formats: DebateFormat[];
  difficulty: 1 | 2 | 3 | 4 | 5;
}

export interface DebateStageConfig {
  id: string;
  name: string;
  side?: Side;
  speakerIndex?: number;
  duration: number;
  crossExamine?: {
    enabled: boolean;
    duration?: number;
  };
  bpRole?: 'og' | 'oo' | 'cg' | 'co';
}

export interface ScoringCriterion {
  id: string;
  name: string;
  maxScore: number;
  weight: number;
  description?: string;
}

export interface FormatRules {
  format: DebateFormat;
  label: string;
  description: string;
  stages: DebateStageConfig[];
  scoringCriteria: ScoringCriterion[];
  teamScoreMax: number;
  isFourTeamFormat?: boolean; // BP赛制为true，支持4队（OG/OO/CG/CO）
}

export interface TournamentConfig {
  id: string;
  name: string;
  format: DebateFormat;
  type: TournamentType;
  totalRounds: number;
  judgesPerMatch: number;
  createdAt: number;
  currentRound: number;
  description?: string;
}

export interface PlayerScore {
  criteriaScores: Record<string, number>;
  total: number;
}

export interface JudgeScore {
  id: string;
  judgeId: string;
  proTeamScore: number;
  conTeamScore: number;
  proPlayerScores: Record<string, PlayerScore>;
  conPlayerScores: Record<string, PlayerScore>;
  comments: {
    pro?: string;
    con?: string;
    general?: string;
  };
  submittedAt: number;
  // BP四队制专用字段
  fourTeamScores?: {
    og: number;
    oo: number;
    cg: number;
    co: number;
  };
  fourTeamPlayerScores?: {
    og: Record<string, PlayerScore>;
    oo: Record<string, PlayerScore>;
    cg: Record<string, PlayerScore>;
    co: Record<string, PlayerScore>;
  };
  fourTeamRankings?: {
    og: number; // 1-4名
    oo: number;
    cg: number;
    co: number;
  };
}

export interface PlayerMatchScore {
  playerId: string;
  totalScore: number;
  avgScore: number;
  mvpVotes: number;
}

export interface MatchScore {
  matchId: string;
  judgeScores: JudgeScore[];
  proTeamTotal: number;
  conTeamTotal: number;
  playerScores: PlayerMatchScore[];
  mvpPlayerId?: string;
}

export interface MatchPairing {
  id: string;
  tournamentId: string;
  round: number;
  matchNumber: number;
  proTeamId: string;
  conTeamId: string;
  topicId: string;
  judgeIds: string[];
  status: MatchStatus;
  scores?: MatchScore;
  winner?: Winner;
  startedAt?: number;
  finishedAt?: number;
  currentStageIndex?: number;
  // BP四队制专用字段
  bpTeams?: BPTeamAssignment;
}

export interface PlayerScoreRecord {
  matchId: string;
  score: number;
  isMVP: boolean;
}

export interface TeamRanking {
  teamId: string;
  teamName: string;
  institution: string;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  totalScore: number;
  avgScore: number;
  ballots: number;
  rank?: number;
}

export interface PlayerRanking {
  playerId: string;
  playerName: string;
  teamName: string;
  teamId: string;
  totalMatches: number;
  totalScore: number;
  avgScore: number;
  mvpCount: number;
  rank?: number;
}

export interface TimerStageState {
  stageIndex: number;
  stageConfig: DebateStageConfig;
  remainingSeconds: number;
  totalSeconds: number;
}

export interface TimerState {
  current: TimerStageState;
  isRunning: boolean;
  isFinished: boolean;
  hasStarted: boolean;
  format: DebateFormat;
}

export interface AvoidanceConflict {
  judgeId: string;
  judgeName: string;
  teamId: string;
  teamName: string;
  reason: string;
  type: 'team' | 'institution' | 'player';
}

export interface Danmaku {
  id: string;
  matchId: string;
  content: string;
  senderName: string;
  senderSide?: 'pro' | 'con' | 'neutral';
  color?: string;
  createdAt: number;
}

export interface DanmakuChannelMessage {
  type: 'danmaku' | 'clear' | 'ping';
  data?: Danmaku;
  matchId: string;
  timestamp: number;
}
