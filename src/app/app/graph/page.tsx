'use client';

import { useEffect, useState } from 'react';
import { getGraphData } from '@/actions/note';
import { GraphView } from '@/components/knowledge/GraphView';
import { GraphData } from '@/types';

export default function GraphPage() {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    getGraphData()
      .then((d) => { setData(d); setError(false); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [retryCount]);

  if (loading) {
    return (
      <div className='flex items-center justify-center h-full text-zinc-500'>
        加载图谱数据...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className='flex flex-col items-center justify-center h-full gap-3'>
        <p className='text-red-500 text-sm'>图谱数据加载失败</p>
        <button
          type='button'
          onClick={() => {
            setLoading(true);
            setError(false);
            setRetryCount((c) => c + 1);
          }}
          className='text-sm text-indigo-500 hover:text-indigo-700 underline'
        >
          重试
        </button>
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
