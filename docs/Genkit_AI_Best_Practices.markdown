# 使用 Firebase Genkit 和 Node.js 开发 AI 功能的最佳实践

本文档总结了使用 **Firebase Genkit** 和 **Node.js** 开发 AI 驱动应用的最佳实践，重点针对以下四种 AI 角色：功能路由器、情境对话伙伴、内容分析师和创意建议者。这些实践基于 Genkit 官方文档和其他权威资源，旨在帮助开发者高效构建 AI 功能，同时确保代码可维护性和性能优化。

## 通用最佳实践

在开发 AI 应用时，以下通用实践适用于 Firebase 和 Node.js 环境：

| **实践** | **描述** | **示例/说明** |
|----------|----------|---------------|
| **环境变量管理** | 使用环境变量存储 API 密钥和其他敏感信息，确保安全性。 | 设置 `GEMINI_API_KEY` 环境变量以访问 Gemini API。 |
| **TypeScript 使用** | 利用 TypeScript 的类型安全特性，减少运行时错误。 | Genkit 示例代码广泛使用 TypeScript，例如定义工具的输入模式。 |
| **异步操作优化** | 使用 `async/await` 处理 AI API 调用等异步操作，确保性能。 | 例如，`await ai.generate()` 用于等待模型响应。 |
| **缓存机制** | 利用 Genkit 的上下文缓存功能，减少重复任务的延迟。 | Gemini 模型支持上下文缓存，适用于频繁引用的长文本。 |

这些实践为所有 AI 角色提供了坚实的基础，确保开发过程安全、高效且可扩展。

## AI 作为功能路由器

**需求**：AI 需要理解用户指令（如“我要打卡”或“看社群”），并通过调用内部函数或 API 响应，以 UI 卡片或页面跳转的形式呈现，而不是文本回复。

### 最佳实践

1. **在 Next.js 中设置 API 路由**
   - 在 Next.js 项目中为 Genkit 流（flows）创建 API 路由，以暴露 AI 功能。
   - 示例：在 `pages/api/menuSuggestion.ts` 中定义路由，调用 `menuSuggestionFlow`。
   - 代码示例：
     ```javascript
     import { menuSuggestionFlow } from '@/genkit/menuSuggestionFlow';
     export default async function handler(req, res) {
       const result = await menuSuggestionFlow(req.body);
       res.status(200).json(result);
     }
     ```

2. **使用 Genkit 客户端 SDK 调用流**
   - 在前端使用 `@genkit-ai/next` 提供的 `runFlow`（非流式）或 `streamFlow`（流式）函数调用后端流。
   - 示例：
     ```javascript
     import { runFlow } from '@genkit-ai/next/client';
     import { menuSuggestionFlow } from '@/genkit/menuSuggestionFlow';
     async function getMenuItem(formData) {
       const theme = formData.get('theme')?.toString() ?? '';
       const result = await runFlow<typeof menuSuggestionFlow>({ url: '/api/menuSuggestion', input: { theme } });
       return result.menuItem;
     }
     ```

3. **定义和使用工具以强制功能调用**
   - 使用 `ai.defineTool()` 定义工具，指定名称、描述和输入模式。
   - 在 `ai.generate()` 中通过 `tools` 参数强制模型调用特定工具，而不是生成文本。
   - 示例：
     ```javascript
     import { ai, z } from 'genkit';
     const getWeather = ai.defineTool({
       name: 'getWeather',
       description: 'Get the weather for a location',
       inputSchema: z.object({ location: z.string() })
     });
     const response = await ai.generate({
       prompt: 'What is the weather in Baltimore?',
       tools: [getWeather]
     });
     ```
   - **注意**：确保模型支持工具调用（检查 `info.supports.tools` 属性）。

4. **工具调用与文本生成的权衡**
   - 当信息可以通过简单函数调用或数据库查询获取时，优先使用工具调用。
   - 对于需要处理大量或模糊信息的场景，考虑使用检索增强生成（RAG）。
   - 示例：对于“查看社群”指令，工具调用可直接查询数据库，而 RAG 适合分析大量帖子内容。

**资源**：
- [Genkit Next.js 集成](https://genkit.dev/docs/nextjs/)
- [Genkit 工具调用](https://genkit.dev/docs/tool-calling/)

## AI 作为情境对话伙伴

**需求**：AI 需要具备上下文记忆能力，支持多轮对话。例如，用户询问“给我推荐几本书”，随后问“哪本最适合初学者？”，AI 需理解上下文。

### 最佳实践

1. **使用 Genkit 聊天 API**
   - 使用 `ai.chat()` 方法处理多轮对话，自动从存储中检索和维护对话历史。
   - 示例：
     ```javascript
     import { ai } from 'genkit';
     const response = await ai.chat({
       model: 'googleai/gemini-2.5-flash',
       messages: [{ role: 'user', content: 'Recommend some books' }]
     });
     ```

2. **管理会话状态**
   - 通过 `ai.createSession()` 创建会话，存储结构化状态（如用户名）。
   - 示例：
     ```javascript
     const session = ai.createSession({ initialState: { userName: 'Pavel' } });
     ```
   - 支持多线程会话，共享单一会话状态。
   - 示例：为同一用户创建 `lawyerThread` 和 `pirateThread`，共享状态。

3. **React 前端集成**
   - 在 React 中使用状态管理（如 `useState`）与 Genkit 后端交互，维护对话上下文。
   - 示例：
     ```javascript
     import { useState } from 'react';
     import { runFlow } from '@genkit-ai/next/client';
     function ChatComponent() {
       const [messages, setMessages] = useState([]);
       async function sendMessage(text) {
         const response = await runFlow({ url: '/api/chat', input: { text, history: messages } });
         setMessages([...messages, { role: 'user', content: text }, { role: 'model', content: response.text }]);
       }
     }
     ```

4. **持久化存储**
   - 实现 `SessionStore` 接口（如基于 JSON 文件的存储）以持久化对话历史。
   - 示例：
     ```javascript
     class JsonSessionStore implements SessionStore {
       async get(sessionId) { /* 读取 JSON 文件 */ }
       async save(sessionId, sessionData) { /* 保存到 JSON 文件 */ }
     }
     const session = ai.createSession({ store: new JsonSessionStore() });
     ```

**资源**：
- [Genkit 聊天会话](https://genkit.dev/docs/chat/)

## AI 作为内容分析师

**需求**：AI 需要分析用户打卡记录，生成月度报告（包含高频词、情感趋势）或词云数据。

### 最佳实践

1. **文本摘要与分析**
   - 使用 `ai.generate()` 结合特定提示词进行文本摘要和分析。
   - 示例提示词：“Summarize the following check-in records and identify high-frequency words: [records]”
   - 代码示例：
     ```javascript
     const response = await ai.generate({
       model: 'googleai/gemini-2.5-flash',
       prompt: 'Summarize the following check-in records: [records]'
     });
     ```

2. **生成结构化 JSON 输出**
   - 使用 Zod 定义输出模式，确保生成结构化数据（如月度报告）。
   - 示例：
     ```javascript
     import { z } from 'genkit';
     const ReportSchema = z.object({
       highFrequencyWords: z.array(z.string()),
       sentimentTrend: z.string()
     });
     const result = await ai.generate({
       prompt: 'Analyze check-in records: [records]',
       output: { schema: ReportSchema }
     });
     ```

3. **词云数据生成**
   - 提取关键词和频率，生成适合词云的 JSON 数据。
   - 示例：
     ```javascript
     const WordCloudSchema = z.array(z.object({
       word: z.string(),
       frequency: z.number()
     }));
     const result = await ai.generate({
       prompt: 'Extract keywords and their frequencies from: [records]',
       output: { schema: WordCloudSchema }
     });
     ```

**资源**：
- [Genkit 模型生成](https://genkit.dev/docs/models/)

## AI 作为创意建议者

**需求**：AI 需提供创意对话开场白或基于社群帖子生成引导性问题和讨论点。

### 最佳实践

1. **使用 Dotprompt 管理提示词**
   - 使用 Genkit 的 Dotprompt 库和 `.prompt` 文件格式管理动态提示词。
   - 示例（`suggestion.prompt`）：
     ```handlebars
     You are a creative assistant. Suggest a dialogue starter for a conversation about {{topic}}.
     ```
   - 加载提示词：
     ```javascript
     const prompt = await ai.prompt('suggestion');
     const response = await prompt.generate({ data: { topic: 'travel' } });
     ```

2. **Handlebars 模板**
   - 使用 Handlebars 模板创建动态提示词，支持条件逻辑和变量。
   - 示例：
     ```handlebars
     {{#if topic}}
     Suggest a creative question about {{topic}}.
     {{else}}
     Suggest a general conversation starter.
     {{/if}}
     ```

3. **少样本提示（Few-Shot Prompting）**
   - 在提示词中包含示例，引导模型生成更符合预期的创意内容。
   - 示例：
     ```javascript
     const response = await ai.generate({
       prompt: `Suggest a discussion point for a post about hiking.
       Example: For a post about cooking, suggest: "What's your favorite recipe to share with friends?"
       Example: For a post about music, suggest: "Which song gets you in a great mood?"`
     });
     ```

4. **模型参数优化**
   - 调整 `temperature`（如 1.4 以增加创意性）或 `topK` 参数，优化创意输出。
   - 示例：
     ```javascript
     const response = await ai.generate({
       prompt: 'Suggest a creative dialogue starter',
       config: { temperature: 1.4, topK: 50 }
     });
     ```

**资源**：
- [Genkit Dotprompt 管理](https://genkit.dev/docs/dotprompt/)

## 总结

通过遵循上述最佳实践，开发者可以利用 Firebase Genkit 和 Node.js 高效实现 AI 功能。功能路由器通过工具调用实现精准功能触发，情境对话伙伴通过聊天 API 维护上下文，内容分析师生成结构化数据，创意建议者通过动态提示词激发灵感。结合通用实践（如环境变量管理和 TypeScript），这些方法确保了应用的可靠性、可扩展性和用户友好性。

**参考文献**：
- [Genkit 官方文档](https://genkit.dev/docs/)
- [Next.js 集成](https://genkit.dev/docs/nextjs/)
- [工具调用](https://genkit.dev/docs/tool-calling/)
- [聊天会话](https://genkit.dev/docs/chat/)
- [模型生成](https://genkit.dev/docs/models/)
- [Dotprompt 管理](https://genkit.dev/docs/dotprompt/)