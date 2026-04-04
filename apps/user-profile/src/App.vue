<template>
  <div id="app" :data-theme="theme">
    <UserProfile />
  </div>
</template>

<script setup lang="ts">
import UserProfile from './views/UserProfile.vue';

import { useHostTheme } from './composables/useHostTheme';

const theme = useHostTheme();
</script>
