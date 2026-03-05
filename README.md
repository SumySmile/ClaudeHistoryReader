# Claude Code History Viewer

浏览、搜索、管理 Claude Code 的所有对话历史。

## 启动

双击 `start.bat`，浏览器自动打开 **http://localhost:5173**

## 功能

- 会话列表：按项目、时间、收藏筛选
- 对话详情：Markdown 渲染、代码高亮、折叠 Thinking/Tool 调用
- 全文搜索：Ctrl+K 快速搜索所有对话内容
- 标签 & 收藏：给对话打标签、标记收藏
- 导出：Markdown / JSON 格式导出
- 统计仪表板：使用量、模型分布、项目分布
- 实时监听：新对话自动入库

## 端口

| 服务 | 端口 | 说明 |
|------|------|------|
| 前端 (Vite) | 5173 | 浏览器访问这个 |
| 后端 (Express) | 3847 | API 服务，前端自动代理 |
