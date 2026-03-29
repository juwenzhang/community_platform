import { Empty } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import styles from '../../profile.module.less';
import EditProfileForm from '../EditProfileForm';

/** 编辑资料页 — /profile 直达编辑表单，保存后跳回个人主页 */
export default function ProfileSettings() {
  const { user, isLoading } = useAuthStore();
  const navigate = useNavigate();

  if (!user && !isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>
          <Empty description="请先登录" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className={styles.page}>
      <EditProfileForm user={user} onSuccess={() => navigate(`/user/${user.username}`)} />
    </div>
  );
}
