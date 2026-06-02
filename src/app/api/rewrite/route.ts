// src/app/api/rewrite/route.ts
import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { getSession } from '@/lib/auth';

export const runtime = 'edge';
export const maxDuration = 30;

const deepseek = createOpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return new Response(JSON.stringify({ error: '未登录' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 接收要修改的文本、指令动作（如”扩写”）、以及当前笔记上下文
    const { text, instruction, context } = await req.json();

    const systemPrompt = `
      你是一个专业的 AI 写作与排版助手。你的任务是严格根据用户的指令，对提供的选中文本进行处理。
      
      【最严格指令 - 绝对遵守】
      1. 你必须直接输出修改后的最终文本。
      2. 绝对不允许包含任何解释、客套话、开场白（如"好的"、"修改如下"）。
      3. 绝对不允许使用 markdown 代码块包裹你的输出（例如不要用 \`\`\` 包裹）。
      4. 保持语言风格与源文本或指令的要求一致。
      
      ${context ? `【参考上下文】\n为了确保用词准确，请参考用户当前正在编辑的文档上下文：\n${context}` : ''}
    `;

    const result = streamText({
      model: deepseek.chat('deepseek-v4-flash'),
      system: systemPrompt,
      prompt: `【指令】：${instruction}\n\n【需要处理的选中文本】：\n${text}`,
      // 降低温度，让 AI 的修改更稳定、更符合上下文
      temperature: 0.3,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('AI Rewrite API 异常:', error);
    return new Response(JSON.stringify({ error: 'AI 重写服务调用失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
