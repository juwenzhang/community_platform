-- 测试用户（密码: password123）
INSERT INTO users (id, username, email, password_hash, display_name, bio, company, location) VALUES
('11111111-1111-1111-1111-111111111111', 'zhangsan', 'zhangsan@test.com', '$2b$12$LJ3m4ys3Rl4WNRG.VXxnNO7BhVHCVKFoGCEqG3k7.V7tBx5Vh8Gy', '张三', 'Rust 后端开发', '字节跳动', '北京'),
('22222222-2222-2222-2222-222222222222', 'lisi', 'lisi@test.com', '$2b$12$LJ3m4ys3Rl4WNRG.VXxnNO7BhVHCVKFoGCEqG3k7.V7tBx5Vh8Gy', '李四', '前端工程师，React/Vue 双修', '腾讯', '深圳'),
('33333333-3333-3333-3333-333333333333', 'wangwu', 'wangwu@test.com', '$2b$12$LJ3m4ys3Rl4WNRG.VXxnNO7BhVHCVKFoGCEqG3k7.V7tBx5Vh8Gy', '王五', 'AI 算法工程师', '阿里巴巴', '杭州'),
('44444444-4444-4444-4444-444444444444', 'zhaoliu', 'zhaoliu@test.com', '$2b$12$LJ3m4ys3Rl4WNRG.VXxnNO7BhVHCVKFoGCEqG3k7.V7tBx5Vh8Gy', '赵六', 'iOS/Android 移动端开发', '美团', '上海'),
('55555555-5555-5555-5555-555555555555', 'sunqi', 'sunqi@test.com', '$2b$12$LJ3m4ys3Rl4WNRG.VXxnNO7BhVHCVKFoGCEqG3k7.V7tBx5Vh8Gy', '孙七', '全栈开发，DevOps 爱好者', '华为', '成都')
ON CONFLICT (username) DO NOTHING;

-- 测试文章（status=2 已发布，覆盖 6 个分类）
INSERT INTO articles (id, title, slug, summary, content, author_id, tags, view_count, like_count, status, published_at, category) VALUES
-- 后端 (1)
('a1000001-0000-0000-0000-000000000001', 'Rust 异步编程实战：从 Tokio 到生产环境', 'rust-async-01', 'Tokio 在生产环境中的最佳实践', E'# Rust 异步编程实战\n\nTokio 是 Rust 生态中最成熟的异步运行时。\n\n```rust\n#[tokio::main]\nasync fn main() {\n    println!("Hello async!");\n}\n```', '11111111-1111-1111-1111-111111111111', '{"Rust","Tokio","后端"}', 342, 28, 2, NOW() - INTERVAL '2 days', 1),
('a1000001-0000-0000-0000-000000000002', 'gRPC 与 REST 的选型思考', 'grpc-vs-rest-01', '什么时候该用 gRPC，什么时候该用 REST', E'# gRPC vs REST\n\n| 维度 | gRPC | REST |\n|------|------|------|\n| 序列化 | Protobuf | JSON |', '11111111-1111-1111-1111-111111111111', '{"gRPC","REST","后端"}', 567, 45, 2, NOW() - INTERVAL '5 days', 1),
('a1000001-0000-0000-0000-000000000003', 'SeaORM 入门：Rust 的现代 ORM', 'seaorm-intro-01', 'SeaORM 基础教程', E'# SeaORM 入门\n\n```rust\nlet articles = Articles::find().all(&db).await?;\n```', '55555555-5555-5555-5555-555555555555', '{"Rust","SeaORM","后端"}', 189, 15, 2, NOW() - INTERVAL '3 days', 1),
-- 前端 (2)
('a1000001-0000-0000-0000-000000000004', 'Vue 3 组合式 API 最佳实践', 'vue3-comp-01', 'Composition API 使用技巧', E'# Vue 3 组合式 API\n\n```vue\n<script setup lang="ts">\nconst count = ref(0)\n</script>\n```', '22222222-2222-2222-2222-222222222222', '{"Vue","TypeScript","前端"}', 891, 72, 2, NOW() - INTERVAL '1 day', 2),
('a1000001-0000-0000-0000-000000000005', 'React 18 并发特性深度解析', 'react18-conc-01', 'useTransition 等并发特性详解', E'# React 18 并发特性\n\n```tsx\nconst [isPending, startTransition] = useTransition();\n```', '22222222-2222-2222-2222-222222222222', '{"React","TypeScript","前端"}', 1203, 98, 2, NOW() - INTERVAL '4 days', 2),
('a1000001-0000-0000-0000-000000000006', 'Tailwind CSS 实用技巧', 'tailwind-tips-01', '提升 Tailwind 开发效率', E'# Tailwind CSS 技巧\n\n```css\n.btn { @apply px-4 py-2 rounded; }\n```', '22222222-2222-2222-2222-222222222222', '{"CSS","Tailwind","前端"}', 456, 34, 2, NOW() - INTERVAL '7 days', 2),
-- AI (3)
('a1000001-0000-0000-0000-000000000007', 'LLM 应用开发入门：从 Prompt 到 Agent', 'llm-app-01', '大语言模型应用开发指南', E'# LLM 应用开发\n\nAgent = LLM + Memory + Tools + Planning', '33333333-3333-3333-3333-333333333333', '{"AI","LLM","Agent"}', 2100, 156, 2, NOW() - INTERVAL '1 day', 3),
('a1000001-0000-0000-0000-000000000008', 'RAG 架构设计：让 AI 拥有私域知识', 'rag-design-01', 'RAG 检索增强生成架构', E'# RAG 架构\n\n用户问题 → 向量化 → 检索 → LLM 生成', '33333333-3333-3333-3333-333333333333', '{"AI","RAG","向量数据库"}', 1567, 120, 2, NOW() - INTERVAL '3 days', 3),
-- 移动端 (4)
('a1000001-0000-0000-0000-000000000009', 'Flutter vs React Native 2026 选型指南', 'flutter-rn-01', '跨平台框架对比', E'# Flutter vs React Native\n\n新项目推荐 Flutter，已有 JS 团队选 RN', '44444444-4444-4444-4444-444444444444', '{"Flutter","ReactNative","移动端"}', 780, 56, 2, NOW() - INTERVAL '2 days', 4),
('a1000001-0000-0000-0000-000000000010', 'SwiftUI 声明式 UI 实战', 'swiftui-01', 'SwiftUI 声明式开发', E'# SwiftUI 实战\n\n@State、@Binding、@ObservedObject', '44444444-4444-4444-4444-444444444444', '{"Swift","iOS","移动端"}', 345, 23, 2, NOW() - INTERVAL '6 days', 4),
-- 开发工具 (5)
('a1000001-0000-0000-0000-000000000011', 'Docker Compose 开发环境最佳实践', 'docker-dev-01', 'Docker Compose 搭建开发环境', E'# Docker Compose\n\n一键启动 PostgreSQL + Redis + Meilisearch', '55555555-5555-5555-5555-555555555555', '{"Docker","DevOps","开发工具"}', 623, 41, 2, NOW() - INTERVAL '4 days', 5),
('a1000001-0000-0000-0000-000000000012', 'Git 高级工作流', 'git-adv-01', 'rebase、cherry-pick 等高级操作', E'# Git 高级工作流\n\n```bash\ngit rebase -i HEAD~5\n```', '55555555-5555-5555-5555-555555555555', '{"Git","DevOps","开发工具"}', 934, 67, 2, NOW() - INTERVAL '8 days', 5),
-- 阅读 (6)
('a1000001-0000-0000-0000-000000000013', '《代码整洁之道》读书笔记', 'clean-code-01', 'Clean Code 读书心得', E'# 代码整洁之道\n\n函数应该短小，只做一件事。', '11111111-1111-1111-1111-111111111111', '{"读书笔记","软件工程","阅读"}', 478, 35, 2, NOW() - INTERVAL '10 days', 6),
('a1000001-0000-0000-0000-000000000014', '程序员成长路径：从初级到架构师', 'career-path-01', '技术人职业发展', E'# 程序员成长路径\n\n初级 → 中级 → 高级 → 架构师', '33333333-3333-3333-3333-333333333333', '{"职业发展","阅读"}', 1890, 145, 2, NOW() - INTERVAL '5 days', 6),
('a1000001-0000-0000-0000-000000000015', '为什么每个程序员都应该写博客', 'why-blog-01', '写作对程序员的价值', E'# 为什么写博客\n\n费曼学习法：教别人是最好的学习方式。', '44444444-4444-4444-4444-444444444444', '{"写作","职业发展","阅读"}', 2340, 189, 2, NOW() - INTERVAL '2 days', 6)
ON CONFLICT (slug) DO NOTHING;

SELECT 'Done: ' || (SELECT COUNT(*) FROM users) || ' users, ' || (SELECT COUNT(*) FROM articles) || ' articles';
