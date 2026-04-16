<script setup lang="ts">
import type { ArticleMeta, EventHandlers, TocItem } from '@luhanxin/md-parser-core';
import { ref, toRef, watch } from 'vue';
import { useEventDelegation } from './composables/useEventDelegation';
import { useMarkdown } from './composables/useMarkdown';
import { useMarkdownContext } from './context/MarkdownProvider';

const props = withDefaults(
  defineProps<{
    /** Markdown 内容 */
    content: string;
    /** 自定义类名 */
    className?: string;
    /** 事件回调（覆盖 Provider 配置） */
    eventHandlers?: EventHandlers;
    /** 防抖延迟 */
    debounce?: number;
  }>(),
  {
    debounce: 150,
  },
);

const emit = defineEmits<{
  (e: 'toc-ready', toc: TocItem[]): void;
  (e: 'meta-ready', meta: ArticleMeta): void;
}>();

const containerRef = ref<HTMLElement | null>(null);
const ctx = useMarkdownContext();

// 使用重构后的 useMarkdown（消除双重解析，内置缓存+防抖）
const contentRef = toRef(props, 'content');
const { html, toc, meta, loading, error } = useMarkdown(contentRef, {
  debounce: props.debounce,
});

// 合并事件回调
const mergedHandlers: EventHandlers = {
  ...ctx.eventHandlers,
  ...props.eventHandlers,
};

// 事件代理（修复 GLM 的 onMounted 清理 bug：现在用 onUnmounted）
useEventDelegation(containerRef, mergedHandlers);

// TOC / Meta 回调
watch(toc, (val) => {
  if (val.length > 0) emit('toc-ready', val);
});

watch(meta, (val) => {
  if (val && Object.keys(val).length > 0) emit('meta-ready', val);
});
</script>

<template>
  <div v-if="loading" class="markdown-skeleton">
    Loading...
  </div>
  <div v-else-if="error" class="markdown-error">
    {{ error }}
  </div>
  <div
    v-else
    ref="containerRef"
    class="markdown-body"
    :class="className"
    v-html="html"
  />
</template>
