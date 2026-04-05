<template>
  <div :class="['custom-container', kind]">
    <div class="container-title">
      <span class="container-icon">{{ iconMap[kind] }}</span>
      <span>{{ title || defaultTitleMap[kind] }}</span>
    </div>
    <div class="container-content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  /** 容器类型 */
  kind: 'tip' | 'warning' | 'info' | 'danger';
  /** 标题（可选） */
  title?: string;
}

const props = defineProps<Props>();

const iconMap = {
  tip: '💡',
  warning: '⚠️',
  info: 'ℹ️',
  danger: '🚫',
};

const defaultTitleMap = {
  tip: '提示',
  warning: '警告',
  info: '信息',
  danger: '危险',
};
</script>

