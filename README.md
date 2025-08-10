# Echoes - AI驱动的个人成长伙伴

Echoes是一个AI驱动的对话式个人成长指导平台，旨在通过沉浸式的对话体验，帮助用户探索自我、设定目标并持续成长。

## 核心理念

我们相信，真正的成长始于对话。Echoes的核心是“一个页面带全局，一切从对话开始”。我们摒弃了复杂的功能菜单，将所有交互都融入到与AI伙伴的自然语言交流中，为您提供一个有温度、懂思考的“AI成长伙伴”。

## 核心功能

1.  **沉浸式AI对话界面** - 设计了极简的对话界面，让您能专注于与AI的交流。
2.  **AI引导与交互** - 基于强大的AI模型，实现上下文感知、意图识别，让功能调用如对话般自然。
3.  **活动与打卡系统** - 通过对话发现和参与线上成长活动，并通过每日打卡与AI互动，记录成长足迹。
4.  **个人成长洞察** - AI会根据您的对话生成个人成长报告，包含词云、情感分析等，帮助您更好地认识自己。
5.  **微信生态集成** - 支持从微信小程序一键登录，实现跨平台的无缝体验。

## 技术栈

- **前端框架**: Next.js
- **编程语言**: TypeScript
- **后端服务**: **Supabase** (认证, 数据库, 存储)
- **AI 功能**: Genkit, Google AI (Gemini)
- **UI 组件库**: Radix UI, shadcn/ui
- **样式框架**: Tailwind CSS

## 开发环境设置

1.  **克隆仓库**
    ```bash
    git clone <repository-url>
    cd <repository-name>
    ```

2.  **安装依赖**
    ```bash
    npm install
    ```

3.  **配置环境变量**
    - 复制 `.env.example` (如果存在) 或创建 `.env.local` 文件。
    - 在 [Supabase](https://supabase.com/) 项目中获取您的服务密钥和URL。
    - 添加以下环境变量：
      ```env
      # Supabase
      NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
      NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
      SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY

      # WeChat Mini Program
      WECHAT_APPID=YOUR_WECHAT_APPID
      WECHAT_APPSECRET=YOUR_WECHAT_APPSECRET
      ```

4.  **启动开发服务器**
    ```bash
    npm run dev
    ```
    在浏览器中打开 `http://localhost:3000` 查看。

## 项目结构

```
.
├── docs/                 # 项目文档 (设计蓝图、需求等)
├── public/               # 静态资源 (图片、Logo等)
├── src/
│   ├── ai/               # AI 相关代码 (Genkit Flows)
│   ├── app/              # Next.js 应用路由和页面
│   │   ├── api/          # API 路由
│   │   └── auth/         # 认证页面 (微信登录回调)
│   ├── components/       # React UI 组件
│   ├── contexts/         # React 上下文 (如 AuthContext)
│   ├── hooks/            # 自定义 React 钩子
│   ├── lib/              # 核心库、工具函数和配置
│   │   └── supabase/     # Supabase 客户端和服务端配置
│   └── ...
├── supabase/             # Supabase 数据库迁移脚本
├── package.json
└── tsconfig.json
```

## 贡献

我们欢迎任何形式的贡献！请遵循以下步骤：

1.  Fork 本仓库
2.  创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3.  提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4.  推送到分支 (`git push origin feature/AmazingFeature`)
5.  创建一个 Pull Request

## 许可证

本项目采用 MIT 许可证。详情请见 `LICENSE` 文件。
