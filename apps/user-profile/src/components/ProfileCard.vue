<template>
  <div class="profile-card">
    <div class="banner" />

    <div class="info">
      <img
        v-if="avatarUrl"
        :src="avatarUrl"
        :alt="displayName"
        class="avatar"
      />
      <div v-else class="avatar placeholder">
        {{ displayName?.charAt(0)?.toUpperCase() || '?' }}
      </div>

      <h2 class="name">{{ displayName || username }}</h2>

      <div class="meta">
        <span class="username">@{{ username }}</span>
        <span v-if="email" class="email">{{ email }}</span>
      </div>

      <p class="bio" :class="{ empty: !bio }">
        {{ bio || '这个人很懒，还没有写简介...' }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  username: string;
  displayName: string;
  email: string;
  avatarUrl: string;
  bio: string;
}>();
</script>

<style scoped>
.profile-card {
  background: #fff;
  border: 1px solid #e4e6eb;
  border-radius: 4px;
  overflow: hidden;

  .banner {
    height: 120px;
    background: linear-gradient(135deg, #1e80ff, #5b8ff9);
  }

  .info {
    padding: 0 24px 24px;
    margin-top: -40px;

    .avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      border: 3px solid #fff;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
      object-fit: cover;

      &.placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #1e80ff, #5b8ff9);
        color: #fff;
        font-size: 32px;
        font-weight: bold;
      }
    }

    .name {
      margin: 12px 0 4px;
      font-size: 20px;
      font-weight: 600;
      color: #252933;
    }

    .meta {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;

      .username {
        color: #1e80ff;
        font-weight: 500;
        font-size: 14px;
      }

      .email {
        color: #8a919f;
        font-size: 13px;
      }
    }

    .bio {
      color: #515767;
      font-size: 14px;
      line-height: 1.6;
      margin: 0;

      &.empty {
        color: #c2c8d1;
        font-style: italic;
      }
    }
  }
}
</style>
