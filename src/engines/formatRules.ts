import { DebateFormat, FormatRules, DebateStageConfig, ScoringCriterion } from '@/types';

const STAGE = (
  id: string,
  name: string,
  duration: number,
  side?: 'pro' | 'con' | 'both' | 'judge',
  speakerIndex?: number,
  crossExamine?: { enabled: boolean; duration?: number },
  bpRole?: 'og' | 'oo' | 'cg' | 'co'
): DebateStageConfig => ({
  id, name, duration, side, speakerIndex, crossExamine, bpRole
});

const CRITERION = (
  id: string,
  name: string,
  maxScore: number,
  weight: number,
  description?: string
): ScoringCriterion => ({ id, name, maxScore, weight, description });

const STANDARD_CRITERIA: ScoringCriterion[] = [
  CRITERION('content', '立论内容', 30, 0.3, '论点的深度、广度与逻辑性'),
  CRITERION('evidence', '论据与论证', 25, 0.25, '论据的质量、相关性与论证严密性'),
  CRITERION('delivery', '表达与风采', 20, 0.2, '语言流畅度、感染力与台风'),
  CRITERION('rebuttal', '反驳与应变', 25, 0.25, '对对方论点的有效回应与临场应变'),
];

export const FORMAT_RULES: Record<DebateFormat, FormatRules> = {
  parliamentary: {
    format: 'parliamentary',
    label: '议会制辩论（亚太大专）',
    description: '正方上院→反方上院→正方下院→反方下院，共8个7分钟陈词',
    teamScoreMax: 100,
    stages: [
      STAGE('pm', '首相（正方一辩）陈词', 7 * 60, 'pro', 0),
      STAGE('lo', '反对党领袖（反方一辩）陈词', 7 * 60, 'con', 0),
      STAGE('dpm', '副首相（正方二辩）陈词', 7 * 60, 'pro', 1),
      STAGE('dlo', '反对党副领袖（反方二辩）陈词', 7 * 60, 'con', 1),
      STAGE('mg', '政府党鞭（正方三辩）陈词', 7 * 60, 'pro', 2),
      STAGE('ow', '反对党党鞭（反方三辩）陈词', 7 * 60, 'con', 2),
      STAGE('gw', '政府总结（正方四辩）', 5 * 60, 'pro', 3),
      STAGE('ol', '反对党总结（反方四辩）', 5 * 60, 'con', 3),
    ],
    scoringCriteria: STANDARD_CRITERIA,
  },

  mandarin: {
    format: 'mandarin',
    label: '华语辩论（新国辩赛制）',
    description: '陈词+质询+盘问+自由辩论+结辩的经典华语赛制',
    teamScoreMax: 100,
    stages: [
      STAGE('pro1', '正方一辩立论', 3 * 60, 'pro', 0),
      STAGE('con_cross1', '反方四辩质询正方一辩', 2 * 60, 'con', 3),
      STAGE('con1', '反方一辩立论', 3 * 60, 'con', 0),
      STAGE('pro_cross1', '正方四辩质询反方一辩', 2 * 60, 'pro', 3),
      STAGE('pro2', '正方二辩陈词', 3 * 60, 'pro', 1),
      STAGE('con_cross2', '反方三辩质询正方二辩', 2 * 60, 'con', 2),
      STAGE('con2', '反方二辩陈词', 3 * 60, 'con', 1),
      STAGE('pro_cross2', '正方三辩质询反方二辩', 2 * 60, 'pro', 2),
      STAGE('pro3', '正方三辩盘问小结', 2 * 60, 'pro', 2),
      STAGE('con3', '反方三辩盘问小结', 2 * 60, 'con', 2),
      STAGE('free_pro', '自由辩论 · 正方（4分钟）', 4 * 60, 'pro'),
      STAGE('free_con', '自由辩论 · 反方（4分钟）', 4 * 60, 'con'),
      STAGE('con4', '反方四辩结辩', 3 * 60, 'con', 3),
      STAGE('pro4', '正方四辩结辩', 3 * 60, 'pro', 3),
    ],
    scoringCriteria: STANDARD_CRITERIA,
  },

  moot_court: {
    format: 'moot_court',
    label: '模拟法庭赛制',
    description: '原告方陈述→被告方陈述→法官盘问→双方最终陈述',
    teamScoreMax: 100,
    stages: [
      STAGE('opening_pro', '原告方开场陈述', 10 * 60, 'pro'),
      STAGE('opening_con', '被告方开场陈述', 10 * 60, 'con'),
      STAGE('examination_pro', '法庭盘问（原告方）', 15 * 60, 'pro'),
      STAGE('examination_con', '法庭盘问（被告方）', 15 * 60, 'con'),
      STAGE('rebuttal_pro', '原告方反驳陈述', 5 * 60, 'pro'),
      STAGE('rebuttal_con', '被告方反驳陈述', 5 * 60, 'con'),
      STAGE('judge_bench', '法官团评议', 10 * 60, 'judge'),
      STAGE('verdict', '宣判阶段', 5 * 60, 'judge'),
    ],
    scoringCriteria: [
      CRITERION('legal_reasoning', '法律论证', 35, 0.35, '法律适用的准确性与论证逻辑'),
      CRITERION('fact_analysis', '事实分析', 25, 0.25, '对案件事实的梳理与运用'),
      CRITERION('advocacy', '辩护技巧', 25, 0.25, '陈述感染力、问答策略'),
      CRITERION('court_manner', '法庭礼仪', 15, 0.15, '着装、言行、程序规范'),
    ],
  },

  british_parliamentary: {
    format: 'british_parliamentary',
    label: '英国议会制（BP赛制）',
    description: '四队制辩论：正方上院/下院、反方上院/下院，各队2人',
    teamScoreMax: 100,
    isFourTeamFormat: true,
    stages: [
      STAGE('pm', '首相 · 正方上院1', 7 * 60, 'pro', 0, undefined, 'og'),
      STAGE('lo', '反对党领袖 · 反方上院1', 7 * 60, 'con', 0, undefined, 'oo'),
      STAGE('dpm', '副首相 · 正方上院2', 7 * 60, 'pro', 1, undefined, 'og'),
      STAGE('dlo', '反对党副领袖 · 反方上院2', 7 * 60, 'con', 1, undefined, 'oo'),
      STAGE('mg', '政府成员 · 正方下院1', 7 * 60, 'pro', 0, undefined, 'cg'),
      STAGE('ow', '反对党成员 · 反方下院1', 7 * 60, 'con', 0, undefined, 'co'),
      STAGE('gw', '政府党鞭 · 正方下院2', 7 * 60, 'pro', 1, undefined, 'cg'),
      STAGE('ol', '反对党党鞭 · 反方下院2', 7 * 60, 'con', 1, undefined, 'co'),
    ],
    scoringCriteria: [
      CRITERION('argument', '论点质量', 30, 0.3, '论点的创新性与价值'),
      CRITERION('extension', '延伸扩展', 30, 0.3, '下院对上院论点的有效延伸'),
      CRITERION('strategy', '辩论策略', 20, 0.2, '团队配合与立场把握'),
      CRITERION('speech', '演讲水平', 20, 0.2, '表达与感染力'),
    ],
  },
};

export const getFormatRules = (format: DebateFormat): FormatRules => {
  return FORMAT_RULES[format];
};

export const TOTAL_DEBATE_TIME = (format: DebateFormat): number => {
  const rules = FORMAT_RULES[format];
  return rules.stages.reduce((acc, s) => acc + s.duration, 0);
};
