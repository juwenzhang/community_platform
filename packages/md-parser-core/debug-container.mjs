#!/usr/bin/env node
/**
 * 诊断脚本：逆调试容器插件问题
 */

import { renderMarkdown } from './dist/index.js';

async function test(name, markdown) {
  console.log(`\n📝 ${name}`);
  console.log(`Input: ${JSON.stringify(markdown)}`);

  try {
    const result = await renderMarkdown(markdown);
    console.log(`HTML: ${result.html.slice(0, 200)}`);
    console.log(`Contains 'custom-container': ${result.html.includes('custom-container')}`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
}

async function main() {
  // 直接从源代码中的字符串
  await test('Test 1: Escaped newlines (单行)', ':::tip\nThis is a tip.\n:::');

  // 模板字符串
  await test(
    'Test 2: Template string (多行)',
    `:::tip
This is a tip.
:::`,
  );

  // 带标题
  await test('Test 3: With title', ':::warning Attention\nThis is a warning.\n:::');

  // 信息框
  await test('Test 4: Info container', ':::info\nThis is information.\n:::');

  // 危险框
  await test('Test 5: Danger container', ':::danger\nThis is dangerous!\n:::');
}

main().catch(console.error);
