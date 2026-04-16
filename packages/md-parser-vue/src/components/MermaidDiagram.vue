<template>
  <div v-if="loading" class="mermaid-loading">
    <div class="mermaid-spinner"></div>
    <span>正在渲染图表...</span>
  </div>
  <div v-else-if="error" class="mermaid-error">
    <span class="mermaid-error-icon">⚠️</span>
    <span class="mermaid-error-text">{{ error }}</span>
    <pre class="mermaid-error-code">{{ code }}</pre>
  </div>
  <div v-else ref="containerRef" class="mermaid-diagram" v-html="svg"></div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';

interface Props {
  /** Mermaid 代码 */
  code: string;
  /** 图表 ID（用于错误提示） */
  id?: string;
}

const props = withDefaults(defineProps<Props>(), {
  id: 'mermaid',
});

const svg = ref('');
const loading = ref(true);
const error = ref('');
const containerRef = ref<HTMLDivElement>();

let cancelled = false;

const renderDiagram = async () => {
  try {
    loading.value = true;
    error.value = '';
    cancelled = false;

    // 动态加载 mermaid（延迟加载）
    const mermaid = await import('mermaid');
    mermaid.default.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'strict',
    });

    // 超时机制（5秒）
    const timeout = setTimeout(() => {
      if (!cancelled) {
        error.value = '图表渲染超时';
        loading.value = false;
      }
    }, 5000);

    const result = await mermaid.default.render(`${props.id}-${Date.now()}`, props.code);
    clearTimeout(timeout);

    if (!cancelled) {
      svg.value = result.svg;
      loading.value = false;
    }
  } catch (err: unknown) {
    if (!cancelled) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      error.value = `图表渲染失败: ${message}`;
      loading.value = false;
    }
  }
};

onMounted(() => {
  renderDiagram();
});

onUnmounted(() => {
  cancelled = true;
});

watch(
  () => props.code,
  () => {
    renderDiagram();
  },
);
</script>

