import { useMemo, useState } from 'react';
import { Network, Users2, School, UserCircle2, Scale } from 'lucide-react';
import { useDebateStore } from '@/store/debateStore';

/**
 * 回避网络可视化
 * 单一职责：将「评委的回避配置」抽象为节点 + 连线，使用 SVG 直观渲染。
 *           不修改任何回避数据，仅做只读展示与高亮。
 */

/** 节点类型：评委 / 队伍 / 学校 / 选手 */
type NodeKind = 'judge' | 'team' | 'institution' | 'player';

/** 图节点的统一结构 */
interface GraphNode {
  id: string;        // 节点全局唯一 id（含类型前缀，避免不同类型 id 冲突）
  rawId: string;     // 原始 id（团队 id / 选手 id / 学校名 / 评委 id）
  label: string;     // 显示文字
  kind: NodeKind;
  x: number;         // SVG 坐标
  y: number;
}

/** 图边：表示一条回避关系 */
interface GraphEdge {
  fromId: string;
  toId: string;
  reason: '回避队伍' | '回避机构' | '回避选手';
}

/** 单一职责的工具函数：根据节点类型构造唯一 id 前缀 */
const nid = (kind: NodeKind, raw: string) => `${kind}:${raw}`;

/** 节点类型对应的视觉样式 */
const KIND_STYLE: Record<NodeKind, { fill: string; stroke: string; text: string; icon: JSX.Element }> = {
  judge: {
    fill: '#FEF3C7',
    stroke: '#D97706',
    text: '#7C2D12',
    icon: <Scale className="w-3 h-3" />,
  },
  team: {
    fill: '#DCFCE7',
    stroke: '#16A34A',
    text: '#14532D',
    icon: <Users2 className="w-3 h-3" />,
  },
  institution: {
    fill: '#DBEAFE',
    stroke: '#2563EB',
    text: '#1E3A8A',
    icon: <School className="w-3 h-3" />,
  },
  player: {
    fill: '#FCE7F3',
    stroke: '#DB2777',
    text: '#831843',
    icon: <UserCircle2 className="w-3 h-3" />,
  },
};

/**
 * 圆环布局：将不同类型节点放置到不同同心圆上
 * 单一职责：仅做几何位置计算，不关心数据来源
 */
const layoutCircular = (
  nodes: Omit<GraphNode, 'x' | 'y'>[],
  width: number,
  height: number
): GraphNode[] => {
  const cx = width / 2;
  const cy = height / 2;
  // 不同类型对应的半径
  const radius: Record<NodeKind, number> = {
    judge: Math.min(width, height) * 0.18,
    team: Math.min(width, height) * 0.36,
    institution: Math.min(width, height) * 0.46,
    player: Math.min(width, height) * 0.46,
  };

  // 按类型分组
  const grouped: Record<NodeKind, Omit<GraphNode, 'x' | 'y'>[]> = {
    judge: [],
    team: [],
    institution: [],
    player: [],
  };
  nodes.forEach((n) => grouped[n.kind].push(n));

  const placed: GraphNode[] = [];
  (Object.keys(grouped) as NodeKind[]).forEach((kind) => {
    const list = grouped[kind];
    const count = list.length;
    if (count === 0) return;
    // institution 与 player 放在同一外圈，错开角度
    const angleOffset = kind === 'player' ? Math.PI / count : 0;
    list.forEach((n, i) => {
      const angle = (i / Math.max(count, 1)) * Math.PI * 2 + angleOffset;
      placed.push({
        ...n,
        x: cx + Math.cos(angle) * radius[kind],
        y: cy + Math.sin(angle) * radius[kind],
      });
    });
  });
  return placed;
};

interface AvoidanceGraphProps {
  /** 仅查看某一位评委的关系，留空则展示全部评委 */
  focusJudgeId?: string;
  /** SVG 高度，宽度自动撑满 */
  height?: number;
}

export const AvoidanceGraph = ({ focusJudgeId, height = 460 }: AvoidanceGraphProps) => {
  const judges = useDebateStore((s) => s.judges);
  const teams = useDebateStore((s) => s.teams);

  // 组件内宽度采用固定 viewBox，由 SVG 自适应到容器
  const width = 760;

  // 鼠标 hover 用于高亮关联连线
  const [hoverNodeId, setHoverNodeId] = useState<string | null>(null);

  /** 根据当前评委过滤源数据 */
  const judgeList = useMemo(
    () => (focusJudgeId ? judges.filter((j) => j.id === focusJudgeId) : judges),
    [judges, focusJudgeId]
  );

  /** 构造节点 + 边 */
  const { nodes, edges } = useMemo(() => {
    const rawNodes: Omit<GraphNode, 'x' | 'y'>[] = [];
    const edgeList: GraphEdge[] = [];
    const seen = new Set<string>();

    const pushNode = (n: Omit<GraphNode, 'x' | 'y'>) => {
      if (seen.has(n.id)) return;
      seen.add(n.id);
      rawNodes.push(n);
    };

    // 团队/选手/学校 lookup
    const teamMap = new Map(teams.map((t) => [t.id, t]));
    const playerMap = new Map<string, { name: string; teamName: string }>();
    teams.forEach((t) =>
      t.players.forEach((p) => playerMap.set(p.id, { name: p.name, teamName: t.name }))
    );

    judgeList.forEach((j) => {
      pushNode({
        id: nid('judge', j.id),
        rawId: j.id,
        kind: 'judge',
        label: j.name,
      });

      // 回避队伍
      j.avoidTeams.forEach((tid) => {
        const t = teamMap.get(tid);
        if (!t) return;
        pushNode({ id: nid('team', tid), rawId: tid, kind: 'team', label: t.name });
        edgeList.push({
          fromId: nid('judge', j.id),
          toId: nid('team', tid),
          reason: '回避队伍',
        });
      });

      // 回避机构（学校）：以名称作为 rawId
      j.avoidInstitutions.forEach((inst) => {
        pushNode({
          id: nid('institution', inst),
          rawId: inst,
          kind: 'institution',
          label: inst,
        });
        edgeList.push({
          fromId: nid('judge', j.id),
          toId: nid('institution', inst),
          reason: '回避机构',
        });
      });

      // 回避选手
      j.avoidPlayers.forEach((pid) => {
        const p = playerMap.get(pid);
        if (!p) return;
        pushNode({
          id: nid('player', pid),
          rawId: pid,
          kind: 'player',
          label: `${p.name}·${p.teamName}`,
        });
        edgeList.push({
          fromId: nid('judge', j.id),
          toId: nid('player', pid),
          reason: '回避选手',
        });
      });
    });

    const placed = layoutCircular(rawNodes, width, height);
    return { nodes: placed, edges: edgeList };
  }, [judgeList, teams, height]);

  /** 通过节点 id 快速取节点 */
  const nodeMap = useMemo(() => {
    const m = new Map<string, GraphNode>();
    nodes.forEach((n) => m.set(n.id, n));
    return m;
  }, [nodes]);

  // 没有任何回避配置时给出空状态
  if (nodes.length === 0) {
    return (
      <div className="card p-6 text-center text-sm text-navy-500">
        <Network className="w-5 h-5 mx-auto mb-2 text-navy-400" />
        当前没有可展示的回避关系
      </div>
    );
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-gold-600" />
          <h3 className="font-serif text-sm font-bold text-navy-900">评委回避关系图</h3>
        </div>
        {/* 类型图例 */}
        <div className="flex items-center gap-3 text-[11px] text-navy-600">
          {(
            [
              { k: 'judge', label: '评委' },
              { k: 'team', label: '队伍' },
              { k: 'institution', label: '学校' },
              { k: 'player', label: '选手' },
            ] as { k: NodeKind; label: string }[]
          ).map((it) => (
            <span key={it.k} className="flex items-center gap-1">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{
                  background: KIND_STYLE[it.k].fill,
                  border: `1px solid ${KIND_STYLE[it.k].stroke}`,
                }}
              />
              {it.label}
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-navy-100 bg-ivory-50/40">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto"
          role="img"
          aria-label="评委回避关系图"
        >
          {/* 连线层 */}
          <g>
            {edges.map((e, i) => {
              const a = nodeMap.get(e.fromId);
              const b = nodeMap.get(e.toId);
              if (!a || !b) return null;
              const isHover =
                hoverNodeId !== null && (hoverNodeId === a.id || hoverNodeId === b.id);
              return (
                <line
                  key={i}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={isHover ? '#D97706' : '#94A3B8'}
                  strokeOpacity={isHover ? 0.95 : 0.45}
                  strokeWidth={isHover ? 2 : 1}
                  strokeDasharray={e.reason === '回避机构' ? '4 3' : undefined}
                />
              );
            })}
          </g>

          {/* 节点层 */}
          <g>
            {nodes.map((n) => {
              const style = KIND_STYLE[n.kind];
              const isHover = hoverNodeId === n.id;
              const r = n.kind === 'judge' ? 22 : 16;
              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x},${n.y})`}
                  onMouseEnter={() => setHoverNodeId(n.id)}
                  onMouseLeave={() => setHoverNodeId(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <circle
                    r={r}
                    fill={style.fill}
                    stroke={style.stroke}
                    strokeWidth={isHover ? 2.5 : 1.5}
                  />
                  <text
                    textAnchor="middle"
                    y={r + 12}
                    fontSize={11}
                    fill={style.text}
                    style={{ pointerEvents: 'none', fontWeight: n.kind === 'judge' ? 700 : 500 }}
                  >
                    {n.label.length > 10 ? `${n.label.slice(0, 9)}…` : n.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* 文字说明：辅助理解线型 */}
      <p className="mt-2 text-[11px] text-navy-500">
        实线 = 回避队伍 / 回避选手；虚线 = 回避机构。鼠标悬停节点可高亮其相关连线。
      </p>
    </div>
  );
};

export default AvoidanceGraph;
