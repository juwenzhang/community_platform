<template>
  <div class="container">
    <h1 class="title">Vue Markdown Parser Demo</h1>

    <div class="editor">
      <label class="label">编辑 Markdown：</label>
      <textarea
        v-model="markdown"
        class="textarea"
        rows="12"
      ></textarea>
    </div>

    <div class="preview">
      <h2 class="preview-title">渲染结果：</h2>
      <MarkdownRenderer :content="markdown" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { MarkdownRenderer } from '@luhanxin/md-parser-vue';

const markdown = ref(`# Vue Markdown Demo

这是一个 **测试示例**，验证 \`@luhanxin/md-parser-vue\` 包是否正常工作。

## 功能测试

### 1. 代码高亮

\`\`\`typescript
import { MarkdownRenderer } from '@luhanxin/md-parser-vue';

const markdown = ref('# Hello World');
\`\`\`

### 2. Mermaid 图表

\`\`\`mermaid
graph LR
    A[Vue] --> B[Markdown]
    B --> C[渲染]
\`\`\`

### 3. Mention 提及

@vue 你好，这是一条测试消息。

### 4. Hashtag 标签

#前端开发 #Vue #Markdown

### 5. 自定义容器

:::tip 提示
这是一个提示框
:::

:::warning 警告
这是一个警告框
:::

## 列表测试

- 无序列表项 1
- 无序列表项 2
  - 嵌套项 2.1
  - 嵌套项 2.2

1. 有序列表项 1
2. 有序列表项 2

---

**测试完成！** ✅
`);
</script>

<style scoped>
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.title {
  text-align: center;
  margin-bottom: 20px;
}

.editor {
  margin-bottom: 20px;
}

.label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
}

.textarea {
  width: 100%;
  padding: 12px;
  font-size: 14px;
  font-family: monospace;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.preview {
  border-top: 2px solid #eee;
  padding-top: 20px;
}

.preview-title {
  margin-bottom: 16px;
}
</style>
