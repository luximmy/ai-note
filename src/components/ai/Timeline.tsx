// src/components/ai/Timeline.tsx
import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface TimelineEvent {
  date: string;
  title: string;
  description?: string;
}

interface TimelineProps {
  title?: string;
  events?: unknown;
  onUpdateProps?: (props: Record<string, unknown>) => void;
}

function normalizeEvents(value: unknown): TimelineEvent[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is TimelineEvent => {
    if (!item || typeof item !== 'object') return false;
    const evt = item as Partial<TimelineEvent>;
    return typeof evt.date === 'string' && typeof evt.title === 'string';
  });
}

export function Timeline({ title, events: rawEvents }: TimelineProps) {
  const events = normalizeEvents(rawEvents);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (events.length === 0) {
    return (
      <div className='my-4 p-4 rounded-xl border border-border bg-muted text-muted-foreground text-sm'>
        暂无时间线数据
      </div>
    );
  }

  return (
    <div className='my-4 rounded-xl border border-border bg-muted overflow-hidden font-sans shadow-sm'>
      {/* Header */}
      <div className='flex items-center justify-between px-4 py-3 border-b border-border'>
        <h3 className='font-semibold text-foreground flex items-center gap-2 text-sm'>
          <span>📅</span>
          {title || 'AI 生成时间线'}
        </h3>
        <span className='text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full'>
          {events.length} 个事件
        </span>
      </div>

      {/* Timeline */}
      <div className='p-4 bg-background/50'>
        <div className='relative'>
          {/* Vertical line */}
          <div className='absolute left-[11px] top-2 bottom-2 w-0.5 bg-border' />

          <div className='space-y-1'>
            {events.map((event, index) => {
              const isExpanded = expandedIndex === index;
              const hasDescription = event.description && event.description.trim();

              return (
                <div key={index} className='relative flex gap-3'>
                  {/* Dot */}
                  <div className='relative z-10 mt-2.5'>
                    <div
                      className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center transition-colors ${
                        isExpanded
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-background'
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full transition-colors ${
                          isExpanded ? 'bg-primary' : 'bg-muted-foreground/30'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Content */}
                  <div className='flex-1 pb-3'>
                    <button
                      onClick={() =>
                        setExpandedIndex(isExpanded ? null : index)
                      }
                      className='w-full text-left group'
                    >
                      <div className='flex items-center gap-2'>
                        <span className='text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded'>
                          {event.date}
                        </span>
                        <span className='text-sm font-medium text-foreground group-hover:text-primary transition-colors'>
                          {event.title}
                        </span>
                        {hasDescription && (
                          <span className='ml-auto shrink-0'>
                            {isExpanded ? (
                              <ChevronDown className='h-3.5 w-3.5 text-muted-foreground' />
                            ) : (
                              <ChevronRight className='h-3.5 w-3.5 text-muted-foreground' />
                            )}
                          </span>
                        )}
                      </div>
                    </button>

                    {isExpanded && hasDescription && (
                      <div className='mt-2 text-xs text-muted-foreground leading-relaxed pl-0'>
                        {event.description}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
