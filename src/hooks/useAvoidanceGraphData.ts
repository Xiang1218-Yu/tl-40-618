import { useMemo } from 'react';
import type { Judge, Team, Player } from '@/types';

/**
 * 图节点类型
 */
export type NodeType = 'judge' | 'team' | 'institution' | 'player';

/**
 * 图节点数据
 */
export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  relatedIds: Set<string>;
}

/**
 * 图连线数据
 */
export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: 'team' | 'institution' | 'player' | 'belongs_to';
  color: string;
  width: number;
}

/**
 * 评委回避关系图数据结构
 */
export interface AvoidanceGraphData {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
  width: number;
  height: number;
}

// 节点颜色配置
const COLORS = {
  judge: '#3B82F6',      // 蓝色 - 评委
  team: '#10B981',       // 绿色 - 队伍
  institution: '#F59E0B', // 金色 - 学校/机构
  player: '#8B5CF6',     // 紫色 - 选手
  edgeTeam: '#EF4444',   // 红色 - 队伍回避
  edgeInstitution: '#F97316', // 橙色 - 机构回避
  edgePlayer: '#EC4899', // 粉色 - 选手回避
  edgeBelongs: '#94A3B8', // 灰色 - 所属关系
};

// 节点半径配置
const RADIUS = {
  judge: 32,
  institution: 28,
  team: 24,
  player: 18,
};

/**
 * 生成节点唯一ID
 */
const genNodeId = (type: NodeType, rawId: string): string => `${type}:${rawId}`;

/**
 * 计算圆形布局位置
 */
const calculateCircularLayout = (
  items: Array<{ id: string; type: NodeType; label: string }>,
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number = 0
): Map<string, { x: number; y: number }> => {
  const positions = new Map<string, { x: number; y: number }>();
  const count = items.length;
  if (count === 0) return positions;

  const angleStep = (2 * Math.PI) / count;

  items.forEach((item, i) => {
    const angle = startAngle + i * angleStep;
    positions.set(item.id, {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    });
  });

  return positions;
};

/**
 * 评委回避关系图数据Hook
 * 单一职责：
 * - 将评委/队伍/选手数据转换为图的节点和连线格式
 * - 计算初始布局位置（分区域圆形布局）
 */
export function useAvoidanceGraphData(
  judges: Judge[],
  teams: Team[]
): AvoidanceGraphData {
  return useMemo(() => {
    const nodes = new Map<string, GraphNode>();
    const edges: GraphEdge[] = [];
    const edgeSet = new Set<string>();

    const width = 900;
    const height = 700;
    const centerX = width / 2;
    const centerY = height / 2;

    const institutions = new Map<string, string>();
    const allPlayers: Player[] = [];
    teams.forEach((team) => {
      if (team.institution && !institutions.has(team.institution)) {
        institutions.set(team.institution, team.institution);
      }
      team.players.forEach((p) => allPlayers.push(p));
    });

    const judgeItems = judges.map((j) => ({
      id: genNodeId('judge', j.id),
      type: 'judge' as NodeType,
      label: j.name,
      radius: RADIUS.judge,
    }));

    const institutionItems = Array.from(institutions.keys()).map((inst) => ({
      id: genNodeId('institution', inst),
      type: 'institution' as NodeType,
      label: inst,
      radius: RADIUS.institution,
    }));

    const teamItems = teams.filter((t) => !t.id.startsWith('__')).map((t) => ({
      id: genNodeId('team', t.id),
      type: 'team' as NodeType,
      label: t.name,
      radius: RADIUS.team,
    }));

    const playerItems = allPlayers.map((p) => ({
      id: genNodeId('player', p.id),
      type: 'player' as NodeType,
      label: p.name,
      radius: RADIUS.player,
    }));

    const judgePositions = calculateCircularLayout(
      judgeItems,
      centerX,
      centerY,
      100,
      -Math.PI / 2
    );

    const instPositions = calculateCircularLayout(
      institutionItems,
      centerX,
      centerY,
      200,
      -Math.PI / 2 + Math.PI / 6
    );

    const teamPositions = calculateCircularLayout(
      teamItems,
      centerX,
      centerY,
      290,
      -Math.PI / 2
    );

    const playerPositions = calculateCircularLayout(
      playerItems,
      centerX,
      centerY,
      370,
      -Math.PI / 2 + Math.PI / 12
    );

    const addNode = (item: typeof judgeItems[0], pos: { x: number; y: number } | undefined, color: string) => {
      if (!pos) return;
      nodes.set(item.id, {
        id: item.id,
        type: item.type,
        label: item.label,
        x: pos.x,
        y: pos.y,
        radius: item.radius,
        color,
        relatedIds: new Set(),
      });
    };

    judgeItems.forEach((item) => addNode(item, judgePositions.get(item.id), COLORS.judge));
    institutionItems.forEach((item) => addNode(item, instPositions.get(item.id), COLORS.institution));
    teamItems.forEach((item) => addNode(item, teamPositions.get(item.id), COLORS.team));
    playerItems.forEach((item) => addNode(item, playerPositions.get(item.id), COLORS.player));

    const addEdge = (sourceId: string, targetId: string, type: GraphEdge['type'], color: string) => {
      const edgeKey = [sourceId, targetId].sort().join('--');
      if (edgeSet.has(edgeKey)) return;
      edgeSet.add(edgeKey);

      edges.push({
        id: edgeKey,
        sourceId,
        targetId,
        type,
        color,
        width: type === 'belongs_to' ? 1 : 2,
      });

      const sourceNode = nodes.get(sourceId);
      const targetNode = nodes.get(targetId);
      if (sourceNode) sourceNode.relatedIds.add(targetId);
      if (targetNode) targetNode.relatedIds.add(sourceId);
    };

    teams.forEach((team) => {
      if (team.id.startsWith('__')) return;

      const teamNodeId = genNodeId('team', team.id);
      const instNodeId = genNodeId('institution', team.institution);

      if (nodes.has(instNodeId) && nodes.has(teamNodeId)) {
        addEdge(teamNodeId, instNodeId, 'belongs_to', COLORS.edgeBelongs);
      }

      team.players.forEach((player) => {
        const playerNodeId = genNodeId('player', player.id);
        if (nodes.has(playerNodeId) && nodes.has(teamNodeId)) {
          addEdge(playerNodeId, teamNodeId, 'belongs_to', COLORS.edgeBelongs);
        }
      });
    });

    judges.forEach((judge) => {
      const judgeNodeId = genNodeId('judge', judge.id);

      const judgeInstNodeId = genNodeId('institution', judge.institution);
      if (nodes.has(judgeInstNodeId) && nodes.has(judgeNodeId)) {
        addEdge(judgeNodeId, judgeInstNodeId, 'belongs_to', COLORS.edgeBelongs);
      }

      judge.avoidTeams.forEach((teamId) => {
        const teamNodeId = genNodeId('team', teamId);
        if (nodes.has(teamNodeId)) {
          addEdge(judgeNodeId, teamNodeId, 'team', COLORS.edgeTeam);
        }
      });

      judge.avoidInstitutions.forEach((inst) => {
        const instNodeId = genNodeId('institution', inst);
        if (nodes.has(instNodeId)) {
          addEdge(judgeNodeId, instNodeId, 'institution', COLORS.edgeInstitution);
        }
      });

      judge.avoidPlayers.forEach((playerId) => {
        const playerNodeId = genNodeId('player', playerId);
        if (nodes.has(playerNodeId)) {
          addEdge(judgeNodeId, playerNodeId, 'player', COLORS.edgePlayer);
        }
      });
    });

    return { nodes, edges, width, height };
  }, [judges, teams]);
}

export { COLORS as GRAPH_COLORS, genNodeId };
