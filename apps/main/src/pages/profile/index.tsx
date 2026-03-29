import { EditOutlined } from '@ant-design/icons';
import { Button, Empty } from 'antd';
import { useState } from 'react';

import { useAuthStore } from '@/stores/useAuthStore';

import EditProfileForm from './components/EditProfileForm';
import ProfileCard from './components/ProfileCard';

export default function ProfilePage() {
  const { user, isLoading } = useAuthStore();
  const [editing, setEditing] = useState(false);

  if (!user && !isLoading) {
    return (
      <div className="bg-white rounded-lg border border-[#e4e6eb] p-12">
        <Empty description="请先登录" />
      </div>
    );
  }

  return (
    <div className="max-w-[720px] mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-[#252933] m-0">我的资料</h2>
        <Button
          type={editing ? 'default' : 'primary'}
          size="small"
          icon={<EditOutlined />}
          onClick={() => setEditing(!editing)}
          className={`rounded ${!editing ? 'bg-[#1e80ff] border-[#1e80ff]' : ''}`}
        >
          {editing ? '取消' : '编辑'}
        </Button>
      </div>

      <div className="space-y-4">
        <ProfileCard user={user} loading={isLoading} />
        {editing && user && <EditProfileForm user={user} onSuccess={() => setEditing(false)} />}
      </div>
    </div>
  );
}
