// src/app/api/chat/route.ts
import { createOpenAI } from '@ai-sdk/openai';
import {
  streamText,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from 'ai';
import { keywordSearch } from '@/lib/retrieval';
import { getAllDocumentsWithBlocks } from '@/db/queries';

export const maxDuration = 30;

const deepseek = createOpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

export async function POST(req: Request) {
  try {
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

    const allDocs = await getAllDocumentsWithBlocks();
    const sources = await keywordSearch(query, allDocs, 5);

    // 2. Build sources context for the system prompt
    const sourcesContext =
      sources.length > 0
        ? `\n\n【检索到的相关知识片段】\n以下是通过关键词检索找到的相关笔记内容，请优先参考这些内容回答，并在引用时使用对应的编号标记 [1], [2] 等：\n${sources.map((s, i) => `[${i + 1}] 来源：《${s.noteTitle}》\n${s.content}`).join('\n\n')}`
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
当用户要求你生成"任务看板"、"待办清单"、"计划表"等结构化任务视图时，请放弃使用普通 Markdown 列表，而是严格按照以下 JSON 格式返回一个代码块：
\`\`\`json
{
  "componentId": "TaskBoard",
  "props": {
    "tasks": [
      { "id": "1", "title": "任务名称", "status": "todo" },
      { "id": "2", "title": "另一个任务", "status": "in-progress" }
    ]
  }
}
\`\`\`
注意：任务的 status 只能是 "todo", "in-progress", 或 "done"。
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
