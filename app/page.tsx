'use client';

import { useEffect, useState, useCallback } from 'react';
import type { NewsItem } from './api/news/route';

const REFRESH_INTERVAL = 5 * 60;

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${month}월 ${day}일 ${hh}:${mm}`;
}

export default function Page() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [updatedAt, setUpdatedAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);

  const fetchNews = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/news');
      if (!res.ok) throw new Error('서버 오류');
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setNews(json.data);
      setUpdatedAt(json.updatedAt);
      setCountdown(REFRESH_INTERVAL);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '뉴스를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNews(); }, [fetchNews]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { fetchNews(); return REFRESH_INTERVAL; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [fetchNews]);

  const mins = String(Math.floor(countdown / 60)).padStart(2, '0');
  const secs = String(countdown % 60).padStart(2, '0');

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* 헤더 */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🇲🇳</span>
          <h1 className="text-2xl font-bold text-gray-900">몽골 뉴스 비즈니스 인사이트</h1>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          {updatedAt && <span>업데이트: {formatDate(updatedAt)}</span>}
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
            {mins}:{secs} 후 자동 새로고침
          </span>
          <button
            onClick={fetchNews}
            disabled={loading}
            className="text-blue-600 hover:text-blue-800 disabled:opacity-40 transition-colors"
          >
            지금 새로고침
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">Google 뉴스에서 &apos;몽골&apos; 키워드 한국어 뉴스를 실시간 수집합니다.</p>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6">{error}</div>
      )}

      {/* 로딩 스켈레톤 */}
      {loading && news.length === 0 && (
        <div className="grid gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-1/5 mb-3" />
              <div className="h-5 bg-gray-200 rounded w-4/5 mb-4" />
              <div className="h-3 bg-gray-100 rounded w-full mb-2" />
              <div className="h-3 bg-gray-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      )}

      {/* 뉴스 카드 */}
      {news.length > 0 && (
        <div className="grid gap-4">
          {news.map((item) => (
            <article
              key={item.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2 mb-2">
                {item.source && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    {item.source}
                  </span>
                )}
                {item.pubDate && (
                  <span className="text-xs text-gray-400">{formatDate(item.pubDate)}</span>
                )}
              </div>

              <h2 className="font-semibold text-gray-900 mb-2 leading-snug">
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 transition-colors"
                >
                  {item.title}
                </a>
              </h2>

              {item.summary && (
                <p className="text-sm text-gray-600 leading-relaxed mb-2">{item.summary}</p>
              )}

              {item.keywords && item.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {item.keywords.map((kw) => (
                    <span key={kw} className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                      #{kw}
                    </span>
                  ))}
                </div>
              )}

              <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-lg p-3">
                <div className="flex items-center gap-1 text-amber-700 text-xs font-bold mb-1">
                  <span>💡</span> 사업적 의미
                </div>
                <p className="text-sm text-amber-900 leading-relaxed">{item.businessInsight}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
