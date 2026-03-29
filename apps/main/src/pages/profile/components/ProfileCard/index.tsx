import { MailOutlined, UserOutlined } from '@ant-design/icons';
import type { User } from '@luhanxin/shared-types';
import { Avatar, Skeleton } from 'antd';

interface ProfileCardProps {
  user: User | null;
  loading?: boolean;
}

export default function ProfileCard({ user, loading }: ProfileCardProps) {
  if (loading || !user) {
    return (
      <div className="bg-white rounded-lg border border-[#e4e6eb] p-6">
        <Skeleton avatar={{ size: 64 }} active paragraph={{ rows: 2 }} />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-[#e4e6eb] overflow-hidden">
      {/* 顶部色条 */}
      <div className="h-1.5 bg-[#1e80ff]" />

      <div className="p-6">
        <div className="flex items-start gap-5">
          <Avatar
            src={user.avatarUrl || undefined}
            icon={!user.avatarUrl ? <UserOutlined /> : undefined}
            size={64}
            className="flex-shrink-0"
          />

          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-[#252933] mb-1">
              {user.displayName || user.username}
            </h2>
            <div className="flex items-center gap-3 text-sm text-[#8a919f] mb-2">
              <span>@{user.username}</span>
              {user.email && (
                <span className="flex items-center gap-1">
                  <MailOutlined className="text-xs" /> {user.email}
                </span>
              )}
            </div>
            <p className="text-sm text-[#515767] mb-0">
              {user.bio || '这个人很懒，还没有写简介...'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
