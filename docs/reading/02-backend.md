# 核心推荐阅读 — 后端篇

> 📅 创建日期：2026-03-29
> 📌 作者：luhanxin
> 🏷️ 标签：推荐阅读 · 后端 · 架构 · Rust · 微服务

---

## 0. 宝藏博主 & 学习资源（先收藏）

> 后端不像前端有那么多花哨的东西，但这些博主写的每篇都是**真枪实弹的工程经验**。

### 🌍 后端架构 & 分布式系统

| 博主 | 擅长 | 资源地址 | 推荐理由 |
|------|------|---------|---------|
| **Alex Xu (ByteByteGo)** | 系统设计 | [blog.bytebytego.com](https://blog.bytebytego.com/) | 100 万订阅，System Design 可视化讲解全网最佳，每篇配图都是艺术品 |
| **Martin Kleppmann** | 分布式系统 | [martin.kleppmann.com](https://martin.kleppmann.com/) | DDIA 作者，分布式系统领域的教科书级人物 |
| **Werner Vogels** | 大规模架构 | [allthingsdistributed.com](https://www.allthingsdistributed.com/) | AWS CTO，Amazon 架构设计哲学的第一手来源 |
| **Julia Evans** | 系统/网络/调试 | [jvns.ca](https://jvns.ca/) | Wizard Zines 作者，用漫画讲 Linux/网络/系统，看完就懂系列 |
| **Brandur Leach** | PostgreSQL、系统设计 | [brandur.org](https://www.brandur.org/articles) | Stripe 前工程师，PostgreSQL 实战和后端架构写得极好 |
| **Hussein Nasser** | 数据库、网络协议 | [YouTube @habormoat](https://www.youtube.com/@habormoat) | 数据库工程课天花板，把 Postgres/Redis 内部原理讲得明明白白 |

### 🦀 Rust 生态

| 博主 | 擅长 | 资源地址 | 推荐理由 |
|------|------|---------|---------|
| **fasterthanlime (Amos)** | Rust 深度、系统编程 | [fasterthanli.me](https://fasterthanli.me/) | 全网最好的 Rust 长文博客，每篇万字级别深入浅出，读完功力大增 |
| **Jon Gjengset** | Rust 进阶、直播教学 | [thesquareplanet.com](https://thesquareplanet.com/) / [YouTube](https://www.youtube.com/@jonhoo) | 《Rust for Rustaceans》作者，直播写 Rust 解释思考过程 |
| **Luca Palmieri** | Rust Web 后端 | [lpalmieri.com](https://www.lpalmieri.com/) | 《Zero To Production In Rust》作者，Rust 后端实战唯一推荐书 |
| **Mara Bos** | Rust 并发 | [m-ou.se](https://blog.m-ou.se/) | 《Rust Atomics and Locks》作者，并发编程讲得最清楚的 |
| **matklad (Alex Kladov)** | Rust 编译器、IDE | [matklad.github.io](https://matklad.github.io/) | rust-analyzer 作者，Rust 工程实践和 API 设计的典范 |
| **without.boats** | Rust 异步、语言设计 | [without.boats/blog](https://without.boats/blog/) | Rust async/await 设计者之一，理解 Rust 异步必读 |
| **tonybai (白明)** | Rust/Go 中文 | [tonybai.com](https://tonybai.com/) | 国内 Go/Rust 双修博主，翻译和解读质量极高 |

### 🐹 Go 生态

| 博主 | 擅长 | 资源地址 | 推荐理由 |
|------|------|---------|---------|
| **Dave Cheney** | Go 编程哲学 | [dave.cheney.net](https://dave.cheney.net/) | Go 社区传奇，"Go 之禅" 提出者，代码哲学必读 |
| **Alex Edwards** | Go Web 开发 | [alexedwards.net/blog](https://alexedwards.net/blog/) | 《Let's Go》作者，Go Web 开发最系统的教程 |
| **Eli Bendersky** | Go 内部原理 | [eli.thegreenplace.net](https://eli.thegreenplace.net/) | Go 团队成员，编译器/runtime 原理讲得深入 |
| **Mat Ryer** | Go 实战模式 | [pace.dev/blog](https://pace.dev/blog) / [Twitter @matryer](https://twitter.com/matryer) | Go Time 播客主持人，Go 代码风格和模式总结到位 |
| **tonybai (白明)** | Go 深度 | [tonybai.com](https://tonybai.com/) | 国内 Go 第一博主，《Go 语言精进之路》作者 |

### 🟢 Node.js 生态

| 博主 | 擅长 | 资源地址 | 推荐理由 |
|------|------|---------|---------|
| **Matteo Collina** | Node.js 性能 | [nodeland.dev](https://nodeland.dev/) / [GitHub](https://github.com/mcollina) | Node.js TSC 成员，Fastify 作者，Node 性能问他就对了 |
| **Sindre Sorhus** | Node.js 工具库 | [sindresorhus.com](https://sindresorhus.com/) / [GitHub](https://github.com/sindresorhus) | 1000+ npm 包作者（chalk/ora/got），JS 生态工具之王 |
| **goldbergyoni** | Node.js 最佳实践 | [GitHub](https://github.com/goldbergyoni/nodebestpractices) | 95k stars，Node.js 最佳实践大全，企业级参考 |

### 📚 系统性学习资源

| 资源 | 说明 |
|------|------|
| [Zero To Production In Rust（Luca Palmieri）](https://www.zero2prod.com/) | Rust 后端实战圣经，从零到生产级 |
| [Comprehensive Rust（Google）](https://google.github.io/comprehensive-rust/zh-CN/) | Google 内部 Rust 培训课，免费中文版 |
| [Rust for Rustaceans（Jon Gjengset）](https://rust-for-rustaceans.com/) | Rust 进阶必读，入门后第二本书 |
| [Let's Go / Let's Go Further（Alex Edwards）](https://lets-go.alexedwards.net/) | Go Web 开发最佳教程 |
| [ByteByteGo — System Design 101](https://github.com/ByteByteGoHq/system-design-101) | 系统设计可视化，GitHub 55k+ stars |
| [System Design Primer](https://github.com/donnemartin/system-design-primer) | 系统设计面试准备，GitHub 250k+ stars |
| [Hussein Nasser — 数据库工程课](https://www.udemy.com/course/database-engines-crash-course/) | 数据库内部原理，Udemy 最佳 |
| [Julia Evans — Wizard Zines](https://wizardzines.com/) | 漫画学 Linux/网络/Git/SQL，看完就懂 |

---

## 1. 后端架构设计

### 微服务

- [Microservices — Martin Fowler](https://martinfowler.com/articles/microservices.html)
- [Building Microservices（Sam Newman 著，经典书）](https://samnewman.io/books/building_microservices_2nd_edition/)
- [Designing Data-Intensive Applications（DDIA，分布式系统圣经）](https://dataintensive.net/) ⭐ Martin Kleppmann 神作
- [The Twelve-Factor App（12 要素应用）](https://12factor.net/)
- [Microservice Patterns（Chris Richardson）](https://microservices.io/patterns/)
- [ByteByteGo · System Design 101](https://github.com/ByteByteGoHq/system-design-101) ⭐ 可视化系统设计，55k+ stars
- [System Design Primer（donnemartin）](https://github.com/donnemartin/system-design-primer) ⭐ 250k+ stars

### API 设计

- [Google API Design Guide（Proto/gRPC 最佳实践）](https://cloud.google.com/apis/design)
- [gRPC 官方文档](https://grpc.io/docs/)
- [Connect Protocol 规范（Buf）](https://connectrpc.com/docs/protocol/)
- [Buf Schema Registry 文档](https://buf.build/docs/)
- [REST API Design Rulebook（O'Reilly）](https://www.oreilly.com/library/view/rest-api-design/9781449317904/)
- [API Versioning 策略对比](https://www.xmatters.com/blog/blog-four-rest-api-versioning-strategies)

### 分布式系统

- [Distributed Systems for Fun and Profit（免费书）](https://book.mixu.net/distsys/)
- [CAP 定理解读 — Martin Kleppmann](https://martin.kleppmann.com/2015/05/11/please-stop-calling-databases-cp-or-ap.html) ⭐ 别再把数据库叫 CP 或 AP 了
- [分布式事务 — Saga 模式](https://microservices.io/patterns/data/saga.html)
- [事件驱动架构 — CQRS + Event Sourcing](https://martinfowler.com/bliki/CQRS.html)
- [Werner Vogels · All Things Distributed](https://www.allthingsdistributed.com/) — AWS CTO 博客

---

## 2. Rust 生态

### 核心

- [The Rust Programming Language（官方书，免费）](https://doc.rust-lang.org/book/)
- [Rust by Example（通过例子学 Rust）](https://doc.rust-lang.org/rust-by-example/)
- [Comprehensive Rust（Google 内部培训课，免费中文版）](https://google.github.io/comprehensive-rust/zh-CN/) ⭐ 4 天入门 Rust
- [Rust Async Book（异步编程）](https://rust-lang.github.io/async-book/)
- [Rustonomicon（高级/unsafe Rust）](https://doc.rust-lang.org/nomicon/)
- [Rust Design Patterns（设计模式）](https://rust-unofficial.github.io/patterns/)

### 进阶必读书

- [Rust for Rustaceans（Jon Gjengset）](https://rust-for-rustaceans.com/) ⭐ 入门后第一本进阶书
- [Zero To Production In Rust（Luca Palmieri）](https://www.zero2prod.com/) ⭐ Rust 后端实战唯一推荐
- [Rust Atomics and Locks（Mara Bos，免费在线版）](https://marabos.nl/atomics/) ⭐ 并发编程讲得最清楚

### 深度博客（实战经验，不是官网复读）

- [fasterthanlime (Amos) · 博客合集](https://fasterthanli.me/) ⭐ 全网最好的 Rust 深度博客，万字长文系列
- [matklad · API 设计和工程实践](https://matklad.github.io/) ⭐ rust-analyzer 作者的工程哲学
- [without.boats · Rust 异步设计](https://without.boats/blog/) — async/await 设计者的思考
- [Jon Gjengset · YouTube 直播写 Rust](https://www.youtube.com/@jonhoo) ⭐ 看大佬现场写代码 + 讲思路

### Web 框架

- [Axum 官方文档](https://docs.rs/axum/latest/axum/)
- [Axum 示例仓库](https://github.com/tokio-rs/axum/tree/main/examples)
- [Tonic gRPC 官方文档](https://docs.rs/tonic/latest/tonic/)
- [SeaORM 官方文档](https://www.sea-ql.org/SeaORM/)
- [Tower 中间件生态](https://docs.rs/tower/latest/tower/)

### 性能

- [Tokio 官方教程（async runtime）](https://tokio.rs/tokio/tutorial)
- [Rust Performance Book](https://nnethercote.github.io/perf-book/)
- [Are We Fast Yet — Rust 性能对比](https://arewefastyet.rs/)

---

## 3. Go 生态（拓宽视野）

### 核心

- [Go 官方教程 — A Tour of Go](https://go.dev/tour/)
- [Effective Go（官方最佳实践）](https://go.dev/doc/effective_go)
- [Go 官方博客](https://go.dev/blog/) — Eli Bendersky 等核心团队成员撰写

### 进阶必读

- [Dave Cheney · 博客合集](https://dave.cheney.net/) ⭐ Go 之禅提出者，代码哲学必读
- [Alex Edwards · Let's Go 系列](https://alexedwards.net/blog/) ⭐ Go Web 开发最系统的博客
- [Eli Bendersky · Go 内部原理](https://eli.thegreenplace.net/tag/go) — Go 编译器/runtime 深入分析
- [100 Go Mistakes and How to Avoid Them（Teiva Harsanyi）](https://100go.co/) — 100 个 Go 常见错误
- [tonybai · Go 语言中文深度博客](https://tonybai.com/) ⭐ 国内 Go 第一博主

### 实战框架

- [Gin — 高性能 HTTP 框架](https://gin-gonic.com/docs/)
- [Echo — 简洁 HTTP 框架](https://echo.labstack.com/)
- [gRPC-Go 官方](https://grpc.io/docs/languages/go/)
- [Ent — Facebook 的 Go ORM](https://entgo.io/)
- [sqlc — SQL → Go 代码生成](https://sqlc.dev/)

---

## 4. Node.js 生态（拓宽视野）

### 核心

- [Node.js 官方文档](https://nodejs.org/docs/latest/api/)
- [Node.js Best Practices（goldbergyoni）](https://github.com/goldbergyoni/nodebestpractices) ⭐ 95k+ stars

### 进阶

- [Matteo Collina · Node.js 性能与架构](https://nodeland.dev/) — Node TSC 成员，Fastify 作者
- [Sindre Sorhus · 1000+ npm 包](https://github.com/sindresorhus) — JS 工具库之王
- [Fastify — 高性能 Node.js 框架](https://fastify.dev/)
- [tRPC — 全栈类型安全 RPC](https://trpc.io/)
- [Drizzle ORM — 轻量级 TypeScript ORM](https://orm.drizzle.team/)
- [Effect-TS — 函数式 TypeScript 工具](https://effect.website/)

---

## 5. 数据库

### PostgreSQL

- [PostgreSQL 官方文档](https://www.postgresql.org/docs/current/)
- [The Art of PostgreSQL（进阶书）](https://theartofpostgresql.com/)
- [Brandur Leach · PostgreSQL 实战文章](https://www.brandur.org/articles) ⭐ Stripe 前工程师的 PG 深度实践
- [Hussein Nasser · 数据库工程课（YouTube）](https://www.youtube.com/@habormoat) ⭐ 数据库内部原理讲得最好
- [Use The Index, Luke — SQL 索引原理](https://use-the-index-luke.com/)
- [PostgreSQL EXPLAIN 详解 — 读懂执行计划](https://www.postgresql.org/docs/current/using-explain.html)
- [PostgreSQL 连接池 — PgBouncer](https://www.pgbouncer.org/)
- [冯若航 · 国内 PostgreSQL 深度博客](https://vonng.com/cn/) — PG 中文社区核心贡献者

### Redis

- [Redis 官方文档](https://redis.io/docs/)
- [Redis Streams 入门](https://redis.io/docs/data-types/streams-tutorial/)
- [Redis 设计与实现（黄健宏，中文经典）](http://redisbook.com/)

### 搜索

- [Meilisearch 官方文档](https://www.meilisearch.com/docs)
- [Elasticsearch 权威指南](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
- [Typesense — 轻量级搜索引擎（Algolia 替代）](https://typesense.org/docs/)

---

## 6. 缓存策略

- [Caching Strategies — AWS](https://docs.aws.amazon.com/whitepapers/latest/database-caching-strategies-using-redis/caching-patterns.html)
- [Cache-Aside / Read-Through / Write-Through / Write-Behind 对比](https://codeahoy.com/2017/08/11/caching-strategies-and-how-to-choose-the-right-one/)
- [缓存雪崩、穿透、击穿详解与方案](https://juejin.cn/post/6844903891803586567)
- [Redis 作为缓存 — 官方最佳实践](https://redis.io/docs/manual/patterns/)
- [HTTP 缓存机制 — MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching)
- [CDN 缓存策略 — Cloudflare](https://developers.cloudflare.com/cache/)

---

## 7. 消息队列 & 事件驱动

### 概念

- [消息队列选型：Kafka vs RabbitMQ vs NATS vs Pulsar](https://www.confluent.io/blog/kafka-vs-rabbitmq-vs-nats/)
- [消息投递语义：At-Most-Once / At-Least-Once / Exactly-Once](https://www.confluent.io/blog/exactly-once-semantics-are-possible-heres-how-apache-kafka-does-it/)
- [Event-Driven Architecture 模式全集 — Chris Richardson](https://microservices.io/patterns/data/event-driven-architecture.html)
- [Saga 分布式事务模式详解](https://microservices.io/patterns/data/saga.html)
- [Outbox Pattern（事务性消息发送）](https://microservices.io/patterns/data/transactional-outbox.html)

### 具体技术

- [NATS 官方文档](https://docs.nats.io/)
- [NATS JetStream（持久化消息）](https://docs.nats.io/nats-concepts/jetstream)
- [Apache Kafka 官方文档](https://kafka.apache.org/documentation/)
- [RabbitMQ 官方教程](https://www.rabbitmq.com/tutorials)

---

## 8. 服务治理

### 服务发现 & 配置

- [Consul 官方文档](https://developer.hashicorp.com/consul/docs)
- [etcd 官方文档](https://etcd.io/docs/)

### 限流 & 熔断 & 降级

- [Rate Limiting 算法对比（令牌桶 / 漏桶 / 滑动窗口）](https://www.quinbay.com/blog/understanding-rate-limiting-algorithms)
- [Circuit Breaker Pattern — Martin Fowler](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Tower 中间件 — Rust 的限流/重试/超时](https://docs.rs/tower/latest/tower/)
- [Bulkhead Pattern（舱壁隔离）](https://learn.microsoft.com/en-us/azure/architecture/patterns/bulkhead)
- [优雅降级 vs 熔断 vs 限流 — 三者的区别](https://juejin.cn/post/6844903651806093319)

### 可观测性

- [OpenTelemetry 官方文档](https://opentelemetry.io/docs/)
- [Prometheus 官方文档](https://prometheus.io/docs/)
- [Grafana 官方文档](https://grafana.com/docs/)
- [Sentry 官方文档](https://docs.sentry.io/)
- [Distributed Tracing 原理 — Jaeger](https://www.jaegertracing.io/docs/)
- [Rust tracing crate 指南](https://docs.rs/tracing/latest/tracing/)
- [结构化日志最佳实践](https://www.dataset.com/blog/the-10-commandments-of-logging/)

### 容器化 & 编排

- [Docker 官方文档](https://docs.docker.com/)
- [Kubernetes 官方文档](https://kubernetes.io/docs/)
- [K8s Patterns（O'Reilly 免费电子书）](https://www.redhat.com/en/resources/oreilly-kubernetes-patterns-cloud-native-apps-ebook)

---

## 9. 实时通信 & WebSocket

- [WebSocket 协议 (RFC 6455)](https://datatracker.ietf.org/doc/html/rfc6455)
- [tokio-tungstenite — Rust WebSocket 库](https://github.com/snapview/tokio-tungstenite)
- [Axum WebSocket 示例](https://github.com/tokio-rs/axum/tree/main/examples/websockets)
- [Socket.IO 架构原理](https://socket.io/docs/v4/)
- [SSE vs WebSocket vs Long Polling 对比](https://ably.com/topic/websocket-vs-sse)
- [yjs — CRDT 协同编辑框架](https://docs.yjs.dev/)
- [Automerge — Rust CRDT 库](https://automerge.org/)

---

## 10. 后端测试

### 策略

- [测试金字塔 — Martin Fowler](https://martinfowler.com/articles/practical-test-pyramid.html)
- [Testing Microservices — Sam Newman](https://samnewman.io/patterns/testing/)
- [Contract Testing with Pact](https://docs.pact.io/)

### Rust 测试

- [Rust 官方测试章节](https://doc.rust-lang.org/book/ch11-00-testing.html)
- [Rust 集成测试最佳实践](https://doc.rust-lang.org/rust-by-example/testing/integration_testing.html)
- [mockall — Rust Mock 库](https://docs.rs/mockall/latest/mockall/)
- [wiremock — HTTP Mock Server (Rust)](https://docs.rs/wiremock/latest/wiremock/)
- [sqlx 测试 — 数据库测试自动回滚](https://docs.rs/sqlx/latest/sqlx/attr.test.html)
- [cargo-nextest — 更快的测试运行器](https://nexte.st/)

---

## 11. 后端部署

- [Docker Multi-stage Build](https://docs.docker.com/build/building/multi-stage/)
- [Rust Docker 最佳实践](https://kerkour.com/rust-small-docker-image)
- [GitHub Actions + Docker + K8s 自动部署](https://docs.github.com/en/actions/use-cases-and-examples/deploying)
- [Terraform 基础设施即代码](https://developer.hashicorp.com/terraform/docs)
- [Ansible 自动化运维](https://docs.ansible.com/)
