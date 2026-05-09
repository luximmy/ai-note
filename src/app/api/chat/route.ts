// src/app/api/chat/route.ts
import { createOpenAI } from '@ai-sdk/openai';
import { streamText, convertToModelMessages } from 'ai';

export const maxDuration = 30;

const deepseek = createOpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { messages, noteContext } = await req.json();

    const systemPrompt = `
      你是一个名为 Insight Note 的 AI Copilot。
      你的任务是协助用户进行思考、扩展写作、总结内容以及生成结构化的模块。
      ${noteContext ? `\n用户当前正在查看的笔记内容如下：\n${noteContext}\n请结合上述内容进行回答。` : ''}
    `;

    const modelMessages = await convertToModelMessages(messages);

    const result = streamText({
      model: deepseek.chat('deepseek-v4-flash'),
      system: systemPrompt,
      messages: modelMessages,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('AI API 路由异常:', error);
    return new Response('API 请求失败', { status: 500 });
  }
}
