# 核心推荐阅读 — 原理篇

> 📅 创建日期：2026-03-29
> 📌 作者：luhanxin
> 🏷️ 标签：推荐阅读 · 原理 · 计算机基础 · 协议

---

## 0. 宝藏博主 & 学习资源（先收藏）

> 计算机基础最怕看教科书睡着，**这些博主用可视化/漫画/互动的方式讲原理**，看完就懂。

### 博主

| 博主 | 擅长 | 资源地址 | 推荐理由 |
|------|------|---------|---------|
| **Julia Evans** | Linux/网络/系统/调试 | [jvns.ca](https://jvns.ca/) / [Wizard Zines](https://wizardzines.com/) | 漫画讲 Linux/网络/SQL/Git，复杂概念一张图就懂，神级科普 |
| **Brendan Gregg** | 系统性能 | [brendangregg.com](https://www.brendangregg.com/) | Netflix 前性能架构师，火焰图发明人，性能分析领域圣经级 |
| **Martin Kleppmann** | 分布式系统 | [martin.kleppmann.com](https://martin.kleppmann.com/) | DDIA 作者，剑桥教授，分布式系统讲义免费 |
| **Ben Eater** | 计算机组成 | [YouTube @BenEater](https://www.youtube.com/@BenEater) | 在面包板上从零造 CPU，看完彻底理解计算机是怎么跑起来的 |
| **Hussein Nasser** | 数据库/网络协议 | [YouTube @habormoat](https://www.youtube.com/@habormoat) | TCP/UDP/HTTP/WebSocket 原理讲得最透 |

### 系统性学习资源

| 资源 | 说明 |
|------|------|
| [Wizard Zines（Julia Evans）](https://wizardzines.com/) | 漫画学 Linux/网络/Git/SQL/HTTP，每本一个主题，强烈推荐 |
| [Teach Yourself CS（自学计算机科学）](https://teachyourselfcs.com/) | 计算机自学路线图，精选每个方向最好的一本书 + 一门课 |
| [OSTEP — 操作系统导论（免费书）](https://pages.cs.wisc.edu/~remzi/OSTEP/) | 最好的操作系统入门书，免费 |
| [CMU 15-445 数据库系统](https://15445.courses.cs.cmu.edu/) | Andy Pavlo 的数据库课，全网最佳 |
| [MIT 6.824 分布式系统](https://pdos.csail.mit.edu/6.824/) | 分布式系统经典课 |
| [Crafting Interpreters（免费书）](https://craftinginterpreters.com/) | 编译原理入门天花板，从零写解释器 |
| [Computer Networking: A Top-Down Approach](https://gaia.cs.umass.edu/kurose_ross/index.php) | 计算机网络经典教材 |

---

## 1. 计算机网络

- [Julia Evans · Networking Zine](https://wizardzines.com/zines/networking/) ⭐ 漫画讲网络概念
- [HTTP/2 规范 (RFC 7540)](https://httpwg.org/specs/rfc7540.html)
- [HTTP/3 & QUIC 详解](https://http3-explained.haxx.se/)
- [WebSocket 协议 (RFC 6455)](https://datatracker.ietf.org/doc/html/rfc6455)
- [gRPC over HTTP/2 协议](https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-HTTP2.md)
- [Protocol Buffers 编码原理](https://protobuf.dev/programming-guides/encoding/)
- [DNS 原理 — How DNS Works（漫画版）](https://howdns.works/) ⭐ 一看就懂
- [TLS 1.3 握手原理 — 每一步都可视化](https://tls13.xargs.org/) ⭐ 交互式讲解每个字节
- [High Performance Browser Networking（Ilya Grigorik，免费）](https://hpbn.co/) — 浏览器网络性能圣经

## 2. 操作系统 & 并发

- [Operating Systems: Three Easy Pieces（OSTEP，免费书）](https://pages.cs.wisc.edu/~remzi/OSTEP/) ⭐ 操作系统最佳入门
- [Julia Evans · Linux Zines](https://wizardzines.com/zines/bite-size-linux/) ⭐ 漫画讲 Linux 概念
- [Brendan Gregg · Systems Performance（性能分析经典）](https://www.brendangregg.com/systems-performance-2nd-edition-book.html)
- [Brendan Gregg · 火焰图原理](https://www.brendangregg.com/flamegraphs.html) ⭐ 性能调优必备工具
- [Tokio 异步运行时原理 — Tokio Internals](https://tokio.rs/tokio/tutorial)
- [Rust 异步原理 — Pin/Future/Waker](https://rust-lang.github.io/async-book/02_execution/01_chapter.html)
- [epoll / kqueue / io_uring 对比](https://unixism.net/loti/what_is_io_uring.html)
- [io_uring 原理与实践](https://kernel.dk/io_uring.pdf)
- [Mara Bos · Rust Atomics and Locks（免费在线版）](https://marabos.nl/atomics/) ⭐ 并发编程最清晰的讲解

## 3. 数据库原理

- [CMU 15-445 数据库系统（Andy Pavlo 经典课，免费）](https://15445.courses.cs.cmu.edu/) ⭐ 数据库课天花板
- [Hussein Nasser · 数据库工程课（YouTube）](https://www.youtube.com/@habormoat) ⭐ 数据库内部原理实战讲解
- [Database Internals（Alex Petrov）](https://www.databass.dev/) — 数据库内部原理进阶书
- [B-Tree 原理可视化](https://www.cs.usfca.edu/~galles/visualization/BTree.html)
- [MVCC 原理详解](https://www.postgresql.org/docs/current/mvcc.html)
- [WAL (Write-Ahead Logging) 原理](https://www.postgresql.org/docs/current/wal-intro.html)
- [LSM-Tree 原理（RocksDB / LevelDB）](https://www.igvita.com/2012/02/06/sstable-and-log-structured-storage-leveldb/)
- [Julia Evans · SQL Zine](https://wizardzines.com/zines/sql/) ⭐ 漫画讲 SQL

## 4. 分布式系统原理

- [MIT 6.824 分布式系统（经典课，免费）](https://pdos.csail.mit.edu/6.824/) ⭐ 分布式系统必修课
- [Martin Kleppmann · 分布式系统讲义（剑桥大学，免费）](https://www.cl.cam.ac.uk/~mk428/teaching.html)
- [Raft 共识算法可视化](https://raft.github.io/) ⭐ 交互式理解共识算法
- [Paxos Made Simple — Lamport](https://lamport.azurewebsites.net/pubs/paxos-simple.pdf)
- [Google MapReduce 论文](https://research.google/pubs/pub62/)
- [Amazon Dynamo 论文（DynamoDB 前身）](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf)
- [Google Spanner 论文](https://research.google/pubs/pub39966/)
- [CRDT 原理（协同编辑的理论基础）](https://crdt.tech/)

## 5. 编译器 & 语言原理

- [Crafting Interpreters（编译原理入门，免费书）](https://craftinginterpreters.com/) ⭐ 从零写解释器，天花板级别
- [Ben Eater · 从面包板造 CPU（YouTube）](https://www.youtube.com/@BenEater) ⭐ 计算机组成原理可视化
- [Rust 编译器工作原理 — rustc dev guide](https://rustc-dev-guide.rust-lang.org/)
- [LLVM 入门](https://llvm.org/docs/tutorial/)
- [V8 引擎原理（JavaScript 运行时）](https://v8.dev/blog)
- [matklad · 编译器和 IDE 的工程实践](https://matklad.github.io/) — rust-analyzer 作者

## 6. 序列化 & 编码

- [Protocol Buffers 编码原理](https://protobuf.dev/programming-guides/encoding/)
- [MessagePack vs JSON vs Protobuf 性能对比](https://auth0.com/blog/beating-json-performance-with-protobuf/)
- [UTF-8 编码原理](https://sethmlarson.dev/blog/utf-8)
- [Base64 编码原理](https://developer.mozilla.org/en-US/docs/Glossary/Base64)
