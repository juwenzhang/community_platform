<template>
  <div class="page">
    <!-- Loading -->
    <div v-if="loading" class="loading">
      <div class="spinner" />
      <p>加载中...</p>
    </div>

    <!-- Error / 404 -->
    <div v-else-if="error" class="error">
      <h2>{{ error === 'not_found' ? '用户不存在' : '加载失败' }}</h2>
      <p v-if="error === 'not_found'">
        找不到用户「{{ username }}」，请检查用户名是否正确。
      </p>
      <p v-else>{{ errorMessage }}</p>
    </div>

    <!-- User Profile -->
    <div v-else-if="user" class="profile">
      <ProfileCard
        :username="user.username"
        :display-name="user.displayName"
        :email="user.email"
        :avatar-url="user.avatarUrl"
        :bio="user.bio"
      />

      <div class="content-placeholder">
        <h3>Ta 的内容</h3>
        <p>文章、动态等内容即将上线...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { createClient } from '@connectrpc/connect';
import type { User } from '@luhanxin/shared-types';
import { UserService } from '@luhanxin/shared-types';
import { onMounted, ref } from 'vue';

import ProfileCard from '../components/ProfileCard.vue';
import { transport } from '../lib/connect';

const userClient = createClient(UserService, transport);

const loading = ref(true);
const error = ref<string | null>(null);
const errorMessage = ref('');
const user = ref<User | null>(null);

// 从 URL 提取 username（Garfish 挂载在 /user/:username）
const pathParts = window.location.pathname.split('/');
const username = ref(pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2] || '');

onMounted(async () => {
  if (!username.value) {
    error.value = 'not_found';
    loading.value = false;
    return;
  }

  try {
    const resp = await userClient.getUserByUsername({ username: username.value });
    user.value = resp.user ?? null;
    if (!user.value) {
      error.value = 'not_found';
    }
  } catch (e: any) {
    if (e?.code === 5) {
      error.value = 'not_found';
    } else {
      error.value = 'error';
      errorMessage.value = e?.message || '未知错误';
    }
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.page {
  max-width: 720px;
  margin: 0 auto;
  padding: 16px;

  .loading {
    text-align: center;
    padding: 60px 0;
    color: #8a919f;

    .spinner {
      width: 28px;
      height: 28px;
      border: 3px solid #e4e6eb;
      border-top-color: #1e80ff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 12px;
    }
  }

  .error {
    text-align: center;
    padding: 60px 0;
    color: #8a919f;

    h2 {
      font-size: 18px;
      color: #252933;
      margin-bottom: 8px;
    }
  }

  .profile {
    display: flex;
    flex-direction: column;
    gap: 16px;

    .content-placeholder {
      background: #fff;
      border: 1px solid #e4e6eb;
      border-radius: 4px;
      padding: 32px;
      text-align: center;

      h3 {
        font-size: 15px;
        color: #252933;
        margin-bottom: 8px;
      }

      p {
        color: #c2c8d1;
        font-size: 13px;
      }
    }
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
