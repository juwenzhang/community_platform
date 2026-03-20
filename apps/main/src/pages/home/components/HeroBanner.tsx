import { Typography } from 'antd';

const { Title, Paragraph } = Typography;

/** 首页顶部 Banner */
export default function HeroBanner() {
  return (
    <div className="rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 p-8 text-white">
      <Title level={3} className="!text-white !mb-2">
        🚀 构建你的开发者社区
      </Title>
      <Paragraph className="!text-white/80 !mb-0 text-base">
        Luhanxin Community 是一个全栈技术社区平台，采用微前端架构，
        支持文章发布、社区动态、实时通知等功能。
      </Paragraph>
    </div>
  );
}
