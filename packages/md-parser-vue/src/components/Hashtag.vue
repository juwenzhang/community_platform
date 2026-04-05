<template>
  <a
    :href="`/tag/${tag}`"
    class="hashtag"
    :data-tag="tag"
    @click="handleClick"
  >
    #{{ tag }}
  </a>
</template>

<script setup lang="ts">
interface Props {
  /** 标签名 */
  tag: string;
}

interface Emits {
  /** 点击回调 */
  (e: 'click', tag: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const handleClick = (e: Event) => {
  e.preventDefault();
  emit('click', props.tag);
};
</script>

