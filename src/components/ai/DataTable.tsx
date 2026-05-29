// src/components/ai/DataTable.tsx
import { useState, useMemo } from 'react';
import { ArrowUpDown, Search } from 'lucide-react';

interface DataTableProps {
  title?: string;
  columns?: unknown;
  rows?: unknown;
  onUpdateProps?: (props: Record<string, unknown>) => void;
}

function normalizeColumns(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}

function normalizeRows(value: unknown): string[][] {
  if (!Array.isArray(value)) return [];
  return value.filter((row): row is string[] => {
    if (!Array.isArray(row)) return false;
    return row.every((cell) => typeof cell === 'string');
  });
}

export function DataTable({
  title,
  columns: rawColumns,
  rows: rawRows,
}: DataTableProps) {
  const columns = normalizeColumns(rawColumns);
  const rows = normalizeRows(rawRows);

  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [search, setSearch] = useState('');

  const handleSort = (colIndex: number) => {
    if (sortCol === colIndex) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(colIndex);
      setSortDir('asc');
    }
  };

  const filteredAndSortedRows = useMemo(() => {
    let result = [...rows];

    // 搜索过滤
    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter((row) =>
        row.some((cell) => cell.toLowerCase().includes(query)),
      );
    }

    // 排序
    if (sortCol !== null) {
      result.sort((a, b) => {
        const aVal = a[sortCol] || '';
        const bVal = b[sortCol] || '';
        const cmp = aVal.localeCompare(bVal, 'zh-CN');
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [rows, search, sortCol, sortDir]);

  if (columns.length === 0) {
    return (
      <div className='my-4 p-4 rounded-xl border border-border bg-muted text-muted-foreground text-sm'>
        暂无数据
      </div>
    );
  }

  return (
    <div className='my-4 rounded-xl border border-border bg-muted overflow-hidden font-sans shadow-sm'>
      {/* Header */}
      <div className='flex items-center justify-between px-4 py-3 border-b border-border'>
        <h3 className='font-semibold text-foreground flex items-center gap-2 text-sm'>
          <span>📊</span>
          {title || 'AI 生成数据表格'}
        </h3>
        <span className='text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full'>
          {filteredAndSortedRows.length} 行
        </span>
      </div>

      {/* Search */}
      <div className='px-4 py-2 border-b border-border bg-background/50'>
        <div className='relative'>
          <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground' />
          <input
            type='text'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='搜索...'
            className='w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/30'
          />
        </div>
      </div>

      {/* Table */}
      <div className='overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b border-border bg-background/30'>
              {columns.map((col, i) => (
                <th
                  key={i}
                  onClick={() => handleSort(i)}
                  className='px-4 py-2.5 text-left font-medium text-muted-foreground text-xs cursor-pointer hover:text-foreground transition-colors select-none'
                >
                  <div className='flex items-center gap-1.5'>
                    <span>{col}</span>
                    <ArrowUpDown className='h-3 w-3 opacity-40' />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className='px-4 py-8 text-center text-muted-foreground text-xs'
                >
                  {search ? '没有匹配的结果' : '暂无数据'}
                </td>
              </tr>
            ) : (
              filteredAndSortedRows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className='border-b border-border last:border-b-0 hover:bg-accent/50 transition-colors'
                >
                  {columns.map((_, colIndex) => (
                    <td
                      key={colIndex}
                      className='px-4 py-2.5 text-foreground text-xs'
                    >
                      {row[colIndex] || ''}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
