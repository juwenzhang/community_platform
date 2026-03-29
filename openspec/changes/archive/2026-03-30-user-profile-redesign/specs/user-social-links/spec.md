# user-social-links — 用户社交链接系统

## 概述

为用户模型添加社交链接和结构化个人信息（公司/地点/网站），支持前端展示和编辑。

## 需求

### Proto 扩展

1. **新增 `SocialLink` 消息**
   - `platform` (string): 平台标识，枚举值 `github | twitter | weibo | linkedin | juejin | zhihu | bilibili | website`
   - `url` (string): 链接 URL

2. **`User` 消息新增字段**（从字段号 9 开始）
   - `company` (string, 9): 公司/组织
   - `location` (string, 10): 所在地
   - `website` (string, 11): 个人网站
   - `social_links` (repeated SocialLink, 12): 社交链接列表

3. **`UpdateProfileRequest` 消息扩展**（从字段号 4 开始）
   - `company` (string, 4)
   - `location` (string, 5)
   - `website` (string, 6)
   - `social_links` (repeated SocialLink, 7)

### 后端

4. **数据库 schema 扩展**
   - `users` 表新增列：`company VARCHAR(100)`、`location VARCHAR(100)`、`website VARCHAR(255)`、`social_links JSONB DEFAULT '[]'`

5. **svc-user UpdateProfile handler 扩展**
   - 保存新字段到数据库
   - social_links 序列化为 JSON 存入 JSONB 列
   - 读取时反序列化为 `Vec<SocialLink>`

6. **svc-user 查询 handler 扩展**
   - GetUser / GetUserByUsername / ListUsers / GetCurrentUser 返回的 User 包含新字段

### Gateway

7. **REST Proxy DTO 扩展**
   - `UserDto` 新增 `company`、`location`、`website`、`social_links` 字段
   - `UpdateProfileDto` 新增对应字段
   - Swagger 文档自动更新

### 前端展示

8. **ProfileCard 社交链接展示**
   - 卡片右上角展示社交平台图标（GitHub、微博等），可点击跳转
   - 图标使用对应平台的品牌色或统一灰色
   - 结构化信息展示：公司（🏢）、地点（📍）、网站（🔗）

9. **公开个人主页 `/user/:username` 同步**
   - 展示完整的社交链接和结构化信息

### 前端编辑

10. **EditProfileForm 社交链接编辑**
    - 新增 company / location / website 输入框
    - 社交链接：动态列表，每行 = 平台下拉选择 + URL 输入 + 删除按钮
    - "添加链接" 按钮，最多 10 条
    - 平台下拉可选值：GitHub, Twitter/X, 微博, LinkedIn, 掘金, 知乎, B站, 个人网站

### Vue 子应用

11. **`apps/user-profile/UserProfile.vue` 适配**
    - 展示新的 User 字段（社交链接图标 + 结构化信息）

## 验收标准

- [ ] Proto `SocialLink` 消息定义 + `User` / `UpdateProfileRequest` 扩展
- [ ] `make proto` 代码生成成功
- [ ] svc-user 支持存储和读取新字段
- [ ] ProfileCard 展示社交链接图标（可点击）和结构化信息
- [ ] 编辑资料可以增删改社交链接
- [ ] 公开个人主页同步展示
