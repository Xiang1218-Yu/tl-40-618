import { Team, Judge, Topic, TournamentConfig, MatchPairing, DebateFormat, TournamentType, TopicCategory } from '@/types';
import { uid } from '@/engines/scoringEngine';

const now = Date.now();

const roleOptions: ('一辩' | '二辩' | '三辩' | '四辩')[] = ['一辩', '二辩', '三辩', '四辩'];

const INSTITUTIONS = [
  '北京大学', '清华大学', '复旦大学', '上海交通大学',
  '浙江大学', '南京大学', '武汉大学', '中山大学',
  '中国人民大学', '北京师范大学', '厦门大学', '同济大学',
  '四川大学', '南开大学', '西安交通大学', '华中科技大学',
];

const TEAM_NAME_PREFIXES = [
  '青锋', '明辨', '知行', '弘毅', '求是', '博雅', '经纬', '星芒',
  '格致', '云帆', '弘毅', '晨光', '百川', '观澜', '北辰', '远志',
];

const PLAYER_NAMES = [
  '思远', '子轩', '嘉怡', '浩然', '若涵', '雨泽', '梓涵', '星宇',
  '诗涵', '伟祺', '雅婷', '明辉', '晨曦', '瑞杰', '佳宁', '博文',
  '欣怡', '奕辰', '婉清', '嘉豪', '梦琪', '振宇', '雅琴', '景行',
  '芷若', '逸凡', '佳琪', '承恩', '沐阳', '语桐', '俊杰', '雪莹',
];

const buildPlayers = (teamIdx: number): Team['players'] => {
  const base = teamIdx * 4;
  return (roleOptions.map((role, i) => ({
    id: `p_${teamIdx}_${i}`,
    name: `${PLAYER_NAMES[(base + i) % PLAYER_NAMES.length]}`,
    role,
    contact: `player${base + i}@debate.edu`,
    scores: [],
  })));
};

export const buildInitialTeams = (count = 8): Team[] => {
  return Array.from({ length: count }, (_, i) => {
    const inst = INSTITUTIONS[i % INSTITUTIONS.length];
    const name = TEAM_NAME_PREFIXES[i % TEAM_NAME_PREFIXES.length];
    return {
      id: `t_${i}`,
      name: `${inst}${name}队`,
      institution: inst,
      players: buildPlayers(i),
      seed: i + 1,
      createdAt: now - 1000 * 60 * 60 * (24 + i),
    };
  });
};

const JUDGE_INFO = [
  { name: '张秉文', inst: '中国社会科学院', title: '研究员' },
  { name: '李明远', inst: '清华大学法学院', title: '副教授' },
  { name: '王雅琴', inst: '北京大学政府管理学院', title: '教授' },
  { name: '赵思琪', inst: '复旦大学新闻学院', title: '讲师' },
  { name: '陈守正', inst: '上海交通大学', title: '校辩论队总教练' },
  { name: '周怀安', inst: '浙江大学光华法学院', title: '副教授' },
  { name: '吴若兰', inst: '南京大学文学院', title: '副研究员' },
  { name: '郑怀瑾', inst: '武汉大学', title: '资深辩论导师' },
  { name: '孙敬之', inst: '中国人民大学', title: '特聘研究员' },
  { name: '林婉清', inst: '厦门大学', title: '辩论队指导老师' },
];

export const buildInitialJudges = (): Judge[] => {
  return JUDGE_INFO.map((j, i) => ({
    id: `j_${i}`,
    name: j.name,
    institution: j.inst,
    title: j.title,
    avoidTeams: i % 3 === 0 ? [`t_${i % 8}`] : [],
    avoidInstitutions: i % 4 === 1 ? [INSTITUTIONS[(i + 2) % INSTITUTIONS.length]] : [],
    avoidPlayers: i === 5 ? ['p_0_0', 'p_0_1'] : [],
  }));
};

type TopicCat = '政策' | '价值' | '事实' | '模拟法庭';
const TOPIC_DATA: {
  title: string;
  pro: string;
  con: string;
  cats: TopicCat[];
  difficulty: 1 | 2 | 3 | 4 | 5;
}[] = [
  {
    title: '人工智能的发展对人类未来利大于弊/弊大于利',
    pro: '人工智能的发展对人类未来利大于弊',
    con: '人工智能的发展对人类未来弊大于利',
    cats: ['价值', '政策'] as const,
    difficulty: 3,
  },
  {
    title: '当今社会，更需要英雄主义/集体主义',
    pro: '当今社会，更需要英雄主义',
    con: '当今社会，更需要集体主义',
    cats: ['价值'] as const,
    difficulty: 2,
  },
  {
    title: '应该/不应该全面禁止未成年人网络游戏',
    pro: '应该全面禁止未成年人网络游戏',
    con: '不应该全面禁止未成年人网络游戏',
    cats: ['政策', '事实'] as const,
    difficulty: 3,
  },
  {
    title: '短视频的流行提升/降低了当代人的认知能力',
    pro: '短视频的流行提升了当代人的认知能力',
    con: '短视频的流行降低了当代人的认知能力',
    cats: ['价值', '事实'] as const,
    difficulty: 2,
  },
  {
    title: '全球化时代，母语教育比外语教育更/更不重要',
    pro: '全球化时代，母语教育比外语教育更重要',
    con: '全球化时代，母语教育不如外语教育重要',
    cats: ['价值'] as const,
    difficulty: 3,
  },
  {
    title: '应该/不应该在全国推行免费大学教育',
    pro: '应该在全国推行免费大学教育',
    con: '不应该在全国推行免费大学教育',
    cats: ['政策'] as const,
    difficulty: 4,
  },
  {
    title: '科技进步使人更/更不自由',
    pro: '科技进步使人更自由',
    con: '科技进步使人更不自由',
    cats: ['价值'] as const,
    difficulty: 4,
  },
  {
    title: '原告甲公司诉被告乙公司侵犯商业秘密案',
    pro: '原告：甲公司主张乙公司构成侵权并请求赔偿',
    con: '被告：乙公司主张未侵权并请求驳回原告诉求',
    cats: ['模拟法庭'] as const,
    difficulty: 5,
  },
  {
    title: '应该/不应该赋予AI生成作品版权保护',
    pro: '应该赋予AI生成作品版权保护',
    con: '不应该赋予AI生成作品版权保护',
    cats: ['政策', '价值'] as const,
    difficulty: 5,
  },
  {
    title: '城市化进程中，保留/拆除老旧居民区更重要',
    pro: '城市化进程中，保留老旧居民区更重要',
    con: '城市化进程中，拆除老旧居民区更重要',
    cats: ['政策', '价值'] as const,
    difficulty: 3,
  },
  {
    title: '知识付费能/不能缓解当代年轻人的焦虑',
    pro: '知识付费能缓解当代年轻人的焦虑',
    con: '知识付费不能缓解当代年轻人的焦虑',
    cats: ['事实', '价值'] as const,
    difficulty: 2,
  },
  {
    title: '离婚率上升是/不是社会进步的体现',
    pro: '离婚率上升是社会进步的体现',
    con: '离婚率上升不是社会进步的体现',
    cats: ['价值', '事实'] as const,
    difficulty: 4,
  },
];

const ALL_FORMATS: DebateFormat[] = ['parliamentary', 'mandarin', 'moot_court', 'british_parliamentary'];

export const buildInitialTopics = (): Topic[] => {
  return TOPIC_DATA.map((t, i) => {
    const formats: DebateFormat[] = [];
    if (t.cats.includes('模拟法庭')) {
      formats.push('moot_court');
    } else {
      formats.push(ALL_FORMATS.filter((f) => f !== 'moot_court')[(i + 1) % 3]);
      formats.push(ALL_FORMATS.filter((f) => f !== 'moot_court')[i % 3]);
    }
    return {
      id: `topic_${i}`,
      title: t.title,
      proSide: t.pro,
      conSide: t.con,
      category: [...t.cats] as TopicCategory[],
      formats: Array.from(new Set(formats)),
      difficulty: t.difficulty as 1 | 2 | 3 | 4 | 5,
    };
  });
};

export const buildInitialTournament = (): TournamentConfig => ({
  id: 'tourn_0',
  name: '2026·第二届全国高校华语辩论邀请赛',
  format: 'mandarin' as DebateFormat,
  type: 'single_elimination' as TournamentType,
  totalRounds: 3,
  judgesPerMatch: 3,
  createdAt: now - 1000 * 60 * 60 * 24 * 7,
  currentRound: 1,
  description: '年度最高规格华语辩论赛事，汇集全国顶尖高校辩论队伍',
});

export const buildSampleMatches = (
  teams: Team[],
  judges: Judge[],
  topics: Topic[],
  tournament: TournamentConfig
): MatchPairing[] => {
  const mandarinTopics = topics.filter((t) => t.formats.includes(tournament.format));
  const pairs: MatchPairing[] = [];

  for (let i = 0; i < teams.length; i += 2) {
    if (i + 1 < teams.length) {
      const matchNum = i / 2 + 1;
      const judgeIds = judges.slice((matchNum - 1) * 3, matchNum * 3).map((j) => j.id);
      pairs.push({
        id: uid(),
        tournamentId: tournament.id,
        round: 1,
        matchNumber: matchNum,
        proTeamId: teams[i].id,
        conTeamId: teams[i + 1].id,
        topicId: mandarinTopics[(matchNum - 1) % mandarinTopics.length].id,
        judgeIds: judgeIds.length ? judgeIds : [judges[0].id, judges[1].id, judges[2].id],
        status: matchNum === 1 ? 'ongoing' : 'pending',
        startedAt: matchNum === 1 ? now - 1000 * 60 * 10 : undefined,
      });
    }
  }

  const totalRounds = tournament.totalRounds;
  for (let round = 2; round <= totalRounds; round++) {
    const count = Math.max(1, Math.floor(teams.length / Math.pow(2, round)));
    for (let m = 0; m < count; m++) {
      pairs.push({
        id: uid(),
        tournamentId: tournament.id,
        round,
        matchNumber: m + 1,
        proTeamId: `__tbd_r${round}_${m}_a`,
        conTeamId: `__tbd_r${round}_${m}_b`,
        topicId: mandarinTopics[m % mandarinTopics.length].id,
        judgeIds: [],
        status: 'pending',
      });
    }
  }

  return pairs;
};
