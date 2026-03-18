# Claude Code History Viewer

浏览、搜索、管理 Claude Code 的所有对话历史。

## 启动

- 开发模式：`npm run dev`
- 仅后端：`npm run dev:server`
- 仅前端：`npm run dev:client`
- 生产构建：`npm run build`

也可以双击 `start.bat`。

`start.bat` 的行为：
- 自动寻找第一个可用前端端口（从 `5173` 开始）
- 在单独的专用命令行窗口中启动开发服务
- 启动成功后自动打开实际使用的前端地址
- 不会去关闭或干扰其他已经打开的 `cmd` 窗口

默认情况下：
- 前端优先使用 `http://localhost:5173`
- 后端使用 `http://localhost:3847`

## 功能

- 会话列表：按项目、时间、收藏筛选
- 对话详情：Markdown 渲染、代码高亮、折叠 Thinking/Tool 调用
- AskUserQuestion：在时间线中显示独立的用户回答卡片，支持选项高亮、自定义文本、多选与降级展示
- 全文搜索：Ctrl+K 快速搜索所有对话内容
- 标签 & 收藏：给对话打标签、标记收藏
- 导出：Markdown / JSON 格式导出，保留 AskUserQuestion 回答结构
- 统计仪表板：使用量、模型分布、项目分布
- 实时监听：新对话自动入库
- 更稳健的启动流程：后端优先启动提供服务，扫描、监听、索引等任务在后台分阶段执行

## 端口

| 服务 | 端口 | 说明 |
|------|------|------|
| 前端 (Vite) | 5173 起 | 浏览器访问这个；若占用会自动递增 |
| 后端 (Express) | 3847 | API 服务，前端自动代理 |
