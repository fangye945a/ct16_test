# 真实设备前端对齐实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将当前原型工程的前端页面对齐到真实设备工程，并以 mock API 数据驱动页面，同时保留批量运维管理模块。

**Architecture:** 以真实设备工程 `frontend/src` 的业务页面、模块入口、布局、路由和 API DTO 为页面基线。将真实 API 请求边界迁移到当前工程，再通过 mock adapter 返回与真实 DTO 一致的数据；批量运维继续使用当前工程的原型服务，并挂接到新 Sidebar 和路由。

**Tech Stack:** React 19、TypeScript、React Router、Vite、Tailwind CSS v4、shadcn/ui、ECharts、SSE mock。

**Spec:** `docs/superpowers/specs/2026-09-04-real-device-frontend-alignment-design.md`

## Global Constraints

- 页面视觉和交互以 `/home/openvalley/projects/rk3506/third_party/zaiohDeviceWorkSpace/frontend` 为准。
- 默认数据模式为 mock，不请求真实设备后端。
- 批量运维路由固定为 `/batch-operations`，功能行为保持当前实现。
- 不修改 `src/index.tsx` 和 `src/components/ui/*`。
- 业务代码使用现有 TypeScript/React 结构，新增源码按当前工程规范使用 ASCII 文件内容和中文注释。
- 每个任务完成后执行与改动相关的 typecheck/lint；全部完成后执行完整构建和路由冒烟检查。

---

### Task 1: 迁移真实设备工程的基础配置与 API DTO 边界

**Files:**
- Copy/Modify: `/home/openvalley/projects/rk3506/third_party/zaiohDeviceWorkSpace/frontend/src/api/*.ts` -> `src/api/*.ts`
- Copy/Create: `/home/openvalley/projects/rk3506/third_party/zaiohDeviceWorkSpace/frontend/src/lib/appearance.ts`, `src/lib/md5.ts`, `src/lib/ota-image.ts` -> current `src/lib/`
- Modify: `package.json`, `package-lock.json`, `vite.config.ts`, `vercel.json`, `index.html`
- Create: `src/api/mockAdapter.ts`, `src/api/mockData.ts`

**Interfaces:**
- API modules keep real-engine function names and DTO types, for example `getSystemOverview(): Promise<Ct16SystemOverviewDto>` and `getModules(): Promise<Ct16ModuleListDto>`.
- `mockAdapter.ts` exposes typed mock equivalents for query, update, OTA, reboot, logs and settings operations.
- API modules select mock implementations by default; a future real mode can be enabled through one environment flag without changing page consumers.

- [ ] **Step 1: Compare dependency and build configuration differences.**

Run:

```bash
diff -u package.json /home/openvalley/projects/rk3506/third_party/zaiohDeviceWorkSpace/frontend/package.json
diff -u vite.config.ts /home/openvalley/projects/rk3506/third_party/zaiohDeviceWorkSpace/frontend/vite.config.ts
```

Record only dependencies and scripts required by migrated pages. Keep the current project name and batch-specific dependencies.

- [ ] **Step 2: Add the real API type surface and utility modules.**

Copy the target API DTO definitions and appearance/OTA utilities. Preserve the current project aliases and do not copy UI components or `src/index.tsx`.

- [ ] **Step 3: Implement mock API responses with the target DTO shapes.**

Use current data files and deterministic helper data. Query functions must return cloned values; mutation functions must update mock state in `localStorage` and return the same success/error shape expected by target pages. Streaming functions must return an `EventSource`-compatible mock that can be closed.

- [ ] **Step 4: Run focused static checks.**

```bash
npm run typecheck
npm run lint:eslint
```

Expected: both commands pass before page migration continues.

- [ ] **Step 5: Commit the API boundary.**

```bash
git add package.json package-lock.json vite.config.ts vercel.json index.html src/api src/lib
git commit -sm "refactor: 对齐真实设备前端接口边界"
```

### Task 2: 迁移深色工业控制台外壳和认证流程

**Files:**
- Modify: `src/components/AppSidebar.tsx`, `src/components/Header.tsx`, `src/components/Layout.tsx`, `src/components/AuthGuard.tsx`
- Create: `src/components/BrandLogo.tsx`
- Modify: `src/index.css`, `src/tailwind-theme.css`, `src/typography.css`
- Modify: `src/app.tsx`

**Interfaces:**
- `Layout` provides the target Sidebar/Header/Outlet composition.
- `AuthGuard` reads mock session state through the migrated auth API and redirects to `/login` when absent.
- `AppSidebar` exposes the target navigation labels and adds `/batch-operations`.

- [ ] **Step 1: Migrate target layout and branding code.**

Copy the target versions of `Header`, `Layout`, `AuthGuard`, and `BrandLogo`, then adapt imports to current aliases and preserve the existing Node-RED sidebar behavior if the target page requires it.

- [ ] **Step 2: Merge batch navigation without changing other target labels.**

Add one navigation item:

```ts
{ path: '/batch-operations', label: '批量运维管理', icon: ListChecks }
```

Keep the target ordering for all other entries.

- [ ] **Step 3: Apply target theme variables and document title.**

Use target dark industrial tokens. Set the HTML title to `CT16 设备管理平台`; runtime appearance changes must update title and favicon through the existing appearance event.

- [ ] **Step 4: Verify unauthenticated mock flow.**

Clear browser storage, start the dev server, and confirm `/` redirects to the mock login page, successful mock login returns to `/`, and refresh preserves the selected mock session according to the target behavior.

- [ ] **Step 5: Commit the shell.**

```bash
git add src/components src/index.css src/tailwind-theme.css src/typography.css src/app.tsx index.html
git commit -sm "refactor: 对齐真实设备控制台外壳"
```

### Task 3: 迁移核心设备页面和真实设备 API 页面模块

**Files:**
- Replace/Copy: target `src/modules/dashboard`, `src/modules/topology`, `src/modules/logs`, `src/modules/ota`, `src/modules/network`, `src/modules/device-models`, `src/modules/cloud`, `src/modules/settings`
- Replace/Copy: target page components used by those modules under `src/pages/`
- Modify: `src/app.tsx`
- Preserve: `src/pages/BatchOperationsPage/`

**Interfaces:**
- Route components consume only `src/api` and target DTOs for device data.
- `/logs` renders file query, exception query, kernel stream and system stream through mock API adapters.
- `/network`, `/device-models`, `/northbound-platforms`, and `/settings` use target API boundaries with mock persistence.

- [ ] **Step 1: Migrate dashboard and topology modules.**

Bring over target overview and topology components. Replace direct network assumptions only at API adapter boundaries. Confirm mock module lists, port state, wireless topology, control and detection actions render without a backend.

- [ ] **Step 2: Migrate logs and network modules.**

Bring over target logs subpages and network settings page. Ensure the mock SSE implementation emits lines on an interval and `close()` stops all timers on unmount.

- [ ] **Step 3: Migrate OTA, device model, cloud and settings modules.**

Use target OTA file validation and DTOs, but simulate upload/job status locally. Keep device model configuration and cloud platform UI aligned to the target, with mutations persisted only to mock storage.

- [ ] **Step 4: Register target routes plus the preserved batch route.**

The final route set must include:

```tsx
<Route path="logs" element={<LogsPage />} />
<Route path="network" element={<NetworkSettingsPage />} />
<Route path="northbound-platforms" element={<CloudServicePage />} />
<Route path="batch-operations" element={<BatchOperationsPage />} />
```

Remove obsolete duplicate routes only after checking no navigation item references them.

- [ ] **Step 5: Run page-level static checks.**

```bash
npm run typecheck
npm run lint:eslint
```

Expected: pass with no changes to UI primitives.

- [ ] **Step 6: Commit the core pages.**

```bash
git add src/app.tsx src/modules src/pages src/api src/data
git commit -sm "refactor: 对齐真实设备管理页面"
```

### Task 4: 迁移 Node-RED、智能体和设备节点实现

**Files:**
- Replace/Copy: target `src/modules/nodered`, target `src/pages/NodeRedPage/`
- Replace/Copy: target `src/pages/PicoClawPage/`
- Modify: `src/api/mockAdapter.ts` and related mock DTO data
- Preserve: batch operations files

**Interfaces:**
- `/nodered` keeps the target iframe/editor integration and device-node workspace.
- `/agent` uses target model/skill API boundaries, with mock model/skill storage.
- All AI and node operations remain local mock operations; they do not install modules, restart services or write to devices.

- [ ] **Step 1: Migrate Node-RED and device-node files.**

Copy the target device-node subdirectory and page module. Adapt target API calls to mock responses and confirm editor URL/proxy configuration does not require a running service in mock mode.

- [ ] **Step 2: Migrate agent configuration files.**

Copy target PicoClaw page subcomponents and API wrapper. Return target-shaped model and skill lists from mock storage; preserve test, import, enable/disable and delete semantics.

- [ ] **Step 3: Add mock empty/error/connected states.**

Ensure Node-RED, model fetch, skill import and device-node test actions show explicit loading, success and failure states while backend services are absent.

- [ ] **Step 4: Verify the two major interactive workflows.**

Check that a mock node can be created, edited, tested and deleted; check that a mock agent model can be added/tested/defaulted and a skill can be enabled or imported.

- [ ] **Step 5: Commit the interactive pages.**

```bash
git add src/modules/nodered src/pages/NodeRedPage src/pages/PicoClawPage src/api src/data
git commit -sm "refactor: 对齐可视化编程和智能体页面"
```

### Task 5: 保留并适配批量运维管理模块

**Files:**
- Preserve/Modify: `src/pages/BatchOperationsPage/BatchOperationsPage.tsx`
- Preserve/Modify: `src/pages/BatchOperationsPage/BatchDeviceImportDialog.tsx`
- Preserve/Modify: `src/pages/BatchOperationsPage/deviceBatchImport.ts`
- Preserve/Modify: `src/services/batchOperationsPrototype.ts`
- Preserve/Copy: required `src/data/batch-device-models.ts`
- Modify: `src/app.tsx`, `src/components/AppSidebar.tsx`

**Interfaces:**
- Batch page keeps its current local mock service signatures and task workflows.
- It receives target theme tokens and shared UI primitives only; it does not depend on real device API modules.

- [ ] **Step 1: Restore batch files after target page synchronization.**

If target file copying overwrote shared data or services, restore the current batch-specific files from the pre-migration commit without reverting unrelated target changes.

- [ ] **Step 2: Adapt visual-only differences.**

Replace obsolete light-theme utility colors in the batch page with semantic target classes where needed. Do not change task state transitions, import parsing, backup serialization, retry behavior or restore confirmation.

- [ ] **Step 3: Verify batch operations manually.**

Run the following checks in the browser:

```text
打开 /batch-operations
创建批量任务并查看任务详情
导入设备文件并确认解析结果
执行任务并触发失败任务重试
创建配置备份、下载备份、恢复备份
```

- [ ] **Step 4: Commit the retained module.**

```bash
git add src/pages/BatchOperationsPage src/services/batchOperationsPrototype.ts src/data/batch-device-models.ts src/app.tsx src/components/AppSidebar.tsx
git commit -sm "feat: 保留批量运维管理模块"
```

### Task 6: 完整验证、构建产物和部署配置收口

**Files:**
- Modify: `scripts/build.sh`, `vercel.json`, `README.md` only if validation finds an actual mismatch
- Test: all migrated routes and mock API workflows

**Interfaces:**
- `npm run build` must finish and leave the configured deploy directory available.
- Mock mode must be explicit in documentation and default without requiring `1880`, `18800`, `8080` or real device hardware.

- [ ] **Step 1: Run all static checks.**

```bash
npm run typecheck
npm run lint:eslint
```

- [ ] **Step 2: Run production build and inspect output.**

```bash
npm run build
find dist -maxdepth 3 -type f | sort
```

Verify the build script does not delete the directory configured by `vercel.json`. Fix the script or deployment configuration so both use one consistent output path.

- [ ] **Step 3: Run the development server and route smoke test.**

```bash
npm run dev
```

Visit `/`, `/topology`, `/logs`, `/ota`, `/nodered`, `/agent`, `/device-models`, `/network`, `/northbound-platforms`, `/settings`, and `/batch-operations`. Confirm each route renders mock content with no uncaught console errors.

- [ ] **Step 4: Check responsive and failure states.**

Check desktop and narrow viewport layouts, unavailable Node-RED status, empty log results, failed mock API actions, OTA cancellation, and batch operation error/retry states.

- [ ] **Step 5: Commit final verification fixes.**

```bash
git add scripts/build.sh vercel.json README.md src
git commit -sm "fix: 收口前端构建和模拟运行验证"
```

