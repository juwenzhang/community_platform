/**
 * DraftStore 单测 — 基于 fake-indexeddb 模拟浏览器 IDB 环境
 */

import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ProseMirrorJSON } from '../../types/editor';
import {
  cleanupOld,
  clearAll,
  deleteDraft,
  listDrafts,
  loadByArticleId,
  loadDraft,
  saveDraft,
} from '../DraftStore';

const sampleJson: ProseMirrorJSON = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hi' }] }],
};

beforeEach(async () => {
  await clearAll();
});

afterEach(async () => {
  await clearAll();
});

describe('saveDraft / loadDraft', () => {
  it('creates a draft with updatedAt and version', async () => {
    const saved = await saveDraft({
      id: 'draft-1',
      articleId: null,
      contentJson: sampleJson,
      contentMarkdown: 'hi',
    });
    expect(saved.id).toBe('draft-1');
    expect(saved.updatedAt).toBeGreaterThan(0);
    expect(saved.version).toBeGreaterThan(0);
  });

  it('loads by id', async () => {
    await saveDraft({
      id: 'draft-1',
      articleId: null,
      contentJson: sampleJson,
      contentMarkdown: 'hi',
    });
    const loaded = await loadDraft('draft-1');
    expect(loaded).toBeDefined();
    expect(loaded?.contentMarkdown).toBe('hi');
  });

  it('returns undefined for missing id', async () => {
    const loaded = await loadDraft('nonexistent');
    expect(loaded).toBeUndefined();
  });

  it('upserts same id', async () => {
    await saveDraft({
      id: 'draft-1',
      articleId: null,
      contentJson: sampleJson,
      contentMarkdown: 'v1',
    });
    await saveDraft({
      id: 'draft-1',
      articleId: null,
      contentJson: sampleJson,
      contentMarkdown: 'v2',
    });
    const loaded = await loadDraft('draft-1');
    expect(loaded?.contentMarkdown).toBe('v2');
  });
});

describe('loadByArticleId', () => {
  it('returns most recent draft for an article', async () => {
    await saveDraft({
      id: 'a',
      articleId: 'art-1',
      contentJson: sampleJson,
      contentMarkdown: 'old',
    });
    // 让时间戳错开
    await new Promise((r) => setTimeout(r, 5));
    await saveDraft({
      id: 'b',
      articleId: 'art-1',
      contentJson: sampleJson,
      contentMarkdown: 'new',
    });
    const latest = await loadByArticleId('art-1');
    expect(latest?.contentMarkdown).toBe('new');
  });

  it('returns undefined when no draft', async () => {
    const d = await loadByArticleId('nonexistent');
    expect(d).toBeUndefined();
  });
});

describe('listDrafts', () => {
  it('returns all drafts sorted by updatedAt desc', async () => {
    await saveDraft({ id: 'a', articleId: null, contentJson: sampleJson, contentMarkdown: 'a' });
    await new Promise((r) => setTimeout(r, 5));
    await saveDraft({ id: 'b', articleId: null, contentJson: sampleJson, contentMarkdown: 'b' });
    const drafts = await listDrafts();
    expect(drafts.length).toBe(2);
    expect(drafts[0]?.id).toBe('b');
    expect(drafts[1]?.id).toBe('a');
  });
});

describe('deleteDraft', () => {
  it('removes the draft', async () => {
    await saveDraft({
      id: 'draft-1',
      articleId: null,
      contentJson: sampleJson,
      contentMarkdown: 'hi',
    });
    await deleteDraft('draft-1');
    const loaded = await loadDraft('draft-1');
    expect(loaded).toBeUndefined();
  });
});

describe('cleanupOld', () => {
  it('cleans up drafts older than retentionDays', async () => {
    // 手动插入一个 60 天前的草稿
    const old: Parameters<typeof saveDraft>[0] = {
      id: 'old',
      articleId: null,
      contentJson: sampleJson,
      contentMarkdown: 'old',
    };
    await saveDraft(old);
    // 通过再次 saveDraft 把更新时间设置为 60 天前（绕开 idb 直接改）
    // 简单做法：用 DB 底层替换（fake-indexeddb 支持）
    const dbReq = indexedDB.open('luhanxin-doc-editor');
    await new Promise<void>((resolve, reject) => {
      dbReq.onsuccess = () => {
        const db = dbReq.result;
        const tx = db.transaction('drafts', 'readwrite');
        const store = tx.objectStore('drafts');
        const getReq = store.get('old');
        getReq.onsuccess = () => {
          const record = getReq.result;
          record.updatedAt = Date.now() - 60 * 24 * 60 * 60 * 1000;
          store.put(record);
        };
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
      dbReq.onerror = () => reject(dbReq.error);
    });

    // 新草稿（不过期）
    await saveDraft({
      id: 'fresh',
      articleId: null,
      contentJson: sampleJson,
      contentMarkdown: 'fresh',
    });

    const removed = await cleanupOld(30, 50);
    expect(removed).toBe(1);
    const remaining = await listDrafts();
    expect(remaining.map((d) => d.id)).toEqual(['fresh']);
  });

  it('removes oldest when exceeding maxCount', async () => {
    // 创建 5 个草稿
    for (let i = 0; i < 5; i += 1) {
      await saveDraft({
        id: `d${i}`,
        articleId: null,
        contentJson: sampleJson,
        contentMarkdown: `v${i}`,
      });
      await new Promise((r) => setTimeout(r, 3));
    }
    // 设置 maxCount=3 → 应删除 d0/d1
    const removed = await cleanupOld(30, 3);
    expect(removed).toBe(2);
    const remaining = await listDrafts();
    expect(remaining.length).toBe(3);
    // 保留的是最新的 3 个
    expect(remaining.map((d) => d.id).sort()).toEqual(['d2', 'd3', 'd4']);
  });
});
