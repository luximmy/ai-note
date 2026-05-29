// src/app/api/generate-ui/route.ts
import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
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

    const { prompt, noteContext } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return new Response(
        JSON.stringify({ error: '缺少 prompt 参数' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const systemPrompt = `你是一个专业的 AI 组件生成器。你的任务是根据用户的描述，生成一个可交互的 React 组件的 JSON 配置。

【严格输出格式】
你必须且只能输出一个 JSON 代码块，格式如下：
\`\`\`json
{
  "componentId": "组件类型",
  "props": { ... }
}
\`\`\`

【可用的组件类型】

1. **TaskBoard** — 任务看板
   - 适用场景：任务清单、待办事项、项目计划、工作安排
   - props 格式：
     {
       "tasks": [
         { "id": "1", "title": "任务名称", "status": "todo" },
         { "id": "2", "title": "进行中的任务", "status": "in-progress" },
         { "id": "3", "title": "已完成的任务", "status": "done" }
       ]
     }
   - status 只能是 "todo", "in-progress", 或 "done"

2. **DataTable** — 数据表格
   - 适用场景：数据对比、信息整理、规格说明、优缺点分析
   - props 格式：
     {
       "title": "表格标题（可选）",
       "columns": ["列名1", "列名2", "列名3"],
       "rows": [
         ["值1", "值2", "值3"],
         ["值4", "值5", "值6"]
       ]
     }

3. **MermaidDiagram** — 流程图/思维导图
   - 适用场景：流程说明、架构图、思维导图、关系图、时序图
   - props 格式：
     {
       "title": "图表标题（可选）",
       "code": "graph TD\\n    A[开始] --> B[处理]\\n    B --> C[结束]"
     }
   - code 必须是有效的 Mermaid 语法
   - 支持的图表类型：graph（流程图）、mindmap（思维导图）、sequenceDiagram（时序图）、classDiagram（类图）、stateDiagram（状态图）

4. **Timeline** — 时间线
   - 适用场景：历史事件、项目里程碑、学习路线、计划安排
   - props 格式：
     {
       "title": "时间线标题（可选）",
       "events": [
         { "date": "2024-01", "title": "事件标题", "description": "详细描述（可选）" },
         { "date": "2024-02", "title": "事件标题", "description": "详细描述" }
       ]
     }

【选择组件的规则】
- 如果用户描述的是"任务"、"待办"、"计划"、"清单" → TaskBoard
- 如果用户描述的是"表格"、"对比"、"数据"、"分析" → DataTable
- 如果用户描述的是"流程"、"架构"、"思维导图"、"关系"、"图" → MermaidDiagram
- 如果用户描述的是"时间线"、"历史"、"里程碑"、"路线"、"步骤" → Timeline
- 如果不确定，优先使用 TaskBoard

【绝对禁止】
1. 不要输出任何解释文字，只输出 JSON 代码块
2. 不要使用 markdown 代码块包裹 JSON（不要用 \`\`\` 包裹）
3. 不要输出多个 JSON 对象
4. 确保 JSON 格式正确，可以被 JSON.parse 解析

${noteContext ? `【参考上下文】\n用户当前正在编辑的笔记内容：\n${noteContext}\n请结合上述内容生成相关组件。` : ''}`;

    const result = streamText({
      model: deepseek.chat('deepseek-v4-flash'),
      system: systemPrompt,
      prompt,
      temperature: 0.3,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Generative UI API 异常:', error);
    return new Response(
      JSON.stringify({ error: 'AI 组件生成服务调用失败' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
