// @ts-check

/** @type {import('lint-staged').Configuration} */
export default {
  // 前端文件：Biome check + format
  '*.{ts,tsx,js,jsx,json,css}': ['biome check --write --no-errors-on-unmatched'],

  // Proto 文件提醒（如果安装了 buf）
  '*.proto': () => 'echo "⚠️  Proto files changed — remember to run: make proto"',
};
