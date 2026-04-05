import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import Groq from 'groq-sdk';

export const runtime = 'nodejs';

const parser = new Parser({
  timeout: 10000,
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsMNBot/1.0)' },
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const FEED_URL = 'https://news.google.com/rss/search?q=%EB%AA%BD%EA%B3%A8&hl=ko&gl=KR&ceid=KR:ko';

let cache: { data: NewsItem[]; updatedAt: string } | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

export interface NewsItem {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  source: string;
  summary: string;
  keywords: string[];
  businessInsight: string;
}

export async function GET() {
  if (cache && Date.now() - cacheTime < CACHE_TTL) {
    return NextResponse.json(cache);
  }

  // RSS 수집
  let rawNews: Omit<NewsItem, 'businessInsight'>[] = [];
  try {
    const feed = await parser.parseURL(FEED_URL);
    rawNews = feed.items
      .slice(0, 20)
      .map((item) => ({
        id: item.guid || item.link || Math.random().toString(),
        title: cleanTitle(item.title || ''),
        link: item.link || '',
        pubDate: item.pubDate || item.isoDate || '',
        source: extractSource(item.title || ''),
      }))
      .filter((item) => item.title);
  } catch (e) {
    console.error('RSS 오류:', e);
    return NextResponse.json({ error: `RSS 수집 실패: ${String(e)}` }, { status: 502 });
  }

  if (rawNews.length === 0) {
    return NextResponse.json({ error: '검색 결과가 없습니다.' }, { status: 404 });
  }

  // Groq으로 사업적 분석
  const listText = rawNews.map((item, i) => `${i + 1}. ${item.title}`).join('\n');

  type AnalysisItem = { summary: string; keywords: string[]; insight: string };
  let analyses: AnalysisItem[] = rawNews.map(() => ({
    summary: '요약 불가',
    keywords: [],
    insight: '분석 불가',
  }));

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: '당신은 몽골 시장 전문 비즈니스 애널리스트입니다. 반드시 JSON 형식으로만 응답하세요.',
        },
        {
          role: 'user',
          content:
            `아래 뉴스들을 한국 사업가 관점에서 분석해주세요.\n\n` +
            `각 항목마다 다음 3가지를 작성하세요:\n` +
            `- summary: 뉴스 내용을 2문장으로 요약 (핵심 사실 중심)\n` +
            `- keywords: 핵심 키워드 3~5개 (짧은 단어/구)\n` +
            `- insight: 한국 사업가 관점 사업적 의미 2~3문장 (시장 기회/리스크, 시사점)\n\n` +
            `${listText}\n\n` +
            `반드시 아래 JSON 형식만 출력하세요 (다른 텍스트 없이):\n` +
            `{"items":[{"summary":"...","keywords":["키워드1","키워드2"],"insight":"..."},...]}`
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const text = completion.choices[0]?.message?.content?.trim() ?? '';
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed.items)) {
      analyses = parsed.items.map((item: unknown) => {
        if (typeof item !== 'object' || item === null) return { summary: '', keywords: [], insight: String(item) };
        const obj = item as Record<string, unknown>;
        return {
          summary: typeof obj.summary === 'string' ? obj.summary : '',
          keywords: Array.isArray(obj.keywords) ? obj.keywords.map(String) : [],
          insight: typeof obj.insight === 'string' ? obj.insight : '',
        };
      });
    }
  } catch (e) {
    console.error('Groq 오류:', e);
    analyses = rawNews.map(() => ({ summary: '', keywords: [], insight: `분석 오류: ${String(e)}` }));
  }

  const finalResult = {
    data: rawNews.map((item, i) => ({
      ...item,
      summary: analyses[i]?.summary ?? '',
      keywords: analyses[i]?.keywords ?? [],
      businessInsight: analyses[i]?.insight ?? '분석 중...',
    })),
    updatedAt: new Date().toISOString(),
  };

  cache = finalResult;
  cacheTime = Date.now();

  return NextResponse.json(finalResult);
}

function extractSource(title: string): string {
  const match = title.match(/ - ([^-]+)$/);
  return match ? match[1].trim() : '';
}

function cleanTitle(title: string): string {
  return title.replace(/ - [^-]+$/, '').trim();
}
