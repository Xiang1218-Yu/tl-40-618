import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Info } from 'lucide-react';
import { useAvoidanceGraphData } from '@/hooks/useAvoidanceGraphData';
import { GraphNodeComponent } from './GraphNode';
import { GraphEdgeComponent } from './GraphEdge';
import type { Judge, Team } from '@/types';
import type { GraphNode } from '@/hooks/useAvoidanceGraphData';

/**
 * 回避关系图组件属性
 */
interface AvoidanceRelationalGraphProps {
  judges: Judge[];
  teams: Team[];
}

/**
 * 节点拖拽状态
 */
interface DragState {
  nodeId: string;
  offsetX: number;
  offsetY: number;
}

/**
 * 图例项配置
 */
const legendItems = [
  { color: '#3B82F6', label: '评委', isNode: true },
  { color: '#F59E0B', label: '机构/学校', isNode: true },
  { color: '#10B981', label: '队伍', isNode: true },
  { color: '#8B5CF6', label: '选手', isNode: true },
  { color: '#EF4444', label: '回避-队伍', isNode: false, dash: '' },
  { color: '#F97316', label: '回避-机构', isNode: false, dash: '8,4' },
  { color: '#EC4899', label: '回避-选手', isNode: false, dash: '4,4' },
  { color: '#94A3B8', label: '所属关系', isNode: false, dash: '2,4' },
];

/**
 * 评委回避关系图主组件
 * 单一职责：
 * - 渲染SVG画布
 * - 管理节点位置状态（支持拖拽移动节点）
 * - 管理视口缩放/平移
 * - 处理hover/click高亮联动
 * - 显示图例和操作说明
 */
export const AvoidanceRelationalGraph: React.FC<AvoidanceRelationalGraphProps> = ({
  judges,
  teams,
}) => {
  const graphData = useAvoidanceGraphData(judges, teams);

  const [nodePositions, setNodePositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragState, setDragState] = useState<DragState | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  /**
   * 初始化节点位置
   */
  useEffect(() => {
    const positions = new Map<string, { x: number; y: number }>();
    graphData.nodes.forEach((node) => {
      positions.set(node.id, { x: node.x, y: node.y });
    });
    setNodePositions(positions);
  }, [graphData]);

  /**
   * 获取当前节点位置（优先使用拖拽后的位置）
   */
  const getNodeWithPosition = useCallback((nodeId: string): GraphNode | undefined => {
    const baseNode = graphData.nodes.get(nodeId);
    if (!baseNode) return undefined;
    const pos = nodePositions.get(nodeId);
    return pos ? { ...baseNode, x: pos.x, y: pos.y } : baseNode;
  }, [graphData.nodes, nodePositions]);

  /**
   * 获取高亮节点集合（包括直接相连的节点）
   */
  const highlightedNodeIds = useMemo(() => {
    const activeId = hoveredNodeId ?? selectedNodeId;
    if (!activeId) return new Set<string>();

    const result = new Set<string>([activeId]);
    const node = graphData.nodes.get(activeId);
    if (node) {
      node.relatedIds.forEach((id) => result.add(id));
    }
    return result;
  }, [graphData.nodes, hoveredNodeId, selectedNodeId]);

  /**
   * 判断连线是否应高亮
   */
  const isEdgeHighlighted = useCallback((sourceId: string, targetId: string): boolean => {
    const activeId = hoveredNodeId ?? selectedNodeId;
    if (!activeId) return false;
    return sourceId === activeId || targetId === activeId;
  }, [hoveredNodeId, selectedNodeId]);

  /**
   * 将屏幕坐标转换为SVG坐标
   */
  const screenToSvg = useCallback((clientX: number, clientY: number): { x: number; y: number } => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const x = (clientX - rect.left - pan.x) / scale;
    const y = (clientY - rect.top - pan.y) / scale;
    return { x, y };
  }, [pan, scale]);

  /**
   * 处理节点拖拽开始
   */
  const handleNodeDragStart = useCallback((nodeId: string, e: React.MouseEvent | React.TouchEvent) => {
    const node = getNodeWithPosition(nodeId);
    if (!node) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const svgPos = screenToSvg(clientX, clientY);

    setDragState({
      nodeId,
      offsetX: svgPos.x - node.x,
      offsetY: svgPos.y - node.y,
    });
    setSelectedNodeId(nodeId);
  }, [getNodeWithPosition, screenToSvg]);

  /**
   * 处理鼠标移动（节点拖拽 + 画布平移）
   */
  const handleMouseMove = useCallback((e: React.MouseEvent | MouseEvent | TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

    if (dragState) {
      const svgPos = screenToSvg(clientX, clientY);
      setNodePositions((prev) => {
        const next = new Map(prev);
        next.set(dragState.nodeId, {
          x: svgPos.x - dragState.offsetX,
          y: svgPos.y - dragState.offsetY,
        });
        return next;
      });
      return;
    }

    if (isPanning && panStartRef.current) {
      const dx = clientX - panStartRef.current.x;
      const dy = clientY - panStartRef.current.y;
      setPan({
        x: panStartRef.current.panX + dx,
        y: panStartRef.current.panY + dy,
      });
    }
  }, [dragState, isPanning, screenToSvg]);

  /**
   * 处理鼠标释放
   */
  const handleMouseUp = useCallback(() => {
    setDragState(null);
    setIsPanning(false);
    panStartRef.current = null;
  }, []);

  /**
   * 处理画布平移开始
   */
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as SVGElement).classList.contains('graph-bg')) {
      setIsPanning(true);
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        panX: pan.x,
        panY: pan.y,
      };
      setSelectedNodeId(null);
    }
  }, [pan]);

  /**
   * 缩放控制
   */
  const handleZoomIn = useCallback(() => {
    setScale((s) => Math.min(s + 0.2, 2.5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((s) => Math.max(s - 0.2, 0.4));
  }, []);

  const handleReset = useCallback(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
    const positions = new Map<string, { x: number; y: number }>();
    graphData.nodes.forEach((node) => {
      positions.set(node.id, { x: node.x, y: node.y });
    });
    setNodePositions(positions);
    setSelectedNodeId(null);
    setHoveredNodeId(null);
  }, [graphData.nodes]);

  /**
   * 滚轮缩放处理
   */
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale((s) => Math.max(0.4, Math.min(2.5, s + delta)));
  }, []);

  /**
   * 全局鼠标事件监听
   */
  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => handleMouseMove(e as unknown as MouseEvent);
    const handleUp = () => handleMouseUp();

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleUp);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const hasData = graphData.nodes.size > 0;

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-navy-100">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-gold text-white">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="6" cy="6" r="3" />
              <circle cx="18" cy="6" r="3" />
              <circle cx="12" cy="18" r="3" />
              <line x1="8.5" y1="7.5" x2="15.5" y2="16.5" />
              <line x1="15.5" y1="7.5" x2="8.5" y2="16.5" />
            </svg>
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-navy-900">回避关系网络图</h3>
            <p className="text-xs text-navy-500">
              共 {judges.length} 位评委 · {teams.filter(t => !t.id.startsWith('__')).length} 支队伍
              {hoveredNodeId || selectedNodeId ? ' · 悬停/点击节点查看关联' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={handleZoomOut} className="p-2 rounded-md text-navy-500 hover:bg-navy-50 hover:text-navy-700 transition-colors" title="缩小">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-medium text-navy-500 w-12 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={handleZoomIn} className="p-2 rounded-md text-navy-500 hover:bg-navy-50 hover:text-navy-700 transition-colors" title="放大">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={handleReset} className="p-2 rounded-md text-navy-500 hover:bg-navy-50 hover:text-navy-700 transition-colors ml-1" title="重置视图">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex">
        <div className="flex-1 relative bg-gradient-to-br from-ivory-50 to-white" style={{ height: 520 }}>
          {!hasData ? (
            <div className="absolute inset-0 flex items-center justify-center text-navy-400 text-sm">
              暂无评委或队伍数据
            </div>
          ) : (
            <svg
              ref={svgRef}
              width="100%"
              height="100%"
              viewBox={`0 0 ${graphData.width} ${graphData.height}`}
              preserveAspectRatio="xMidYMid meet"
              style={{ cursor: isPanning ? 'grabbing' : dragState ? 'grabbing' : 'grab' }}
              onMouseDown={handleCanvasMouseDown}
              onWheel={handleWheel}
              className="graph-bg"
            >
              <rect
                className="graph-bg"
                width={graphData.width}
                height={graphData.height}
                fill="transparent"
              />

              <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
                {graphData.edges.map((edge) => {
                  const sourceNode = getNodeWithPosition(edge.sourceId);
                  const targetNode = getNodeWithPosition(edge.targetId);
                  const highlighted = isEdgeHighlighted(edge.sourceId, edge.targetId);
                  const activeId = hoveredNodeId ?? selectedNodeId;
                  const dimmed = activeId !== null && !highlighted;

                  return (
                    <GraphEdgeComponent
                      key={edge.id}
                      edge={edge}
                      sourceNode={sourceNode}
                      targetNode={targetNode}
                      isHighlighted={highlighted}
                      isDimmed={dimmed}
                    />
                  );
                })}

                {Array.from(graphData.nodes.values()).map((node) => {
                  const posNode = getNodeWithPosition(node.id);
                  if (!posNode) return null;

                  const isHighlighted = highlightedNodeIds.has(node.id);
                  const activeId = hoveredNodeId ?? selectedNodeId;
                  const isDimmed = activeId !== null && !isHighlighted;
                  const isSelected = selectedNodeId === node.id;

                  return (
                    <GraphNodeComponent
                      key={node.id}
                      node={posNode}
                      isHighlighted={isHighlighted}
                      isDimmed={isDimmed}
                      isSelected={isSelected}
                      onMouseEnter={setHoveredNodeId}
                      onMouseLeave={() => setHoveredNodeId(null)}
                      onClick={setSelectedNodeId}
                      onDragStart={handleNodeDragStart}
                    />
                  );
                })}
              </g>
            </svg>
          )}

          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm border border-navy-100">
            <Info className="w-3.5 h-3.5 text-navy-400" />
            <span className="text-[11px] text-navy-500">拖拽节点调整位置 · 拖拽空白平移画布 · 滚轮缩放</span>
          </div>
        </div>

        <div className="w-52 border-l border-navy-100 p-4 bg-navy-50/30">
          <h4 className="text-xs font-semibold text-navy-700 mb-3 uppercase tracking-wider">图例说明</h4>
          <div className="space-y-2.5">
            {legendItems.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                {item.isNode ? (
                  <div
                    className="w-4 h-4 rounded-full border-2 flex-shrink-0"
                    style={{ borderColor: item.color, backgroundColor: `${item.color}20` }}
                  />
                ) : (
                  <svg width="24" height="8" className="flex-shrink-0">
                    <line
                      x1="0" y1="4" x2="24" y2="4"
                      stroke={item.color}
                      strokeWidth="2"
                      strokeDasharray={item.dash}
                      strokeLinecap="round"
                    />
                  </svg>
                )}
                <span className="text-xs text-navy-600">{item.label}</span>
              </div>
            ))}
          </div>

          {(hoveredNodeId || selectedNodeId) && (() => {
            const nodeId = hoveredNodeId ?? selectedNodeId;
            const node = getNodeWithPosition(nodeId!);
            if (!node) return null;

            const typeLabel = {
              judge: '评委',
              institution: '机构',
              team: '队伍',
              player: '选手',
            }[node.type];

            const relatedCount = node.relatedIds.size;

            return (
              <div className="mt-5 pt-4 border-t border-navy-200">
                <h4 className="text-xs font-semibold text-navy-700 mb-2">当前选中</h4>
                <div className="bg-white rounded-lg p-3 border border-navy-100">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: node.color }} />
                    <span className="text-sm font-semibold text-navy-900">{node.label}</span>
                  </div>
                  <p className="text-[11px] text-navy-500">{typeLabel} · {relatedCount} 个关联</p>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default AvoidanceRelationalGraph;
