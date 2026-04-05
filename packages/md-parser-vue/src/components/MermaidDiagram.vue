<template>
  <div v-if="loading" class="mermaidLoading">
    <div class="mermaidSpinner"></div>
    <span>正在渲染图表...</span>
  </div>
  <div v-else-if="error" class="mermaidError">
    <span class="mermaidErrorIcon">⚠️</span>
    <span class="mermaidErrorText">{{ error }}</span>
    <pre class="mermaidErrorCode">{{ code }}</pre>
  </div>
  <div v-else ref="containerRef" class="mermaidDiagram" v-html="sanitizedSvg"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import DOMPurify from 'dompurify';

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

// 使用 DOMPurify 清理 SVG（防止 XSS）
const sanitizedSvg = computed(() => DOMPurify.sanitize(svg.value));

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
      securityLevel: 'loose',
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
  }
);
</script>

<style scoped>
.mermaidDiagram {
  margin: 1em 0;
  text-align: center;
  overflow-x: auto;
}

.mermaidDiagram svg {
  max-width: 100%;
  height: auto;
}

.mermaidLoading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2rem;
  color: #6a737d;
}

.mermaidSpinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e1e4e8;
  border-top-color: #1e80ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.mermaidError {
  padding: 1rem;
  background: #fff8e6;
  border: 1px solid #f59e0b;
  border-radius: 4px;
}

.mermaidErrorIcon {
  margin-right: 0.5rem;
}

.mermaidErrorText {
  color: #92400e;
  font-weight: 500;
}

.mermaidErrorCode {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: #fffbeb;
  border-radius: 4px;
  font-size: 0.875rem;
  overflow-x: auto;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
