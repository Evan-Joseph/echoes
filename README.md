# Echoes Firebase

Echoes是一个AI驱动的对话式个人成长指导中心，旨在通过沉浸式对话体验帮助用户实现个人成长目标。

## 项目概述

Echoes提供了一个基于AI的互动平台，用户可以通过对话获得个性化的成长指导，参与活动和打卡，加入社群讨论，并跟踪自己的成长进度。

## 核心功能

1. **沉浸式AI对话界面** - Hero Zone设计，提供专注且富有吸引力的对话体验
2. **AI引导交互** - 基于Gemini模型的智能对话系统，提供个性化指导
3. **活动参与和打卡系统** - 参与成长活动并记录进度
4. **个人成长洞察** - 基于用户数据提供成长分析和建议
5. **成就系统** - 完成目标获得成就徽章
6. **社群广场** - 用户互动和经验分享社区

## 技术栈

- **前端框架**: Next.js 15.3.3
- **编程语言**: TypeScript
- **后端服务**: Firebase (Authentication, Firestore, Storage)
- **AI功能**: Genkit 1.14.1, Google AI (Gemini-2.0-flash)
- **UI组件库**: Radix UI
- **样式框架**: Tailwind CSS
- **构建工具**: Next.js内置构建系统

## 开发环境设置

1. 克隆仓库
2. 安装依赖
   ```bash
   npm install
   ```
3. 配置环境变量
   创建`.env`文件，添加必要的Firebase和Google AI凭证
4. 启动开发服务器
   ```bash
   npm run dev
   ```

## 项目结构

```
├── .env                  # 环境变量配置
├── .gitignore            # Git忽略文件
├── apphosting.yaml       # Firebase托管配置
├── docs/                 # 项目文档
├── next.config.ts        # Next.js配置
├── package.json          # 项目依赖
├── public/               # 静态资源
├── src/                  # 源代码
│   ├── ai/               # AI相关代码
│   ├── app/              # Next.js应用路由
│   ├── components/       # UI组件
│   ├── contexts/         # React上下文
│   ├── genkit/           # Genkit流程配置
│   ├── hooks/            # 自定义钩子
│   └── lib/              # 工具函数和配置
├── tailwind.config.ts    # Tailwind配置
└── tsconfig.json         # TypeScript配置
```

## 贡献指南

1.  Fork仓库
2.  创建特性分支
3.  提交更改
4.  创建Pull Request

## 许可证

本项目采用MIT许可证。详情请见LICENSE文件。
