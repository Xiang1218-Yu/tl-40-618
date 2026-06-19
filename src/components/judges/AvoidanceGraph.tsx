import { useMemo, useState } from 'react';
import { Network } from 'lucide-react';
import { useDebateStore } from '@/store/debateStore';
import type { Judge, Team } from '@/types';

/**
 * 回避网络可视化（三层层次：评委 → 学校 → 选手）
 * 单一职责：把回避配置抽象为「评委-学校」「学校-选手」两层连接关系，
 *           通过分列布局（左：评委，中：学校，右：选手）直观展示关联；
 *           不修改任何回避数据，仅做只读展示与高亮。
 *
 * 数据来源映射规则（保证三层结构清晰）：
 *  1. judge.avoidInstitutions 直接产生「评委 -> 学校」连线（实线）
 *  2. judge.avoidTeams        通过队伍 -> 所属机构推导「评委 -> 学校」（虚线）
 *  3. judge.avoidPlayers      通过选手 -> 所属队伍 -> 所属机构产生：
 *      a. 「评委 -> 学校」（虚线，用于把节点串到对应学校列）
 *      b. 「学校 -> 选手」（点划线，承接到第三层）
 */

/** 三层结构的列定义 */
type ColumnKind = 'judge' | 'institution' | 'player';

/** 节点对象 */
interface LayoutNode {
  id: string;        // 全局唯一 id（含类型前缀）
  rawId: string;
  label: string;
  subLabel?: string; // 副标题（如选手所在队伍）
  column: ColumnKind;
  x: number;
  y: number;
}

/** 连线对象 */
interface LayoutEdge {
  fromId: string;
  toId: string;
  /** 实线 = 直接回避机构；虚线 = 由队伍/选手推导出的间接关系 */
  style: 'solid' | 'dashed' | 'dotted';
  reason: string;
}

/** 列样式（颜色 + 标题） */
const COLUMN_STYLE: Record<ColumnKind, { fill: string; stroke: string; text: string; title: string }> = {
  judge: {
    fill: '#FEF3C7',
    stroke: '#D97706',
    text: '#7C2D12',
    title: '评委',
  },
  institution: {
    fill: '#DBEAFE',
    stroke: '#2563EB',
    text: '#1E3A8A',
    title: '学校',
  },
  player: {
    fill: '#FCE7F3',
    stroke: '#DB2777',
    text: '#831843',
    title: '选手',
  },
};

/** 节点 id 构造 */
const nid = (column: ColumnKind, raw: string) => `${column}:${raw}`;

/**
 * 三列布局：将节点按 column 分配到三列、按出现顺序均匀纵向排布
 * 单一职责：仅做几何位置计算
 */
const layoutColumns = (
  nodes: Omit<LayoutNode, 'x' | 'y'>[],
  width: number,
  height: number
): LayoutNode[] => {
  // 三列横坐标
  const cx: Record<ColumnKind, number> = {
    judge: width * 0.13,
    institution: width * 0.5,
    player: width * 0.87,
  };

  const grouped: Record<ColumnKind, Omit<LayoutNode, 'x' | 'y'>[]> = {
    judge: [],
    institution: [],
    player: [],
  };
  nodes.forEach((n) => grouped[n.column].push(n));

  // 上下边距
  const paddingTop = 60;
  const paddingBottom = 30;
  const usable = height - paddingTop - paddingBottom;

  const placed: LayoutNode[] = [];
  (Object.keys(grouped) as ColumnKind[]).forEach((col) => {
    const list = grouped[col];
    const count = list.length;
    if (count === 0) return;
    // 单节点居中显示，多节点均匀分布
    const step = count === 1 ? 0 : usable / (count - 1);
    list.forEach((n, i) => {
      const y = count === 1 ? height / 2 : paddingTop + step * i;
      placed.push({ ...n, x: cx[col], y });
    });
  });
  return placed;
};

/**
 * 工具：根据回避数据为某个评委构造其涉及的「评委 -> 学校 -> 选手」节点与连线
 * 单一职责：仅做数据展开，输入评委 + 队伍数据，输出原始节点/边
 */
const buildJudgeSubGraph = (
  judge: Judge,
  teamMap: Map<string, Team>,
  institutionTeams: Map<string, Team[]>
) => {
  const nodes: Omit<LayoutNode, 'x' | 'y'>[] = [];
  const edges: LayoutEdge[] = [];
  const seen = new Set<string>();

  const pushNode = (n: Omit<LayoutNode, 'x' | 'y'>) => {
    if (seen.has(n.id)) return;
    seen.add(n.id);
    nodes.push(n);
  };

  // 评委节点
  const judgeId = nid('judge', judge.id);
  pushNode({
    id: judgeId,
    rawId: judge.id,
    column: 'judge',
    label: judge.name,
    subLabel: judge.institution,
  });

  // 1) 直接回避机构：评委 -> 学校（实线）
  judge.avoidInstitutions.forEach((inst) => {
    const instId = nid('institution', inst);
    pushNode({ id: instId, rawId: inst, column: 'institution', label: inst });
    edges.push({
      fromId: judgeId,
      toId: instId,
      style: 'solid',
      reason: '直接回避机构',
    });
  });

  // 2) 回避队伍：解析为评委 -> 该队伍所在学校（虚线）
  judge.avoidTeams.forEach((tid) => {
    const team = teamMap.get(tid);
    if (!team) return;
    const instId = nid('institution', team.institution);
    pushNode({
      id: instId,
      rawId: team.institution,
      column: 'institution',
      label: team.institution,
    });
    edges.push({
      fromId: judgeId,
      toId: instId,
      style: 'dashed',
      reason: `因回避队伍「${team.name}」`,
    });
  });

  // 3) 回避选手：评委 -> 学校（虚线，连通中间列） + 学校 -> 选手（点划线）
  judge.avoidPlayers.forEach((pid) => {
    // 找到选手所在队伍
    let ownerTeam: Team | undefined;
    let playerName = '';
    for (const team of teamMap.values()) {
      const p = team.players.find((pp) => pp.id === pid);
      if (p) {
        ownerTeam = team;
        playerName = p.name;
        break;
      }
    }
    if (!ownerTeam) return;
    const instId = nid('institution', ownerTeam.institution);
    pushNode({
      id: instId,
      rawId: ownerTeam.institution,
      column: 'institution',
      label: ownerTeam.institution,
    });
    // 评委 -> 学校（间接关系，使用虚线）
    edges.push({
      fromId: judgeId,
      toId: instId,
      style: 'dashed',
      reason: `因回避选手「${playerName}」`,
    });
    // 学校 -> 选手（点划线表示由选手回避产生）
    const playerNodeId = nid('player', pid);
    pushNode({
      id: playerNodeId,
      rawId: pid,
      column: 'player',
      label: playerName,
      subLabel: ownerTeam.name,
    });
    edges.push({
      fromId: instId,
      toId: playerNodeId,
      style: 'dotted',
      reason: '该选手被评委回避',
    });
  });

  // 边引用：避免“institutionTeams”未使用警告（保留参数语义供未来扩展）
  void institutionTeams;
  return { nodes, edges };
};

interface AvoidanceGraphProps {
  /** 仅查看某一位评委的关系，留空则展示全部评委 */
  focusJudgeId?: string;
  /** SVG 高度，宽度自动撑满 */
  height?: number;
}

export const AvoidanceGraph = ({ focusJudgeId, height = 520 }: AvoidanceGraphProps) => {
  const judges = useDebateStore((s) => s.judges);
  const teams = useDebateStore((s) => s.teams);

  // 视图宽度采用固定 viewBox，外层 SVG 自适应
  const width = 880;

  // 鼠标 hover 用于高亮关联连线
  const [hoverNodeId, setHoverNodeId] = useState<string | null>(null);

  /** 根据当前评委过滤源数据 */
  const judgeList = useMemo(
    () => (focusJudgeId ? judges.filter((j) => j.id === focusJudgeId) : judges),
    [judges, focusJudgeId]
  );

  /** 构造节点 + 边 */
  const { nodes, edges } = useMemo(() => {
    const teamMap = new Map(teams.map((t) => [t.id, t]));
    // 学校 -> 队伍映射，预留扩展用（如展示该学校所有选手）
    const institutionTeams = new Map<string, Team[]>();
    teams.forEach((t) => {
      const list = institutionTeams.get(t.institution) ?? [];
      list.push(t);
      institutionTeams.set(t.institution, list);
    });

    const allNodes: Omit<LayoutNode, 'x' | 'y'>[] = [];
    const allEdges: LayoutEdge[] = [];
    const nodeIdSet = new Set<string>();

    judgeList.forEach((j) => {
      const sub = buildJudgeSubGraph(j, teamMap, institutionTeams);
      sub.nodes.forEach((n) => {
        if (nodeIdSet.has(n.id)) return;
        nodeIdSet.add(n.id);
        allNodes.push(n);
      });
      allEdges.push(...sub.edges);
    });

    const placed = layoutColumns(allNodes, width, height);
    return { nodes: placed, edges: allEdges };
  }, [judgeList, teams, height]);

  /** 节点 id 快速查找 */
  const nodeMap = useMemo(() => {
    const m = new Map<string, LayoutNode>();
    nodes.forEach((n) => m.set(n.id, n));
    return m;
  }, [nodes]);

  // 没有任何回避配置时给出空状态
  if (nodes.length === 0 || edges.length === 0) {
    return (
      <div className="card p-6 text-center text-sm text-navy-500">
        <Network className="w-5 h-5 mx-auto mb-2 text-navy-400" />
        当前没有可展示的回避关系
      </div>
    );
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-gold-600" />
          <h3 className="font-serif text-sm font-bold text-navy-900">
            评委回避关系图（评委 → 学校 → 选手）
          </h3>
        </div>
        {/* 线型图例 */}
        <div className="flex items-center gap-3 text-[11px] text-navy-600">
          <span className="flex items-center gap-1">
            <svg width="22" height="6">
              <line x1="0" y1="3" x2="22" y2="3" stroke="#D97706" strokeWidth="2" />
            </svg>
            直接回避机构
          </span>
          <span className="flex items-center gap-1">
            <svg width="22" height="6">
              <line
                x1="0"
                y1="3"
                x2="22"
                y2="3"
                stroke="#94A3B8"
                strokeWidth="2"
                strokeDasharray="4 3"
              />
            </svg>
            因队伍/选手推导
          </span>
          <span className="flex items-center gap-1">
            <svg width="22" height="6">
              <line
                x1="0"
                y1="3"
                x2="22"
                y2="3"
                stroke="#DB2777"
                strokeWidth="2"
                strokeDasharray="1 3"
              />
            </svg>
            学校 → 选手
          </span>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-navy-100 bg-ivory-50/40">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto"
          role="img"
          aria-label="评委回避关系图（三层结构）"
        >
          {/* 列标题 */}
          <g>
            {(['judge', 'institution', 'player'] as ColumnKind[]).map((col) => {
              const cx =
                col === 'judge' ? width * 0.13 : col === 'institution' ? width * 0.5 : width * 0.87;
              return (
                <g key={col} transform={`translate(${cx}, 24)`}>
                  <rect
                    x={-46}
                    y={-16}
                    width={92}
                    height={26}
                    rx={13}
                    fill={COLUMN_STYLE[col].fill}
                    stroke={COLUMN_STYLE[col].stroke}
                    strokeWidth={1.2}
                  />
                  <text
                    textAnchor="middle"
                    y={3}
                    fontSize={12}
                    fontWeight={700}
                    fill={COLUMN_STYLE[col].text}
                  >
                    {COLUMN_STYLE[col].title}
                  </text>
                </g>
              );
            })}
          </g>

          {/* 连线层（贝塞尔曲线）*/}
          <g>
            {edges.map((e, i) => {
              const a = nodeMap.get(e.fromId);
              const b = nodeMap.get(e.toId);
              if (!a || !b) return null;
              const isHover =
                hoverNodeId !== null && (hoverNodeId === a.id || hoverNodeId === b.id);
              const midX = (a.x + b.x) / 2;
              // 贝塞尔曲线，让分层连线更易读
              const path = `M ${a.x},${a.y} C ${midX},${a.y} ${midX},${b.y} ${b.x},${b.y}`;
              const dash =
                e.style === 'dashed' ? '5 4' : e.style === 'dotted' ? '1 4' : undefined;
              const stroke =
                e.style === 'solid'
                  ? isHover
                    ? '#B45309'
                    : '#D97706'
                  : e.style === 'dashed'
                  ? isHover
                    ? '#475569'
                    : '#94A3B8'
                  : isHover
                  ? '#9D174D'
                  : '#DB2777';
              return (
                <path
                  key={i}
                  d={path}
                  fill="none"
                  stroke={stroke}
                  strokeOpacity={isHover ? 0.95 : 0.55}
                  strokeWidth={isHover ? 2.2 : 1.3}
                  strokeDasharray={dash}
                />
              );
            })}
          </g>

          {/* 节点层 */}
          <g>
            {nodes.map((n) => {
              const style = COLUMN_STYLE[n.column];
              const isHover = hoverNodeId === n.id;
              const w = 130;
              const h = n.subLabel ? 40 : 30;
              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x},${n.y})`}
                  onMouseEnter={() => setHoverNodeId(n.id)}
                  onMouseLeave={() => setHoverNodeId(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <rect
                    x={-w / 2}
                    y={-h / 2}
                    width={w}
                    height={h}
                    rx={8}
                    fill={style.fill}
                    stroke={style.stroke}
                    strokeWidth={isHover ? 2.4 : 1.4}
                  />
                  <text
                    textAnchor="middle"
                    y={n.subLabel ? -3 : 4}
                    fontSize={12}
                    fontWeight={n.column === 'judge' ? 700 : 600}
                    fill={style.text}
                    style={{ pointerEvents: 'none' }}
                  >
                    {n.label.length > 10 ? `${n.label.slice(0, 9)}…` : n.label}
                  </text>
                  {n.subLabel && (
                    <text
                      textAnchor="middle"
                      y={12}
                      fontSize={10}
                      fill={style.text}
                      opacity={0.75}
                      style={{ pointerEvents: 'none' }}
                    >
                      {n.subLabel.length > 12 ? `${n.subLabel.slice(0, 11)}…` : n.subLabel}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      <p className="mt-2 text-[11px] text-navy-500">
        三列分别为「评委 / 学校 / 选手」。鼠标悬停任一节点可高亮其相关连线。
      </p>
    </div>
  );
};

export default AvoidanceGraph;
