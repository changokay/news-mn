import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '몽골 뉴스 비즈니스 인사이트',
  description: '몽골 최신 뉴스와 사업적 의미 분석',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-gray-50 text-gray-900 min-h-screen" suppressHydrationWarning>{children}</body>
    </html>
  );
}
