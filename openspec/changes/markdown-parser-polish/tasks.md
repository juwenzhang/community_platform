## 任务拆分

### Phase 1: Case 覆盖审计

#### Task 1.1: 编写 Markdown 渲染能力支持矩阵
- [ ] 创建 `docs/tech/10-markdown-rendering-capability-matrix.md`
- [ ] 列出 CommonMark / GFM / 平台自定义 / 图表 / 公式 五大类的全部语法点
- [ ] 标注每项的支持状态（✅/⚠️/❌）和现状描述
- **预估**: 3h

#### Task 1.2: 创建边界 case 测试集
- [ ] `packages/md-parser-core/src/__tests__/cases/footnotes.test.ts`
- [ ] `cases/nested-blockquote.test.ts`
- [ ] `cases/long-table.test.ts`
- [ ] `cases/html-embed.test.ts`（details/summary/kbd 等）
- [ ] `cases/escape-chars.test.ts`
- [ ] `cases/complex-lists.test.ts`
- [ ] `cases/code-edge.test.ts`（特殊字符、超长行）
- [ ] `cases/math-complex.test.ts`（矩阵、align 环境）
- [ ] `cases/custom-syntax-edge.test.ts`（mention 在引用/代码块中应不解析）
- **预估**: 6h

#### Task 1.3: 补全缺失能力
- [ ] 根据矩阵评估必须补的能力（如 `remark-footnotes`）
- [ ] 实现并通过对应 case
- **预估**: 4h

#### Task 1.4: 添加 fuzz 测试
- [ ] 随机 Markdown 生成器
- [ ] 1000 次解析不崩溃
- **预估**: 2h

---

### Phase 2: 视觉抛光（theme 包）

#### Task 2.1: 设计 Token 重整
- [ ] 整理 CSS 变量：颜色（主题色 + 中性灰阶）、间距、字号、行高、圆角、阴影
- [ ] 与项目 `apps/main/src/styles/variables.less` 设计 token 对齐
- **预估**: 3h

#### Task 2.2: 排版重设计
- [ ] h1-h6 字号阶梯、margin、行高、border-bottom（h1/h2）
- [ ] 段落、列表、引用、水平线的间距和颜色
- [ ] 行内 code、链接的样式
- **预估**: 4h

#### Task 2.3: 代码块美化
- [ ] 圆角 wrapper + 深色主题背景
- [ ] 语言 tag 视觉优化
- [ ] 复制按钮 hover/active/已复制 三态动画
- [ ] 引入代码字体栈（JetBrains Mono / Fira Code / Menlo fallback）
- [ ] 行号支持（可选）
- **预估**: 5h

#### Task 2.4: 自定义容器美化
- [ ] tip/warning/info/danger 各配 SVG icon
- [ ] 左侧色条 + 浅色背景 + 标题加粗
- [ ] 暗色模式适配
- **预估**: 3h

#### Task 2.5: Mermaid 卡片化
- [ ] 圆角白卡片 + 阴影 + 居中
- [ ] loading 骨架优化
- [ ] error 状态友好展示
- **预估**: 2h

#### Task 2.6: KaTeX 优化
- [ ] display 模式居中 + 横向滚动
- [ ] inline 与文字基线对齐
- **预估**: 2h

#### Task 2.7: 表格 / mention / hashtag / heading-anchor
- [ ] 表格：斑马纹 + hover + 横向滚动
- [ ] mention/hashtag：Pill 样式 + hover 过渡
- [ ] heading-anchor：默认隐藏，hover 淡入
- **预估**: 3h

#### Task 2.8: 暗色模式
- [ ] 通过 `[data-theme="dark"]` 覆盖 CSS 变量
- [ ] Mermaid theme 切换对接
- [ ] Shiki 主题切换（亮：github-light，暗：github-dark）
- **预估**: 4h

---

### Phase 3: 主站接入

#### Task 3.1: 评估 CopyableCodeBlock 合并
- [ ] 对比 `apps/main` 现有 `CopyableCodeBlock` 与 md-parser-react 的 `CodeBlock`
- [ ] 决策：合并 / 替换 / 保留
- **预估**: 1h

#### Task 3.2: 替换 MarkdownRender 组件
- [ ] `apps/main/src/components/MarkdownRender/index.tsx` 改用 `<MarkdownRenderer>` from `@luhanxin/md-parser-react`
- [ ] 保留组件签名（`{ content }`），对调用方透明
- [ ] 移除 react-markdown / remark-gfm / remark-breaks / rehype-slug 依赖
- **预估**: 2h

#### Task 3.3: 引入 theme CSS
- [ ] `apps/main/src/main.tsx` 引入 `@luhanxin/md-parser-theme`
- [ ] 验证不冲突 antd / tailwind / 项目自身样式
- **预估**: 1h

#### Task 3.4: 文章详情页验证
- [ ] `apps/main/src/pages/post/pages/detail/index.tsx` 渲染验证
- [ ] TOC 集成（如需）
- [ ] 滚动锚定、复制代码、点击 mention 等交互验证
- **预估**: 2h

#### Task 3.5: 编辑器预览验证
- [ ] `apps/main/src/components/ArticleEditor/` 预览面板验证
- [ ] 实时预览 + debounce 体验
- **预估**: 2h

#### Task 3.6: Feature flag
- [ ] 新旧渲染器切换开关（环境变量或 localStorage）
- [ ] 灰度回滚预案
- **预估**: 2h

---

### Phase 4: 真实文章回归

#### Task 4.1: 准备回归集
- [ ] 抓取/准备 10-20 篇典型技术文档（含代码、图表、公式、表格、容器）
- [ ] 分类整理到 `tests/fixtures/markdown/`
- **预估**: 2h

#### Task 4.2: 截图对比
- [ ] Playwright 脚本：旧渲染 vs 新渲染，逐篇截图
- [ ] 生成 diff 报告（HTML 索引）
- **预估**: 4h

#### Task 4.3: 逐项审阅
- [ ] 标注每个 diff 是改进 / 回归 / 中性
- [ ] 回归项创建 issue 或修复
- **预估**: 3h

---

### Phase 5: 文档与归档

#### Task 5.1: 更新 README
- [ ] md-parser-theme README 增加暗色模式说明
- [ ] md-parser-react README 增加主站接入示例
- **预估**: 1h

#### Task 5.2: 更新 tech 文档索引
- [ ] `docs/tech/` 新增条目：能力支持矩阵
- **预估**: 0.5h

#### Task 5.3: 会话日志
- [ ] `.codebuddy/memory/YYYY-MM-DD.md`
- **预估**: 0.5h

---

## 总计

- **Case 覆盖**: ~15h
- **视觉抛光**: ~26h
- **主站接入**: ~10h
- **回归验证**: ~9h
- **文档**: ~2h
- **总时长**: ~62h（约 8 个工作日）
