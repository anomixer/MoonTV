import { DoubanItem, DoubanResult } from './types';

interface DoubanCategoriesParams {
  kind: 'tv' | 'movie';
  category: string;
  type: string;
  pageLimit?: number;
  pageStart?: number;
}

interface DoubanCategoryApiResponse {
  total: number;
  items: Array<{
    id: string;
    title: string;
    card_subtitle: string;
    pic: {
      large: string;
      normal: string;
    };
    rating: {
      value: number;
    };
  }>;
}

/**
 * 帶超時的 fetch 請求
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超時

  // 檢查是否使用代理
  const proxyUrl = getDoubanProxyUrl();
  const finalUrl = proxyUrl ? `${proxyUrl}${encodeURIComponent(url)}` : url;

  const fetchOptions: RequestInit = {
    ...options,
    signal: controller.signal,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      Referer: 'https://movie.douban.com/',
      Accept: 'application/json, text/plain, */*',
      ...options.headers,
    },
  };

  try {
    const response = await fetch(finalUrl, fetchOptions);
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * 獲取豆瓣代理 URL 設置
 */
export function getDoubanProxyUrl(): string | null {
  if (typeof window === 'undefined') return null;

  const doubanProxyUrl = localStorage.getItem('doubanProxyUrl');
  return doubanProxyUrl && doubanProxyUrl.trim() ? doubanProxyUrl.trim() : null;
}

/**
 * 檢查是否應該使用客戶端獲取豆瓣數據
 */
export function shouldUseDoubanClient(): boolean {
  return getDoubanProxyUrl() !== null;
}

/**
 * 瀏覽器端豆瓣分類數據獲取函數
 */
export async function fetchDoubanCategories(
  params: DoubanCategoriesParams
): Promise<DoubanResult> {
  const { kind, category, type, pageLimit = 20, pageStart = 0 } = params;

  // 驗證參數
  if (!['tv', 'movie'].includes(kind)) {
    throw new Error('kind 參數必須是 tv 或 movie');
  }

  if (!category || !type) {
    throw new Error('category 和 type 參數不能為空');
  }

  if (pageLimit < 1 || pageLimit > 100) {
    throw new Error('pageLimit 必須在 1-100 之間');
  }

  if (pageStart < 0) {
    throw new Error('pageStart 不能小於 0');
  }

  const target = `https://m.douban.com/rexxar/api/v2/subject/recent_hot/${kind}?start=${pageStart}&limit=${pageLimit}&category=${category}&type=${type}`;

  try {
    const response = await fetchWithTimeout(target);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const doubanData: DoubanCategoryApiResponse = await response.json();

    // 轉換數據格式
    const list: DoubanItem[] = doubanData.items.map((item) => ({
      id: item.id,
      title: item.title,
      poster: item.pic?.normal || item.pic?.large || '',
      rate: item.rating?.value ? item.rating.value.toFixed(1) : '',
      year: item.card_subtitle?.match(/(\d{4})/)?.[1] || '',
    }));

    return {
      code: 200,
      message: '獲取成功',
      list: list,
    };
  } catch (error) {
    throw new Error(`獲取豆瓣分類數據失敗: ${(error as Error).message}`);
  }
}

/**
 * 統一的豆瓣分類數據獲取函數，根據代理設置選擇使用服務端 API 或客戶端代理獲取
 */
export async function getDoubanCategories(
  params: DoubanCategoriesParams
): Promise<DoubanResult> {
  if (shouldUseDoubanClient()) {
    // 使用客戶端代理獲取（當設置了代理 URL 時）
    return fetchDoubanCategories(params);
  } else {
    // 使用服務端 API（當沒有設置代理 URL 時）
    const { kind, category, type, pageLimit = 20, pageStart = 0 } = params;
    const response = await fetch(
      `/api/douban/categories?kind=${kind}&category=${category}&type=${type}&limit=${pageLimit}&start=${pageStart}`
    );

    if (!response.ok) {
      throw new Error('獲取豆瓣分類數據失敗');
    }

    return response.json();
  }
}
