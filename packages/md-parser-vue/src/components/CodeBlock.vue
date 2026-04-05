<template>
  <div class="code-block-wrapper">
    <span v-if="language" class="code-block-lang">{{ language }}</span>
    <pre ref="preRef" :class="{ shiki: highlightedHtml }">
      <code v-if="highlightedHtml" v-html="highlightedHtml"></code>
      <code v-else-if="showLineNumbers">
        <div v-for="(line, i) in lines" :key="i" class="code-line">
          <span class="line-number">{{ i + 1 }}</span>
          <span class="line-content">{{ line }}</span>
        </div>
      </code>
      <code v-else>{{ code }}</code>
    </pre>
    <button type="button" class="code-block-copy" @click="handleCopy" :aria-label="copied ? '已复制' : '复制代码'">
      {{ copied ? '✓' : '📋' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

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

