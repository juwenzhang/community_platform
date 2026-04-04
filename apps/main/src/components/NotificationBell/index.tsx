import { BellOutlined, CheckOutlined } from '@ant-design/icons';
import { Avatar, Badge, Button, Empty, Popover, Spin } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '@/stores/useAuthStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import styles from './notificationBell.module.less';

/** 通知类型 → 中文描述 */
function typeLabel(type: number): string {
  switch (type) {
    case 1:
      return '评论了你的文章';
    case 2:
      return '赞了你的文章';
    case 3:
      return '收藏了你的文章';
    default:
      return '与你互动';
  }
}

/** 相对时间 */
function timeAgo(ts?: { seconds: bigint }): string {
  if (!ts) return '';
  const now = Date.now() / 1000;
  const diff = now - Number(ts.seconds);
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  return `${Math.floor(diff / 86400)}天前`;
}

export default function NotificationBell() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const {
    unreadCount,
    notifications,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    startPolling,
    stopPolling,
  } = useNotificationStore();

  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  // 登录状态变化时启停轮询
  useEffect(() => {
    if (isAuthenticated) {
      startPolling();
    } else {
      stopPolling();
    }
    return () => stopPolling();
  }, [isAuthenticated, startPolling, stopPolling]);

  // 打开弹窗时加载通知列表
  const handleOpenChange = (visible: boolean) => {
    setOpen(visible);
    if (visible) {
      fetchNotifications(true);
    }
  };

  const handleClickNotification = (notifId: string, targetId: string, isRead: boolean) => {
    if (!isRead) markAsRead(notifId);
    setOpen(false);
    navigate(`/post/${targetId}`);
  };

  if (!isAuthenticated) return null;

  const content = (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>通知</span>
        {unreadCount > 0 && (
          <Button type="link" size="small" icon={<CheckOutlined />} onClick={markAllAsRead}>
            全部已读
          </Button>
        )}
      </div>

      <div className={styles.list}>
        {isLoading && notifications.length === 0 ? (
          <div className={styles.center}>
            <Spin size="small" />
          </div>
        ) : notifications.length === 0 ? (
          <Empty description="暂无通知" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          notifications.map((n) => (
            <button
              type="button"
              key={n.id}
              className={`${styles.item} ${n.isRead ? '' : styles.unread}`}
              onClick={() => handleClickNotification(n.id, n.targetId, n.isRead)}
            >
              <Avatar size={32} src={n.actor?.avatarUrl || undefined}>
                {n.actor?.username?.charAt(0)?.toUpperCase()}
              </Avatar>
              <div className={styles.itemContent}>
                <div className={styles.itemText}>
                  <span className={styles.actorName}>
                    {n.actor?.displayName || n.actor?.username || '某用户'}
                  </span>{' '}
                  {typeLabel(n.type)}
                </div>
                {n.targetTitle && <div className={styles.targetTitle}>{n.targetTitle}</div>}
                <div className={styles.time}>{timeAgo(n.createdAt)}</div>
              </div>
              {!n.isRead && <span className={styles.dot} />}
            </button>
          ))
        )}
      </div>
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      placement="bottomRight"
      open={open}
      onOpenChange={handleOpenChange}
      arrow={false}
      overlayStyle={{ padding: 0 }}
    >
      <button type="button" className={styles.bellBtn} title="通知">
        <Badge count={unreadCount} size="small" offset={[2, -2]}>
          <BellOutlined style={{ fontSize: 18, color: 'var(--color-text-3)' }} />
        </Badge>
      </button>
    </Popover>
  );
}
