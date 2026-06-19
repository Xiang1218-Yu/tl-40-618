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
  /** 关联的实体ID（如评委id、队伍id） */
  entityId: string;
}

/**
 * 图连线（回避关系）
 */
interface GraphEdge {
  id: string;
  source: string;
  target: string;
  /** 回避类型 */
  avoidanceType: 'team' | 'institution' | 'player';
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
 *   1. 构建评委-队伍/学校/选手的回避关系图数据
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
   * 构建图数据（节点 + 连线）
   * 使用圆形布局：评委在中心圈，回避对象在外圈
   */
  const { nodes, edges } = useMemo(() => {
    const nodeMap = new Map<string, GraphNode>();
    const edgeList: GraphEdge[] = [];

    const width = 700;
    const height = 500;
    const centerX = width / 2;
    const centerY = height / 2;

    /**
     * 简单确定性圆形布局
     * 使用 layoutSeed 作为种子允许刷新布局
     */
    const pseudoRandom = (seed: number) => {
      let s = seed;
      return () => {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
      };
    };
    const rand = pseudoRandom(layoutSeed + 1);

    // 1. 添加评委节点（内圈）
    const judgeCount = judges.length;
    judges.forEach((j, idx) => {
      const angle = (idx / Math.max(1, judgeCount)) * Math.PI * 2 - Math.PI / 2;
      const radius = 80 + rand() * 20;
      nodeMap.set(`judge-${j.id}`, {
        id: `judge-${j.id}`,
        label: j.name,
        type: 'judge',
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        radius: 22,
        color: NODE_COLORS.judge,
        entityId: j.id,
      });
    });

    // 2. 收集所有回避实体并添加节点
    const allAvoidances: {
      judgeId: string;
      entityId: string;
      label: string;
      type: NodeType;
      avoidanceType: 'team' | 'institution' | 'player';
    }[] = [];

    judges.forEach((j) => {
      // 回避队伍
      j.avoidTeams.forEach((tid) => {
        const team = teams.find((t) => t.id === tid);
        if (team) {
          allAvoidances.push({
            judgeId: j.id,
            entityId: tid,
            label: team.name,
            type: 'team',
            avoidanceType: 'team',
          });
        }
      });
      // 回避机构
      j.avoidInstitutions.forEach((inst, i) => {
        allAvoidances.push({
          judgeId: j.id,
          entityId: `inst-${inst}-${i}`,
          label: inst,
          type: 'institution',
          avoidanceType: 'institution',
        });
      });
      // 回避选手
      j.avoidPlayers.forEach((pid) => {
        for (const t of teams) {
          const player = t.players.find((p) => p.id === pid);
          if (player) {
            allAvoidances.push({
              judgeId: j.id,
              entityId: pid,
              label: player.name,
              type: 'player',
              avoidanceType: 'player',
            });
            break;
          }
        }
      });
    });

    // 外圈布局
    const outerCount = allAvoidances.length;
    allAvoidances.forEach((a, idx) => {
      const angle = (idx / Math.max(1, outerCount)) * Math.PI * 2 - Math.PI / 2;
      const radius = 170 + rand() * 40;
      const nodeId = `${a.type}-${a.entityId}`;
      if (!nodeMap.has(nodeId)) {
        nodeMap.set(nodeId, {
          id: nodeId,
          label: a.label,
          type: a.type,
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
          radius: a.type === 'judge' ? 22 : 16,
          color: NODE_COLORS[a.type],
          entityId: a.entityId,
        });
      }
      edgeList.push({
        id: `edge-${a.judgeId}-${a.entityId}-${idx}`,
        source: `judge-${a.judgeId}`,
        target: nodeId,
        avoidanceType: a.avoidanceType,
      });
    });

    return {
      nodes: Array.from(nodeMap.values()),
      edges: edgeList,
    };
  }, [judges, teams, layoutSeed]);

  /**
   * 判断节点/连线是否高亮
   */
  const isHighlighted = useCallback(
    (nodeId: string) => {
      if (!hoveredNode) return true;
      if (nodeId === hoveredNode) return true;
      return edges.some(
        (e) =>
          (e.source === hoveredNode && e.target === nodeId) ||
          (e.target === hoveredNode && e.source === nodeId)
      );
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
    return { judgeCount, teamCount, instCount, playerCount, edgeCount: edges.length };
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
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
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
            {type === 'judge' && (
              <span className="text-navy-400">({stats.judgeCount})</span>
            )}
            {type === 'team' && <span className="text-navy-400">({stats.teamCount})</span>}
            {type === 'institution' && (
              <span className="text-navy-400">({stats.instCount})</span>
            )}
            {type === 'player' && (
              <span className="text-navy-400">({stats.playerCount})</span>
            )}
          </div>
        ))}
      </div>

      {/* SVG 画布 */}
      <div className="relative rounded-xl border border-navy-100 bg-gradient-to-br from-navy-50/30 to-ivory-50 overflow-hidden">
        <svg
          viewBox="0 0 700 500"
          className="w-full h-auto"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
        >
          <defs>
            {/* 渐变滤镜 */}
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* 连线 */}
          {edges.map((edge) => {
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
                stroke={
                  edge.avoidanceType === 'team'
                    ? NODE_COLORS.team
                    : edge.avoidanceType === 'institution'
                    ? NODE_COLORS.institution
                    : NODE_COLORS.player
                }
                strokeWidth={highlighted ? 2 : 1}
                strokeOpacity={highlighted ? 0.7 : 0.2}
                strokeDasharray={edge.avoidanceType === 'institution' ? '4 3' : 'none'}
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
                    r={node.radius + 8}
                    fill={node.color}
                    opacity={0.2}
                    filter="url(#glow)"
                  />
                )}
                {/* 节点圆圈 */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isHovered ? node.radius + 2 : node.radius}
                  fill={node.color}
                  opacity={highlighted ? 1 : 0.3}
                  stroke="white"
                  strokeWidth={2}
                  style={{ transition: 'all 0.2s ease' }}
                />
                {/* 评委节点显示文字首字 */}
                {node.type === 'judge' && (
                  <text
                    x={node.x}
                    y={node.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="white"
                    fontSize="11"
                    fontWeight="bold"
                    opacity={highlighted ? 1 : 0.5}
                  >
                    {node.label.charAt(0)}
                  </text>
                )}
                {/* 标签 */}
                <text
                  x={node.x}
                  y={node.y + node.radius + 12}
                  textAnchor="middle"
                  fill="#1e3a5f"
                  fontSize="10"
                  fontWeight={isHovered ? 600 : 400}
                  opacity={highlighted ? 1 : 0.4}
                >
                  {node.label.length > 6
                    ? node.label.slice(0, 6) + '…'
                    : node.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* 悬停提示 */}
        {hoveredNode && (
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur rounded-lg shadow-lg p-3 text-xs border border-navy-100">
            {(() => {
              const node = nodes.find((n) => n.id === hoveredNode);
              if (!node) return null;
              const connectedEdges = edges.filter(
                (e) => e.source === hoveredNode || e.target === hoveredNode
              );
              return (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: node.color }}
                    />
                    <span className="font-semibold text-navy-900">
                      {node.label}
                    </span>
                    <span className="text-navy-400">
                      {NODE_TYPE_LABELS[node.type]}
                    </span>
                  </div>
                  {node.type === 'judge' && connectedEdges.length > 0 && (
                    <div className="text-navy-500 mt-1">
                      回避：
                      {connectedEdges.map((e) => {
                        const targetNode = nodes.find(
                          (n) => n.id === e.target
                        );
                        return targetNode ? (
                          <span
                            key={e.id}
                            className={cn(
                              'inline-block ml-1 px-1.5 py-0.5 rounded text-white',
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
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      <p className="text-[11px] text-navy-400 mt-3 text-center">
        提示：悬停节点可查看详情，鼠标悬停在连线上可查看回避类型，点击「重新布局」可刷新排列
      </p>
    </div>
  );
}
