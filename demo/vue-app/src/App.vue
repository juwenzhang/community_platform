<template>
  <div class="app">
    <div class="layout">
      <!-- 左侧：编辑器 + 渲染 -->
      <div class="main">
        <h1 class="title">Vue Markdown Parser Demo</h1>

        <textarea
          v-model="markdown"
          class="editor"
          rows="8"
        />

        <div ref="containerRef">
          <MarkdownRenderer
            :content="markdown"
            :debounce="200"
            :event-handlers="eventHandlers"
            @toc-ready="onTocReady"
          />
        </div>
      </div>

      <!-- 右侧：TOC + 事件日志 -->
      <div class="sidebar">
        <nav class="toc">
          <h3 class="toc-title">目录</h3>
          <ul class="toc-list">
            <li v-for="item in toc" :key="item.id">
              <a
                :href="`#${item.id}`"
                :class="{ active: activeId === item.id }"
                :style="{ paddingLeft: `${(item.level - 1) * 16}px` }"
              >
                {{ item.text }}
              </a>
            </li>
          </ul>
        </nav>

        <div class="events">
          <h3 class="events-title">事件日志</h3>
          <div class="events-log">
            <div v-if="events.length === 0" class="events-empty">
              点击 @mention、#hashtag 等试试
            </div>
            <div v-for="(e, i) in events" :key="i" class="events-item">
              {{ e }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { TocItem, EventHandlers } from '@luhanxin/md-parser-core';
import { MarkdownRenderer } from '@luhanxin/md-parser-vue';
import { useActiveHeading } from '@luhanxin/md-parser-vue';

const containerRef = ref<HTMLElement | null>(null);
const toc = ref<TocItem[]>([]);
const events = ref<string[]>([]);
const activeId = useActiveHeading(containerRef, toc);

const markdown = ref(`---
title: Vue Markdown Demo
tags: [vue, markdown, enterprise]
---

# Vue Markdown Parser Demo

这是一个 **企业级** Markdown 渲染 Demo，验证 \`@luhanxin/md-parser-vue\` 的全部能力。

## 功能测试

### 1. 代码高亮

\`\`\`typescript
import { MarkdownRenderer } from '@luhanxin/md-parser-vue';
const markdown = ref('# Hello World');
\`\`\`

### 2. 自定义语法

@vue 你好，这是一条 @mention 测试。

标签：#前端 #Vue #Markdown

### 3. 容器

:::tip 提示
支持 **Markdown** 语法。
:::

:::warning 警告
注意事项。
:::

### 4. 外链

访问 [Vue.js](https://vuejs.org) 官网。

---

**测试完成！** ✅
`);

const addEvent = (msg: string) => {
  const time = new Date().toLocaleTimeString();
  events.value = [`[${time}] ${msg}`, ...events.value.slice(0, 9)];
};

const eventHandlers: EventHandlers = {
  onMentionClick: (u) => addEvent(`@mention: ${u}`),
  onHashtagClick: (t) => addEvent(`#hashtag: ${t}`),
  onImageClick: (src) => addEvent(`image: ${src}`),
  onLinkClick: (href) => addEvent(`link: ${href}`),
  onCodeCopy: (_, lang) => addEvent(`code copy: ${lang}`),
  onHeadingClick: (id) => addEvent(`heading: #${id}`),
};

const onTocReady = (t: TocItem[]) => {
  toc.value = t;
};
</script>

<style scoped>
.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px;
}

.layout {
  display: flex;
  gap: 24px;
}

.main {
  flex: 1;
  min-width: 0;
}

.title {
  font-size: 24px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 16px;
}

.editor {
  width: 100%;
  padding: 12px;
  font-size: 13px;
  font-family: monospace;
  border: 1px solid #e4e6eb;
  border-radius: 8px;
  margin-bottom: 16px;
  resize: vertical;
}

.sidebar {
  width: 220px;
  flex-shrink: 0;
}

.toc {
  position: sticky;
  top: 16px;
}

.toc-title {
  font-size: 14px;
  font-weight: 600;
  color: #515767;
  margin-bottom: 8px;
}

.toc-list {
  list-style: none;
  padding: 0;
  margin: 0;

  a {
    display: block;
    padding: 4px 0;
    font-size: 13px;
    color: #8a919f;
    text-decoration: none;
    transition: color 0.2s;

    &.active {
      color: #1e80ff;
      font-weight: 600;
    }

    &:hover {
      color: #1e80ff;
    }
  }
}

.events {
  margin-top: 24px;
}

.events-title {
  font-size: 14px;
  font-weight: 600;
  color: #515767;
  margin-bottom: 8px;
}

.events-log {
  max-height: 300px;
  overflow: auto;
  font-size: 12px;
  font-family: monospace;
  background: #f7f8fa;
  border-radius: 8px;
  padding: 8px;
}

.events-empty {
  color: #a8b1bf;
}

.events-item {
  padding: 2px 0;
  color: #515767;
}
</style>
