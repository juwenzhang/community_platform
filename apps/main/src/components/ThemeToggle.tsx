import { MoonOutlined, SunOutlined } from '@ant-design/icons';
import { useThemeStore } from '@/stores/useThemeStore';

export default function ThemeToggle() {
  const { theme, toggle } = useThemeStore();

  return (
    <button
      type="button"
      onClick={toggle}
      title={theme === 'light' ? '切换暗色模式' : '切换亮色模式'}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
        border: 'none',
        background: 'none',
        color: 'var(--color-text-3)',
        fontSize: 16,
        cursor: 'pointer',
        borderRadius: 'var(--radius-sm)',
        transition: 'color 0.2s, background 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = 'var(--color-primary)';
        e.currentTarget.style.background = 'var(--color-bg-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = 'var(--color-text-3)';
        e.currentTarget.style.background = 'none';
      }}
    >
      {theme === 'light' ? <MoonOutlined /> : <SunOutlined />}
    </button>
  );
}
