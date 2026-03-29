# 软件开发专业术语手册 — 从 MVP 到 Production

> 📅 创建日期：2026-03-29
> 📌 作者：luhanxin
> 🏷️ 标签：技术文档 · 术语 · 软件工程

---

## 1. 产品阶段术语

### 1.1 早期阶段（从 0 到"能用"）

| 术语 | 全称 | 含义 | 我们项目中 |
|------|------|------|-----------|
| **PoC** | Proof of Concept | 概念验证。只验证技术可行性，不做完整产品。如：验证 Rust + gRPC 能不能跑通、微前端能不能加载子应用 | ✅ 已完成（gRPC + Garfish + Consul 验证） |
| **Prototype** | — | 原型。侧重 UI 流程和交互演示，不一定有真实后端 | ✅ 已完成（页面结构、路由、登录流程） |
| **MVP** | Minimum Viable Product | 最小可行产品。只做核心功能，能跑通主流程，验证需求，不追求完美 | ✅ **当前阶段**（用户认证 + 文章 CRUD） |
| **MLP** | Minimum Lovable Product | 最小可爱产品。比 MVP 多一层：好用、好看、体验顺滑，不再是"能用就行" | 下一个目标（掘金风格 UI 打磨 + 编辑器升级） |
| **MMP** | Minimum Marketable Product | 最小可市场化产品。能正式对外、能商业化的最小版本 | 远期目标（需要搜索、通知、管理后台等） |

### 1.2 产品生命周期（从开发到成熟）

| 术语 | 全称 | 含义 | 典型特征 |
|------|------|------|---------|
| **Pre-alpha** | — | 极早期内部版本。功能残缺，极不稳定，只给开发者自己看 | 编译能过、核心链路能走通 |
| **Alpha** | — | 内部测试版。核心功能基本可用，Bug 较多，仅内部测试 | 团队内部试用 |
| **Beta** | — | 公开测试版。功能基本完整，开放给真实用户找 Bug | 邀请制公测 |
| **RC** | Release Candidate | 发布候选版。"如果没大问题，这就是最终版" | 最后一轮全面测试 |
| **GA** | General Availability | 正式商用版 / 全面可用版。可以大规模上线、对外服务 | 正式发布公告 |
| **LTS** | Long Term Support | 长期支持版本。稳定、持续维护，适合生产环境长期使用（如 Node 20 LTS） | 2-3 年安全补丁 |
| **EOL** | End of Life | 生命周期终止。不再维护，建议迁移 | 停止安全更新 |

### 1.3 产品演进路径

三种常见的演进路径：

**路径 A：小步快跑迭代**
```
MVP → V1 → V2 → V3 → …
```

**路径 B：从可用到可商业化**
```
MVP → MLP → MMP → Scale
可用    好用    可卖    可扩展
```

**路径 C：技术验证到生产（我们的项目）**
```
PoC → Prototype → MVP → Alpha → Beta → GA
验证    原型       可用    内测    公测    正式
```

### 1.4 本项目阶段对照

```
✅ PoC     — 验证 Rust gRPC + React Garfish + Consul 技术栈
✅ Prototype — 跑通页面结构、路由、登录、微前端挂载
🔵 MVP     — 核心业务可用（用户认证 + 文章 CRUD）← 当前
⬜ MLP     — 好用好看（编辑器升级 + 协同编辑 + UI 打磨）
⬜ Alpha   — 内部完整功能（评论/搜索/通知/管理后台）
⬜ Beta    — 小范围用户试用
⬜ GA      — 正式对外
```

### 1.5 Pilot（试点）

| 术语 | 含义 |
|------|------|
| **Pilot** | 试点。在正式全面推广前，选一小群用户 / 一个部门 / 一个区域先试用 |
| **Pilot → Production** | PoC 验证技术可行 → Pilot 验证业务可行 → Production 全面上线 |

和 Beta 的区别：Beta 是公开测试收集 Bug，Pilot 是**验证业务流程在真实场景中是否跑得通**。

### 1.6 版本发布

| 术语 | 含义 |
|------|------|
| **SemVer** | Semantic Versioning（语义化版本）：`MAJOR.MINOR.PATCH`，如 `1.2.3` |
| **Breaking Change** | 不兼容变更。升级后旧代码会挂，SemVer 中 MAJOR 版本号 +1 |
| **Feature Flag** | 功能开关。代码已部署但通过配置控制是否启用，实现灰度发布 |
| **Canary Release** | 金丝雀发布。先给 1-5% 用户用新版本，观察无问题再全量 |
| **Blue-Green Deploy** | 蓝绿部署。两套环境交替切换，实现零停机发布 |
| **Rolling Update** | 滚动更新。逐个替换旧实例为新版本（K8s 默认策略） |
| **Rollback** | 回滚。发布后发现问题，退回到上一个稳定版本 |
| **Hotfix** | 热修复。紧急修复线上 bug 的临时补丁 |

---

## 2. 架构术语

### 2.1 架构模式

| 术语 | 含义 | 我们项目中 |
|------|------|-----------|
| **Monolith** | 单体架构。所有功能在一个进程中 | — |
| **Microservices** | 微服务。每个功能域独立部署 | ✅ svc-user, svc-content, gateway |
| **BFF** | Backend for Frontend。为前端定制的后端聚合层 | ✅ Gateway 就是 BFF |
| **API Gateway** | API 网关。统一入口，负责路由、认证、限流 | ✅ 我们的 Gateway |
| **Sidecar** | 边车模式。主进程旁挂一个辅助进程（如 Envoy） | — |
| **Event-Driven** | 事件驱动。服务间通过事件/消息通信 | ✅ NATS 消息队列 |
| **CQRS** | Command Query Responsibility Segregation | 读写分离。写操作和读操作走不同的模型/数据源 |
| **Event Sourcing** | 事件溯源。不存状态，存事件序列，状态通过回放事件得出 | — |
| **DDD** | Domain-Driven Design | 领域驱动设计。按业务领域划分边界（Bounded Context） |
| **Hexagonal** | 六边形架构（端口和适配器）。核心逻辑不依赖外部框架 | — |

### 2.2 通信模式

| 术语 | 含义 | 我们项目中 |
|------|------|-----------|
| **RPC** | Remote Procedure Call | 远程过程调用，像调本地函数一样调远程服务 | ✅ gRPC / Tonic |
| **REST** | Representational State Transfer | 基于 HTTP 动词的 API 风格 | ✅ Swagger REST proxy |
| **gRPC** | Google RPC | 基于 HTTP/2 + Protobuf 的高性能 RPC | ✅ 核心通信协议 |
| **GraphQL** | — | 查询语言，客户端精确指定需要的字段 | — |
| **WebSocket** | — | 全双工长连接，服务端可主动推送 | 后续通知系统会用 |
| **SSE** | Server-Sent Events | 服务端单向推送（HTTP 长连接） | 后续 AI 流式输出 |
| **Pub/Sub** | Publish/Subscribe | 发布/订阅模式 | ✅ NATS |

### 2.3 数据层

| 术语 | 含义 |
|------|------|
| **ORM** | Object-Relational Mapping。对象关系映射，用代码操作数据库（如 SeaORM） |
| **Migration** | 数据库迁移。版本化管理表结构变更 |
| **Entity** | 实体。ORM 中对应数据库表的 Rust/TS 结构体 |
| **ActiveRecord** | 活动记录模式。Entity 自带 CRUD 方法（SeaORM 的 ActiveModel） |
| **Connection Pool** | 连接池。复用数据库连接，避免频繁创建/销毁 |
| **N+1 Problem** | 查询 N 条记录时，额外发 N 次子查询（应该用 JOIN 或批量查询） |
| **Cursor Pagination** | 游标分页。用上一页最后一条的标识作为下一页起点（vs offset 分页） |
| **Soft Delete** | 软删除。不真删，标记状态为"已删除" |

---

## 3. 前端术语

### 3.1 工程化

| 术语 | 含义 | 我们项目中 |
|------|------|-----------|
| **Monorepo** | 单仓多包。所有子项目在一个 Git 仓库 | ✅ pnpm workspace |
| **Polyrepo** | 多仓。每个子项目独立仓库 | — |
| **Micro Frontend** | 微前端。多个前端子应用独立开发/部署/运行 | ✅ Garfish |
| **Code Splitting** | 代码分割。按路由/组件拆分 JS bundle | ✅ React.lazy |
| **Tree Shaking** | 摇树优化。打包时去掉未使用的代码 | ✅ Vite/esbuild |
| **HMR** | Hot Module Replacement | 热模块替换。修改代码不刷新页面 |
| **SSR** | Server-Side Rendering | 服务端渲染（Next.js / Nuxt） |
| **SSG** | Static Site Generation | 静态站点生成（build 时生成 HTML） |
| **SPA** | Single Page Application | 单页应用 | ✅ 我们就是 SPA |
| **CSR** | Client-Side Rendering | 客户端渲染 | ✅ |
| **ISR** | Incremental Static Regeneration | 增量静态再生（Next.js 特有） |

### 3.2 状态管理

| 术语 | 含义 |
|------|------|
| **Store** | 全局状态容器（Zustand / Redux / Pinia） |
| **Selector** | 选择器。从 store 中精确提取需要的数据片段 |
| **Middleware** | 中间件。拦截 action 做额外处理（日志、异步等） |
| **Hydration** | 水合。SSR 生成的 HTML 在客户端"激活"，绑定事件和状态 |
| **Stale While Revalidate** | 先返回缓存数据，后台刷新（SWR / TanStack Query 的核心策略） |

### 3.3 CSS 工程化

| 术语 | 含义 | 我们项目中 |
|------|------|-----------|
| **CSS Modules** | CSS 模块。类名自动加 hash，组件级作用域 | ✅ `.module.less` |
| **CSS-in-JS** | 用 JS 写 CSS（styled-components / Emotion） | — |
| **Atomic CSS** | 原子化 CSS。每个类只做一件事（Tailwind） | ✅ Tailwind |
| **BEM** | Block Element Modifier。CSS 命名规范 `.block__element--modifier` | — |
| **CSS Variables** | CSS 自定义属性。运行时可变，支持主题切换 | ✅ `--color-primary` |
| **Design Token** | 设计令牌。颜色/间距/圆角等设计系统的最小单元 | ✅ `variables.less` |

---

## 4. 后端术语

### 4.1 服务治理

| 术语 | 含义 | 我们项目中 |
|------|------|-----------|
| **Service Discovery** | 服务发现。自动找到服务实例的地址 | ✅ Consul |
| **Load Balancing** | 负载均衡。请求分发到多个实例 | — |
| **Circuit Breaker** | 熔断器。下游故障时快速失败，防止雪崩 | — |
| **Rate Limiting** | 限流。控制请求频率 | — |
| **Retry** | 重试。失败后自动重试 | ✅ RetryInterceptor + NATS |
| **Timeout** | 超时。请求超时自动失败 | — |
| **Graceful Degradation** | 优雅降级。部分功能不可用时，核心功能仍可用 | ✅ svc-user DB 不可用时降级 |
| **Health Check** | 健康检查。定期检测服务是否存活 | ✅ gRPC Health Protocol |
| **Idempotent** | 幂等。同一请求执行多次，结果和执行一次一样 | — |

### 4.2 安全

| 术语 | 含义 | 我们项目中 |
|------|------|-----------|
| **JWT** | JSON Web Token | 自包含的认证令牌 | ✅ |
| **OAuth 2.0** | 开放授权协议。第三方登录 | 后续规划 |
| **RBAC** | Role-Based Access Control | 基于角色的权限控制 | 后续管理后台 |
| **ABAC** | Attribute-Based Access Control | 基于属性的权限控制（更灵活） | — |
| **CORS** | Cross-Origin Resource Sharing | 跨域资源共享 | ✅ Gateway 配置 |
| **CSRF** | Cross-Site Request Forgery | 跨站请求伪造 | — |
| **XSS** | Cross-Site Scripting | 跨站脚本攻击 | Markdown 渲染需防范 |
| **SQL Injection** | SQL 注入 | ORM 参数化查询自动防范 | ✅ SeaORM |
| **bcrypt** | 密码哈希算法 | ✅ 注册/登录 |
| **Salt** | 盐值。哈希前追加的随机值（bcrypt 自动处理） | ✅ |

### 4.3 并发

| 术语 | 含义 | 我们项目中 |
|------|------|-----------|
| **Async/Await** | 异步编程模型 | ✅ Rust tokio / JS Promise |
| **spawn_blocking** | 把阻塞操作放到专用线程池（不阻塞 async 运行时） | ✅ bcrypt 哈希 |
| **Connection Pool** | 连接池。复用连接避免频繁创建 | ✅ SeaORM / tonic Channel |
| **Backpressure** | 背压。下游处理不过来时，上游降速 | — |
| **Dead Letter Queue** | 死信队列。处理失败的消息暂存，后续重试或人工处理 | — |

---

## 5. DevOps & 工程实践

### 5.1 开发流程

| 术语 | 含义 |
|------|------|
| **CI/CD** | Continuous Integration / Continuous Deployment。持续集成/持续部署 |
| **Trunk-Based Development** | 主干开发。所有人向 main 分支提交，用 feature flag 控制 |
| **Git Flow** | Git 流程。feature/develop/release/hotfix 多分支模型 |
| **PR / MR** | Pull Request / Merge Request。代码合并请求 + Review |
| **Code Review** | 代码评审。合并前同事审查代码质量 |
| **Linting** | 静态分析。自动检查代码风格和潜在问题（Biome / ESLint / Clippy） |
| **Pre-commit Hook** | 提交前钩子。自动跑 lint + format | 
| **Conventional Commits** | 约定式提交。`feat(scope): message` 格式 |

### 5.2 测试

| 术语 | 含义 |
|------|------|
| **Unit Test** | 单元测试。测试最小代码单元（函数/方法） |
| **Integration Test** | 集成测试。测试模块间的交互 |
| **E2E Test** | 端到端测试。模拟真实用户操作（Playwright / Cypress） |
| **Regression Test** | 回归测试。确保新改动没有破坏已有功能 |
| **TDD** | Test-Driven Development。先写测试，再写实现 |
| **BDD** | Behavior-Driven Development。用自然语言描述行为（Given/When/Then） |
| **Mock** | 模拟。用假数据/假实现替代真实依赖 |
| **Fixture** | 测试夹具。预设的测试数据 |
| **Coverage** | 覆盖率。代码被测试覆盖的百分比 |
| **Snapshot Test** | 快照测试。对比渲染输出和之前的快照是否一致 |

### 5.3 可观测性

| 术语 | 含义 |
|------|------|
| **Logging** | 日志。记录运行时事件（tracing crate） |
| **Metrics** | 指标。数值化的系统状态（QPS / 延迟 / 错误率） |
| **Tracing** | 链路追踪。一次请求经过的所有服务的调用链（OpenTelemetry） |
| **Alerting** | 告警。指标异常时自动通知 |
| **SLA** | Service Level Agreement。服务等级协议（如 99.9% 可用性） |
| **SLO** | Service Level Objective。服务等级目标（SLA 的内部版本） |
| **P50 / P99** | 百分位延迟。50% / 99% 的请求在多少毫秒内完成 |

---

## 6. 设计模式术语（本项目用到的）

| 术语 | 含义 | 我们项目中 |
|------|------|-----------|
| **Interceptor / Middleware** | 拦截器/中间件。在请求处理前后插入逻辑 | ✅ Gateway InterceptorPipeline |
| **Pipeline** | 管道模式。多个处理器串联 | ✅ pre → call → post |
| **Strategy** | 策略模式。运行时切换算法 | ✅ ConfigProvider（Dev / Env） |
| **Observer / Pub-Sub** | 观察者/发布订阅 | ✅ NATS |
| **Factory** | 工厂模式。封装对象创建过程 | — |
| **Singleton** | 单例模式。全局唯一实例 | ✅ AppRegistry |
| **Adapter** | 适配器模式。接口转换 | ✅ registryToRoutes / getGarfishApps |
| **Proxy** | 代理模式 | ✅ Gateway REST proxy |
| **Bridge** | 桥接模式 | ✅ Garfish vueBridge / reactBridge |

---

## 7. 缩写速查表

| 缩写 | 全称 |
|------|------|
| API | Application Programming Interface |
| SDK | Software Development Kit |
| CLI | Command Line Interface |
| IDE | Integrated Development Environment |
| DNS | Domain Name System |
| CDN | Content Delivery Network |
| CRUD | Create Read Update Delete |
| ORM | Object-Relational Mapping |
| DTO | Data Transfer Object |
| DAO | Data Access Object |
| IoC | Inversion of Control |
| DI | Dependency Injection |
| CI/CD | Continuous Integration / Continuous Deployment |
| k8s | Kubernetes（k + 8 个字母 + s） |
| gRPC | Google Remote Procedure Call |
| JWT | JSON Web Token |
| CORS | Cross-Origin Resource Sharing |
| WASM | WebAssembly |
| PWA | Progressive Web App |
| SEO | Search Engine Optimization |

---

## 8. 参考资料

- [Conventional Commits](https://www.conventionalcommits.org/)
- [SemVer](https://semver.org/)
- [12 Factor App](https://12factor.net/)
- [Martin Fowler's Microservices](https://martinfowler.com/articles/microservices.html)
- [The Pragmatic Programmer](https://pragprog.com/titles/tpp20/)
