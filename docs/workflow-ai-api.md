# 流程助手接口契约

## 提案生成

`POST /api/workflow-ai/proposals`

请求体：

```json
{
  "mode": "flow | node-instance | node-module",
  "messages": [{ "role": "user | assistant", "content": "用户对话内容" }],
  "targetFlowId": "仅 node-instance 模式需要"
}
```

响应体：

```json
{
  "proposal": {
    "id": "proposal-id",
    "mode": "flow",
    "summary": "提案说明",
    "assistantMessage": "用于显示在会话中的回复",
    "nodeCount": 5,
    "connectionCount": 4,
    "warnings": ["部署前请确认设备地址"],
    "targetDirectory": "仅 node-module 模式返回",
    "files": ["仅 node-module 模式返回"]
  }
}
```

AI 服务负责生成标准流程定义，并直接调用运行时管理接口完成后端操作；前端不传递运行时凭据。

## 提案应用

`POST /api/workflow-ai/proposals/:id/apply`

请求体：

```json
{
  "targetFlowId": "仅 node-instance 模式需要"
}
```

- `flow`：创建新的未部署流程，不覆盖既有流程。
- `node-instance`：将已确认的节点实例写入指定流程，不自动部署。
- `node-module`：仅把模块文件写入后端指定目录；本期不安装、不加载、不重启服务。

## 设备节点提案

`POST /api/workflow-ai/device-node-proposals`

请求体：

```json
{
  "prompt": "创建用于控制告警灯的数字输出节点",
  "nodeId": "编辑已有节点时可选",
  "boards": [{ "id": "板卡标识", "name": "板卡名称", "pins": [] }]
}
```

响应中的 `proposal.draft` 必须为可编辑的设备节点草稿，包含 `name`、`description`、`boardId`、`pinId`、`mode` 和 `parameters`。前端仅回填草稿；用户点击保存后，由 node-green 的设备节点接口完成校验与持久化。
