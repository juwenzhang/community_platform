import { FileTextOutlined, UserOutlined } from '@ant-design/icons';
import type { SearchArticleHit, SearchUserHit } from '@luhanxin/shared-types';
import { Avatar, Empty, Input, Spin, Tabs } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { searchClient } from '@/lib/grpc-clients';
import styles from './search.module.less';

/**
 * 将 Meilisearch 高亮文本（含 <em> 标签）安全地转为 React 元素。
 * 只保留 <em> 标签，其余 HTML 标签被转义。
 */
function renderHighlight(html: string): React.ReactNode {
  const parts = html.split(/(<em>.*?<\/em>)/g);
  return parts.map((part) => {
    if (part.startsWith('<em>') && part.endsWith('</em>')) {
      const text = part.slice(4, -5);
      return (
        <em key={part} className={styles.highlight}>
          {text}
        </em>
      );
    }
    return part;
  });
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';
  const tab = searchParams.get('tab') || 'articles';

  const [articles, setArticles] = useState<SearchArticleHit[]>([]);
  const [users, setUsers] = useState<SearchUserHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalArticles, setTotalArticles] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);

  const doSearch = useCallback(async (q: string, t: string) => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      if (t === 'articles') {
        const resp = await searchClient.searchArticles({
          query: q,
          pagination: { pageSize: 20, pageToken: '' },
        });
        setArticles(resp.hits || []);
        setTotalArticles(resp.pagination?.totalCount || 0);
      } else {
        const resp = await searchClient.searchUsers({
          query: q,
          pagination: { pageSize: 20, pageToken: '' },
        });
        setUsers(resp.hits || []);
        setTotalUsers(resp.pagination?.totalCount || 0);
      }
    } catch {
      // 静默
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    doSearch(query, tab);
  }, [query, tab, doSearch]);

  const handleTabChange = (key: string) => {
    setSearchParams({ q: query, tab: key });
  };

  const handleSearch = (value: string) => {
    if (value.trim()) {
      setSearchParams({ q: value.trim(), tab });
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.searchBar}>
        <Input.Search
          placeholder="搜索文章或用户..."
          defaultValue={query}
          onSearch={handleSearch}
          size="large"
          enterButton
          allowClear
        />
      </div>

      {query && (
        <Tabs
          activeKey={tab}
          onChange={handleTabChange}
          items={[
            {
              key: 'articles',
              label: `文章${totalArticles > 0 ? ` (${totalArticles})` : ''}`,
              icon: <FileTextOutlined />,
              children: loading ? (
                <div className={styles.center}>
                  <Spin />
                </div>
              ) : articles.length === 0 ? (
                <Empty description={`没有找到与 "${query}" 相关的文章`} />
              ) : (
                <div className={styles.results}>
                  {articles.map((hit) => (
                    <button
                      type="button"
                      key={hit.id}
                      className={styles.articleItem}
                      onClick={() => navigate(`/post/${hit.id}`)}
                    >
                      <h3 className={styles.articleTitle}>{renderHighlight(hit.title)}</h3>
                      {hit.summary && (
                        <p className={styles.articleSummary}>{renderHighlight(hit.summary)}</p>
                      )}
                      <div className={styles.articleMeta}>
                        {hit.tags.length > 0 && (
                          <span className={styles.tags}>
                            {hit.tags.slice(0, 3).map((t) => (
                              <span key={t} className={styles.tag}>
                                {t}
                              </span>
                            ))}
                          </span>
                        )}
                        <span>{hit.viewCount} 阅读</span>
                        <span>{hit.likeCount} 赞</span>
                      </div>
                    </button>
                  ))}
                </div>
              ),
            },
            {
              key: 'users',
              label: `用户${totalUsers > 0 ? ` (${totalUsers})` : ''}`,
              icon: <UserOutlined />,
              children: loading ? (
                <div className={styles.center}>
                  <Spin />
                </div>
              ) : users.length === 0 ? (
                <Empty description={`没有找到与 "${query}" 相关的用户`} />
              ) : (
                <div className={styles.results}>
                  {users.map((hit) => (
                    <button
                      type="button"
                      key={hit.id}
                      className={styles.userItem}
                      onClick={() => navigate(`/user/${hit.username.replace(/<\/?em>/g, '')}`)}
                    >
                      <Avatar src={hit.avatarUrl || undefined} size={40}>
                        {hit.username
                          .replace(/<\/?em>/g, '')
                          .charAt(0)
                          .toUpperCase()}
                      </Avatar>
                      <div className={styles.userInfo}>
                        <span className={styles.userName}>
                          {renderHighlight(hit.displayName || hit.username)}
                        </span>
                        <span className={styles.userHandle}>@{renderHighlight(hit.username)}</span>
                        {hit.bio && <p className={styles.userBio}>{hit.bio}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
