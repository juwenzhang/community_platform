## 1. Proto 定义

- [ ] 1.1 创建 `proto/luhanxin/community/v1/websocket.proto` — 定义 `WsMessage` 消息类型
- [ ] 1.2 执行 `make proto` 生成代码

> **依赖**：无前置依赖。

## 2. Gateway WebSocket 端点

- [ ] 2.1 在 `services/gateway/Cargo.toml` 添加 `tokio-tungstenite` + `dashmap` 依赖
- [ ] 2.2 创建 `services/gateway/src/ws/mod.rs` — WebSocket 模块入口
- [ ] 2.3 创建 `services/gateway/src/ws/connection.rs` — `ConnectionManager`（DashMap 管理活跃连接）
- [ ] 2.4 创建 `services/gateway/src/ws/handler.rs` — WS 握手 handler + JWT 认证（subprotocol 方案）
- [ ] 2.5 创建 `services/gateway/src/ws/session.rs` — WS 消息循环（读/写/心跳保活）
- [ ] 2.6 在 `services/gateway/src/main.rs` 中注册 `/ws` 路由

> **依赖**：依赖 Phase 1（Proto 定义）。

## 3. NATS→WS 桥接

- [ ] 3.1 创建 `services/gateway/src/ws/bridge.rs` — 订阅 NATS 通知 Subject
- [ ] 3.2 实现事件路由 — 解析 NATS 消息 → 查找目标用户连接 → 推送
- [ ] 3.3 实现离线处理 — 目标用户不在线时记录到 Redis（或跳过，依赖轮询补齐）
- [ ] 3.4 在 Gateway 启动时启动 bridge 任务

> **依赖**：依赖 Phase 2（WS 端点就绪）。

## 4. 前端 WS Client

- [ ] 4.1 创建 `apps/main/src/lib/ws-client.ts` — WebSocket 客户端类
- [ ] 4.2 实现 JWT 认证握手 — subprotocol 方案传递 token
- [ ] 4.3 实现自动重连 — 指数退避 + 随机抖动
- [ ] 4.4 实现消息类型路由 — notification/interaction/system
- [ ] 4.5 与 `useAuthStore` 集成 — 登录时连接，登出时断开

> **依赖**：依赖 Phase 2（后端 WS 端点就绪）。

## 5. 通知 UI 实时更新

- [ ] 5.1 修改通知 store — 从轮询改为 WS 监听
- [ ] 5.2 修改通知铃铛组件 — WS 推送时实时更新未读数和通知列表
- [ ] 5.3 实现通知弹出效果 — 新通知到达时的 Toast/Popup 动画
- [ ] 5.4 保留轮询作为 fallback — WS 连接失败时降级为轮询

> **依赖**：依赖 Phase 4（WS Client 就绪）。

## 6. 验证

- [ ] 6.1 WS 连接测试 — 握手认证、心跳保活、异常断开
- [ ] 6.2 消息推送测试 — 评论/点赞/@提及 触发 WS 推送
- [ ] 6.3 重连测试 — 网络中断后自动重连
- [ ] 6.4 降级测试 — WS 不可用时回退到轮询
- [ ] 6.5 并发测试 — 多用户同时在线推送
