// src/components/ai/TaskBoard.tsx
import { CheckCircle2, Circle } from 'lucide-react';

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

  return (
    <div className='bg-zinc-50 border border-zinc-200 rounded-xl p-4 my-4 font-sans shadow-sm'>
      <div className='flex items-center justify-between mb-4 pb-2 border-b border-zinc-200'>
        <h3 className='font-semibold text-zinc-800 flex items-center gap-2'>
          <span>📋</span> AI 生成任务看板
        </h3>
        <span className='text-xs font-medium text-zinc-500 bg-zinc-200/50 px-2 py-1 rounded-full'>
          {doneCount} / {normalizedTasks.length}
        </span>
      </div>

      <div className='space-y-2'>
        {normalizedTasks.map((task) => (
          <div
            key={task.id}
            // ✨ 4. 绑定点击事件，并加上鼠标手势
            onClick={() => toggleTaskStatus(task.id)}
            className={`flex items-start gap-3 p-2.5 rounded-lg transition-colors cursor-pointer ${
              task.status === 'done'
                ? 'bg-zinc-100/50'
                : 'bg-white border border-zinc-100 shadow-sm hover:border-indigo-200'
            }`}
          >
            {task.status === 'done' ? (
              <CheckCircle2 className='w-5 h-5 text-emerald-500 shrink-0 mt-0.5' />
            ) : (
              <Circle className='w-5 h-5 text-zinc-300 shrink-0 mt-0.5' />
            )}
            <span
              className={`text-sm leading-relaxed ${
                task.status === 'done'
                  ? 'text-zinc-400 line-through'
                  : 'text-zinc-700'
              }`}
            >
              {task.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
