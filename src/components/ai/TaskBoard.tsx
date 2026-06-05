// src/components/ai/TaskBoard.tsx
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

interface Task {
  id: string | number;
  title: string;
  status: 'todo' | 'in-progress' | 'done';
}

const taskStatuses = ['todo', 'in-progress', 'done'] as const;

function isTaskStatus(value: unknown): value is Task['status'] {
  return (
    typeof value === 'string' && taskStatuses.includes(value as Task['status'])
  );
}

function normalizeTasks(value: unknown): Task[] {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is Task => {
    if (!item || typeof item !== 'object') return false;

    const task = item as Partial<Task>;
    const hasValidId =
      typeof task.id === 'string' || typeof task.id === 'number';

    return (
      hasValidId && typeof task.title === 'string' && isTaskStatus(task.status)
    );
  });
}

export function TaskBoard({
  tasks,
  onUpdateProps,
}: {
  tasks?: unknown;
  onUpdateProps?: (props: Record<string, unknown>) => void; // ✨ 接收更新回调
}) {
  const normalizedTasks = normalizeTasks(tasks);

  // ✨ 2. 实现点击切换逻辑
  const toggleTaskStatus = (taskId: string | number) => {
    const newTasks = normalizedTasks.map((task) => {
      if (task.id === taskId) {
        // 循环切换状态：todo -> in-progress -> done -> todo
        const statusMap = {
          todo: 'in-progress',
          'in-progress': 'done',
          done: 'todo',
        } as const;
        const nextStatus = statusMap[task.status];
        return { ...task, status: nextStatus };
      }
      return task;
    });

    // ✨ 3. 通知编辑器框架保存新状态
    onUpdateProps?.({ tasks: newTasks });
  };

  const doneCount = normalizedTasks.filter((t) => t.status === 'done').length;
  const inProgressCount = normalizedTasks.filter(
    (t) => t.status === 'in-progress'
  ).length;

  const statusConfig = {
    todo: {
      icon: <Circle className='w-5 h-5 text-muted-foreground/50 shrink-0 mt-0.5' />,
      itemClass: 'bg-background border border-border shadow-sm hover:border-primary/30',
      textClass: 'text-foreground',
    },
    'in-progress': {
      icon: <Loader2 className='w-5 h-5 text-blue-500 shrink-0 mt-0.5 animate-spin' />,
      itemClass:
        'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 shadow-sm hover:border-blue-400',
      textClass: 'text-foreground',
    },
    done: {
      icon: <CheckCircle2 className='w-5 h-5 text-emerald-500 shrink-0 mt-0.5' />,
      itemClass: 'bg-secondary/50',
      textClass: 'text-muted-foreground line-through',
    },
  } as const;

  return (
    <div className='bg-muted border border-border rounded-xl p-4 my-4 font-sans shadow-sm'>
      <div className='flex items-center justify-between mb-4 pb-2 border-b border-border'>
        <h3 className='font-semibold text-foreground flex items-center gap-2'>
          <span>📋</span> AI 生成任务看板
        </h3>
        <span className='text-xs font-medium text-muted-foreground bg-secondary px-2 py-1 rounded-full'>
          {doneCount} done{inProgressCount > 0 && ` · ${inProgressCount} in progress`} · {normalizedTasks.length} total
        </span>
      </div>

      <div className='space-y-2'>
        {normalizedTasks.map((task) => {
          const config = statusConfig[task.status];
          return (
            <div
              key={task.id}
              onClick={() => toggleTaskStatus(task.id)}
              className={`flex items-start gap-3 p-2.5 rounded-lg transition-colors cursor-pointer ${config.itemClass}`}
            >
              {config.icon}
              <span className={`text-sm leading-relaxed ${config.textClass}`}>
                {task.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
