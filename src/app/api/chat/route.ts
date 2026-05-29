// src/app/api/chat/route.ts
import { createOpenAI } from '@ai-sdk/openai';
import {
  streamText,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from 'ai';
import { searchNotes } from '@/lib/retrieval';
import { getSession } from '@/lib/auth';

export const maxDuration = 30;

const deepseek = createOpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return new Response(
        JSON.stringify({ error: '未登录' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const { messages, noteContext } = await req.json();

    // 1. RAG: Extract query from last user message and search across all notes
    const lastUserMessage = [...messages]
      .reverse()
      .find((m: { role: string }) => m.role === 'user');
    const query =
      lastUserMessage?.parts
        ?.filter((p: { type: string }) => p.type === 'text')
        .map((p: { text: string }) => p.text)
        .join(' ') || '';

    const sources = await searchNotes(query, 5);

    // 2. Build sources context for the system prompt
    const sourcesContext =
      sources.length > 0
        ? `\n\n【检索到的相关知识片段】\n以下是通过语义检索找到的相关笔记内容，请优先参考这些内容回答，并在引用时使用对应的编号标记 [1], [2] 等：\n${sources.map((s, i) => `[${i + 1}] 来源：《${s.noteTitle}》\n${s.content}`).join('\n\n')}`
        : '';

    const citationRules = `\n\n【引用规则】
当你参考了检索到的知识片段时，请在相关句子末尾使用 [数字] 标记引用来源。
例如："React 19 推荐使用 useOptimistic 处理离散原子操作 [2]。"
只引用你实际参考了的片段，不要凭空编造引用编号。
如果没有检索到相关内容，正常回答即可，不需要引用标记。`;

    const systemPrompt = `你是一个名为 Insight Note 的 AI Copilot。
你的任务是协助用户进行思考、扩展写作、总结内容以及生成结构化的模块。
${sourcesContext}
${citationRules}

【重要能力：生成交互式组件】
当用户要求你生成结构化内容时，请优先使用以下 JSON 格式返回代码块，而不是普通 Markdown 列表。

可用的组件类型：

1. **TaskBoard** — 任务看板（任务清单、待办事项、项目计划）
\`\`\`json
{
  "componentId": "TaskBoard",
  "props": {
    "tasks": [
      { "id": "1", "title": "任务名称", "status": "todo" },
      { "id": "2", "title": "进行中的任务", "status": "in-progress" },
      { "id": "3", "title": "已完成的任务", "status": "done" }
    ]
  }
}
\`\`\`
status 只能是 "todo", "in-progress", 或 "done"。

2. **DataTable** — 数据表格（数据对比、信息整理、规格说明）
\`\`\`json
{
  "componentId": "DataTable",
  "props": {
    "title": "表格标题",
    "columns": ["列名1", "列名2", "列名3"],
    "rows": [
      ["值1", "值2", "值3"],
      ["值4", "值5", "值6"]
    ]
  }
}
\`\`\`

3. **MermaidDiagram** — 流程图/思维导图（流程说明、架构图、关系图）
\`\`\`json
{
  "componentId": "MermaidDiagram",
  "props": {
    "title": "图表标题",
    "code": "graph TD\\n    A[开始] --> B[处理]\\n    B --> C[结束]"
  }
}
\`\`\`
code 必须是有效的 Mermaid 语法（graph/mindmap/sequenceDiagram 等）。

4. **Timeline** — 时间线（历史事件、项目里程碑、学习路线）
\`\`\`json
{
  "componentId": "Timeline",
  "props": {
    "title": "时间线标题",
    "events": [
      { "date": "2024-01", "title": "事件标题", "description": "详细描述" },
      { "date": "2024-02", "title": "事件标题", "description": "详细描述" }
    ]
  }
}
\`\`\`

【选择组件的规则】
- "任务"、"待办"、"计划"、"清单" → TaskBoard
- "表格"、"对比"、"数据"、"分析" → DataTable
- "流程"、"架构"、"思维导图"、"关系"、"图" → MermaidDiagram
- "时间线"、"历史"、"里程碑"、"路线"、"步骤" → Timeline
- 如果不确定，优先使用 TaskBoard
- 如果用户没有明确要求生成组件，正常用 Markdown 回答即可
${noteContext ? `\n用户当前正在查看的笔记内容如下：\n${noteContext}\n请结合上述内容进行回答。` : ''}`;

    const modelMessages = await convertToModelMessages(messages);

    // 3. Stream with citations injected as a data part
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        const result = streamText({
          model: deepseek.chat('deepseek-v4-flash'),
          system: systemPrompt,
          messages: modelMessages,
        });

        writer.merge(result.toUIMessageStream());
        writer.write({ type: 'data-citations', data: sources });
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    console.error('AI API 路由异常:', error);
    return new Response(
      JSON.stringify({ error: 'AI 服务调用失败，请检查网络或 API Key' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
