<template>
  <div id="app" :data-theme="theme">
    <UserProfile />
  </div>
</template>

<script setup lang="ts">
import { useHostTheme } from './composables/useHostTheme';
import UserProfile from './views/UserProfile.vue';

const theme = useHostTheme();
</script>
