import { getAvailableApiSites } from '@/lib/config';
import { SearchResult } from '@/lib/types';

import { getDetailFromApi, searchFromApi } from './downstream';

interface FetchVideoDetailOptions {
  source: string;
  id: string;
  fallbackTitle?: string;
}

/**
 * 根據 source 與 id 獲取視頻詳情。
 * 1. 若傳入 fallbackTitle，則先調用 /api/search 搜索精確匹配。
 * 2. 若搜索未命中或未提供 fallbackTitle，則直接調用 /api/detail。
 */
export async function fetchVideoDetail({
  source,
  id,
  fallbackTitle = '',
}: FetchVideoDetailOptions): Promise<SearchResult> {
  // 優先通過搜索接口查找精確匹配
  const apiSites = await getAvailableApiSites();
  const apiSite = apiSites.find((site) => site.key === source);
  if (!apiSite) {
    throw new Error('無效的API來源');
  }
  if (fallbackTitle) {
    try {
      const searchData = await searchFromApi(apiSite, fallbackTitle.trim());
      const exactMatch = searchData.find(
        (item: SearchResult) =>
          item.source.toString() === source.toString() &&
          item.id.toString() === id.toString()
      );
      if (exactMatch) {
        return exactMatch;
      }
    } catch (error) {
      // do nothing
    }
  }

  // 調用 /api/detail 接口
  const detail = await getDetailFromApi(apiSite, id);
  if (!detail) {
    throw new Error('獲取視頻詳情失敗');
  }

  return detail;
}
