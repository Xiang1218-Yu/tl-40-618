import { useMemo, useState, useEffect } from 'react';
import { Network, ZoomIn, ZoomOut, RotateCcw, User, Users, Building } from 'lucide-react';
import type { Judge, Team } from '@/types';

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
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

/**
 * 图边数据
 */
interface GraphEdge {
  source: string;
  target: string;
  type: 'team' | 'institution' | 'player';
}

interface AvoidanceGraphProps {
  judges: Judge[];
  teams: Team[];
}

/**
 * 力导向布局模拟器
 * 单一职责：计算节点在画布上的位置
 */
const useForceLayout = (nodes: GraphNode[], edges: GraphEdge[], width: number, height: number) => {
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});

  useEffect(() => {
    if (nodes.length === 0) return;

    // 初始化位置
    const simNodes = nodes.map((n, i) => ({
      ...n,
      x: n.x,
      y: n.y,
      vx: 0,
      vy: 0,
    }));

    const nodeMap: Record<string, typeof simNodes[0]> = {};
    simNodes.forEach((n) => (nodeMap[n.id] = n));

    // 简易力导向模拟
    const iterations = 150;
    const repulsionStrength = 3000;
    const attractionStrength = 0.02;
    const centerStrength = 0.01;
    const damping = 0.85;

    for (let iter = 0; iter < iterations; iter++) {
      // 斥力
      for (let i = 0; i < simNodes.length; i++) {
        for (let j = i + 1; j < simNodes.length; j++) {
          const a = simNodes[i];
          const b = simNodes[j];
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          let dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < 50) dist = 50;
          const force = repulsionStrength / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx += fx;
          a.vy += fy;
          b.vx -= fx;
          b.vy -= fy;
        }
      }

      // 引力（边）
      edges.forEach((e) => {
        const a = nodeMap[e.source];
        const b = nodeMap[e.target];
        if (!a || !b) return;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = dist * attractionStrength;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      });

      // 中心引力
      simNodes.forEach((n) => {
        n.vx += (width / 2 - n.x) * centerStrength;
        n.vy += (height / 2 - n.y) * centerStrength;
      });

      // 更新位置
      simNodes.forEach((n) => {
        n.vx *= damping;
        n.vy *= damping;
        n.x += n.vx;
        n.y += n.vy;
        n.x = Math.max(50, Math.min(width - 50, n.x));
        n.y = Math.max(50, Math.min(height - 50, n.y));
      });
    }

    const pos: Record<string, { x: number; y: number }> = {};
    simNodes.forEach((n) => {
      pos[n.id] = { x: n.x, y: n.y };
    });
    setPositions(pos);
  }, [nodes.length, edges.length, width, height]);

  return positions;
};

/**
 * 评委回避关系图组件
 * 单一职责：以SVG网络图形式展示评委与队伍/学校/选手的回避关系
 */
export const AvoidanceGraph = ({ judges, teams }: AvoidanceGraphProps) => {
  const [scale, setScale] = useState(1);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const width = 800;
  const height = 500;

  /**
   * 构建图数据：节点和边
   */
  const { nodes, edges } = useMemo(() => {
    const nodeMap = new Map<string, GraphNode>();
    const edgeList: GraphEdge[] = [];

    // 收集所有机构
    const institutionSet = new Set<string>();
    judges.forEach((j) => {
      if (j.institution) institutionSet.add(j.institution);
    });
    teams.forEach((t) => {
      if (t.institution) institutionSet.add(t.institution);
    });

    // 收集所有选手
    const playerMap = new Map<string, { name: string; teamId: string }>();
    teams.forEach((t) => {
      t.players.forEach((p) => {
        playerMap.set(p.id, { name: p.name, teamId: t.id });
      });
    });

    // 添加评委节点（左侧区域）
    judges.forEach((j, idx) => {
      nodeMap.set(`judge_${j.id}`, {
        id: `judge_${j.id}`,
        label: j.name,
        type: 'judge',
        x: 120 + (idx % 3) * 10,
        y: 100 + Math.floor(idx / 3) * 120,
        vx: 0,
        vy: 0,
        radius: 28,
        color: '#0F2944',
      });
    });

    // 添加队伍节点（中间区域）
    teams.filter((t) => !t.id.startsWith('__')).forEach((t, idx) => {
      nodeMap.set(`team_${t.id}`, {
        id: `team_${t.id}`,
        label: t.name,
        type: 'team',
        x: width / 2 + (idx % 4 - 1.5) * 60,
        y: 100 + Math.floor(idx / 4) * 90,
        vx: 0,
        vy: 0,
        radius: 22,
        color: '#10B981',
      });
    });

    // 添加机构节点（右侧区域）
    Array.from(institutionSet).forEach((inst, idx) => {
      nodeMap.set(`inst_${inst}`, {
        id: `inst_${inst}`,
        label: inst,
        type: 'institution',
        x: width - 150 + (idx % 2) * 30,
        y: 100 + Math.floor(idx / 2) * 100,
        vx: 0,
        vy: 0,
        radius: 20,
        color: '#D4A574',
      });
    });

    // 添加选手节点（右下区域）
    Array.from(playerMap.entries()).forEach(([pid, p], idx) => {
      nodeMap.set(`player_${pid}`, {
        id: `player_${pid}`,
        label: p.name,
        type: 'player',
        x: width - 150 + (idx % 3 - 1) * 50,
        y: height - 80,
        vx: 0,
        vy: 0,
        radius: 14,
        color: '#6366F1',
      });
    });

    // 添加回避关系边
    judges.forEach((j) => {
      const judgeNodeId = `judge_${j.id}`;

      // 回避队伍
      j.avoidTeams.forEach((tid) => {
        edgeList.push({
          source: judgeNodeId,
          target: `team_${tid}`,
          type: 'team',
        });
      });

      // 回避机构
      j.avoidInstitutions.forEach((inst) => {
        edgeList.push({
          source: judgeNodeId,
          target: `inst_${inst}`,
          type: 'institution',
        });
      });

      // 回避选手
      j.avoidPlayers.forEach((pid) => {
        edgeList.push({
          source: judgeNodeId,
          target: `player_${pid}`,
          type: 'player',
        });
      });
    });

    return {
      nodes: Array.from(nodeMap.values()),
      edges: edgeList.filter(
        (e) => nodeMap.has(e.source) && nodeMap.has(e.target)
      ),
    };
  }, [judges, teams]);

  const positions = useForceLayout(nodes, edges, width, height);

  /**
   * 获取边的颜色
   */
  const getEdgeColor = (type: GraphEdge['type']) => {
    switch (type) {
      case 'team':
        return '#EF4444';
      case 'institution':
        return '#F59E0B';
      case 'player':
        return '#8B5CF6';
    }
  };

  /**
   * 获取节点图标
   */
  const getNodeIcon = (type: NodeType) => {
    switch (type) {
      case 'judge':
        return <User className="w-4 h-4" />;
      case 'team':
        return <Users className="w-3.5 h-3.5" />;
      case 'institution':
        return <Building className="w-3.5 h-3.5" />;
      case 'player':
        return <User className="w-3 h-3" />;
    }
  };

  /**
   * 判断节点/边是否高亮
   */
  const isHighlighted = (nodeId: string) => {
    if (!hoveredNode) return true;
    if (hoveredNode === nodeId) return true;
    return edges.some(
      (e) =>
        (e.source === hoveredNode && e.target === nodeId) ||
        (e.target === hoveredNode && e.source === nodeId)
    );
  };

  const isEdgeHighlighted = (edge: GraphEdge) => {
    if (!hoveredNode) return true;
    return edge.source === hoveredNode || edge.target === hoveredNode;
  };

  const hasAnyAvoidance = edges.length > 0;

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-navy-100">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-gold text-white shadow-sm">
            <Network className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-navy-900">回避关系网络</h3>
            <p className="text-xs text-navy-500">
              {hasAnyAvoidance
                ? `共 ${judges.length} 位评委，${edges.length} 条回避关系`
                : '暂无回避配置'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setScale((s) => Math.min(2, s + 0.2))}
            className="p-2 rounded-md text-navy-500 hover:bg-navy-50 transition-colors"
            title="放大"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}
            className="p-2 rounded-md text-navy-500 hover:bg-navy-50 transition-colors"
            title="缩小"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setScale(1)}
            className="p-2 rounded-md text-navy-500 hover:bg-navy-50 transition-colors"
            title="重置"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 px-4 py-2 bg-ivory-50/50 border-b border-navy-100 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-navy-800" />
          <span className="text-navy-600">评委</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-navy-600">队伍</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-gold-500" />
          <span className="text-navy-600">机构</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-indigo-500" />
          <span className="text-navy-600">选手</span>
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-red-500" />
            <span className="text-navy-600">回避队伍</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-amber-500" />
            <span className="text-navy-600">回避机构</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-purple-500" />
            <span className="text-navy-600">回避选手</span>
          </div>
        </div>
      </div>

      <div className="overflow-auto p-4" style={{ maxHeight: 500 }}>
        {!hasAnyAvoidance ? (
          <div className="flex flex-col items-center justify-center py-16 text-navy-400">
            <Network className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">暂无回避关系配置</p>
            <p className="text-xs mt-1">在评委管理中添加回避关系后，这里将自动展示关系网络</p>
          </div>
        ) : (
          <svg
            width={width * scale}
            height={height * scale}
            viewBox={`0 0 ${width} ${height}`}
            className="mx-auto"
          >
            <defs>
              {['#EF4444', '#F59E0B', '#8B5CF6'].map((color) => (
                <marker
                  key={color}
                  id={`arrow_${color.replace('#', '')}`}
                  viewBox="0 0 10 10"
                  refX="10"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill={color} opacity="0.6" />
                </marker>
              ))}
            </defs>

            {/* 绘制边 */}
            {edges.map((e, i) => {
              const sourcePos = positions[e.source];
              const targetPos = positions[e.target];
              if (!sourcePos || !targetPos) return null;
              const color = getEdgeColor(e.type);
              const highlighted = isEdgeHighlighted(e);
              return (
                <line
                  key={`edge_${i}`}
                  x1={sourcePos.x}
                  y1={sourcePos.y}
                  x2={targetPos.x}
                  y2={targetPos.y}
                  stroke={color}
                  strokeWidth={highlighted ? 2 : 1}
                  strokeOpacity={highlighted ? 0.7 : 0.25}
                  markerEnd={`url(#arrow_${color.replace('#', '')})`}
                  className="transition-all duration-200"
                />
              );
            })}

            {/* 绘制节点 */}
            {nodes.map((n) => {
              const pos = positions[n.id];
              if (!pos) return null;
              const highlighted = isHighlighted(n.id);
              return (
                <g
                  key={n.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  onMouseEnter={() => setHoveredNode(n.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  style={{ cursor: 'pointer' }}
                  opacity={highlighted ? 1 : 0.4}
                  className="transition-opacity duration-200"
                >
                  <circle
                    r={n.radius}
                    fill={n.color}
                    fillOpacity={0.9}
                    stroke="white"
                    strokeWidth={3}
                    className="drop-shadow-md"
                  />
                  <g
                    fill="white"
                    transform={`translate(-${n.type === 'judge' ? 8 : n.type === 'player' ? 6 : 7}, -${n.type === 'judge' ? 8 : n.type === 'player' ? 6 : 7})`}
                  >
                    {getNodeIcon(n.type)}
                  </g>
                  <text
                    y={n.radius + 14}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={600}
                    fill="#0F2944"
                    className="select-none"
                  >
                    {n.label.length > 6 ? n.label.slice(0, 6) + '...' : n.label}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>

      {hoveredNode && hasAnyAvoidance && (
        <div className="px-4 py-2 bg-navy-50 border-t border-navy-100 text-xs text-navy-600">
          {(() => {
            const node = nodes.find((n) => n.id === hoveredNode);
            if (!node) return null;
            const connectedEdges = edges.filter(
              (e) => e.source === hoveredNode || e.target === hoveredNode
            );
            const typeLabel = {
              judge: '评委',
              team: '队伍',
              institution: '机构',
              player: '选手',
            }[node.type];
            return (
              <span>
                <strong>{typeLabel}「{node.label}」</strong>
                {connectedEdges.length > 0 && ` · ${connectedEdges.length} 条回避关系`}
              </span>
            );
          })()}
        </div>
      )}
    </div>
  );
};
