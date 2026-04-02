## ADDED Requirements

### Requirement: 首页支持按关键词搜索文章

首页文章列表上方 SHALL 提供搜索输入框，用户输入关键词后文章列表按 `query` 参数筛选。

#### Scenario: 用户输入搜索关键词
- **WHEN** 用户在搜索框中输入关键词并等待 300ms（debounce）
- **THEN** 文章列表使用 `fetchArticles({ query })` 重新加载，显示匹配结果

#### Scenario: 搜索与标签筛选叠加
- **WHEN** 用户同时选择了标签筛选和输入了搜索关键词
- **THEN** 文章列表使用 `fetchArticles({ tag, query })` 同时按标签和关键词筛选

#### Scenario: 清空搜索恢复默认列表
- **WHEN** 用户清空搜索框
- **THEN** 文章列表恢复为默认列表（仅受 tag 筛选影响）

#### Scenario: 搜索无结果
- **WHEN** 搜索关键词没有匹配到任何文章
- **THEN** 显示「暂无文章」空状态
