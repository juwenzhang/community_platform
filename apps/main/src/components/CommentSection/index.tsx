import { DeleteOutlined, SmileOutlined } from '@ant-design/icons';
import type { Comment } from '@luhanxin/shared-types';
import { Avatar, Button, Popover } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCommentStore } from '@/stores/useCommentStore';
import { parseMentions } from '@/utils/mentionParser';
import styles from './commentSection.module.less';
import EmojiPicker from './EmojiPicker';
import MentionInput from './MentionInput';

interface CommentSectionProps {
  articleId: string;
}

/** 内联回复状态 */
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
    submitting,
    loadComments,
    createComment,
    deleteComment,
    reset,
  } = useCommentStore();

  // 顶部主输入框状态
  const [mainContent, setMainContent] = useState('');
  const [mainShowEmoji, setMainShowEmoji] = useState(false);
  const mainInputRef = useRef<HTMLTextAreaElement>(null);

  // 内联回复状态（同一时间只有一个）
  const [inlineReply, setInlineReply] = useState<InlineReply | null>(null);
  const [inlineContent, setInlineContent] = useState('');
  const [inlineShowEmoji, setInlineShowEmoji] = useState(false);
  const inlineInputRef = useRef<HTMLTextAreaElement>(null);

  // 加载评论
  useEffect(() => {
    loadComments(articleId);
    return () => reset();
  }, [articleId, loadComments, reset]);

  // 提交主评论（一级评论）
  const handleMainSubmit = async () => {
    if (!mainContent.trim() || submitting) return;
    const success = await createComment({
      articleId,
      content: mainContent.trim(),
    });
    if (success) {
      setMainContent('');
    }
  };

  // 提交内联回复
  const handleInlineSubmit = async () => {
    if (!inlineContent.trim() || submitting || !inlineReply) return;
    const success = await createComment({
      articleId,
      content: inlineContent.trim(),
      parentId: inlineReply.parentId,
      replyToId: inlineReply.replyToId,
    });
    if (success) {
      setInlineContent('');
      setInlineReply(null);
      setInlineShowEmoji(false);
    }
  };

  // 删除评论
  const handleDelete = (commentId: string) => {
    deleteComment(commentId, articleId);
  };

  // 点击回复 → 展开内联输入框
  const handleReply = useCallback(
    (parentId: string, replyToId: string, username: string) => {
      // 如果点击的是同一个回复目标，则关闭
      if (inlineReply?.replyToId === replyToId) {
        setInlineReply(null);
        setInlineContent('');
        setInlineShowEmoji(false);
        return;
      }
      setInlineReply({ parentId, replyToId, replyToUsername: username });
      setInlineContent('');
      setInlineShowEmoji(false);
      // 自动聚焦内联输入框
      setTimeout(() => {
        inlineInputRef.current?.focus();
      }, 50);
    },
    [inlineReply?.replyToId],
  );

  // 取消内联回复
  const cancelInlineReply = () => {
    setInlineReply(null);
    setInlineContent('');
    setInlineShowEmoji(false);
  };

  // 主输入框表情插入
  const handleMainEmojiSelect = (emoji: string) => {
    const textarea = mainInputRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const newValue = mainContent.slice(0, start) + emoji + mainContent.slice(start);
      setMainContent(newValue);
      const newPos = start + emoji.length;
      setTimeout(() => textarea.setSelectionRange(newPos, newPos), 0);
    } else {
      setMainContent((prev) => prev + emoji);
    }
  };

  // 内联回复表情插入
  const handleInlineEmojiSelect = (emoji: string) => {
    const textarea = inlineInputRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const newValue = inlineContent.slice(0, start) + emoji + inlineContent.slice(start);
      setInlineContent(newValue);
      const newPos = start + emoji.length;
      setTimeout(() => textarea.setSelectionRange(newPos, newPos), 0);
    } else {
      setInlineContent((prev) => prev + emoji);
    }
  };

  // 格式化时间
  const formatTime = (comment: Comment) => {
    if (!comment.createdAt) return '';
    return new Date(Number(comment.createdAt.seconds) * 1000).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 渲染内联回复输入框
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
          <div className={styles.inlineReplyActions}>
            <Popover
              content={
                <EmojiPicker
                  onSelect={handleInlineEmojiSelect}
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
              disabled={!inlineContent.trim()}
            >
              回复
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // 渲染单条评论
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
        {/* 内联回复框：紧跟在被回复的评论下方 */}
        {renderInlineReplyBox(comment.id)}
      </div>
    );
  };

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>评论 ({totalCount})</h3>

      {/* 顶部主输入区 — 仅用于发表一级评论 */}
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
              <div className={styles.inputActions}>
                <Popover
                  content={
                    <EmojiPicker
                      onSelect={handleMainEmojiSelect}
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
                  disabled={!mainContent.trim()}
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
        <div className={styles.loading}>加载评论中...</div>
      ) : comments.length === 0 ? (
        <div className={styles.empty}>暂无评论，来说点什么吧</div>
      ) : (
        <div className={styles.commentList}>
          {comments.map((comment) => (
            <div key={comment.id} className={styles.commentThread}>
              {renderComment(comment)}
              {comment.replies.length > 0 && (
                <div className={styles.replies}>
                  {comment.replies.map((reply) => renderComment(reply, true))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
