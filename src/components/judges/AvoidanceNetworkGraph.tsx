import { useState, useMemo, useCallback } from 'react';
import { Network, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';
import { useDebateStore } from '@/store/debateStore';
import { cn } from '@/lib/utils';

/**
 * 图节点类型
 */
type NodeType = 'judge' | 'team' | 'institution' | 'player';

/**
 * 图节点数据
 */
interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  x: number;
  y: number;
  radius: number;
  color: string;
  /** 关联的实体ID */
  entityId: string;
  /** 所属队伍ID（仅选手节点有） */
  teamId?: string;
}

/**
 * 图连线
 */
interface GraphEdge {
  id: string;
  source: string;
  target: string;
  /** 连线类型：'avoid' 回避关系 | 'belong' 隶属关系 */
  edgeType: 'avoid' | 'belong';
  /** 回避类型（仅 edgeType='avoid' 时有意义） */
  avoidanceType?: 'team' | 'institution' | 'player';
}

/**
 * 节点颜色配置
 */
const NODE_COLORS: Record<NodeType, string> = {
  judge: '#1e3a5f',
  team: '#059669',
  institution: '#d97706',
  player: '#dc2626',
};

/**
 * 节点标签
 */
const NODE_TYPE_LABELS: Record<NodeType, string> = {
  judge: '评委',
  team: '队伍',
  institution: '学校',
  player: '选手',
};

/**
 * 回避关系图组件
 * 职责：
 *   1. 构建评委-队伍/学校/选手的回避关系图数据（含选手-队伍隶属关系）
 *   2. 使用 SVG 渲染交互式网络图
 *   3. 支持缩放、悬停高亮、布局重置
 * 单一职责：仅负责关系图的可视化，不处理评委编辑逻辑
 */
export function AvoidanceNetworkGraph() {
  const judges = useDebateStore((s) => s.judges);
  const teams = useDebateStore((s) => s.teams);

  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [layoutSeed, setLayoutSeed] = useState(0);

  /**
   * 构建图数据
   * 三层布局：
   *   - 最内圈：评委
   *   - 中圈：队伍/学校
   *   - 最外圈：选手
   * 连线类型：
   *   - 评委 → 队伍/学校/选手：回避关系（彩色实线/虚线）
   *   - 选手 → 所属队伍：隶属关系（浅灰细线）
   */
  const { nodes, edges } = useMemo(() => {
    const nodeMap = new Map<string, GraphNode>();
    const edgeList: GraphEdge[] = [];

    const width = 900;
    const height = 600;
    const centerX = width / 2;
    const centerY = height / 2;

    /**
     * 伪随机数生成器（可重现布局）
     */
    const pseudoRandom = (seed: number) => {
      let s = seed;
      return () => {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
      };
    };
    const rand = pseudoRandom(layoutSeed * 7919 + 1);

    // 第一圈：评委（最内圈）
    const judgeCount = judges.length;
    judges.forEach((j, idx) => {
      const angle = (idx / Math.max(1, judgeCount)) * Math.PI * 2 - Math.PI / 2;
      const radius = 90 + rand() * 25;
      nodeMap.set(`judge-${j.id}`, {
        id: `judge-${j.id}`,
        label: j.name,
        type: 'judge',
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        radius: 24,
        color: NODE_COLORS.judge,
        entityId: j.id,
      });
    });

    // 收集所有被回避的队伍ID和选手ID
    const avoidedTeamIds = new Set<string>();
    const avoidedInstNames = new Set<string>();
    const avoidedPlayerIds = new Set<string>();
    const playerToTeam = new Map<string, string>(); // playerId -> teamId

    // 先建立所有选手→队伍的隶属关系（无论是否被回避）
    teams.forEach((t) => {
      t.players.forEach((p) => {
        playerToTeam.set(p.id, t.id);
      });
    });

    // 收集回避数据
    judges.forEach((j) => {
      j.avoidTeams.forEach((tid) => {
        if (teams.find((t) => t.id === tid)) {
          avoidedTeamIds.add(tid);
        }
      });
      j.avoidInstitutions.forEach((inst) => {
        if (inst) {
          avoidedInstNames.add(inst);
        }
      });
      j.avoidPlayers.forEach((pid) => {
        avoidedPlayerIds.add(pid);
      });
    });

    // 第二圈：队伍和学校（中圈）
    const middleRingEntities: { id: string; label: string; type: NodeType }[] = [];
    avoidedTeamIds.forEach((tid) => {
      const team = teams.find((t) => t.id === tid);
      if (team) {
        middleRingEntities.push({ id: tid, label: team.name, type: 'team' });
      }
    });
    avoidedInstNames.forEach((instName) => {
      middleRingEntities.push({ id: `inst-${instName}`, label: instName, type: 'institution' });
    });

    const middleCount = middleRingEntities.length;
    middleRingEntities.forEach((ent, idx) => {
      const angle = (idx / Math.max(1, middleCount)) * Math.PI * 2 - Math.PI / 2;
      const radius = 200 + rand() * 30;
      nodeMap.set(`${ent.type}-${ent.id}`, {
        id: `${ent.type}-${ent.id}`,
        label: ent.label,
        type: ent.type,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        radius: 18,
        color: NODE_COLORS[ent.type],
        entityId: ent.id,
      });
    });

    // 第三圈：选手（最外圈）
    const playerList: { id: string; label: string; teamId: string }[] = [];
    avoidedPlayerIds.forEach((pid) => {
      const teamId = playerToTeam.get(pid);
      for (const t of teams) {
        const player = t.players.find((p) => p.id === pid);
        if (player) {
          playerList.push({ id: pid, label: player.name, teamId: t.id });
          break;
        }
      }
    });

    const playerCount = playerList.length;
    playerList.forEach((p, idx) => {
      const angle = (idx / Math.max(1, playerCount)) * Math.PI * 2 - Math.PI / 2;
      const radius = 280 + rand() * 25;
      nodeMap.set(`player-${p.id}`, {
        id: `player-${p.id}`,
        label: p.label,
        type: 'player',
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        radius: 13,
        color: NODE_COLORS.player,
        entityId: p.id,
        teamId: p.teamId,
      });
    });

    // 添加连线：评委 → 回避对象
    let edgeIdx = 0;
    judges.forEach((j) => {
      // 评委 → 队伍
      j.avoidTeams.forEach((tid) => {
        edgeList.push({
          id: `edge-avoid-${j.id}-team-${tid}-${edgeIdx++}`,
          source: `judge-${j.id}`,
          target: `team-${tid}`,
          edgeType: 'avoid',
          avoidanceType: 'team',
        });
      });
      // 评委 → 机构
      j.avoidInstitutions.forEach((inst) => {
        edgeList.push({
          id: `edge-avoid-${j.id}-inst-${inst}-${edgeIdx++}`,
          source: `judge-${j.id}`,
          target: `institution-inst-${inst}`,
          edgeType: 'avoid',
          avoidanceType: 'institution',
        });
      });
      // 评委 → 选手
      j.avoidPlayers.forEach((pid) => {
        edgeList.push({
          id: `edge-avoid-${j.id}-player-${pid}-${edgeIdx++}`,
          source: `judge-${j.id}`,
          target: `player-${pid}`,
          edgeType: 'avoid',
          avoidanceType: 'player',
        });
      });
    });

    // 添加连线：选手 → 所属队伍（隶属关系，浅灰色）
    playerList.forEach((p) => {
      if (nodeMap.has(`team-${p.teamId}`)) {
        edgeList.push({
          id: `edge-belong-${p.id}-${p.teamId}-${edgeIdx++}`,
          source: `player-${p.id}`,
          target: `team-${p.teamId}`,
          edgeType: 'belong',
        });
      }
    });

    return {
      nodes: Array.from(nodeMap.values()),
      edges: edgeList,
    };
  }, [judges, teams, layoutSeed]);

  /**
   * 判断节点/连线是否高亮（联动显示）
   */
  const isHighlighted = useCallback(
    (nodeId: string) => {
      if (!hoveredNode) return true;
      if (nodeId === hoveredNode) return true;
      // BFS：查找直接或间接相连节点
      const connected = new Set<string>([hoveredNode]);
      let changed = true;
      while (changed) {
        changed = false;
        edges.forEach((e) => {
          if (connected.has(e.source) && !connected.has(e.target)) {
            connected.add(e.target);
            changed = true;
          }
          if (connected.has(e.target) && !connected.has(e.source)) {
            connected.add(e.source);
            changed = true;
          }
        });
      }
      return connected.has(nodeId);
    },
    [hoveredNode, edges]
  );

  const isEdgeHighlighted = useCallback(
    (edge: GraphEdge) => {
      if (!hoveredNode) return true;
      return edge.source === hoveredNode || edge.target === hoveredNode;
    },
    [hoveredNode]
  );

  /**
   * 统计数据
   */
  const stats = useMemo(() => {
    const judgeCount = nodes.filter((n) => n.type === 'judge').length;
    const teamCount = nodes.filter((n) => n.type === 'team').length;
    const instCount = nodes.filter((n) => n.type === 'institution').length;
    const playerCount = nodes.filter((n) => n.type === 'player').length;
    const avoidEdgeCount = edges.filter((e) => e.edgeType === 'avoid').length;
    return { judgeCount, teamCount, instCount, playerCount, edgeCount: avoidEdgeCount };
  }, [nodes, edges]);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-navy text-white">
            <Network className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-navy-900">回避关系网络</h3>
            <p className="text-xs text-navy-500">
              共 {stats.judgeCount} 位评委 · {stats.edgeCount} 条回避关系
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom((z) => Math.max(0.4, z - 0.1))}
            className="p-2 rounded-lg hover:bg-navy-50 text-navy-500 transition-colors"
            title="缩小"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
            className="p-2 rounded-lg hover:bg-navy-50 text-navy-500 transition-colors"
            title="放大"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setLayoutSeed((s) => s + 1);
              setZoom(1);
            }}
            className="p-2 rounded-lg hover:bg-navy-50 text-navy-500 transition-colors"
            title="重新布局"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 图例 */}
      <div className="flex flex-wrap gap-4 mb-4 text-xs">
        {(['judge', 'team', 'institution', 'player'] as NodeType[]).map((type) => (
          <div key={type} className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: NODE_COLORS[type] }}
            />
            <span className="text-navy-600">{NODE_TYPE_LABELS[type]}</span>
            {type === 'judge' && <span className="text-navy-400">({stats.judgeCount})</span>}
            {type === 'team' && <span className="text-navy-400">({stats.teamCount})</span>}
            {type === 'institution' && <span className="text-navy-400">({stats.instCount})</span>}
            {type === 'player' && <span className="text-navy-400">({stats.playerCount})</span>}
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-navy-400">
          <span className="w-6 h-px bg-slate-300" />
          <span>选手隶属队伍</span>
        </div>
      </div>

      {/* SVG 画布 - 使用更大尺寸确保所有节点可见 */}
      <div className="relative rounded-xl border border-navy-100 bg-gradient-to-br from-navy-50/30 to-ivory-50 overflow-auto max-h-[650px]">
        <svg
          viewBox="0 0 900 600"
          className="w-full"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
            minHeight: 600 * zoom,
          }}
        >
          <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* 先画隶属关系连线（灰色，在底层） */}
          {edges
            .filter((e) => e.edgeType === 'belong')
            .map((edge) => {
              const source = nodes.find((n) => n.id === edge.source);
              const target = nodes.find((n) => n.id === edge.target);
              if (!source || !target) return null;
              const highlighted = isEdgeHighlighted(edge);
              return (
                <line
                  key={edge.id}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke="#94a3b8"
                  strokeWidth={highlighted ? 1.5 : 1}
                  strokeOpacity={highlighted ? 0.5 : 0.15}
                  strokeDasharray="3 3"
                />
              );
            })}

          {/* 再画回避关系连线（彩色，在上层） */}
          {edges
            .filter((e) => e.edgeType === 'avoid')
            .map((edge) => {
              const source = nodes.find((n) => n.id === edge.source);
              const target = nodes.find((n) => n.id === edge.target);
              if (!source || !target) return null;
              const highlighted = isEdgeHighlighted(edge);
              const color =
                edge.avoidanceType === 'team'
                  ? NODE_COLORS.team
                  : edge.avoidanceType === 'institution'
                  ? NODE_COLORS.institution
                  : NODE_COLORS.player;
              return (
                <line
                  key={edge.id}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={color}
                  strokeWidth={highlighted ? 2.5 : 1.2}
                  strokeOpacity={highlighted ? 0.8 : 0.2}
                  strokeDasharray={edge.avoidanceType === 'institution' ? '5 3' : 'none'}
                />
              );
            })}

          {/* 节点 */}
          {nodes.map((node) => {
            const highlighted = isHighlighted(node.id);
            const isHovered = hoveredNode === node.id;
            return (
              <g
                key={node.id}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* 悬停光晕 */}
                {isHovered && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.radius + 10}
                    fill={node.color}
                    opacity={0.25}
                    filter="url(#glow)"
                  />
                )}
                {/* 节点圆圈 */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isHovered ? node.radius + 3 : node.radius}
                  fill={node.color}
                  opacity={highlighted ? 1 : 0.25}
                  stroke="white"
                  strokeWidth={2.5}
                  style={{ transition: 'all 0.2s ease' }}
                />
                {/* 评委节点显示首字 */}
                {node.type === 'judge' && (
                  <text
                    x={node.x}
                    y={node.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="white"
                    fontSize="13"
                    fontWeight="bold"
                    opacity={highlighted ? 1 : 0.5}
                  >
                    {node.label.charAt(0)}
                  </text>
                )}
                {/* 标签 */}
                <text
                  x={node.x}
                  y={node.y + node.radius + 14}
                  textAnchor="middle"
                  fill="#1e3a5f"
                  fontSize="11"
                  fontWeight={isHovered ? 600 : 400}
                  opacity={highlighted ? 1 : 0.35}
                >
                  {node.label.length > 8
                    ? node.label.slice(0, 8) + '…'
                    : node.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* 悬停提示面板 */}
        {hoveredNode && (() => {
          const node = nodes.find((n) => n.id === hoveredNode);
          if (!node) return null;
          const connectedAvoidEdges = edges.filter(
            (e) =>
              e.edgeType === 'avoid' &&
              (e.source === hoveredNode || e.target === hoveredNode)
          );
          const belongEdges = edges.filter(
            (e) => e.edgeType === 'belong' && e.source === hoveredNode
          );
          return (
            <div className="absolute top-3 left-3 bg-white/95 backdrop-blur rounded-lg shadow-lg p-3 text-xs border border-navy-100 max-w-xs">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: node.color }}
                />
                <span className="font-semibold text-navy-900 truncate">
                  {node.label}
                </span>
                <span className="text-navy-400 flex-shrink-0">
                  {NODE_TYPE_LABELS[node.type]}
                </span>
              </div>
              {node.type === 'judge' && connectedAvoidEdges.length > 0 && (
                <div className="text-navy-500">
                  <div className="mb-1">回避对象：</div>
                  <div className="flex flex-wrap gap-1">
                    {connectedAvoidEdges.map((e) => {
                      const targetNode = nodes.find((n) => n.id === e.target);
                      return targetNode ? (
                        <span
                          key={e.id}
                          className={cn(
                            'inline-block px-1.5 py-0.5 rounded text-white text-[10px]',
                            e.avoidanceType === 'team'
                              ? 'bg-emerald-600'
                              : e.avoidanceType === 'institution'
                              ? 'bg-amber-600'
                              : 'bg-red-600'
                          )}
                        >
                          {targetNode.label}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
              {node.type === 'player' && belongEdges.length > 0 && (
                <div className="text-navy-500">
                  所属队伍：
                  {belongEdges.map((e) => {
                    const team = nodes.find((n) => n.id === e.target);
                    return team ? (
                      <span
                        key={e.id}
                        className="inline-block ml-1 px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[10px]"
                      >
                        {team.label}
                      </span>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      <p className="text-[11px] text-navy-400 mt-3 text-center">
        提示：悬停节点高亮关联网络，灰线表示选手隶属队伍，点击「重新布局」可刷新排列
      </p>
    </div>
  );
}
