# 开发负责人技术说明

## 项目定位

这是一个刻意保持小规模的存量 Web 项目，用于验证 CoSpowers 在已有代码上的增量研发能力。无真实客户数据、无生产服务、无第三方运行时依赖。

## 运行模型

- `server.js` 使用 Node.js 内置 `node:http` 提供静态文件服务。
- 默认监听 `127.0.0.1:4173`，只接受 GET/HEAD。
- `/health` 返回 `{ "status": "ok" }`，用于启动确认。
- `public/` 是唯一静态文件根目录，服务端阻止路径越界访问。
- 页面使用原生 ES Modules；业务逻辑在 `public/lib/shipment-utils.js`，浏览器和 Node.js 测试共用。
- 没有 API 写入、数据库、构建步骤、外部字体或 CDN 资源。

## 常用命令

```bash
node --version     # 要求 >= 18
npm start          # 启动，等价于 node server.js
npm test           # 运行 node --test
```

指定其他端口：

- macOS / Linux：`PORT=4174 npm start`
- Windows PowerShell：`$env:PORT=4174; npm start`

## 基线功能边界

现有能力：统计、关键词搜索、运输状态筛选、组合筛选、空态、基础详情、响应式布局。

`public/data/shipments.js` 已含异常字段，但基线未实现异常筛选和异常原因展示。不要在演示前把目标功能补进 `main`，否则增量任务会失去可观察差异。

目标任务的详细业务与验收约束见 `DEMO_TASK.md`。

## 修改时的约束

- 优先复用 `public/lib/shipment-utils.js`，不要在页面和测试中各写一套筛选规则。
- 保持静态、离线、无依赖特性；不引入 npm 依赖、前端框架或外部服务。
- 保持原有测试，新增测试必须确定、独立、可在干净 Node.js 环境重复执行。
- 保持 `server.js` 只监听回环地址，不把演示服务暴露到局域网。
- 任务代码在独立分支和 PR 中交付，验收后由有权限的人合并。

## 常见问题

### `node: command not found`

Node.js 未安装或未加入 PATH。安装 Node.js 18+ 后重新打开终端，不要尝试用其他命令绕过。

### 端口被占用

按 README 使用 `PORT=4174 npm start`（PowerShell 使用 `$env:PORT=4174; npm start`），并打开对应端口。

### 页面能打开但筛选不工作

检查浏览器控制台是否为 JavaScript 模块加载错误。应通过 `npm start` 访问 HTTP 页面，不以 `file://` 双击 `index.html`，因为本项目使用 ES Modules。

### 测试失败

先确认未修改 `public/data/shipments.js` 的基线数据；若业务代码变更，保留失败输出并检查共享逻辑，不删除旧测试换取通过。

### 客户追问能否直接用于生产

不能。本项目是培训用模拟项目，缺少生产所需的身份认证、持久化、审计、备份、监控、数据治理和正式安全加固。它只用于演示存量项目的增量研发流程。

现场技术支持按团队安排由开发负责人或金榜处理，销售人员不需要现场修改服务配置或代码。
