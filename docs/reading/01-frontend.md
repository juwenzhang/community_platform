# 核心推荐阅读 — 前端篇

> 📅 创建日期：2026-03-29
> 📌 作者：luhanxin
> 🏷️ 标签：推荐阅读 · 前端 · 架构 · 工程化 · 性能优化

---

## 0. 宝藏博主 & 学习资源（先收藏）

> 这些是**真正值得长期追更**的个人博主和社区资源，写的都是实战总结，不是官网复读机。

### 🌍 英文博主（第一梯队，强烈推荐）

| 博主 | 擅长 | 博客地址 | 推荐理由 |
|------|------|---------|---------|
| **Dan Abramov** | React 核心、心智模型 | [overreacted.io](https://overreacted.io/) | React 核心团队前成员，每篇都是深度思考，不讲 API 讲本质 |
| **Kent C. Dodds** | React 实战、测试 | [kentcdodds.com/blog](https://kentcdodds.com/blog) | 211 篇高质量文章，Epic React 作者，实战味最浓 |
| **Josh W. Comeau** | CSS、React、动画 | [joshwcomeau.com](https://www.joshwcomeau.com/) | 可交互的可视化教程，CSS 讲解全网最好没有之一 |
| **Robin Wieruch** | React 全栈教程 | [robinwieruch.de](https://www.robinwieruch.de/) | 《The Road to React》作者，从零到一最系统的教程 |
| **Ahmad Shadeed** | CSS 布局、调试 | [ishadeed.com](https://ishadeed.com/) | 可视化讲解 CSS 布局，还写了 [Debugging CSS](https://debuggingcss.com/) 免费书 |
| **Lydia Hallie** | JS 可视化、设计模式 | [lydiahallie.com](https://www.lydiahallie.com/) | patterns.dev 共同作者，JS 引擎可视化系列封神 |
| **Addy Osmani** | 性能优化、设计模式 | [addyosmani.com](https://addyosmani.com/) | Google 工程总监，《Learning JavaScript Design Patterns》作者 |
| **Harry Roberts** | Web 性能、CSS 架构 | [csswizardry.com](https://csswizardry.com/) | 全球顶级性能顾问，CSS 架构 ITCSS 发明人 |
| **Alex Russell** | 性能、Web 标准 | [infrequently.org](https://infrequently.org/) | Chrome 团队，Performance Inequality Gap 系列犀利深刻 |
| **TkDodo (Dominik)** | React Query、状态管理 | [tkdodo.eu/blog](https://tkdodo.eu/blog/) | TanStack Query maintainer，状态管理实践写得最好的 |
| **Kevin Powell** | CSS | [YouTube @kevinpowell](https://www.youtube.com/@KevinPowell) | CSS 教学 YouTuber 天花板，CSS 不懂的先看他 |

### 🇨🇳 中文博主（一线开发者实战总结）

| 博主 | 擅长 | 资源地址 | 推荐理由 |
|------|------|---------|---------|
| **冴羽 (mqyqingfeng)** | JS 底层原理 | [GitHub 博客](https://github.com/mqyqingfeng/Blog) / [yayujs.com](https://yayujs.com/) | JS 深入 15 篇 + 专题 20 篇 + ES6 20 篇，中文 JS 原理系列天花板 |
| **张鑫旭** | CSS 深入 | [zhangxinxu.com](https://www.zhangxinxu.com/wordpress/) | 十年如一日钻研 CSS，《CSS 世界》三部曲作者，CSS 问题找他准没错 |
| **阮一峰** | ES6、科技周刊 | [ruanyifeng.com/blog](https://www.ruanyifeng.com/blog/) | 《ES6 入门教程》作者，每周科技周刊是行业风向标 |
| **神说要有光 (zxg)** | TS 类型体操、Babel、调试 | [掘金主页](https://juejin.cn/user/2788017216685118) | 多本掘金小册作者（TS 类型体操/React/Nest/调试），深度 + 广度兼备 |
| **前端南玖** | 工程化、Vite | [掘金专栏](https://juejin.cn/column/7186849795636461623) | 工程化系列深入浅出，Vite 原理讲得透彻 |
| **ConardLi (code秘密花园)** | 前端进阶、浏览器原理 | [掘金主页](https://juejin.cn/user/3949101466785709) | 大厂视角的前端进阶系列，浏览器原理讲得好 |
| **廖雪峰** | JS/Python 入门 | [liaoxuefeng.com](https://www.liaoxuefeng.com/) | 中文编程教程标杆，零基础入门首选 |
| **王福朋** | JS 原型、闭包 | [博客园](https://www.cnblogs.com/wangfupeng1988/p/3977924.html) | 《深入理解 JS 原型和闭包》系列，通俗易懂 |

### 📚 GitHub 系统性学习仓库

| 仓库 | Stars | 说明 |
|------|-------|------|
| [mqyqingfeng/Blog](https://github.com/mqyqingfeng/Blog) | 30k+ | JS 深入 + 专题 + ES6 + React，中文最系统 |
| [lydiahallie/javascript-questions](https://github.com/lydiahallie/javascript-questions) | 60k+ | JS 面试题可视化讲解，每题都有图解 |
| [type-challenges/type-challenges](https://github.com/type-challenges/type-challenges) | 40k+ | TS 类型体操训练场，从 easy 到 extreme |
| [goldbergyoni/nodebestpractices](https://github.com/goldbergyoni/nodebestpractices) | 95k+ | Node.js 最佳实践大全，企业级参考 |
| [trekhleb/javascript-algorithms](https://github.com/trekhleb/javascript-algorithms) | 180k+ | JS 实现的算法和数据结构，附讲解 |
| [ryanmcdermott/clean-code-javascript](https://github.com/ryanmcdermott/clean-code-javascript) | 88k+ | Clean Code 原则的 JS 版，代码规范必读 |
| [leonardomso/33-js-concepts](https://github.com/leonardomso/33-js-concepts) | 60k+ | 每个 JS 开发者都应该知道的 33 个概念 |
| [phodal/clean-frontend](https://github.com/phodal/clean-frontend) | 4k+ | 整洁前端架构，DDD 在前端的实践 |
| [kentcdodds/advanced-react-patterns](https://github.com/kentcdodds/advanced-react-patterns) | 5k+ | React 高级模式练习，compound/render props/hooks |

### 🎓 免费高质量课程 / 互动教程

- [patterns.dev — JS & React 设计模式（Lydia Hallie & Addy Osmani）](https://www.patterns.dev/) — 可视化讲设计模式和渲染模式，免费
- [javascript.info — 现代 JS 教程](https://javascript.info/) — 最好的 JS 在线教程，比 MDN 更适合学习
- [CSS for JS Developers（Josh Comeau）](https://css-for-js.dev/) — 付费但公认最好的 CSS 课程
- [Epic React（Kent C. Dodds）](https://www.epicreact.dev/) — 付费但 React 实战课天花板
- [Total TypeScript（Matt Pocock）](https://www.totaltypescript.com/) — TS 进阶课程最佳
- [web.dev — Google 前端学习平台](https://web.dev/learn) — 免费，Learn CSS / Learn HTML / Learn Performance 等
- [Frontend Masters](https://frontendmasters.com/) — 付费，讲师全是一线大牛

---

## 1. 前端架构设计

### Monorepo

- [Monorepo 工具对比：Turborepo vs Nx vs Lerna](https://monorepo.tools/)
- [pnpm Workspace 官方指南](https://pnpm.io/workspaces)
- [Why Google Stores Billions of Lines of Code in a Single Repository](https://research.google/pubs/pub45424/)
- [Monorepo 实战：从 0 搭建 pnpm + Turborepo 项目](https://juejin.cn/post/7098609682519949325)
- [Nx 官方文档 — 为什么选 Monorepo](https://nx.dev/concepts/more-concepts/why-monorepos)

### 微前端

- [Micro Frontends — Martin Fowler](https://martinfowler.com/articles/micro-frontends.html)
- [Garfish 官方文档](https://www.garfishjs.org/)
- [Qiankun 官方文档](https://qiankun.umijs.org/)
- [Module Federation 官方文档 (Webpack 5)](https://module-federation.io/)
- [微前端实践与思考（字节）](https://juejin.cn/post/7113503219904430111)
- [Qiankun vs Wujie：微前端框架深度对比](https://juejin.cn/post/7264431567224242212)
- [微前端 JS/CSS 沙箱隔离原理](https://juejin.cn/post/7070032850237521956)

### 前端项目类型（SPA / MPA / SSR / SSG / ISR）

- [Rendering Patterns — patterns.dev](https://www.patterns.dev/posts/rendering-patterns) ⭐ 可视化讲解各种渲染模式
- [When to Use SSG vs SSR vs CSR — Vercel Blog](https://vercel.com/blog/how-to-choose-the-best-rendering-strategy-for-your-app)
- [Next.js Rendering 文档（SSR/SSG/ISR 全覆盖）](https://nextjs.org/docs/app/building-your-application/rendering)
- [Nuxt 3 Rendering Modes](https://nuxt.com/docs/guide/concepts/rendering)
- [Islands Architecture — Jason Miller](https://jasonformat.com/islands-architecture/)
- [SPA vs MPA vs Hybrid — web.dev](https://web.dev/articles/vitals-spa-faq)

### 前端架构方法论

- [Feature-Sliced Design — 现代前端架构方法论](https://feature-sliced.design/) ⭐ 按功能切片组织代码，比「按类型分目录」更实用
- [Clean Architecture in Frontend — 实战指南](https://feature-sliced.design/blog/frontend-clean-architecture)
- [Frontend Architecture Patterns — frontendpatterns.dev](https://frontendpatterns.dev/patterns/) — 40+ 生产级前端架构模式
- [A Guide to Modern Frontend Architecture — LogRocket](https://blog.logrocket.com/guide-modern-frontend-architecture-patterns/)

---

## 2. JavaScript 深入（先打地基）

> 💡 **不懂原型链、闭包、事件循环，后面的框架都是空中楼阁。**

### 系统性系列（强烈推荐按顺序读）

- [冴羽 · JS 深入系列 15 篇](https://github.com/mqyqingfeng/Blog#深入系列目录) ⭐ 原型链 → 作用域 → 执行上下文 → 闭包 → this → 继承，中文最佳
- [冴羽 · JS 专题系列 20 篇](https://github.com/mqyqingfeng/Blog#专题系列目录) ⭐ 防抖/节流/类型判断/深拷贝/柯里化等实战专题
- [冴羽 · ES6 系列 20 篇](https://github.com/mqyqingfeng/Blog#es6-系列目录)
- [javascript.info — 现代 JavaScript 教程](https://javascript.info/) ⭐ 最好的 JS 在线教程，从基础到高级全覆盖
- [33 个 JS 开发者应该知道的概念](https://github.com/leonardomso/33-js-concepts)

### 可视化理解 JS

- [Lydia Hallie · JavaScript Visualized 系列（DEV）](https://dev.to/lydiahallie) ⭐ 用 GIF 动图解释 JS 引擎、Hoisting、Scope Chain、Event Loop
- [JavaScript Questions（Lydia Hallie）](https://github.com/lydiahallie/javascript-questions) — 每道题都有图解，刷完功力大增
- [JS 事件循环可视化工具 — Loupe](http://latentflip.com/loupe/)

### 进阶专题

- [王福朋 · 深入理解 JS 原型和闭包（完结）](https://www.cnblogs.com/wangfupeng1988/p/3977924.html) — 通俗易懂，适合原型链一直搞不懂的
- [阮一峰 · ES6 入门教程（免费全文）](https://es6.ruanyifeng.com/) — 中文 ES6 标准参考
- [You Don't Know JS (YDKJS) — Kyle Simpson](https://github.com/getify/You-Dont-Know-JS) — 深入 JS 的英文经典，GitHub 170k+ stars
- [Clean Code JavaScript — 代码整洁之道](https://github.com/ryanmcdermott/clean-code-javascript)
- [JS 算法与数据结构（trekhleb）](https://github.com/trekhleb/javascript-algorithms)

---

## 3. 前端工程化

### 构建工具

- [Vite 官方文档](https://vite.dev/)
- [Vite 设计理念 — Why Vite（尤雨溪）](https://vite.dev/guide/why.html)
- [前端南玖 · Vite 原理深入系列（掘金专栏）](https://juejin.cn/column/7186849795636461623) ⭐ Vite 构建原理讲得最透彻的中文系列
- [Webpack vs Vite 全方位对比（掘金）](https://juejin.cn/post/7582063437414514726)
- [Rollup 官方文档](https://rollupjs.org/)
- [esbuild — 为什么这么快](https://esbuild.github.io/faq/#why-is-esbuild-fast)
- [Turbopack 官方介绍（Vercel）](https://turbo.build/pack/docs)
- [Rspack — 字节跳动的 Rust 打包器](https://rspack.dev/)

### 代码规范

- [Biome 官方文档（Lint + Format 一体化）](https://biomejs.dev/)
- [ESLint 官方文档](https://eslint.org/)
- [Prettier 官方文档](https://prettier.io/)
- [Conventional Commits 规范](https://www.conventionalcommits.org/)
- [Husky + lint-staged 最佳实践](https://typicode.github.io/husky/)

### TypeScript

- [TypeScript Deep Dive（免费书）](https://basarat.gitbook.io/typescript/)
- [Type Challenges — TS 类型体操](https://github.com/type-challenges/type-challenges) ⭐ 从 easy 到 extreme，刷完 TS 就通了
- [神说要有光 · TypeScript 类型体操通关秘籍（掘金小册）](https://juejin.cn/user/2788017216685118) ⭐ 六大套路总结成顺口溜，实战案例丰富
- [TypeScript 进阶秘籍 · 类型体操 108 种姿势（掘金）](https://juejin.cn/post/7494500661658435634)
- [Matt Pocock 的 Total TypeScript（视频课）](https://www.totaltypescript.com/) ⭐ 英文 TS 进阶课天花板
- [TypeScript 官方 Handbook](https://www.typescriptlang.org/docs/handbook/)

### CSS 工程化

- [Josh Comeau · CSS 文章合集](https://www.joshwcomeau.com/css/) ⭐ 全网最好的 CSS 教程，可交互可视化
- [Ahmad Shadeed · Debugging CSS（免费书）](https://debuggingcss.com/) ⭐ CSS 调试实战手册
- [Ahmad Shadeed · CSS 布局深度文章](https://ishadeed.com/) — Flexbox/Grid 可视化讲解
- [张鑫旭 · 鑫空间](https://www.zhangxinxu.com/wordpress/) ⭐ CSS 问题先搜他博客，大概率有答案
- [Tailwind CSS 官方文档](https://tailwindcss.com/docs)
- [CSS Modules 规范](https://github.com/css-modules/css-modules)
- [Kevin Powell — CSS YouTube 天花板](https://www.youtube.com/@KevinPowell)
- [CSS-Tricks 博客（经典资源站）](https://css-tricks.com/)
- [State of CSS 2024（年度调查报告）](https://2024.stateofcss.com/)
- [Design Tokens 概念（W3C 草案）](https://tr.designtokens.org/format/)
- [Open Props — 现代 CSS 变量设计系统](https://open-props.style/)
- [Josh Comeau · A Modern CSS Reset](https://www.joshwcomeau.com/css/custom-css-reset/) — 现代 CSS Reset 最佳实践

---

## 4. React 生态

### React 核心理解

- [Dan Abramov · Overreacted 博客](https://overreacted.io/) ⭐ 每篇都值得反复读（A Complete Guide to useEffect / Before You memo）
- [React 新官方文档](https://react.dev/) — 2023 年重写的新文档，交互式学习
- [Kent C. Dodds · React 实战博客](https://kentcdodds.com/blog) ⭐ 测试 / Hooks / 性能 / 最佳实践
- [Robin Wieruch · The Road to React](https://www.robinwieruch.de/) — 从零搭建 React 项目的最系统教程

### React 高级模式

- [Kent C. Dodds · Advanced React Patterns（GitHub）](https://github.com/kentcdodds/advanced-react-patterns) ⭐ Compound / Render Props / Custom Hooks 实战练习
- [patterns.dev · React Patterns（Lydia Hallie）](https://www.patterns.dev/) ⭐ 可视化讲解 HOC / Hooks / Provider / Compound

### 状态管理实战

- [TkDodo · React Query 实战博客](https://tkdodo.eu/blog/) ⭐ TanStack Query 核心维护者，状态管理写得最好的
- [Zustand vs Jotai vs Redux 对比实战](https://www.alvinquach.dev/blog/react-state-management-comparison)
- [Zustand 官方文档](https://docs.pmnd.rs/zustand/getting-started/introduction)

---

## 5. 前端性能优化

### 核心指标

- [Web Vitals — Google 官方](https://web.dev/articles/vitals)
- [Core Web Vitals 优化指南 — web.dev](https://web.dev/explore/learn-core-web-vitals)
- [LCP / FID / CLS 详解](https://web.dev/articles/lcp)
- [Chrome User Experience Report (CrUX)](https://developer.chrome.com/docs/crux/)

### 大牛实战经验

- [Addy Osmani · 性能优化文章合集](https://addyosmani.com/) ⭐ Google 工程总监，The Cost of JavaScript 经典
- [Harry Roberts · CSS Wizardry 性能博客](https://csswizardry.com/) ⭐ 全球顶级性能顾问的实战分享
- [Alex Russell · Performance Inequality Gap 系列](https://infrequently.org/series/performance-inequality/) ⭐ Chrome 团队犀利的性能分析
- [Addy Osmani · Patterns.dev Newsletter](https://largeapps.substack.com/) — 大型应用性能模式

### 实践

- [前端性能优化 24 条建议（2024）](https://juejin.cn/post/6892994632968306702)
- [Code Splitting 最佳实践 — React](https://react.dev/reference/react/lazy)
- [Tree Shaking 原理和实践](https://webpack.js.org/guides/tree-shaking/)
- [图片优化完全指南 — web.dev](https://web.dev/articles/image-optimization)
- [Virtual Scrolling 虚拟滚动原理](https://web.dev/articles/virtualize-long-lists-react-window)
- [Preload / Prefetch / Preconnect 策略](https://web.dev/articles/preload-critical-assets)

### 工具

- [Lighthouse — Google 性能审计](https://developer.chrome.com/docs/lighthouse/)
- [WebPageTest](https://www.webpagetest.org/)
- [Bundle Analyzer — webpack-bundle-analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer)
- [Vite 的 rollup-plugin-visualizer](https://github.com/btd/rollup-plugin-visualizer)

---

## 6. SEO 优化

### 通用

- [Google Search Central — SEO 入门指南](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
- [Google Search Central — 技术 SEO](https://developers.google.com/search/docs/crawling-indexing)
- [Schema.org 结构化数据](https://schema.org/)
- [robots.txt 规范](https://developers.google.com/search/docs/crawling-indexing/robots/intro)
- [Sitemap 协议](https://www.sitemaps.org/protocol.html)

### 搜索引擎差异

| 搜索引擎 | 优化重点 | 资源 |
|----------|---------|------|
| **Google** | Core Web Vitals + 结构化数据 + 移动端优先 | [Google Search Console](https://search.google.com/search-console) |
| **百度** | 百度站长平台主动推送 + MIP/AMP + 中文分词友好 | [百度搜索资源平台](https://ziyuan.baidu.com/) |
| **Bing** | IndexNow 协议（实时通知爬虫）+ 清晰的 meta | [Bing Webmaster Tools](https://www.bing.com/webmasters/) |

### SPA 的 SEO 挑战

- [SPA SEO: A Single-Page App Guide to Google's 1st Page](https://snipcart.com/blog/spa-seo)
- [Dynamic Rendering for SPA SEO — Google](https://developers.google.com/search/docs/crawling-indexing/javascript/dynamic-rendering)
- [Prerender.io — SPA 预渲染服务](https://prerender.io/)
- [Next.js SSR/SSG 实现 SEO 最佳实践](https://nextjs.org/learn/seo)

---

## 7. 前端部署

- [Vercel 部署文档](https://vercel.com/docs)
- [Netlify 部署文档](https://docs.netlify.com/)
- [Docker 化前端应用 — Nginx + Multi-stage Build](https://www.docker.com/blog/how-to-dockerize-your-frontend-application/)
- [CDN 原理与实践 — Cloudflare 学习中心](https://www.cloudflare.com/learning/cdn/what-is-a-cdn/)
- [GitHub Actions CI/CD 前端自动部署](https://docs.github.com/en/actions/automating-builds-and-tests)
- [EdgeOne Pages（腾讯 CDN 边缘部署）](https://edgeone.ai/products/pages)

---

## 8. ToC — H5 / 跨端开发

### 移动端 H5

- [移动端 H5 适配方案（rem / vw / viewport）](https://juejin.cn/post/6844903631993454600)
- [移动端 1px 问题终极方案](https://juejin.cn/post/6844903877947424782)
- [H5 性能优化实战（首屏/白屏/交互）](https://juejin.cn/post/7164493764574117895)
- [iOS/Android WebView 调试指南](https://developer.chrome.com/docs/devtools/remote-debugging/)
- [JSBridge 原理 — H5 与 Native 通信](https://juejin.cn/post/6844903585268891662)

### 跨端框架

- [React Native 官方文档](https://reactnative.dev/)
- [Flutter 官方文档](https://docs.flutter.dev/)
- [Taro — 多端统一开发框架（京东）](https://docs.taro.zone/)
- [uni-app 官方文档（DCloud）](https://uniapp.dcloud.net.cn/)
- [Expo — React Native 最佳入口](https://docs.expo.dev/)
- [Lynx - 跨端框架 (字节)](https://lynxjs.org/zh/)

### 小程序

- [微信小程序官方文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)
- [小程序性能优化指南 — 微信官方](https://developers.weixin.qq.com/miniprogram/dev/framework/performance/)
- [小程序原理 — 双线程架构](https://juejin.cn/post/6844903811052896264)

---

## 9. ToB — 企业管理后台

### 架构

- [Ant Design Pro 最佳实践（React 管理后台）](https://pro.ant.design/zh-CN/docs/overview)
- [Vue Admin Template（Vue 管理后台模板）](https://panjiachen.github.io/vue-element-admin-site/zh/)
- [Arco Design Pro（字节管理后台）](https://arco.design/vue/docs/pro/start)
- [TDesign Starter（腾讯管理后台）](https://tdesign.tencent.com/starter/docs/vue-next/get-started)

### 核心能力

- [RBAC 权限模型设计（角色-权限-菜单）](https://juejin.cn/post/7052477075092955166)
- [动态路由 + 按钮级权限控制](https://juejin.cn/post/7041473782768771109)
- [表单引擎设计 — FormRender（阿里）](https://xrender.fun/form-render)
- [表格虚拟滚动 — ag-Grid / TanStack Table](https://tanstack.com/table/latest)
- [ProComponents — 重型组件（Ant Design 增强）](https://procomponents.ant.design/)
- [大文件上传 — 分片 + 断点续传 + 秒传](https://juejin.cn/post/6844904046436843527)

---

## 10. 平台搭建 — 低代码 / 执行引擎 / 文档站

### 低代码

- [LowCodeEngine — 阿里低代码引擎](https://lowcode-engine.cn/)
- [Amis — 百度低代码前端框架（JSON 配置生成页面）](https://aisuda.bce.baidu.com/amis/)
- [低代码平台设计思路（掘金）](https://juejin.cn/post/7098611204706312222)
- [可视化搭建原理 — 拖拽 + Schema + 渲染引擎](https://juejin.cn/post/7121534061483671566)
- [DSL 设计 — 从 JSON Schema 到自定义 DSL](https://juejin.cn/post/7166210494638481416)

### 执行引擎 / 工作流

- [Coze — 字节 AI Bot 搭建平台](https://www.coze.com/)
- [Dify — AI 工作流引擎](https://docs.dify.ai/)
- [n8n — 开源工作流自动化](https://docs.n8n.io/)
- [Node-RED — 低代码事件驱动编程](https://nodered.org/)
- [插件体系设计 — VS Code 插件架构解析](https://code.visualstudio.com/api)

### 文档站

- [VitePress 官方文档](https://vitepress.dev/)
- [Docusaurus 官方文档（Meta）](https://docusaurus.io/)
- [Nextra — Next.js 文档框架](https://nextra.site/)
- [Storybook — 组件文档 + 可视化测试](https://storybook.js.org/)
- [dumi — 组件库文档工具（蚂蚁）](https://d.umijs.org/)

---

## 11. 前端基建 — Node / CLI / SDK / 打包

### Node.js 工具链

- [Node.js 官方文档](https://nodejs.org/docs/latest/api/)
- [Node.js Best Practices（goldbergyoni）](https://github.com/goldbergyoni/nodebestpractices) ⭐ 95k+ stars，企业级 Node 最佳实践
- [用 Node.js 写 CLI 工具 — Commander.js](https://github.com/tj/commander.js)
- [tsup — TypeScript 打包器（零配置）](https://tsup.egoist.dev/)
- [unbuild — 统一构建工具（UnJS）](https://github.com/unjs/unbuild)

### CLI 工具开发

- [Inquirer.js — 交互式命令行](https://github.com/SBoudrias/Inquirer.js)
- [ora — 终端 loading 动画](https://github.com/sindresorhus/ora)
- [chalk — 终端颜色](https://github.com/chalk/chalk)
- [create-xxx 脚手架设计模式](https://juejin.cn/post/7172522811291885604)
- [Yeoman — 脚手架生成器](https://yeoman.io/)

### SDK 设计

- [如何设计一个前端 SDK（埋点/监控/请求）](https://juejin.cn/post/7085726680932999205)
- [前端监控 SDK 设计 — Sentry JS SDK 源码](https://github.com/getsentry/sentry-javascript)
- [埋点 SDK 设计 — 无侵入式数据采集](https://juejin.cn/post/7163233164620087333)

### 打包工具原理

- [Webpack 核心原理 — Module / Chunk / Bundle](https://webpack.js.org/concepts/)
- [Rollup 插件开发指南](https://rollupjs.org/plugin-development/)
- [Vite 插件开发指南](https://vite.dev/guide/api-plugin.html)
- [AST 抽象语法树 — 从 Babel 理解编译原理](https://astexplorer.net/)
- [SWC — Rust 编写的 JS/TS 编译器](https://swc.rs/)

---

## 12. 前端广告 & 数据

### 广告开发

- [Google Ad Manager 前端集成](https://developers.google.com/publisher-tag/guides/get-started)
- [广告 SDK 加载策略（异步/延迟/预加载）](https://web.dev/articles/efficiently-load-third-party-javascript)
- [广告位渲染性能优化（避免 CLS 跳动）](https://web.dev/articles/optimize-cls)
- [Intersection Observer — 懒加载/曝光检测](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)

### 埋点 & 数据

- [前端埋点方案对比（代码/可视化/无痕）](https://juejin.cn/post/7084031582701404190)
- [GrowingIO 无埋点技术原理](https://docs.growingio.com/)
- [Google Analytics 4 开发者文档](https://developers.google.com/analytics)
- [A/B 实验 — 前端实验平台设计](https://juejin.cn/post/7129530898498519077)
- [Feature Flag 实现 — LaunchDarkly 文档](https://docs.launchdarkly.com/)

### 前端监控

- [Sentry 前端监控](https://docs.sentry.io/platforms/javascript/)
- [前端错误监控体系搭建](https://juejin.cn/post/7172072612430872584)
- [Performance Observer API — 性能数据采集](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver)
- [Web Vitals 自动采集库](https://github.com/GoogleChrome/web-vitals)

---

## 13. 可视化 & 编辑器

### 数据可视化

- [D3.js 官方文档](https://d3js.org/)
- [ECharts 官方文档（Apache）](https://echarts.apache.org/)
- [AntV 可视化方案（蚂蚁）](https://antv.antgroup.com/)
- [Observable Plot — 现代可视化库](https://observablehq.com/plot/)
- [Chart.js — 轻量级图表库](https://www.chartjs.org/)

### 3D / WebGL

- [Three.js 官方文档](https://threejs.org/docs/)
- [React Three Fiber — React + Three.js](https://docs.pmnd.rs/react-three-fiber/)
- [Spline — 3D 设计工具（生成前端代码）](https://spline.design/)
- [WebGPU 入门](https://surma.dev/things/webgpu/)

### 富文本编辑器

- [TipTap — 现代块编辑器（基于 ProseMirror）](https://tiptap.dev/)
- [ProseMirror 官方文档（编辑器底层库）](https://prosemirror.net/)
- [Editor.js — 块式编辑器](https://editorjs.io/)
- [Lexical — Meta 开源编辑器](https://lexical.dev/)
- [Slate.js — 可定制富文本框架](https://docs.slatejs.org/)

### 协同编辑

- [yjs — CRDT 协同编辑框架](https://docs.yjs.dev/)
- [Hocuspocus — yjs WebSocket 后端](https://tiptap.dev/hocuspocus/introduction)
- [Liveblocks — 协同开发基础设施](https://liveblocks.io/docs)
- [CRDT 原理 — 冲突无关复制数据类型](https://crdt.tech/)

### 代码编辑器

- [Monaco Editor — VS Code 同款编辑器](https://microsoft.github.io/monaco-editor/)
- [CodeMirror 6 官方文档](https://codemirror.net/)
- [Shiki — 语法高亮（VS Code 主题兼容）](https://shiki.style/)

---

## 14. AI 前端

- [Vercel AI SDK — 流式 AI 对话 UI](https://sdk.vercel.ai/)
- [ChatGPT 式对话界面实现（流式 SSE 渲染）](https://sdk.vercel.ai/docs/ai-sdk-ui/chatbot)
- [AI 代码补全前端集成 — Copilot 插件架构](https://github.blog/engineering/infrastructure/github-copilot-for-your-editor/)
- [Prompt 输入框 UX 设计最佳实践](https://pair.withgoogle.com/guidebook)
- [AI 生成 UI — v0.dev（Vercel）](https://v0.dev/)
- [前端 WASM + ONNX 推理（浏览器端 AI）](https://onnxruntime.ai/docs/tutorials/web/)
