# 控制器网关管理平台 - 需求拆解文档

## 产品概述

- **产品类型**：工业物联网网关设备 Web 管理后台
- **目标用户**：工业物联网运维工程师、系统集成工程师、设备管理员
- **界面语言**：中文
- **主题偏好**：浅色设备管理控制台。页面使用浅灰白背景、白色卡片、绿色主色、蓝灰辅助文字和柔和边框。
- **导航布局**：左侧 Sidebar，顶部状态栏，右侧内容区。

## 页面结构

| 页面名称 | 文件名 | 路由 | 数据来源 |
| --- | --- | --- | --- |
| 系统概览 | `DashboardPage.tsx` | `/` | mock |
| 系统拓扑图 | `TopologyPage.tsx` | `/topology` | mock |
| 文件日志 | `FileLogPage.tsx` | `/files-logs` | mock |
| OTA 升级 | `OtaUpgradePage.tsx` | `/ota` | mock |
| 设备模型管理 | `DeviceModelPage.tsx` | `/device-models` | mock |
| 可视化编程 | `NodeRedPage.tsx` | `/nodered` | 同域嵌入流程编辑器 |
| 智能体配置 | `PicoClawPage.tsx` | `/picoclaw` | mock |
| 系统设置 | `SettingsPage.tsx` | `/settings` | mock |

## 可视化编程集成

- **产品名称**：产品内统一展示为“可视化编程”。
- **页面职责**：`/nodered` 提供嵌入式编辑器、底部流程助手、加载状态、连接失败提示、重试和新窗口打开入口。
- **后端契约**：iframe 默认加载同域 `/node-red/`；开发环境由 Vite 转发到本机 `1880` 端口，生产环境由网关按相同路径代理并完成统一鉴权。
- **兼容边界**：运行时的上游包名、管理接口、WebSocket、节点逻辑和独立运行方式保持不变；产品页面不展示上游品牌名称。
- **运行时展示**：系统服务列表显示“流程编程服务”，端口为 `1880`。
- **流程助手**：AI 服务生成工作流、节点实例或节点模块提案。工作流和节点实例必须预览确认后应用；节点模块仅保存到后端目录，不安装、不加载、不重启。

## 全局视觉规范

- **页面背景**：使用 `bg-background`，当前令牌为低饱和浅灰白。
- **容器**：使用 `bg-card` 白色卡片、`border-border` 细边框和 `shadow-sm` 轻阴影；卡片圆角遵循现有 `rounded-xl` 和 `rounded-2xl` 层级。
- **颜色**：主交互使用 `primary` 绿色；正文使用 `foreground` 深蓝灰；次要信息使用 `muted-foreground`；成功、警告、异常分别使用 `success`、`warning`、`destructive` 语义色。
- **交互**：按钮、输入框、菜单和卡片必须具有默认、悬停、激活、焦点和禁用状态。焦点反馈使用 `ring`，不得使用高亮发光或深色终端装饰。
- **动效**：仅保留状态提示和操作反馈所需的短时过渡；加载态使用与内容轮廓一致的骨架屏；所有页面需提供明确的空态或错误态。
- **字体**：正文沿用 `Plus Jakarta Sans` 与 `Noto Sans SC` 回退栈；不新增装饰字体。

## 页面布局要求

- 控制台、拓扑、文件日志、OTA、设备模型、智能体配置和系统设置保留现有信息架构与数据来源。
- 内容区默认使用 `px-4 md:px-6 lg:px-8 py-6` 的间距节奏；表格与画布在窄屏使用自身滚动，避免破坏全局布局。
- 编辑器区域在桌面端占据内容区剩余高度；底部流程助手可收起、可调整高度，窄屏下保持全宽对话与横向编辑器能力。

## 运行前准备

- 每次运行本工程前，先确保 `node-green` 子模块已拉取：`git submodule update --init`（子模块内容为空目录时必须执行）。
- `node-green` 首次拉取后需先初始化：在 `node-green/` 目录依次执行 `npm install` 和 `npm run build`（构建编辑器静态资源，否则 `/nodered` 页面会因资源 404 而空白）。
- 可视化编程依赖 `node-green` 提供的 node-red 服务，需先启动：在 `node-green/` 目录执行 `npm start`，确认服务监听本机 `1880` 端口后，再启动本工程（`npm run dev`）。
- 若 `1880` 端口未就绪，`/nodered` 页面会显示连接失败提示，属预期行为，启动 node-red 后重试即可。

## 构建与约束

- 前端采用 React 19、TypeScript、Tailwind CSS v4 和 shadcn/ui，禁止修改 `src/index.tsx` 与 `src/components/ui/*`。
- 新页面放在 `src/pages/<PageName>/`，页面专属逻辑不放入基础 `components/`。
- 路由只在 `src/app.tsx` 的 `<Routes>` 中维护，`app.tsx` 不重复创建 Router。
- 主题令牌由 `src/index.css` 的 CSS 变量定义，业务页面使用语义 Tailwind 类，不硬编码替代色值。
