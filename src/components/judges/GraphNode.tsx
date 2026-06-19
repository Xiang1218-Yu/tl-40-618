import React, { useCallback } from 'react';
import type { GraphNode as GraphNodeType } from '@/hooks/useAvoidanceGraphData';

/**
 * 图节点组件属性
 */
interface GraphNodeProps {
  node: GraphNodeType;
  isHighlighted: boolean;
  isDimmed: boolean;
  isSelected: boolean;
  onMouseEnter: (nodeId: string) => void;
  onMouseLeave: () => void;
  onClick: (nodeId: string) => void;
  onDragStart: (nodeId: string, e: React.MouseEvent | React.TouchEvent) => void;
}

/**
 * 获取节点类型标识字符
 */
const getNodeGlyph = (type: GraphNodeType['type']): string => {
  switch (type) {
    case 'judge': return '⚖';
    case 'institution': return '🏛';
    case 'team': return '👥';
    case 'player': return '👤';
  }
};

/**
 * 获取节点类型标签
 */
const getTypeLabel = (type: GraphNodeType['type']): string => {
  switch (type) {
    case 'judge': return '评委';
    case 'institution': return '机构';
    case 'team': return '队伍';
    case 'player': return '选手';
  }
};

/**
 * SVG图节点组件
 * 单一职责：
 * - 渲染单个节点（圆形+图标+文字标签）
 * - 处理节点的鼠标交互（hover/click/drag）
 * - 根据高亮/选中/淡化状态调整样式
 */
export const GraphNodeComponent: React.FC<GraphNodeProps> = ({
  node,
  isHighlighted,
  isDimmed,
  isSelected,
  onMouseEnter,
  onMouseLeave,
  onClick,
  onDragStart,
}) => {
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDragStart(node.id, e);
  }, [node.id, onDragStart]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    onDragStart(node.id, e);
  }, [node.id, onDragStart]);

  const handleMouseEnter = useCallback(() => {
    onMouseEnter(node.id);
  }, [node.id, onMouseEnter]);

  const handleClick = useCallback(() => {
    onClick(node.id);
  }, [node.id, onClick]);

  const opacity = isDimmed ? 0.2 : 1;
  const scale = isHighlighted || isSelected ? 1.15 : 1;
  const strokeWidth = isSelected ? 4 : isHighlighted ? 3 : 2;
  const strokeColor = isSelected ? '#F59E0B' : node.color;

  return (
    <g
      transform={`translate(${node.x}, ${node.y}) scale(${scale})`}
      style={{ cursor: 'grab', opacity, transition: 'opacity 0.2s, transform 0.15s' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <circle
        r={node.radius}
        fill="white"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        style={{
          filter: isHighlighted || isSelected
            ? 'drop-shadow(0 4px 12px rgba(0,0,0,0.25))'
            : 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
        }}
      />

      <circle
        r={node.radius - 6}
        fill={node.color}
        fillOpacity={0.15}
      />

      <text
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={node.type === 'player' ? 14 : 18}
        style={{ userSelect: 'none', pointerEvents: 'none' }}
      >
        {getNodeGlyph(node.type)}
      </text>

      <g transform={`translate(0, ${node.radius + 14})`}>
        <text
          textAnchor="middle"
          fontSize={node.type === 'player' ? 10 : 12}
          fontWeight={isHighlighted || isSelected ? 700 : 500}
          fill="#1E293B"
          style={{ userSelect: 'none', pointerEvents: 'none' }}
        >
          {node.label.length > 6 ? node.label.slice(0, 6) + '…' : node.label}
        </text>
        {(isHighlighted || isSelected) && (
          <text
            y={14}
            textAnchor="middle"
            fontSize={9}
            fill="#64748B"
            style={{ userSelect: 'none', pointerEvents: 'none' }}
          >
            {getTypeLabel(node.type)}
          </text>
        )}
      </g>
    </g>
  );
};

export default GraphNodeComponent;
