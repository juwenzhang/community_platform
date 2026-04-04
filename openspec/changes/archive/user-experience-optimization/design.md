## Context

平台当前存在三个明显的 UX 缺陷：编辑资料入口丢失、头像只能粘贴 URL、无暗黑模式。

**当前状态**：
- **UserArea 菜单**：只有"我的主页"（`/user/:username`）、"创作中心"（`/profile/manage`）、"退出登录"，缺少"编辑资料"入口
- **EditProfileForm**：头像字段是 `<Input placeholder="https://example.com/avatar.jpg">`，纯文本输入
- **CSS 变量**：`:root` 中定义了语义化变量（`--color-text-1` ~ `--color-text-4`、`--color-bg-page` 等），注释已标注"后续可通过 JS 切换"
- **Antd ConfigProvider**：`algorithm` 硬编码为 `theme.defaultAlgorithm`，`colorPrimary` 硬编码为 `#1e80ff`
- **Vue ProfileCard**：有 `<a href="/profile">编辑资料</a>` 链接，与 React 端不一致

**约束**：
- 文件上传走 `multipart/form-data`（不走 Protobuf），这是项目规范的例外
- CSS 变量是运行时的，适合主题切换；Less 变量是编译时的，不适合
- 暗黑模式只覆盖 React 主应用，Vue 子应用留后续

## Goals / Non-Goals

**Goals:**
- 用户可以从导航菜单一键进入编辑资料页
- 用户可以直接上传图片作为头像（不用手动粘贴 URL）
- 用户可以切换亮色/暗黑主题，选择持久化到 localStorage

**Non-Goals:**
- 多主题 / 自定义调色板
- 图片 CDN / 裁剪 / 压缩处理管线
- Markdown 编辑器内联图片上传
- Vue 子应用暗黑模式
- `prefers-color-scheme` 系统主题自动跟随

## Decisions

### Decision 1：文件存储方案 — Cloudinary 云服务

| 方案 | 优势 | 劣势 |
|------|------|------|
| A. 本地文件系统 | 零依赖、开发简单 | 不可水平扩展、需要静态文件服务 |
| B. MinIO（本地 S3 兼容） | 接近生产环境、S3 API | 多一个 Docker 容器 |
| C. 云 OSS（腾讯云 COS / 阿里 OSS） | 生产就绪 | 需要账号配置、开发环境联网 |
| **D. Cloudinary** | 自带 CDN + 图片变换（裁剪/缩放/格式转换）、免费额度充足、SDK 成熟 | 依赖第三方服务、需联网 |

**选择 D**：使用 Cloudinary 作为图片存储和 CDN 服务。

**理由**：Cloudinary 提供开箱即用的图片上传、存储、CDN 分发和实时变换能力（如自动裁剪为正方形头像、WebP 格式转换、尺寸缩放），无需自建静态文件服务或图片处理管线。免费额度（25 credits/月）足够开发和小规模使用。后续如需迁移，可通过 `StorageBackend` trait 抽象切换到其他方案。

**配置管理**：
- `CLOUDINARY_CLOUD_NAME`、`CLOUDINARY_API_KEY`、`CLOUDINARY_API_SECRET` 通过环境变量注入
- 开发环境在 `docker/.env` 中配置，已在 `.gitignore` 中
- 前端直接使用 Cloudinary 返回的 HTTPS URL（带 CDN 加速）

**Cloudinary 上传模式**：采用 **服务端签名上传（Signed Upload）** 模式：
1. 前端请求 Gateway 获取上传签名（签名包含时间戳、文件夹路径等参数）
2. 前端直接上传文件到 Cloudinary（绕过 Gateway，减轻服务端带宽压力）
3. Cloudinary 返回 `secure_url`，前端将 URL 写入用户资料

### Decision 2：文件上传实现 — Gateway 签名端点 + 前端直传 Cloudinary

文件上传不走 gRPC/Connect Protocol（Protobuf 不适合二进制大文件流），采用两步流程：

**Step 1 — 获取上传签名**（Gateway REST 端点）：
```
POST /api/v1/upload/sign
Content-Type: application/json
Authorization: Bearer <token>
Body: { "folder": "avatars" }

Response: {
  "signature": "xxx",
  "timestamp": 1712345678,
  "cloud_name": "xxx",
  "api_key": "xxx",
  "folder": "avatars/{user_id}"
}
```

**Step 2 — 前端直传 Cloudinary**：
```
POST https://api.cloudinary.com/v1_1/{cloud_name}/image/upload
Content-Type: multipart/form-data
Body: file + signature + timestamp + api_key + folder

Response: { "secure_url": "https://res.cloudinary.com/xxx/image/upload/v1/avatars/xxx/yyy.jpg" }
```

**为什么用签名上传而不是服务端代理上传？**
- 前端直传减轻 Gateway 带宽压力（图片文件不经过后端）
- 签名保证只有认证用户才能上传（签名有时效性）
- Cloudinary 自动处理图片存储、CDN 分发、格式优化

**实现关键**：
- Gateway 签名端点使用 Cloudinary API Secret 生成 SHA-1 签名
- 签名参数：`timestamp`、`folder`、`public_id`（可选）
- 前端使用 Cloudinary Upload Widget 或手动构造 `FormData` 上传
- 上传成功后使用 `secure_url` 更新用户 `avatar_url`
- 图片变换通过 URL 参数实现：`/w_200,h_200,c_fill,g_face/` 自动裁剪为正方形头像

### Decision 3：暗黑模式实现策略

```
用户点击切换按钮
  → useThemeStore 更新 theme 状态
  → document.documentElement.setAttribute('data-theme', 'dark')
  → Antd ConfigProvider algorithm 切换为 darkAlgorithm
  → localStorage 持久化
```

**CSS 变量方案**：

```less
/* variables.less — 在 :root 后新增 */
[data-theme="dark"] {
  --color-primary: #4c9aff;
  --color-primary-hover: #6db3ff;
  --color-primary-bg: #1a3353;

  --color-text-1: #e8e8e8;
  --color-text-2: #c9c9c9;
  --color-text-3: #8b8b8b;
  --color-text-4: #5a5a5a;

  --color-bg-page: #141414;
  --color-bg-card: #1f1f1f;
  --color-bg-hover: #2a2a2a;
  --color-bg-active: #1a3353;

  --color-border: #303030;
  --color-border-light: #252525;

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
}
```

**为什么用 `data-theme` attribute 而不是 CSS `prefers-color-scheme`？**
- `data-theme` 支持手动切换，JS 完全可控
- `prefers-color-scheme` 只能跟随系统设置，无法手动切换
- 后续可以同时支持两者（系统跟随作为默认，手动切换覆盖）

**Antd 主题切换**：

```typescript
// useThemeStore.ts
interface ThemeState {
  theme: 'light' | 'dark';
  toggle: () => void;
}

// main.tsx
const algorithm = theme === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm;
<ConfigProvider theme={{ algorithm, token: { colorPrimary: '#1e80ff' } }}>
```

### Decision 4：主题切换 UI 位置

| 方案 | 优势 | 劣势 |
|------|------|------|
| **A. Header 右侧独立图标** | 醒目、一键切换 | 占 Header 空间 |
| B. UserArea 下拉菜单内 | 不占额外空间 | 需要打开菜单才能切换 |
| C. 两者都有 | 灵活 | 重复 |

**选择 A**：Header 右侧（UserArea 左侧）放置独立的主题切换图标按钮。

**理由**：主题切换是高频操作（尤其在夜间编程时），应该一键可达。掘金也是在 Header 右侧放主题切换图标。使用 `<SunOutlined />` / `<MoonOutlined />` 图标，直观明了。

### Decision 5：UserArea 菜单修复

在现有"我的主页"和"创作中心"之间新增"编辑资料"入口：

```tsx
// 新增菜单项
<div className={styles.menuItem} onClick={() => handleNav('/profile')}>
  <SettingOutlined />
  <span>编辑资料</span>
</div>
```

菜单最终顺序：
1. 👤 我的主页 → `/user/:username`
2. ✏️ 编辑资料 → `/profile` ← **新增**
3. 📝 创作中心 → `/profile/manage`
4. ─── 分隔线 ───
5. 🚪 退出登录

### Decision 6：AvatarUpload 组件设计

使用 Antd `<Upload>` 组件 + 自定义上传逻辑：

```typescript
interface AvatarUploadProps {
  value?: string;        // 当前头像 URL
  onChange?: (url: string) => void;  // 上传成功后回调 URL
}
```

- 展示当前头像预览（圆形裁剪）
- 点击触发文件选择 / 支持拖拽
- 上传中显示 loading 状态
- 上传成功自动调用 `onChange` 更新 URL
- 作为 Antd Form.Item 的受控组件使用

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|---------| 
| Cloudinary 服务不可用 | 图片上传和显示受影响 | 前端显示使用默认头像 fallback；`StorageBackend` trait 抽象可切换方案 |
| Cloudinary 免费额度用尽 | 上传受限 | 监控用量；免费 25 credits/月足够开发使用；生产可升级付费计划 |
| 暗黑模式颜色不协调 | 某些组件在暗色下不好看 | 逐一检查所有组件，确保 CSS 变量覆盖全面；Antd darkAlgorithm 覆盖大部分 |
| 文件上传安全风险 | 恶意文件上传 | Cloudinary 签名上传（有时效性）+ 文件类型/大小限制（Cloudinary 端配置）|
| `data-theme` 切换闪烁 | 页面加载时先亮后暗 | 在 `<head>` 中内联脚本读取 localStorage 提前设置 attribute |
| API Secret 泄露 | Cloudinary 账户被盗用 | Secret 仅存于后端环境变量，不暴露给前端；签名有时间戳过期机制 |

## Open Questions

1. **头像尺寸限制**：Cloudinary 支持 URL 参数实时变换（`/w_200,h_200,c_fill,g_face/`），无需本地裁剪。
2. **文章封面图上传**：可复用同一签名端点（`folder` 参数改为 `covers`），本次只实现头像上传。
3. **暗黑模式色值微调**：暗色配色需要实际看效果调整，目前给出的是初始值。
