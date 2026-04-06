import { Skeleton } from 'antd';

interface CommentSkeletonProps {
  count?: number;
}

export default function CommentSkeleton({ count = 3 }: CommentSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: skeleton 顺序固定
        <div key={i} style={{ display: 'flex', gap: 12, padding: '14px 0' }}>
          <Skeleton.Avatar active size={36} />
          <div style={{ flex: 1 }}>
            <Skeleton
              active
              title={{ width: '30%' }}
              paragraph={{ rows: 2, width: ['80%', '50%'] }}
            />
          </div>
        </div>
      ))}
    </>
  );
}
