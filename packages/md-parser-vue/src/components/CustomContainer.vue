<template>
  <div :class="['customContainer', kind]">
    <div class="customContainerTitle">
      <span class="customContainerIcon">{{ iconMap[kind] }}</span>
      <span>{{ title || defaultTitleMap[kind] }}</span>
    </div>
    <div class="customContainerContent">
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

<style scoped>
.customContainer {
  padding: 1rem;
  border-radius: 4px;
  margin: 1rem 0;
}

.customContainerTitle {
  font-weight: 600;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.customContainerIcon {
  font-size: 1.2em;
}

.customContainerContent {
  line-height: 1.6;
}

/* 提示容器 */
.customContainer.tip {
  background-color: #e8f3ff;
  border-left: 4px solid #1e80ff;
}

.customContainer.tip .customContainerTitle {
  color: #1e3a8a;
}

/* 警告容器 */
.customContainer.warning {
  background-color: #fff8e6;
  border-left: 4px solid #f59e0b;
}

.customContainer.warning .customContainerTitle {
  color: #92400e;
}

/* 信息容器 */
.customContainer.info {
  background-color: #f0f9ff;
  border-left: 4px solid #0ea5e9;
}

.customContainer.info .customContainerTitle {
  color: #0c4a6e;
}

/* 危险容器 */
.customContainer.danger {
  background-color: #fef2f2;
  border-left: 4px solid #ef4444;
}

.customContainer.danger .customContainerTitle {
  color: #991b1b;
}
</style>
