'use client';

import { useEffect, useState } from 'react';
import { getGraphData } from '@/actions/note';
import { GraphView } from '@/components/knowledge/GraphView';
import { GraphData } from '@/types';

export default function GraphPage() {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGraphData()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className='flex items-center justify-center h-full text-zinc-500'>
        加载图谱数据...
      </div>
    );
  }

  if (!data) {
    return (
      <div className='flex items-center justify-center h-full text-red-500'>
        图谱数据加载失败。
      </div>
    );
  }

  return (
    <div className='h-full flex flex-col'>
      <div className='mb-4 shrink-0'>
        <h1 className='text-2xl font-bold text-zinc-900'>知识图谱</h1>
        <p className='text-sm text-zinc-500 mt-1'>
          {data.nodes.length} 篇笔记, {data.edges.length} 条链接 — 点击节点跳转
        </p>
      </div>
      <div className='flex-1 min-h-0'>
        <GraphView data={data} />
      </div>
    </div>
  );
}
