import {
  DeleteOutlined,
  DownOutlined,
  FireOutlined,
  SmileOutlined,
  SortAscendingOutlined,
  UpOutlined,
} from '@ant-design/icons';
import type { Comment, MediaAttachment } from '@luhanxin/shared-types';
import { Avatar, Button, Popover, Spin } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCommentStore } from '@/stores/useCommentStore';
import { parseMentions } from '@/utils/mentionParser';
import ExpressionPicker from '../ExpressionPicker';
import MediaPreview from '../ExpressionPicker/MediaPreview';
import CommentSkeleton from './CommentSkeleton';
import styles from './commentSection.module.less';
import MediaAttachmentRenderer from './MediaAttachmentRenderer';
import MentionInput from './MentionInput';

interface CommentSectionProps {
  articleId: string;
}

interface InlineReply {
  parentId: string;
  replyToId: string;
  replyToUsername: string;
}

export default function CommentSection({ articleId }: CommentSectionProps) {
  const { user, isAuthenticated } = useAuthStore();
  const {
    comments,
    totalCount,
    loading,
    refreshing,
    loadingMore,
    submitting,
    sort,
    hasMore,
    loadComments,
    loadMore,
    setSort,
    createComment,
    deleteComment,
    reset,
  } = useCommentStore();

  const [mainContent, setMainContent] = useState('');
  const [mainShowEmoji, setMainShowEmoji] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaAttachment | null>(null);
  const mainInputRef = useRef<HTMLTextAreaElement>(null);

  const [inlineReply, setInlineReply] = useState<InlineReply | null>(null);
  const [inlineContent, setInlineContent] = useState('');
  const [inlineShowEmoji, setInlineShowEmoji] = useState(false);
  const [inlineSelectedMedia, setInlineSelectedMedia] = useState<MediaAttachment | null>(null);
  const inlineInputRef = useRef<HTMLTextAreaElement>(null);

  // 子评论折叠状态：key = 顶级评论 ID, value = 是否展开
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadComments(articleId);
    return () => reset();
  }, [articleId, loadComments, reset]);

  // 无限滚动
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore(articleId);
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMore, articleId]);

  // 切换子评论折叠
  const toggleReplies = (commentId: string) => {
    setExpandedReplies((prev) => ({ ...prev, [commentId]: !prev[commentId] }));
  };

  const handleMainSubmit = async () => {
    if ((!mainContent.trim() && !selectedMedia) || submitting) return;
    const success = await createComment({
      articleId,
      content: mainContent.trim(),
      mediaAttachments: selectedMedia ? [selectedMedia] : [],
    });
    if (success) {
      setMainContent('');
      setSelectedMedia(null);
    }
  };

  const handleInlineSubmit = async () => {
    if ((!inlineContent.trim() && !inlineSelectedMedia) || submitting || !inlineReply) return;
    const success = await createComment({
      articleId,
      content: inlineContent.trim(),
      parentId: inlineReply.parentId,
      replyToId: inlineReply.replyToId,
      mediaAttachments: inlineSelectedMedia ? [inlineSelectedMedia] : [],
    });
    if (success) {
      setInlineContent('');
      setInlineReply(null);
      setInlineShowEmoji(false);
      setInlineSelectedMedia(null);
    }
  };

  const handleDelete = (commentId: string) => deleteComment(commentId, articleId);

  const handleReply = useCallback(
    (parentId: string, replyToId: string, username: string) => {
      if (inlineReply?.replyToId === replyToId) {
        setInlineReply(null);
        setInlineContent('');
        setInlineShowEmoji(false);
        setInlineSelectedMedia(null);
        return;
      }
      setInlineReply({ parentId, replyToId, replyToUsername: username });
      setInlineContent('');
      setInlineShowEmoji(false);
      setInlineSelectedMedia(null);
      setTimeout(() => inlineInputRef.current?.focus(), 50);
    },
    [inlineReply?.replyToId],
  );

  const cancelInlineReply = () => {
    setInlineReply(null);
    setInlineContent('');
    setInlineShowEmoji(false);
    setInlineSelectedMedia(null);
  };

  const handleMainEmojiSelect = (emoji: string) => {
    const textarea = mainInputRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      setMainContent(mainContent.slice(0, start) + emoji + mainContent.slice(start));
      setTimeout(() => textarea.setSelectionRange(start + emoji.length, start + emoji.length), 0);
    } else {
      setMainContent((prev) => prev + emoji);
    }
  };

  const handleInlineEmojiSelect = (emoji: string) => {
    const textarea = inlineInputRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      setInlineContent(inlineContent.slice(0, start) + emoji + inlineContent.slice(start));
      setTimeout(() => textarea.setSelectionRange(start + emoji.length, start + emoji.length), 0);
    } else {
      setInlineContent((prev) => prev + emoji);
    }
  };

  const formatTime = (comment: Comment) => {
    if (!comment.createdAt) return '';
    return new Date(Number(comment.createdAt.seconds) * 1000).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // ─── 渲染：内联回复框 ───
  const renderInlineReplyBox = (targetCommentId: string) => {
    if (!inlineReply || inlineReply.replyToId !== targetCommentId) return null;
    return (
      <div className={styles.inlineReplyBox}>
        <div className={styles.inlineReplyHeader}>
          <span className={styles.inlineReplyHint}>
            回复 <em>@{inlineReply.replyToUsername}</em>
          </span>
          <button type="button" className={styles.inlineReplyCancel} onClick={cancelInlineReply}>
            取消
          </button>
        </div>
        <div className={styles.inlineReplyInput}>
          <MentionInput
            value={inlineContent}
            onChange={setInlineContent}
            onSubmit={handleInlineSubmit}
            placeholder={`回复 @${inlineReply.replyToUsername}...`}
            inputRef={inlineInputRef}
            compact
          />
          {inlineSelectedMedia && (
            <MediaPreview
              media={inlineSelectedMedia}
              onRemove={() => setInlineSelectedMedia(null)}
            />
          )}
          <div className={styles.inlineReplyActions}>
            <Popover
              content={
                <ExpressionPicker
                  onEmojiSelect={handleInlineEmojiSelect}
                  onMediaSelect={(media) => {
                    setInlineSelectedMedia(media);
                    setInlineShowEmoji(false);
                  }}
                  onClose={() => setInlineShowEmoji(false)}
                />
              }
              open={inlineShowEmoji}
              onOpenChange={setInlineShowEmoji}
              trigger="click"
              placement="bottomLeft"
              arrow={false}
            >
              <button type="button" className={styles.emojiBtn}>
                <SmileOutlined />
              </button>
            </Popover>
            <Button
              type="primary"
              size="small"
              onClick={handleInlineSubmit}
              loading={submitting}
              disabled={!inlineContent.trim() && !inlineSelectedMedia}
            >
              回复
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // ─── 渲染：单条评论 ───
  const renderComment = (comment: Comment, isReply = false) => {
    const author = comment.author;
    const isOwn = user?.id === comment.authorId;
    const replyAuthor = comment.replyToAuthor;

    return (
      <div key={comment.id}>
        <div className={`${styles.commentItem} ${isReply ? styles.reply : ''}`}>
          <Avatar
            src={author?.avatarUrl || undefined}
            size={isReply ? 28 : 36}
            className={styles.avatar}
          >
            {author?.username?.[0]?.toUpperCase()}
          </Avatar>
          <div className={styles.commentBody}>
            <div className={styles.commentHeader}>
              <Link to={`/user/${author?.username}`} className={styles.commentAuthor}>
                {author?.displayName || author?.username || '匿名'}
              </Link>
              {isReply && replyAuthor && (
                <span className={styles.replyInfo}>
                  回复{' '}
                  <Link to={`/user/${replyAuthor.username}`} className={styles.replyTarget}>
                    @{replyAuthor.displayName || replyAuthor.username}
                  </Link>
                </span>
              )}
              <span className={styles.commentTime}>{formatTime(comment)}</span>
            </div>
            <div className={styles.commentContent}>{parseMentions(comment.content)}</div>
            <MediaAttachmentRenderer attachments={comment.mediaAttachments} />
            <div className={styles.commentFooter}>
              {isAuthenticated && (
                <button
                  type="button"
                  className={`${styles.replyBtn} ${inlineReply?.replyToId === comment.id ? styles.active : ''}`}
                  onClick={() =>
                    handleReply(
                      isReply ? comment.parentId : comment.id,
                      comment.id,
                      author?.username ?? '',
                    )
                  }
                >
                  回复
                </button>
              )}
              {isOwn && (
                <button
                  type="button"
                  className={styles.deleteBtn}
                  onClick={() => handleDelete(comment.id)}
                >
                  <DeleteOutlined /> 删除
                </button>
              )}
            </div>
          </div>
        </div>
        {renderInlineReplyBox(comment.id)}
      </div>
    );
  };

  // ─── 渲染：子评论区域（含折叠逻辑） ───
  const renderReplies = (comment: Comment) => {
    const replies = comment.replies;
    if (replies.length === 0) return null;

    const isExpanded = expandedReplies[comment.id] ?? false;

    return (
      <div className={styles.replies}>
        {isExpanded && (
          <div className={styles.repliesInner}>
            {replies.map((reply) => renderComment(reply, true))}
          </div>
        )}

        <button
          type="button"
          className={styles.toggleRepliesBtn}
          onClick={() => toggleReplies(comment.id)}
        >
          {isExpanded ? (
            <>
              <UpOutlined /> 收起回复
            </>
          ) : (
            <>
              <DownOutlined /> 展开 {replies.length} 条回复
            </>
          )}
        </button>
      </div>
    );
  };

  // ─── 计算展示的评论数量 ───
  const displayCount = totalCount > 0 ? totalCount : comments.length;

  return (
    <div className={styles.section}>
      {/* 标题 + 排序 Tab */}
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>评论{displayCount > 0 ? ` (${displayCount})` : ''}</h3>
        <div className={styles.sortTabs}>
          <button
            type="button"
            className={`${styles.sortTab} ${sort === 0 ? styles.active : ''}`}
            onClick={() => setSort(0, articleId)}
          >
            <SortAscendingOutlined /> 最新
          </button>
          <button
            type="button"
            className={`${styles.sortTab} ${sort === 1 ? styles.active : ''}`}
            onClick={() => setSort(1, articleId)}
          >
            <FireOutlined /> 最热
          </button>
        </div>
      </div>

      {/* 主输入区 */}
      {isAuthenticated ? (
        <div className={styles.inputArea}>
          <div className={styles.inputRow}>
            <Avatar src={user?.avatarUrl || undefined} size={36}>
              {user?.username?.[0]?.toUpperCase()}
            </Avatar>
            <div className={styles.inputContent}>
              <MentionInput
                value={mainContent}
                onChange={setMainContent}
                onSubmit={handleMainSubmit}
                placeholder="写下你的评论..."
                inputRef={mainInputRef}
              />
              {selectedMedia && (
                <MediaPreview media={selectedMedia} onRemove={() => setSelectedMedia(null)} />
              )}
              <div className={styles.inputActions}>
                <Popover
                  content={
                    <ExpressionPicker
                      onEmojiSelect={handleMainEmojiSelect}
                      onMediaSelect={(media) => {
                        setSelectedMedia(media);
                        setMainShowEmoji(false);
                      }}
                      onClose={() => setMainShowEmoji(false)}
                    />
                  }
                  open={mainShowEmoji}
                  onOpenChange={setMainShowEmoji}
                  trigger="click"
                  placement="bottomLeft"
                  arrow={false}
                >
                  <button type="button" className={styles.emojiBtn}>
                    <SmileOutlined /> 表情
                  </button>
                </Popover>
                <Button
                  type="primary"
                  size="small"
                  onClick={handleMainSubmit}
                  loading={submitting && !inlineReply}
                  disabled={!mainContent.trim() && !selectedMedia}
                >
                  发表评论
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.loginHint}>
          <Link to="/auth">登录</Link> 后参与评论
        </div>
      )}

      {/* 评论列表 */}
      {loading ? (
        <CommentSkeleton count={3} />
      ) : comments.length === 0 ? (
        <div className={styles.empty}>暂无评论，来说点什么吧</div>
      ) : (
        <div className={`${styles.commentList} ${refreshing ? styles.refreshing : ''}`}>
          {comments.map((comment) => (
            <div key={comment.id} className={styles.commentThread}>
              {renderComment(comment)}
              {renderReplies(comment)}
            </div>
          ))}

          {/* 无限滚动哨兵 */}
          <div ref={sentinelRef} className={styles.sentinel}>
            {loadingMore && (
              <div className={styles.loadingMore}>
                <Spin size="small" />
                <span>加载更多评论...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
