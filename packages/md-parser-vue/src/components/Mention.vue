<template>
  <a
    :href="`/user/${username}`"
    class="mention"
    :data-username="username"
    @click="handleClick"
  >
    @{{ username }}
  </a>
</template>

<script setup lang="ts">
interface Props {
  /** 用户名 */
  username: string;
}

interface Emits {
  /** 点击回调 */
  (e: 'click', username: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const handleClick = (e: Event) => {
  e.preventDefault();
  emit('click', props.username);
};
</script>

