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
        :company="user.company || ''"
        :location="user.location || ''"
        :website="user.website || ''"
        :social-links="user.socialLinks || []"
        :is-owner="isOwner"
      />

      <!-- Ta 的文章 -->
      <div class="section">
        <h3 class="section-title">{{ isOwner ? '📝 我的文章' : '📝 Ta 的文章' }}</h3>
        <div v-if="articlesLoading" class="articles-loading">加载文章中...</div>
        <div v-else-if="articles.length === 0" class="articles-empty">暂无文章</div>
        <div v-else class="article-list">
          <a
            v-for="article in articles"
            :key="article.id"
            :href="`/post/${article.id}`"
            class="article-card"
          >
            <h4 class="article-title">{{ article.title }}</h4>
            <p v-if="article.summary" class="article-summary">{{ article.summary }}</p>
            <div class="article-meta">
              <span v-if="article.publishedAt" class="article-date">
                {{ formatDate(article.publishedAt) }}
              </span>
              <span v-if="article.viewCount > 0" class="article-views">
                {{ article.viewCount }} 阅读
              </span>
              <span v-for="tag in article.tags" :key="tag" class="article-tag">{{ tag }}</span>
            </div>
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { createClient } from '@connectrpc/connect';
import type { Article, User } from '@luhanxin/shared-types';
import { ArticleService, UserService } from '@luhanxin/shared-types';
import { computed, onMounted, ref } from 'vue';

import ProfileCard from '../components/ProfileCard.vue';
import { transport } from '../lib/connect';

const userClient = createClient(UserService, transport);
const articleClient = createClient(ArticleService, transport);

const loading = ref(true);
const error = ref<string | null>(null);
const errorMessage = ref('');
const user = ref<User | null>(null);
const articles = ref<Article[]>([]);
const articlesLoading = ref(false);

// 通过 Garfish props 获取路由参数和当前登录用户
const garfishProps =
  (window as any).__GARFISH_EXPORTS__?.props ||
  (window as any).Garfish?.appInfos?.['user-profile']?.props ||
  {};

// 优先从 Garfish props 获取 username，fallback 到 URL 解析
const routeParams = garfishProps.getRouteParams?.() || {};
const pathParts = window.location.pathname.split('/');
const username = ref(
  routeParams.username || pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2] || '',
);

const currentUser = garfishProps.getCurrentUser?.();
const isOwner = computed(() => !!currentUser && currentUser.username === username.value);

function formatDate(timestamp: { seconds: bigint } | undefined): string {
  if (!timestamp) return '';
  return new Date(Number(timestamp.seconds) * 1000).toLocaleDateString('zh-CN');
}

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

  // 加载用户文章
  if (user.value) {
    articlesLoading.value = true;
    try {
      const resp = await articleClient.listArticles({
        authorId: user.value.id,
        query: '',
        tag: '',
        pagination: { pageSize: 10, pageToken: '' },
      });
      articles.value = resp.articles;
    } catch (e) {
      console.error('ListArticles failed:', e);
    } finally {
      articlesLoading.value = false;
    }
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

    .section {
      .section-title {
        font-size: 15px;
        font-weight: 600;
        color: #252933;
        margin-bottom: 12px;
      }
    }

    .articles-loading,
    .articles-empty {
      background: #fff;
      border: 1px solid #e4e6eb;
      border-radius: 4px;
      text-align: center;
      padding: 32px;
      color: #8a919f;
      font-size: 14px;
    }

    .article-list {
      background: #fff;
      border: 1px solid #e4e6eb;
      border-radius: 4px;
      overflow: hidden;

      .article-card {
        display: block;
        padding: 16px 20px;
        border-bottom: 1px solid #e4e6eb;
        text-decoration: none;
        color: inherit;
        transition: background 0.15s;

        &:last-child { border-bottom: none; }
        &:hover { background: #f7f8fa; }

        .article-title {
          font-size: 16px;
          font-weight: 600;
          color: #252933;
          margin: 0 0 6px;
        }

        .article-summary {
          font-size: 13px;
          color: #8a919f;
          margin: 0 0 10px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          line-height: 1.6;
        }

        .article-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 12px;
          color: #c2c8d1;

          .article-tag {
            color: #1e80ff;
            background: #eaf2ff;
            border-radius: 3px;
            padding: 1px 6px;
            font-size: 11px;
          }
        }
      }
    }
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
