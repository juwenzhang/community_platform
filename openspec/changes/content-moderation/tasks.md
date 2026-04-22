## 任务拆分（骨架 — 启动时细化）

### Phase 1: 词库与核心算法（~6h）
- [ ] T1.1 收集开源敏感词库（政治/色情/广告/暴恐/辱骂 5 类）
- [ ] T1.2 整理为 `config/sensitive-words.yaml`，分级（block/warn/review）
- [ ] T1.3 `shared/src/moderation/ac_automaton.rs`：aho-corasick 封装
- [ ] T1.4 `shared/src/moderation/word_loader.rs`：YAML 加载 + 热加载

### Phase 2: 外链黑名单 + 频率限流（~4h）
- [ ] T2.1 `shared/src/moderation/link_blocklist.rs`：hashset 查询
- [ ] T2.2 `shared/src/moderation/rate_limiter.rs`：Redis 计数器
- [ ] T2.3 限流策略配置（新用户/老用户差异化）

### Phase 3: Gateway 拦截器（~6h）
- [ ] T3.1 `gateway/interceptors/moderation/mod.rs`
- [ ] T3.2 接入 CreateArticle / UpdateArticle / CreateComment / UpdateProfile
- [ ] T3.3 错误类型定义 + 友好提示文案
- [ ] T3.4 测试：违禁词阻止、可疑词标记、正常内容通过

### Phase 4: 数据库 + Proto（~4h）
- [ ] T4.1 迁移：articles/comments 新增 moderation_status
- [ ] T4.2 proto 新增 ModerationStatus enum
- [ ] T4.3 entity 重新生成

### Phase 5: 后台审核 UI 最小版（~8h）
- [ ] T5.1 `apps/main` 或独立 admin 入口
- [ ] T5.2 pending 列表 + 一键通过/驳回
- [ ] T5.3 审核日志查看

### Phase 6: 前端提示 UI（~3h）
- [ ] T6.1 保存失败时友好提示「包含违禁内容，请修改后重试」
- [ ] T6.2 高亮显示违禁词位置（可选）

### Phase 7: 文档与归档（~3h）
- [ ] T7.1 README
- [ ] T7.2 tech 文档：敏感词过滤方案
- [ ] T7.3 Archive

## 总计

约 34h / 4-5 个工作日。细化由启动时 `openspec-continue-change` 完成。
