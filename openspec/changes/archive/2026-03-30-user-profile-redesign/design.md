## Context

当前用户系统已完成基础功能（注册/登录/JWT 认证/个人资料 CRUD），但存在两个体验短板：

1. **Header UserArea**：只有 Ant Design `Dropdown` + 2 项菜单（个人主页/退出登录），缺少创作中心等高频入口
2. **ProfilePage**：页面顶部硬编码"创作中心"和"编辑资料"按钮，ProfileCard 只展示基础信息（头像/用户名/邮箱/bio），没有社交链接和结构化信息

### 现有 Proto 模型

```protobuf
message User {
  string id = 1;
  string username = 2;
  string email = 3;
  string display_name = 4;
  string avatar_url = 5;
  string bio = 6;
  google.protobuf.Timestamp created_at = 7;
  google.protobuf.Timestamp updated_at = 8;
}

message UpdateProfileRequest {
  string display_name = 1;
  string avatar_url = 2;
  string bio = 3;
}
```

### 现有前端组件

- `components/UserArea/index.tsx`：头像 + 用户名 + Ant Dropdown（2 项）
- `components/Layout/index.tsx`：顶栏布局，引用 UserArea
- `pages/profile/index.tsx`：我的资料页（创作中心 + 编辑资料按钮 + ProfileCard + ArticleList）
- `pages/profile/components/ProfileCard/index.tsx`：头像 + 名字 + 邮箱 + bio
- `pages/profile/components/EditProfileForm/index.tsx`：编辑表单（display_name/avatar_url/bio）

## Goals / Non-Goals

**Goals:**
- Proto `User` 消息扩展：新增 company、location、website、social_links 字段
- Header 头像下拉菜单增强：用户信息卡片 + 功能入口（我的主页/创作中心/编辑资料/退出登录）
- ProfileCard 重构：社交链接图标 + 结构化信息 + 更精致的卡片设计
- 编辑资料表单增强：社交链接动态编辑（平台选择 + URL）
- 公开个人主页 `/user/:username` 同步展示
- Vue 子应用 `apps/user-profile` 同步适配

**Non-Goals:**
- 关注/粉丝系统
- 用户统计数据聚合（文章数/获赞数）
- 头像文件上传（继续使用 URL）
- 暗黑模式

## Decisions

### 决策 1：社交链接存储方案 — JSONB 列

**选定方案**: `User` 表新增 `social_links JSONB` 列

| 维度 | 方案 A: JSONB 列 | 方案 B: 独立关联表 |
|------|-----------------|------------------|
| 复杂度 | 低，单表操作 | 高，JOIN 查询 |
| 查询性能 | 随 User 一起返回，零额外开销 | 需要 JOIN 或 N+1 |
| 灵活性 | 新增平台只改前端枚举 | 需要改表结构 |
| 数据一致性 | 应用层校验 | DB 约束 |
| 适用场景 | 数据量小（5-10 条链接）、频繁整体读取 | 大量独立查询 |

**理由**: 社交链接数据量小（通常 ≤10 条），总是随用户一起读取，JSONB 列最简单高效。

```sql
-- 数据库变更
ALTER TABLE users ADD COLUMN company VARCHAR(100) DEFAULT '';
ALTER TABLE users ADD COLUMN location VARCHAR(100) DEFAULT '';
ALTER TABLE users ADD COLUMN website VARCHAR(255) DEFAULT '';
ALTER TABLE users ADD COLUMN social_links JSONB DEFAULT '[]';
```

### 决策 2：Proto 社交链接建模

```protobuf
// 社交链接
message SocialLink {
  // 平台标识：github, twitter, weibo, linkedin, website, juejin, zhihu, bilibili
  string platform = 1;
  // 链接 URL
  string url = 2;
}

// User 扩展（字段号从 9 开始，不影响已有字段）
message User {
  // ... 现有 1-8 ...
  string company = 9;       // 公司/组织
  string location = 10;     // 所在地
  string website = 11;      // 个人网站
  repeated SocialLink social_links = 12;  // 社交链接
}

// UpdateProfileRequest 扩展
message UpdateProfileRequest {
  // ... 现有 1-3 ...
  string company = 4;
  string location = 5;
  string website = 6;
  repeated SocialLink social_links = 7;
}
```

### 决策 3：Header 下拉菜单交互方案

**选定方案**: 自定义下拉面板（非 Ant Dropdown menu）

参考掘金的头像下拉面板设计：
```
┌─────────────────────────────┐
│  [Avatar]  DisplayName      │
│  @username                  │
│  ─────────────────────────  │
│  👤 我的主页                 │
│  ✏️ 创作中心                 │
│  ─────────────────────────  │
│  ⚙️ 编辑资料                 │
│  ─────────────────────────  │
│  🚪 退出登录                 │
└─────────────────────────────┘
```

**理由**: Ant Dropdown menu 样式受限，无法放置头像卡片。使用 Ant `Popover` 组件 + 自定义内容实现。

### 决策 4：ProfileCard 布局

参考掘金个人主页卡片：
```
┌────────────────────────────────────────────┐
│ ┌──────┐                    [GitHub] [微博] │
│ │Avatar│ DisplayName                        │
│ │ 64px │ @username                          │
│ └──────┘ 🏢 Company · 📍 Location           │
│          🔗 website.com                      │
│                                              │
│ Bio (Markdown rendered)                      │
│ ...                                          │
└────────────────────────────────────────────┘
```

社交链接图标显示在卡片右上角，点击跳转对应平台页面。

### 决策 5：`/profile` vs `/user/:username` — 微前端职责分离

**关键约束**: 本项目是 Garfish 微前端架构：
- `/user/:username` → **Vue 子应用** (`apps/user-profile`)，通过 Garfish 动态加载
- `/profile` → **React main 应用** 本地路由

**两者不能合并**，因为 React 组件（EditProfileForm、useAuthStore）无法在 Vue 子应用中复用。

**选定方案**: **各司其职，互不替代**

| 路由 | 应用 | 职责 |
|------|------|------|
| `/user/:username` | Vue 子应用 | 公开个人主页（只读）：ProfileCard + 社交链接 + 文章列表 |
| `/profile` | React main | 当前用户设置（编辑资料 + 社交链接编辑 + 我的文章列表） |

**两页面共享 ProfileCard 设计语言**，但分别用各自框架实现：
- React: `pages/profile/components/ProfileCard/index.tsx`
- Vue: `apps/user-profile/src/components/ProfileCard.vue`（或直接写在 UserProfile.vue）

**Header 下拉菜单入口映射**:
- "我的主页" → `/user/<username>`（Vue 子应用，公开主页）
- "创作中心" → `/article/create`（React main）
- "编辑资料" → `/profile`（React main，编辑模式）
- "退出登录" → 清除 token + 跳转首页

**ProfileCard 展示差异**:
- `/user/:username`（Vue）：纯展示，自己访问自己时可显示"编辑资料"链接跳转到 `/profile`
- `/profile`（React）：带编辑功能，展示 ProfileCard + 内联 EditProfileForm

### 决策 6：UpdateProfile 更新语义 — 全量覆盖

**问题**: 当前后端 `update_profile` 使用"空字符串 = 不更新"语义，但新增的 `social_links` 是 `repeated` 字段，空列表与未设置无法区分。两种语义混用会造成困惑。

**选定方案**: **统一为全量覆盖**

- 前端 EditProfileForm 总是发送**所有字段的当前值**（包括未修改的）
- 后端直接**全量覆盖**所有字段，不再判断"是否为空"
- 这样语义一致、逻辑简单、不会误清空

**需要修改现有后端**：`svc-user/handlers/user/profile.rs` 中的 `if !field.is_empty()` 判断改为直接 `Set(field)`。

**理由**: 当前项目阶段，全量覆盖最简单可靠。部分更新（FieldMask/Optional 字段）等以后有需求再引入。

### 决策 7：社交链接 URL 校验

| 层 | 校验内容 |
|----|---------|
| 前端 | URL 格式校验（以 http:// 或 https:// 开头）；按平台匹配域名提示（非强制） |
| 后端 | URL 基本格式校验（非空 + 合法 URL）；platform 值在允许列表内；单用户最多 10 条 |

**平台域名提示映射**（前端 soft validation，不阻止提交）：
```
github   → github.com/*
twitter  → twitter.com/* | x.com/*
weibo    → weibo.com/*
linkedin → linkedin.com/*
juejin   → juejin.cn/*
zhihu    → zhihu.com/*
bilibili → bilibili.com/* | b23.tv/*
website  → 任意 URL
```

### 决策 8：Vue `/user/:username` 页面的编辑入口

当用户在 Vue 子应用 `/user/:username` 页面访问自己的主页时：
- ProfileCard 右上角显示 **编辑资料** 链接按钮
- 点击跳转到 `/profile`（React main 应用的编辑页面）
- 判断"是否是自己"：通过 localStorage 中的 token + 用户信息比对 username

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|---------|
| JSONB 列无 DB 级校验 | 应用层对 platform/url 做格式验证，前端限制可选平台列表 |
| Proto 字段号扩展可能冲突 | 从 9 开始，`reserved` 标记已删除字段号 |
| 社交链接平台列表硬编码在前端 | 可接受，新增平台只需加枚举值，不影响 Proto/后端 |
| Popover 在移动端体验差 | 当前不考虑移动端适配，后续优化 |
| Vue 子应用判断"是否是自己"需要跨框架通信 | 通过 Garfish props 传递（见决策 9） |
| 全量覆盖语义改变现有 UpdateProfile 行为 | EditProfileForm 打开时用完整 user 数据初始化所有字段（见决策 10） |

### 决策 9：Vue 子应用获取当前用户 — Garfish Props 通信

**问题**: Vue 子应用 (`apps/user-profile`) 需要判断 `/user/:username` 是不是自己，以显示"编辑资料"按钮。但 Vue 和 React 不共享 store。

**方案对比**:

| 方案 | 做法 | 优点 | 缺点 |
|------|------|------|------|
| A. 解析 localStorage JWT | 读 token → 解析 payload → 拿 username | 零网络请求 | JWT 格式变了要同步改 |
| B. 调用 GetCurrentUser RPC | Vue transport 加 auth interceptor | 最准确 | 多一次网络请求 |
| **C. Garfish props** | 主应用注册子应用时传递 `getCurrentUser` 函数 | **最优雅，框架级方案** | 需改 Garfish 配置 |

**选定方案 C**: Garfish props 通信

```typescript
// React main — 注册子应用时传递 props
// apps/main/src/App.tsx 或 Garfish 配置处
{
  name: 'user-profile',
  props: {
    getCurrentUser: () => useAuthStore.getState().user,
  }
}

// Vue sub-app — 接收 props
// apps/user-profile/src/views/UserProfile.vue
const garfishProps = (window as any).__GARFISH__?.props || {};
const currentUser = garfishProps.getCurrentUser?.();
const isOwner = computed(() => currentUser?.username === username.value);
```

**理由**:
- Garfish 原生支持主应用向子应用传 props，这是微前端跨框架通信的标准方式
- 子应用不需要自己管认证、不依赖 localStorage key 约定
- 未来其他子应用（admin 等）也能复用此机制
- 同时解决了 Vue transport 没有 auth interceptor 的问题

### 决策 10：全量覆盖的安全保障 — 表单初始化

**问题**: 改为全量覆盖后，如果前端漏发某个字段，后端会把它清空。

**解决方案**: EditProfileForm 打开时，**必须**用当前 user 的完整数据初始化所有字段

```
用户点击"编辑资料"
  → EditProfileForm 从 useAuthStore.user 读取所有字段作为 initialValues
  → 包括：display_name, avatar_url, bio, company, location, website, social_links
  → 新字段如 user 上为空，默认 "" / []（不是 undefined）
  → 用户修改任意字段
  → 提交时发送所有字段完整值
  → 后端全量覆盖 → 不会误清空未修改的字段
```

**关键约束**:
- EditProfileForm 的 state 初始化必须覆盖 UpdateProfileRequest 的所有字段
- 禁止提交 `undefined` 值，所有字段必须有明确的默认值

## Open Questions

- 无（方案已明确）
