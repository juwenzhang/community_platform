// @ts-check

/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // type 枚举 — 与项目 Git 提交规范一致
    'type-enum': [
      2,
      'always',
      [
        'feat', // 新功能
        'fix', // 修复 Bug
        'docs', // 文档
        'style', // 代码格式（不影响逻辑）
        'refactor', // 重构
        'perf', // 性能优化
        'test', // 测试
        'chore', // 构建/工具变动
        'ci', // CI/CD
        'revert', // 回退
      ],
    ],
    // scope 枚举 — 与项目命名约定一致
    'scope-enum': [
      2,
      'always',
      [
        // 前端子应用
        'main',
        'feed',
        'article',
        'editor',
        'profile',
        'search',
        'admin',
        // 前端共享包
        'shared-types',
        'shared-utils',
        'shared-ui',
        'sdk-tracker',
        'sdk-auth',
        'sdk-request',
        // 后端微服务
        'gateway',
        'svc-user',
        'svc-content',
        'svc-social',
        'svc-notification',
        'svc-search',
        // 基础设施
        'infra',
        'docs',
        'proto',
        'deps',
      ],
    ],
    'scope-empty': [1, 'never'], // scope 建议填写，但不强制
    'subject-case': [0], // 不限制 subject 大小写
    'header-max-length': [2, 'always', 100],
  },
};
