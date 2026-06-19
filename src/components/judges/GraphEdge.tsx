import React from 'react';
import type { GraphEdge as GraphEdgeType, GraphNode } from '@/hooks/useAvoidanceGraphData';

/**
 * 图连线组件属性
 */
interface GraphEdgeProps {
  edge: GraphEdgeType;
  sourceNode: GraphNode | undefined;
  targetNode: GraphNode | undefined;
  isHighlighted: boolean;
  isDimmed: boolean;
}

/**
 * 获取连线类型对应的虚线样式
 */
const getStrokeDasharray = (type: GraphEdgeType['type']): string => {
  switch (type) {
    case 'team': return '';
    case 'institution': return '8,4';
    case 'player': return '4,4';
    case 'belongs_to': return '2,4';
  }
};

/**
 * 计算两个节点连线上的端点位置（从圆边缘开始/结束）
 */
const calculateEdgePoints = (
  source: GraphNode,
  target: GraphNode
): { x1: number; y1: number; x2: number; y2: number } => {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist === 0) {
    return { x1: source.x, y1: source.y, x2: target.x, y2: target.y };
  }

  const sx = source.x + (dx / dist) * source.radius;
  const sy = source.y + (dy / dist) * source.radius;
  const tx = target.x - (dx / dist) * target.radius;
  const ty = target.y - (dy / dist) * target.radius;

  return { x1: sx, y1: sy, x2: tx, y2: ty };
};

/**
 * SVG图连线组件
 * 单一职责：
 * - 渲染两个节点间的连线
 * - 根据连线类型使用不同的颜色/虚线样式
 * - 根据高亮/淡化状态调整透明度
 */
export const GraphEdgeComponent: React.FC<GraphEdgeProps> = ({
  edge,
  sourceNode,
  targetNode,
  isHighlighted,
  isDimmed,
}) => {
  if (!sourceNode || !targetNode) return null;

  const { x1, y1, x2, y2 } = calculateEdgePoints(sourceNode, targetNode);
  const opacity = isDimmed ? 0.08 : isHighlighted ? 1 : 0.35;
  const strokeWidth = isHighlighted ? edge.width + 1 : edge.width;

  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={edge.color}
      strokeWidth={strokeWidth}
      strokeDasharray={getStrokeDasharray(edge.type)}
      strokeLinecap="round"
      opacity={opacity}
      style={{ transition: 'opacity 0.2s, stroke-width 0.15s' }}
    />
  );
};

export default GraphEdgeComponent;
