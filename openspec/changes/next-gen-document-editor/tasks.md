## 任务拆分

### Phase 1: 核心编辑器骨架

#### Task 1.1: 创建包基础结构

**描述**: 创建 @luhanxin/editor 包基础结构

**命令**:
```bash
mkdir -p packages/editor/src/{core,extensions,slash-command,toolbar,renderer,converters,autosave,types}
cd packages/editor
pnpm init
```

**文件**:
- `packages/editor/package.json` — name: @luhanxin/editor
- `packages/editor/tsconfig.json`
- `packages/editor/src/index.ts`

**验收标准**:
- [ ] 包结构创建完成
- [ ] TypeScript 配置正确
- [ ] 导出 API 清晰

**预估时长**: 1h

---

#### Task 1.2: 搭建 TipTap 编辑器骨架

**描述**: 实现 EditorProvider 和 useEditor hook

**文件**:
- `packages/editor/src/core/Editor.tsx`
- `packages/editor/src/core/extensions.ts`
- `packages/editor/src/core/schema.ts`

**验收标准**:
- [ ] TipTap 编辑器渲染正常
- [ ] EditorProvider 配置正确
- [ ] useEditor hook 可用

**预估时长**: 4h

---

#### Task 1.3: 实现基础块类型

**描述**: 实现段落、标题、代码块、引用、分隔线、列表

**文件**:
- `packages/editor/src/extensions/paragraph.ts`
- `packages/editor/src/extensions/heading.ts`
- `packages/editor/src/extensions/code-block/index.tsx`
- `packages/editor/src/extensions/blockquote.ts`
- `packages/editor/src/extensions/horizontal-rule.ts`
- `packages/editor/src/extensions/list.ts`

**验收标准**:
- [ ] 所有基础块类型正常工作
- [ ] 块渲染正确
- [ ] 快捷键正常

**预估时长**: 6h

---

#### Task 1.4: 集成 shiki 代码高亮

**描述**: 复用 @luhanxin/md-parser-core 的 shiki 高亮

**文件**:
- `packages/editor/src/extensions/code-block/shiki-highlight.ts`

**验收标准**:
- [ ] 代码块高亮正常
- [ ] 语言选择器正常
- [ ] 复用 md-parser 的 Worker 架构

**预估时长**: 4h

---

#### Task 1.5: 实现 Slash 命令面板

**描述**: 实现输入 `/` 弹出块类型选择菜单

**文件**:
- `packages/editor/src/slash-command/CommandPalette.tsx`
- `packages/editor/src/slash-command/commands.ts`

**验收标准**:
- [ ] 输入 `/` 弹出命令面板
- [ ] 命令搜索正常
- [ ] 插入块正常

**预估时长**: 4h

---

#### Task 1.6: 实现 Markdown 快捷键

**描述**: 实现自动转换 `#` → 标题、`>` → 引用等

**文件**:
- `packages/editor/src/core/markdown-shortcuts.ts`

**验收标准**:
- [ ] `#` + 空格 → 标题
- [ ] `>` + 空格 → 引用
- [ ] `---` → 分隔线
- [ ] ``` ` ``` → 代码块

**预估时长**: 3h

---

### Phase 2: 高级块类型

#### Task 2.1: 实现图片块

**描述**: 实现图片上传、粘贴、拖拽

**文件**:
- `packages/editor/src/extensions/image/index.tsx`
- `packages/editor/src/extensions/image/upload.ts`

**验收标准**:
- [ ] 图片上传正常
- [ ] 图片粘贴正常
- [ ] 图片拖拽正常
- [ ] 图片大小调整正常

**预估时长**: 4h

---

#### Task 2.2: 实现表格块

**描述**: 实现表格创建和编辑

**文件**:
- `packages/editor/src/extensions/table/index.tsx`

**验收标准**:
- [ ] 创建表格正常
- [ ] 编辑单元格正常
- [ ] 合并单元格正常
- [ ] 添加/删除行列正常

**预估时长**: 6h

---

#### Task 2.3: 实现数学公式块

**描述**: 集成 KaTeX

**文件**:
- `packages/editor/src/extensions/math/index.tsx`

**验收标准**:
- [ ] 行内公式正常（`$...$`）
- [ ] 块级公式正常（`$$...$$`）
- [ ] 公式渲染正确

**预估时长**: 4h

---

#### Task 2.4: 实现 Mermaid 图表块

**描述**: 集成 Mermaid 渲染

**文件**:
- `packages/editor/src/extensions/mermaid/index.tsx`

**验收标准**:
- [ ] Mermaid 图表渲染正常
- [ ] 复用 md-parser 的 Worker 架构
- [ ] 失败时显示源代码

**预估时长**: 4h

---

### Phase 3: 工具栏

#### Task 3.1: 实现浮动工具栏（Bubble Menu）

**描述**: 选中文字时显示工具栏

**文件**:
- `packages/editor/src/toolbar/BubbleMenu.tsx`

**验收标准**:
- [ ] 选中文字时弹出
- [ ] 加粗/斜体/链接/代码按钮正常
- [ ] 位置正确

**预估时长**: 3h

---

#### Task 3.2: 实现块菜单（Block Menu）

**描述**: 悬停块时显示操作菜单

**文件**:
- `packages/editor/src/toolbar/BlockMenu.tsx`

**验收标准**:
- [ ] 悬停块时显示
- [ ] 拖拽手柄正常
- [ ] 删除/复制块正常

**预估时长**: 3h

---

#### Task 3.3: 实现底部工具栏

**描述**: 固定在编辑器底部的工具栏

**文件**:
- `packages/editor/src/toolbar/BottomToolbar.tsx`

**验收标准**:
- [ ] 字数统计正常
- [ ] 保存状态显示正常
- [ ] 快捷操作按钮正常

**预估时长**: 2h

---

### Phase 4: 渲染优化

#### Task 4.1: 实现 DOM 渲染器（Phase 1）

**描述**: 实现基础 DOM 渲染器

**文件**:
- `packages/editor/src/renderer/DOMRenderer.tsx`

**验收标准**:
- [ ] 渲染编辑器内容正常
- [ ] 支持只读模式
- [ ] 小文档（< 5000 字）性能良好

**预估时长**: 4h

---

#### Task 4.2: 实现虚拟列表渲染器（Phase 2）

**描述**: 使用 react-window 实现虚拟滚动

**文件**:
- `packages/editor/src/renderer/VirtualizedRenderer.tsx`
- `packages/editor/src/renderer/strategy.ts`

**验收标准**:
- [ ] 虚拟滚动正常
- [ ] 仅渲染可视区域块
- [ ] 中文档（5000-20000 字）FPS > 55

**预估时长**: 6h

---

#### Task 4.3: 预留 Canvas/WebGL 接口

**描述**: 设计 Phase 3/4 的渲染接口（空实现）

**文件**:
- `packages/editor/src/renderer/CanvasRenderer.tsx`
- `packages/editor/src/renderer/WebGLRenderer.tsx`

**验收标准**:
- [ ] 接口定义完整
- [ ] 文档说明未来实现

**预估时长**: 2h

---

#### Task 4.4: 实现渲染策略选择器

**描述**: 根据文档大小自动选择渲染策略

**文件**:
- `packages/editor/src/renderer/strategy.ts`
- `packages/editor/src/renderer/index.tsx`

**验收标准**:
- [ ] 根据字数自动选择渲染器
- [ ] 策略切换正常

**预估时长**: 2h

---

### Phase 5: Markdown 双向转换

#### Task 5.1: 实现 JSON → Markdown 导出

**描述**: 将编辑器内容导出为 Markdown

**文件**:
- `packages/editor/src/converters/markdown.ts`

**验收标准**:
- [ ] 所有块类型正确导出
- [ ] 导出格式符合 GFM 规范
- [ ] 支持导出为 .md 文件

**预估时长**: 4h

---

#### Task 5.2: 实现 Markdown → JSON 导入

**描述**: 将 Markdown 导入为编辑器内容

**文件**:
- `packages/editor/src/converters/markdown.ts`

**验收标准**:
- [ ] GFM 语法正确解析
- [ ] 复杂格式转换正常
- [ ] 不支持的格式给出警告

**预估时长**: 4h

---

#### Task 5.3: 实现现有文章迁移

**描述**: 将已存储的 Markdown 自动转换为编辑器格式

**验收标准**:
- [ ] 批量迁移脚本正常
- [ ] 迁移后数据完整
- [ ] 可回滚

**预估时长**: 3h

---

### Phase 6: 自动保存

#### Task 6.1: 实现 IndexedDB 缓存

**描述**: 使用 IndexedDB 存储草稿

**文件**:
- `packages/editor/src/autosave/indexeddb.ts`

**验收标准**:
- [ ] IndexedDB 读写正常
- [ ] 草稿列表查询正常
- [ ] 离线编辑正常

**预估时长**: 4h

---

#### Task 6.2: 实现自动保存逻辑

**描述**: 实现定时自动保存和防抖

**文件**:
- `packages/editor/src/autosave/index.ts`

**验收标准**:
- [ ] 防抖 500ms 正常
- [ ] 定时 30s 保存正常
- [ ] 本地 + 远程同步正常

**预估时长**: 4h

---

#### Task 6.3: 实现冲突检测与恢复

**描述**: 检测多设备编辑冲突

**文件**:
- `packages/editor/src/autosave/conflict.ts`

**验收标准**:
- [ ] 冲突检测正常
- [ ] 提示用户选择正常
- [ ] 合并逻辑正常（可选）

**预估时长**: 4h

---

#### Task 6.4: 后端版本快照存储

**描述**: 实现 article_draft_versions 表和 API

**文件**:
- `services/svc-content/src/models/article_draft_version.rs`
- `proto/luhanxin/community/v1/article.proto` — 新增 SaveDraftVersion RPC

**验收标准**:
- [ ] 数据表创建成功
- [ ] RPC 接口正常
- [ ] 保留最近 10 个版本

**预估时长**: 4h

---

### Phase 7: 集成与测试

#### Task 7.1: 集成到 article 子应用

**描述**: 在 apps/article 中使用 @luhanxin/editor

**文件**:
- `apps/article/src/pages/pages/edit/index.tsx`
- `apps/article/src/pages/pages/detail/index.tsx`

**验收标准**:
- [ ] 编辑器正常渲染
- [ ] 文章创建/编辑流程正常
- [ ] 文章详情页渲染正常

**预估时长**: 4h

---

#### Task 7.2: 替换现有 ArticleEditor

**描述**: 移除旧的 textarea 编辑器

**验收标准**:
- [ ] 旧编辑器代码移除
- [ ] 所有引用更新
- [ ] 无遗留代码

**预估时长**: 2h

---

#### Task 7.3: 性能测试

**描述**: 测试不同文档大小的渲染性能

**验收标准**:
- [ ] < 5000 字：DOM 渲染，FPS > 60
- [ ] 5000-20000 字：虚拟列表，FPS > 55
- [ ] 自动保存延迟 < 100ms
- [ ] IndexedDB 写入延迟 < 50ms

**预估时长**: 3h

---

#### Task 7.4: 端到端测试

**描述**: 测试完整的编辑流程

**验收标准**:
- [ ] 创建文章正常
- [ ] 编辑文章正常
- [ ] 自动保存正常
- [ ] 离线编辑正常
- [ ] Markdown 导入/导出正常

**预估时长**: 4h

---

#### Task 7.5: 更新文档

**描述**: 更新技术文档

**文件**:
- `docs/tech/10-tiptap-editor-selection.md`
- `docs/tech/11-editor-rendering-optimization.md`

**验收标准**:
- [ ] TipTap 选型文档完成
- [ ] 渲染优化文档完成
- [ ] 技术文档索引更新

**预估时长**: 3h

---

## 总计

- **Phase 1: 核心编辑器骨架**: ~22h
- **Phase 2: 高级块类型**: ~18h
- **Phase 3: 工具栏**: ~8h
- **Phase 4: 渲染优化**: ~14h
- **Phase 5: Markdown 双向转换**: ~11h
- **Phase 6: 自动保存**: ~16h
- **Phase 7: 集成与测试**: ~16h
- **总时长**: ~105h（约 13 个工作日）

---

## 后续 Change 任务（不在此范围）

| Change | 任务范围 |
|--------|---------|
| **editor-collab** | Yjs 协同编辑 + 版本历史 + WebSocket 服务 |
| **editor-workspace** | 用户创作空间 + 公开分享 + 文章模板系统 |
