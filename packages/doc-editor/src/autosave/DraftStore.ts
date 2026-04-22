/**
 * IndexedDB 草稿存储
 *
 * 基于 `idb` 封装，存编辑器中间态（PM JSON + Markdown 字符串），
 * 仅前端持久化，不替代服务端保存。
 *
 * Schema:
 *   draft { id, articleId|null, contentJson, contentMarkdown, updatedAt, version }
 *
 * 清理策略：
 *   - 30 天未更新的草稿自动清理
 *   - 数量超过 50 时，按 updatedAt 升序清理最老的
 *
 * 使用场景：
 *   - 浏览器意外关闭后恢复
 *   - 离线编辑
 *   - 远程保存失败时的兜底
 */

import { type IDBPDatabase, openDB } from 'idb';
import type { ProseMirrorJSON } from '../types/editor';

export const DB_NAME = 'luhanxin-doc-editor';
export const DB_VERSION = 1;
export const STORE_NAME = 'drafts';

export interface Draft {
  /** 草稿唯一 ID（对应 articleId 或 新建草稿的临时 uuid）*/
  id: string;
  /** 关联文章 ID（新建时为 null）*/
  articleId: string | null;
  /** 当前内容的 ProseMirror JSON（供编辑器直接 setContent） */
  contentJson: ProseMirrorJSON;
  /** 当前内容的 Markdown 序列化（供远程保存对比 / 快速预览） */
  contentMarkdown: string;
  /** 毫秒时间戳 */
  updatedAt: number;
  /** schema 版本，方便未来迁移 */
  version: number;
}

/** 默认保留天数 */
export const DEFAULT_RETENTION_DAYS = 30;
/** 默认最大草稿数量 */
export const DEFAULT_MAX_DRAFTS = 50;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('by-articleId', 'articleId');
          store.createIndex('by-updatedAt', 'updatedAt');
        }
      },
    });
  }
  return dbPromise;
}

/**
 * 保存草稿（upsert 语义）
 */
export async function saveDraft(draft: Omit<Draft, 'updatedAt' | 'version'>): Promise<Draft> {
  const record: Draft = {
    ...draft,
    updatedAt: Date.now(),
    version: DB_VERSION,
  };
  const db = await getDB();
  await db.put(STORE_NAME, record);
  return record;
}

/**
 * 按 id 加载草稿
 */
export async function loadDraft(id: string): Promise<Draft | undefined> {
  const db = await getDB();
  return db.get(STORE_NAME, id) as Promise<Draft | undefined>;
}

/**
 * 按 articleId 查最新草稿（用于编辑器挂载时的草稿恢复）
 */
export async function loadByArticleId(articleId: string): Promise<Draft | undefined> {
  const db = await getDB();
  const index = db.transaction(STORE_NAME).store.index('by-articleId');
  const all = (await index.getAll(articleId)) as Draft[];
  if (all.length === 0) return undefined;
  // 按 updatedAt 降序
  return all.sort((a, b) => b.updatedAt - a.updatedAt)[0];
}

/**
 * 列出所有草稿（按 updatedAt 降序）
 */
export async function listDrafts(): Promise<Draft[]> {
  const db = await getDB();
  const all = (await db.getAll(STORE_NAME)) as Draft[];
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * 删除草稿
 */
export async function deleteDraft(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

/**
 * 清理过期/超量草稿
 *
 * 规则：
 *   1. 删除 > retentionDays 天未更新的
 *   2. 剩余 > maxCount 时，按 updatedAt 升序删除最老的
 *
 * @returns 被清理的草稿数量
 */
export async function cleanupOld(
  retentionDays: number = DEFAULT_RETENTION_DAYS,
  maxCount: number = DEFAULT_MAX_DRAFTS,
): Promise<number> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.store;
  const all = (await store.getAll()) as Draft[];

  const threshold = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  let removed = 0;

  // Step 1: 删过期
  const remaining: Draft[] = [];
  for (const d of all) {
    if (d.updatedAt < threshold) {
      await store.delete(d.id);
      removed += 1;
    } else {
      remaining.push(d);
    }
  }

  // Step 2: 超过 maxCount 的删最老的
  if (remaining.length > maxCount) {
    const sorted = remaining.sort((a, b) => a.updatedAt - b.updatedAt);
    const toDelete = sorted.slice(0, remaining.length - maxCount);
    for (const d of toDelete) {
      await store.delete(d.id);
      removed += 1;
    }
  }

  await tx.done;
  return removed;
}

/**
 * 清空所有草稿（通常仅用于测试 / 调试）
 */
export async function clearAll(): Promise<void> {
  const db = await getDB();
  await db.clear(STORE_NAME);
}

/**
 * 关闭 DB 连接（通常仅用于测试清理）
 */
export async function closeDB(): Promise<void> {
  if (!dbPromise) return;
  const db = await dbPromise;
  db.close();
  dbPromise = null;
}
