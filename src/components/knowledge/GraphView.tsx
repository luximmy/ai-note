'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCollide,
  Simulation,
  SimulationNodeDatum,
  ForceLink,
} from 'd3-force';
import { GraphData, GraphNode } from '@/types';

interface SimNode extends GraphNode, SimulationNodeDatum {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface SimLink {
  source: string | SimNode;
  target: string | SimNode;
}

interface GraphViewProps {
  data: GraphData;
}

function nodeRadius(d: SimNode): number {
  return 8 + Math.sqrt(d.backlinkCount) * 6;
}

export function GraphView({ data }: GraphViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    // Transform state for zoom & pan
    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;

    // Drag state
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragStartOffsetX = 0;
    let dragStartOffsetY = 0;
    let pointerMoved = false;

    let currentWidth = 0;
    let currentHeight = 0;
    let finalFitDone = false;

    // Deep copy to avoid mutating props
    const nodes: SimNode[] = data.nodes.map((n) => ({ ...n }));
    const links: SimLink[] = data.edges.map((e) => ({
      source: e.source,
      target: e.target,
    }));

    // Set initial dimensions from container
    const initRect = container.getBoundingClientRect();
    currentWidth = initRect.width || 800;
    currentHeight = initRect.height || 600;
    canvas.width = currentWidth * dpr;
    canvas.height = currentHeight * dpr;
    canvas.style.width = `${currentWidth}px`;
    canvas.style.height = `${currentHeight}px`;

    // Set initial centering offset so graph appears in the middle
    offsetX = currentWidth / 2;
    offsetY = currentHeight / 2;

    // Simulation without forceCenter — nodes start near origin (0,0)
    const simulation: Simulation<SimNode, SimLink> = forceSimulation(nodes)
      .force(
        'link',
        (forceLink(links) as ForceLink<SimNode, SimLink>)
          .id((d: SimNode) => d.id)
          .distance(120),
      )
      .force('charge', forceManyBody().strength(-300))
      .force(
        'collide',
        forceCollide<SimNode>().radius((d) => nodeRadius(d) + 10),
      );

    function draw() {
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, currentWidth, currentHeight);

      ctx!.save();
      ctx!.translate(offsetX, offsetY);
      ctx!.scale(scale, scale);

      // Draw edges
      ctx!.strokeStyle = '#d4d4d8';
      ctx!.lineWidth = 1.5;
      for (const link of links) {
        const sx = (link.source as SimNode).x;
        const sy = (link.source as SimNode).y;
        const tx = (link.target as SimNode).x;
        const ty = (link.target as SimNode).y;
        if (sx == null || sy == null || tx == null || ty == null) continue;

        ctx!.beginPath();
        ctx!.moveTo(sx, sy);
        ctx!.lineTo(tx, ty);
        ctx!.stroke();
      }

      // Draw nodes
      for (const node of nodes) {
        if (node.x == null || node.y == null) continue;
        const r = nodeRadius(node);

        ctx!.beginPath();
        ctx!.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx!.fillStyle = '#6366f1';
        ctx!.fill();
        ctx!.strokeStyle = '#fff';
        ctx!.lineWidth = 2;
        ctx!.stroke();

        ctx!.font = '12px sans-serif';
        ctx!.fillStyle = '#18181b';
        ctx!.textAlign = 'center';
        const label =
          node.emoji +
          ' ' +
          (node.title.length > 10
            ? node.title.slice(0, 10) + '...'
            : node.title);
        ctx!.fillText(label, node.x, node.y + r + 16);
      }

      ctx!.restore();
    }

    simulation.on('tick', () => {
      draw();
    });

    // Auto-fit once when simulation has nearly stopped (nodes settled)
    simulation.on('end', () => {
      if (!finalFitDone) {
        finalFitDone = true;
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const node of nodes) {
          if (node.x == null || node.y == null) continue;
          minX = Math.min(minX, node.x);
          maxX = Math.max(maxX, node.x);
          minY = Math.min(minY, node.y);
          maxY = Math.max(maxY, node.y);
        }
        if (minX !== Infinity) {
          const gw = maxX - minX || 1;
          const gh = maxY - minY || 1;
          const gcx = (minX + maxX) / 2;
          const gcy = (minY + maxY) / 2;
          const padFactor = 0.8;
          scale = Math.min(
            (currentWidth * padFactor) / gw,
            (currentHeight * padFactor) / gh,
            2,
          );
          offsetX = currentWidth / 2 - gcx * scale;
          offsetY = currentHeight / 2 - gcy * scale;
          draw();
        }
      }
    });

    // --- ResizeObserver: only resize canvas, no simulation restart ---
    let resizeTimer: ReturnType<typeof setTimeout>;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0 && (Math.abs(w - currentWidth) > 2 || Math.abs(h - currentHeight) > 2)) {
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(() => {
            // Calculate old center position in graph space
            const oldCenterGX = (currentWidth / 2 - offsetX) / scale;
            const oldCenterGY = (currentHeight / 2 - offsetY) / scale;

            currentWidth = w;
            currentHeight = h;
            canvas!.width = w * dpr;
            canvas!.height = h * dpr;
            canvas!.style.width = `${w}px`;
            canvas!.style.height = `${h}px`;

            // Keep the same graph point at the center of the new canvas
            offsetX = currentWidth / 2 - oldCenterGX * scale;
            offsetY = currentHeight / 2 - oldCenterGY * scale;

            draw();
          }, 100);
        }
      }
    });
    ro.observe(container);

    // --- Wheel zoom ---
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas!.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      const newScale = Math.max(0.1, Math.min(10, scale * factor));

      offsetX = mx - (mx - offsetX) * (newScale / scale);
      offsetY = my - (my - offsetY) * (newScale / scale);
      scale = newScale;

      draw();
    };
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    // --- Pointer drag pan ---
    const handlePointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      isDragging = true;
      pointerMoved = false;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      dragStartOffsetX = offsetX;
      dragStartOffsetY = offsetY;
      canvas!.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        pointerMoved = true;
      }
      offsetX = dragStartOffsetX + dx;
      offsetY = dragStartOffsetY + dy;
      draw();
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!isDragging) return;
      isDragging = false;
      canvas!.releasePointerCapture(e.pointerId);

      if (!pointerMoved) {
        const rect = canvas!.getBoundingClientRect();
        const mx = (e.clientX - rect.left - offsetX) / scale;
        const my = (e.clientY - rect.top - offsetY) / scale;

        for (const node of nodes) {
          if (node.x == null || node.y == null) continue;
          const r = nodeRadius(node);
          const dx = mx - node.x;
          const dy = my - node.y;
          if (dx * dx + dy * dy < r * r) {
            router.push(`/app/note/${node.id}`);
            return;
          }
        }
      }
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);

    return () => {
      simulation.stop();
      ro.disconnect();
      clearTimeout(resizeTimer);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
    };
  }, [data, router]);

  return (
    <div ref={containerRef} className='w-full h-full min-h-[400px]'>
      <canvas
        ref={canvasRef}
        className='w-full h-full border border-zinc-200 rounded-xl bg-white cursor-grab active:cursor-grabbing'
      />
    </div>
  );
}
