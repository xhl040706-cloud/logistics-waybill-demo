# 物流运单协同系统（模拟存量项目）

这是一个为 **CoSpowers + CoStrict 协同开发演示**准备的存量 Web 项目。所有企业、人员、运单和地址信息均为虚构，不对应柏威物流或任何真实客户的业务数据，也不是客户生产系统。

项目用于模拟一个常见研发场景：**已有系统正在使用，新需求以独立分支和 Pull Request 的方式增量交付，而不是从零重写。**

## 1. 当前存量能力

- 12 条虚构运单及基础运营统计；
- 按运单号、客户、线路或负责人搜索，支持单字和连续名称片段；
- 按待揽收、运输中、派送中、已签收筛选；
- 搜索与运输状态组合筛选、空结果和一键重置；
- 运单基础详情、桌面与窄屏布局；
- 不依赖外部服务的本地启动和 Node.js 内置自动化测试。

### 刻意留作增量任务的功能

运单数据已经包含 `exceptionType` 和 `exceptionReason` 字段，但当前基线：

- 没有“仅看异常运单”筛选；
- 列表和详情不展示异常类型与异常原因。

本次 CoSpowers 演示任务是在这个真实基线上增量实现上述能力。任务书见 [`docs/DEMO_TASK.md`](docs/DEMO_TASK.md)。

## 2. 环境要求

- Node.js 18 或更高版本；
- 一个现代浏览器；
- **不需要** `npm install`、数据库、Docker、外部 API 或互联网连接。

检查 Node.js：

```bash
node --version
```

## 3. 启动项目

在仓库根目录执行：

```bash
npm start
```

也可以直接执行：

```bash
node server.js
```

看到以下提示后，打开 <http://127.0.0.1:4173>：

```text
物流运单协同系统已启动：http://127.0.0.1:4173
按 Ctrl+C 停止服务
```

健康检查地址：<http://127.0.0.1:4173/health>。

服务只监听本机回环地址 `127.0.0.1`，不会主动暴露到局域网。停止服务时，在启动终端按 `Ctrl+C`。

### 端口被占用时

macOS / Linux：

```bash
PORT=4174 npm start
```

Windows PowerShell：

```powershell
$env:PORT=4174; npm start
```

然后打开 `http://127.0.0.1:4174`。

## 4. 运行测试

在仓库根目录执行：

```bash
npm test
```

等价命令：

```bash
node --test
```

测试只使用 Node.js 内置的 `node:test` 和 `node:assert/strict`，不会下载或安装依赖。测试覆盖：

- 演示数据唯一性和字段完整性；
- 运单号、客户、目的地和负责人搜索，包括单字与名称片段；
- 空白与大小写处理；
- 状态筛选及搜索组合筛选；
- 运单统计、空数据和详情读取；
- 非数组输入的明确错误。

## 5. 目录结构

```text
logistics-waybill-demo/
├── package.json                  # 启动和测试命令，无第三方依赖
├── server.js                     # Node.js 本地静态服务，仅监听 127.0.0.1
├── public/
│   ├── index.html                # 存量运单工作台
│   ├── styles.css                # 桌面与窄屏样式
│   ├── app.js                    # 页面渲染、搜索筛选和详情交互
│   ├── data/
│   │   └── shipments.js          # 12 条虚构运单与状态字典
│   └── lib/
│       └── shipment-utils.js     # 浏览器与测试共用的业务逻辑
├── tests/
│   └── shipment-utils.test.js    # Node.js 内置自动化测试
└── docs/
    ├── DEMO_TASK.md              # CoSpowers 增量任务书与验收口径
    └── TECHNICAL_GUIDE.md        # 开发负责人技术说明
```

## 6. 演示时怎么使用

1. 先启动当前基线，展示已有运单系统、搜索、状态筛选和基础详情。
2. 说明当前痛点：异常字段已经存在，但运营无法快速筛选异常，也看不到异常原因。
3. 在 CoStrict 中关联本仓库，以 `main` 为基线创建 `docs/DEMO_TASK.md` 中的增量任务。
4. 通过 CoSpowers 完成需求、设计、拆解、编码和审核。
5. 在代码 PR 中核对变更，重新运行页面和 `npm test`。
6. 验证“仅看异常”和异常原因，同时确认原有搜索、状态筛选没有回归。
7. 预演只保留任务分支和 PR，不合并到 `main`；正式验收通过后，再由有权限的人决定是否合并。未合并前不说功能已进入 `main`。

## 7. GitHub、预演与现场恢复

远程仓库：<https://github.com/xhl040706-cloud/logistics-waybill-demo>（私有）。

### 不需要复制多份项目

Git 已经提供备份和并行版本：

- `main`：始终保持未实现异常筛选的干净基线；
- `baseline-v1.1`：固定本次修正版的标签，作为明确的恢复点；
- `rehearsal/*`：预演任务分支，每次预演使用一个新名称；
- Pull Request：保存代码差异、测试与评审记录，预演后不合并。

因此不需要复制粘贴源码、下载多份 ZIP，也不需要建立多个 GitHub 仓库。每次从 `main` 创建独立任务分支即可；要查看旧预演时切换到对应分支，要回到初始页面时切回 `main`。

### 桌面端关联与预演

1. 在 CoStrict 桌面端关联上述 GitHub 仓库，默认分支选择 `main`。
2. 使用 `docs/DEMO_TASK.md` 中的任务描述，要求创建独立任务分支和 Pull Request，不直接提交 `main`。
3. 预演完成后保留分支和 PR；不要点击 Merge，确保下一轮仍能从无异常筛选的基线开始。
4. 正式演示也新建任务分支，例如 `live/exception-filter`，不要复用已有预演分支。

### 现场开始前恢复本机

先确认需要保留的预演代码已经提交并推送到独立分支。以下命令会**丢弃当前目录未提交的修改和未跟踪文件**，不要在仍有未保存成果时执行：

```bash
git fetch origin
git switch --force main
git reset --hard origin/main
git clean -fd
npm test
npm start
```

`main` 没有被预演合并时，这套命令即可恢复页面和代码，不需要重新下载仓库。若不确定本地修改是否已推送，先执行 `git status`，不要直接运行清理命令。

如果预演误合并到 `main`，不要在现场强推覆盖远程历史；保留现场分支，会后在 GitHub 上对预演 PR 执行 Revert，或让开发负责人处理。

### 最稳妥的备用方案

现场前保留一份从 `main` 新克隆的干净目录，只用于正式演示；预演在另一目录进行。两份目录都关联同一个 GitHub 仓库，不是两套独立备份：

```bash
git clone https://github.com/xhl040706-cloud/logistics-waybill-demo.git logistics-waybill-live
```

这样即使预演目录状态混乱，也不需要现场修复 Git；直接在干净目录执行 `npm start` 并让桌面端关联该目录。

## 8. 数据与安全边界

- 本项目只用于演示和培训，不包含真实客户资料、Token、Cookie 或生产地址。
- `public/data/shipments.js` 是唯一演示数据源；修改数据后应同步更新相关测试。
- 页面无后端写入和真实运单操作，筛选只发生在浏览器内。
- 不要在演示仓库中加入真实客户数据或生产凭证。
- 现场技术问题由开发负责人或金榜按团队安排协助，不要求销售人员现场排障。
