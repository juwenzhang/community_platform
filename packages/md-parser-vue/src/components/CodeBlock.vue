<template>
  <div class="codeBlockWrapper">
    <span v-if="language" class="codeBlockLanguage">{{ language }}</span>
    <pre ref="preRef" :class="{ shiki: highlightedHtml }">
      <code v-if="highlightedHtml" v-html="sanitizedHighlightedHtml"></code>
      <code v-else-if="showLineNumbers">
        <div v-for="(line, i) in lines" :key="i" class="codeLine">
          <span class="lineNumber">{{ i + 1 }}</span>
          <span class="lineContent">{{ line }}</span>
        </div>
      </code>
      <code v-else>{{ code }}</code>
    </pre>
    <button type="button" class="copyButton" @click="handleCopy" :aria-label="copied ? '已复制' : '复制代码'">
      {{ copied ? '✓' : '📋' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import DOMPurify from 'dompurify';

interface Props {
  /** 代码内容 */
  code: string;
  /** 编程语言 */
  language?: string;
  /** 是否显示行号 */
  showLineNumbers?: boolean;
  /** 高亮后的 HTML（来自 Shiki） */
  highlightedHtml?: string;
}

const props = withDefaults(defineProps<Props>(), {
  showLineNumbers: false,
});

const copied = ref(false);
const preRef = ref<HTMLPreElement>();

const lines = computed(() => props.code.split('\n'));

// 使用 DOMPurify 清理高亮 HTML（防止 XSS）
const sanitizedHighlightedHtml = computed(() =>
  props.highlightedHtml ? DOMPurify.sanitize(props.highlightedHtml) : ''
);

const handleCopy = async () => {
  try {
    await navigator.clipboard.writeText(props.code);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy code:', err);
  }
};
</script>

<style scoped>
.codeBlockWrapper {
  position: relative;
  margin: 1em 0;
}

.codeBlockLanguage {
  position: absolute;
  top: 0;
  right: 0;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  color: #6a737d;
  background-color: #f6f8fa;
  border-bottom-left-radius: 4px;
  border: 1px solid #e1e4e8;
  border-top: none;
  border-right: none;
}

.copyButton {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  padding: 0.25rem 0.5rem;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid #e1e4e8;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  opacity: 0;
  transition: opacity 0.2s;
}

.copyButton:hover {
  background: rgba(255, 255, 255, 1);
}

.codeBlockWrapper:hover .copyButton {
  opacity: 1;
}

.codeLine {
  display: flex;
}

.lineNumber {
  display: inline-block;
  width: 3em;
  padding-right: 1em;
  margin-right: 1em;
  text-align: right;
  color: #6a737d;
  background-color: #f6f8fa;
  border-right: 1px solid #e1e4e8;
  user-select: none;
}

.lineContent {
  flex: 1;
}

pre.shiki {
  background-color: #1e1e1e;
  color: #d4d4d4;
}

pre.shiki span {
  color: var(--shiki-color, inherit);
}
</style>
