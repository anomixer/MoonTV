/* eslint-disable no-console, @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-function */
'use client';

/**
 * 僅在瀏覽器端使用的數據庫工具，目前基於 localStorage 實現。
 * 之所以單獨拆分文件，是為了避免在客戶端 bundle 中引入 `fs`, `path` 等 Node.js 內置模塊，
 * 從而解決諸如 "Module not found: Can't resolve 'fs'" 的問題。
 *
 * 功能：
 * 1. 獲取全部播放記錄（getAllPlayRecords）。
 * 2. 保存播放記錄（savePlayRecord）。
 * 3. 數據庫存儲模式下的混合緩存策略，提升用戶體驗。
 *
 * 如後續需要在客戶端讀取收藏等其它數據，可按同樣方式在此文件中補充實現。
 */

import { getAuthInfoFromBrowserCookie } from './auth';

// ---- 類型 ----
export interface PlayRecord {
  title: string;
  source_name: string;
  year: string;
  cover: string;
  index: number; // 第幾集
  total_episodes: number; // 總集數
  play_time: number; // 播放進度（秒）
  total_time: number; // 總進度（秒）
  save_time: number; // 記錄保存時間（時間戳）
  search_title?: string; // 搜索時使用的標題
}

// ---- 收藏類型 ----
export interface Favorite {
  title: string;
  source_name: string;
  year: string;
  cover: string;
  total_episodes: number;
  save_time: number;
  search_title?: string;
}

// ---- 緩存數據結構 ----
interface CacheData<T> {
  data: T;
  timestamp: number;
  version: string;
}

interface UserCacheStore {
  playRecords?: CacheData<Record<string, PlayRecord>>;
  favorites?: CacheData<Record<string, Favorite>>;
  searchHistory?: CacheData<string[]>;
}

// ---- 常量 ----
const PLAY_RECORDS_KEY = 'moontv_play_records';
const FAVORITES_KEY = 'moontv_favorites';
const SEARCH_HISTORY_KEY = 'moontv_search_history';

// 緩存相關常量
const CACHE_PREFIX = 'moontv_cache_';
const CACHE_VERSION = '1.0.0';
const CACHE_EXPIRE_TIME = 60 * 60 * 1000; // 一小時緩存過期

// ---- 環境變量 ----
const STORAGE_TYPE = (() => {
  const raw =
    (typeof window !== 'undefined' &&
      (window as any).RUNTIME_CONFIG?.STORAGE_TYPE) ||
    (process.env.STORAGE_TYPE as
      | 'localstorage'
      | 'redis'
      | 'd1'
      | 'upstash'
      | undefined) ||
    'localstorage';
  return raw;
})();

// ---------------- 搜索歷史相關常量 ----------------
// 搜索歷史最大保存條數
const SEARCH_HISTORY_LIMIT = 20;

// ---- 緩存管理器 ----
class HybridCacheManager {
  private static instance: HybridCacheManager;

  static getInstance(): HybridCacheManager {
    if (!HybridCacheManager.instance) {
      HybridCacheManager.instance = new HybridCacheManager();
    }
    return HybridCacheManager.instance;
  }

  /**
   * 獲取當前用戶名
   */
  private getCurrentUsername(): string | null {
    const authInfo = getAuthInfoFromBrowserCookie();
    return authInfo?.username || null;
  }

  /**
   * 生成用戶專屬的緩存key
   */
  private getUserCacheKey(username: string): string {
    return `${CACHE_PREFIX}${username}`;
  }

  /**
   * 獲取用戶緩存數據
   */
  private getUserCache(username: string): UserCacheStore {
    if (typeof window === 'undefined') return {};

    try {
      const cacheKey = this.getUserCacheKey(username);
      const cached = localStorage.getItem(cacheKey);
      return cached ? JSON.parse(cached) : {};
    } catch (error) {
      console.warn('獲取用戶緩存失敗:', error);
      return {};
    }
  }

  /**
   * 保存用戶緩存數據
   */
  private saveUserCache(username: string, cache: UserCacheStore): void {
    if (typeof window === 'undefined') return;

    try {
      const cacheKey = this.getUserCacheKey(username);
      localStorage.setItem(cacheKey, JSON.stringify(cache));
    } catch (error) {
      console.warn('保存用戶緩存失敗:', error);
    }
  }

  /**
   * 檢查緩存是否有效
   */
  private isCacheValid<T>(cache: CacheData<T>): boolean {
    const now = Date.now();
    return (
      cache.version === CACHE_VERSION &&
      now - cache.timestamp < CACHE_EXPIRE_TIME
    );
  }

  /**
   * 創建緩存數據
   */
  private createCacheData<T>(data: T): CacheData<T> {
    return {
      data,
      timestamp: Date.now(),
      version: CACHE_VERSION,
    };
  }

  /**
   * 獲取緩存的播放記錄
   */
  getCachedPlayRecords(): Record<string, PlayRecord> | null {
    const username = this.getCurrentUsername();
    if (!username) return null;

    const userCache = this.getUserCache(username);
    const cached = userCache.playRecords;

    if (cached && this.isCacheValid(cached)) {
      return cached.data;
    }

    return null;
  }

  /**
   * 緩存播放記錄
   */
  cachePlayRecords(data: Record<string, PlayRecord>): void {
    const username = this.getCurrentUsername();
    if (!username) return;

    const userCache = this.getUserCache(username);
    userCache.playRecords = this.createCacheData(data);
    this.saveUserCache(username, userCache);
  }

  /**
   * 獲取緩存的收藏
   */
  getCachedFavorites(): Record<string, Favorite> | null {
    const username = this.getCurrentUsername();
    if (!username) return null;

    const userCache = this.getUserCache(username);
    const cached = userCache.favorites;

    if (cached && this.isCacheValid(cached)) {
      return cached.data;
    }

    return null;
  }

  /**
   * 緩存收藏
   */
  cacheFavorites(data: Record<string, Favorite>): void {
    const username = this.getCurrentUsername();
    if (!username) return;

    const userCache = this.getUserCache(username);
    userCache.favorites = this.createCacheData(data);
    this.saveUserCache(username, userCache);
  }

  /**
   * 獲取緩存的搜索歷史
   */
  getCachedSearchHistory(): string[] | null {
    const username = this.getCurrentUsername();
    if (!username) return null;

    const userCache = this.getUserCache(username);
    const cached = userCache.searchHistory;

    if (cached && this.isCacheValid(cached)) {
      return cached.data;
    }

    return null;
  }

  /**
   * 緩存搜索歷史
   */
  cacheSearchHistory(data: string[]): void {
    const username = this.getCurrentUsername();
    if (!username) return;

    const userCache = this.getUserCache(username);
    userCache.searchHistory = this.createCacheData(data);
    this.saveUserCache(username, userCache);
  }

  /**
   * 清除指定用戶的所有緩存
   */
  clearUserCache(username?: string): void {
    const targetUsername = username || this.getCurrentUsername();
    if (!targetUsername) return;

    try {
      const cacheKey = this.getUserCacheKey(targetUsername);
      localStorage.removeItem(cacheKey);
    } catch (error) {
      console.warn('清除用戶緩存失敗:', error);
    }
  }

  /**
   * 清除所有過期緩存
   */
  clearExpiredCaches(): void {
    if (typeof window === 'undefined') return;

    try {
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(CACHE_PREFIX)) {
          try {
            const cache = JSON.parse(localStorage.getItem(key) || '{}');
            // 檢查是否有任何緩存數據過期
            let hasValidData = false;
            for (const [, cacheData] of Object.entries(cache)) {
              if (cacheData && this.isCacheValid(cacheData as CacheData<any>)) {
                hasValidData = true;
                break;
              }
            }
            if (!hasValidData) {
              keysToRemove.push(key);
            }
          } catch {
            // 解析失敗的緩存也刪除
            keysToRemove.push(key);
          }
        }
      }

      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      console.warn('清除過期緩存失敗:', error);
    }
  }
}

// 獲取緩存管理器實例
const cacheManager = HybridCacheManager.getInstance();

// ---- 錯誤處理輔助函數 ----
/**
 * 數據庫操作失敗時的通用錯誤處理
 * 立即從數據庫刷新對應類型的緩存以保持數據一致性
 */
async function handleDatabaseOperationFailure(
  dataType: 'playRecords' | 'favorites' | 'searchHistory',
  error: any
): Promise<void> {
  console.error(`數據庫操作失敗 (${dataType}):`, error);

  try {
    let freshData: any;
    let eventName: string;

    switch (dataType) {
      case 'playRecords':
        freshData = await fetchFromApi<Record<string, PlayRecord>>(
          `/api/playrecords`
        );
        cacheManager.cachePlayRecords(freshData);
        eventName = 'playRecordsUpdated';
        break;
      case 'favorites':
        freshData = await fetchFromApi<Record<string, Favorite>>(
          `/api/favorites`
        );
        cacheManager.cacheFavorites(freshData);
        eventName = 'favoritesUpdated';
        break;
      case 'searchHistory':
        freshData = await fetchFromApi<string[]>(`/api/searchhistory`);
        cacheManager.cacheSearchHistory(freshData);
        eventName = 'searchHistoryUpdated';
        break;
    }

    // 觸發更新事件通知組件
    window.dispatchEvent(
      new CustomEvent(eventName, {
        detail: freshData,
      })
    );
  } catch (refreshErr) {
    console.error(`刷新${dataType}緩存失敗:`, refreshErr);
  }
}

// 頁面加載時清理過期緩存
if (typeof window !== 'undefined') {
  setTimeout(() => cacheManager.clearExpiredCaches(), 1000);
}

// ---- 工具函數 ----
async function fetchFromApi<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`請求 ${path} 失敗: ${res.status}`);
  return (await res.json()) as T;
}

/**
 * 生成存儲key
 */
export function generateStorageKey(source: string, id: string): string {
  return `${source}+${id}`;
}

// ---- API ----
/**
 * 讀取全部播放記錄。
 * D1 存儲模式下使用混合緩存策略：優先返回緩存數據，後臺異步同步最新數據。
 * 在服務端渲染階段 (window === undefined) 時返回空對象，避免報錯。
 */
export async function getAllPlayRecords(): Promise<Record<string, PlayRecord>> {
  // 服務器端渲染階段直接返回空，交由客戶端 useEffect 再行請求
  if (typeof window === 'undefined') {
    return {};
  }

  // 數據庫存儲模式：使用混合緩存策略（包括 redis、d1、upstash）
  if (STORAGE_TYPE !== 'localstorage') {
    // 優先從緩存獲取數據
    const cachedData = cacheManager.getCachedPlayRecords();

    if (cachedData) {
      // 返回緩存數據，同時後臺異步更新
      fetchFromApi<Record<string, PlayRecord>>(`/api/playrecords`)
        .then((freshData) => {
          // 只有數據真正不同時才更新緩存
          if (JSON.stringify(cachedData) !== JSON.stringify(freshData)) {
            cacheManager.cachePlayRecords(freshData);
            // 觸發數據更新事件，供組件監聽
            window.dispatchEvent(
              new CustomEvent('playRecordsUpdated', {
                detail: freshData,
              })
            );
          }
        })
        .catch((err) => {
          console.warn('後臺同步播放記錄失敗:', err);
        });

      return cachedData;
    } else {
      // 緩存為空，直接從 API 獲取並緩存
      try {
        const freshData = await fetchFromApi<Record<string, PlayRecord>>(
          `/api/playrecords`
        );
        cacheManager.cachePlayRecords(freshData);
        return freshData;
      } catch (err) {
        console.error('獲取播放記錄失敗:', err);
        return {};
      }
    }
  }

  // localstorage 模式
  try {
    const raw = localStorage.getItem(PLAY_RECORDS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, PlayRecord>;
  } catch (err) {
    console.error('讀取播放記錄失敗:', err);
    return {};
  }
}

/**
 * 保存播放記錄。
 * 數據庫存儲模式下使用樂觀更新：先更新緩存（立即生效），再異步同步到數據庫。
 */
export async function savePlayRecord(
  source: string,
  id: string,
  record: PlayRecord
): Promise<void> {
  const key = generateStorageKey(source, id);

  // 數據庫存儲模式：樂觀更新策略（包括 redis、d1、upstash）
  if (STORAGE_TYPE !== 'localstorage') {
    // 立即更新緩存
    const cachedRecords = cacheManager.getCachedPlayRecords() || {};
    cachedRecords[key] = record;
    cacheManager.cachePlayRecords(cachedRecords);

    // 觸發立即更新事件
    window.dispatchEvent(
      new CustomEvent('playRecordsUpdated', {
        detail: cachedRecords,
      })
    );

    // 異步同步到數據庫
    try {
      const res = await fetch('/api/playrecords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key, record }),
      });

      if (!res.ok) {
        throw new Error(`保存播放記錄失敗: ${res.status}`);
      }
    } catch (err) {
      await handleDatabaseOperationFailure('playRecords', err);
      throw err;
    }
    return;
  }

  // localstorage 模式
  if (typeof window === 'undefined') {
    console.warn('無法在服務端保存播放記錄到 localStorage');
    return;
  }

  try {
    const allRecords = await getAllPlayRecords();
    allRecords[key] = record;
    localStorage.setItem(PLAY_RECORDS_KEY, JSON.stringify(allRecords));
    window.dispatchEvent(
      new CustomEvent('playRecordsUpdated', {
        detail: allRecords,
      })
    );
  } catch (err) {
    console.error('保存播放記錄失敗:', err);
    throw err;
  }
}

/**
 * 刪除播放記錄。
 * 數據庫存儲模式下使用樂觀更新：先更新緩存，再異步同步到數據庫。
 */
export async function deletePlayRecord(
  source: string,
  id: string
): Promise<void> {
  const key = generateStorageKey(source, id);

  // 數據庫存儲模式：樂觀更新策略（包括 redis、d1、upstash）
  if (STORAGE_TYPE !== 'localstorage') {
    // 立即更新緩存
    const cachedRecords = cacheManager.getCachedPlayRecords() || {};
    delete cachedRecords[key];
    cacheManager.cachePlayRecords(cachedRecords);

    // 觸發立即更新事件
    window.dispatchEvent(
      new CustomEvent('playRecordsUpdated', {
        detail: cachedRecords,
      })
    );

    // 異步同步到數據庫
    try {
      const res = await fetch(
        `/api/playrecords?key=${encodeURIComponent(key)}`,
        {
          method: 'DELETE',
        }
      );
      if (!res.ok) throw new Error(`刪除播放記錄失敗: ${res.status}`);
    } catch (err) {
      await handleDatabaseOperationFailure('playRecords', err);
      throw err;
    }
    return;
  }

  // localstorage 模式
  if (typeof window === 'undefined') {
    console.warn('無法在服務端刪除播放記錄到 localStorage');
    return;
  }

  try {
    const allRecords = await getAllPlayRecords();
    delete allRecords[key];
    localStorage.setItem(PLAY_RECORDS_KEY, JSON.stringify(allRecords));
    window.dispatchEvent(
      new CustomEvent('playRecordsUpdated', {
        detail: allRecords,
      })
    );
  } catch (err) {
    console.error('刪除播放記錄失敗:', err);
    throw err;
  }
}

/* ---------------- 搜索歷史相關 API ---------------- */

/**
 * 獲取搜索歷史。
 * 數據庫存儲模式下使用混合緩存策略：優先返回緩存數據，後臺異步同步最新數據。
 */
export async function getSearchHistory(): Promise<string[]> {
  // 服務器端渲染階段直接返回空
  if (typeof window === 'undefined') {
    return [];
  }

  // 數據庫存儲模式：使用混合緩存策略（包括 redis、d1、upstash）
  if (STORAGE_TYPE !== 'localstorage') {
    // 優先從緩存獲取數據
    const cachedData = cacheManager.getCachedSearchHistory();

    if (cachedData) {
      // 返回緩存數據，同時後臺異步更新
      fetchFromApi<string[]>(`/api/searchhistory`)
        .then((freshData) => {
          // 只有數據真正不同時才更新緩存
          if (JSON.stringify(cachedData) !== JSON.stringify(freshData)) {
            cacheManager.cacheSearchHistory(freshData);
            // 觸發數據更新事件
            window.dispatchEvent(
              new CustomEvent('searchHistoryUpdated', {
                detail: freshData,
              })
            );
          }
        })
        .catch((err) => {
          console.warn('後臺同步搜索歷史失敗:', err);
        });

      return cachedData;
    } else {
      // 緩存為空，直接從 API 獲取並緩存
      try {
        const freshData = await fetchFromApi<string[]>(`/api/searchhistory`);
        cacheManager.cacheSearchHistory(freshData);
        return freshData;
      } catch (err) {
        console.error('獲取搜索歷史失敗:', err);
        return [];
      }
    }
  }

  // localStorage 模式
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as string[];
    // 僅返回字符串數組
    return Array.isArray(arr) ? arr : [];
  } catch (err) {
    console.error('讀取搜索歷史失敗:', err);
    return [];
  }
}

/**
 * 將關鍵字添加到搜索歷史。
 * 數據庫存儲模式下使用樂觀更新：先更新緩存，再異步同步到數據庫。
 */
export async function addSearchHistory(keyword: string): Promise<void> {
  const trimmed = keyword.trim();
  if (!trimmed) return;

  // 數據庫存儲模式：樂觀更新策略（包括 redis、d1、upstash）
  if (STORAGE_TYPE !== 'localstorage') {
    // 立即更新緩存
    const cachedHistory = cacheManager.getCachedSearchHistory() || [];
    const newHistory = [trimmed, ...cachedHistory.filter((k) => k !== trimmed)];
    // 限制長度
    if (newHistory.length > SEARCH_HISTORY_LIMIT) {
      newHistory.length = SEARCH_HISTORY_LIMIT;
    }
    cacheManager.cacheSearchHistory(newHistory);

    // 觸發立即更新事件
    window.dispatchEvent(
      new CustomEvent('searchHistoryUpdated', {
        detail: newHistory,
      })
    );

    // 異步同步到數據庫
    try {
      const res = await fetch('/api/searchhistory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keyword: trimmed }),
      });
      if (!res.ok) throw new Error(`保存搜索歷史失敗: ${res.status}`);
    } catch (err) {
      await handleDatabaseOperationFailure('searchHistory', err);
    }
    return;
  }

  // localStorage 模式
  if (typeof window === 'undefined') return;

  try {
    const history = await getSearchHistory();
    const newHistory = [trimmed, ...history.filter((k) => k !== trimmed)];
    // 限制長度
    if (newHistory.length > SEARCH_HISTORY_LIMIT) {
      newHistory.length = SEARCH_HISTORY_LIMIT;
    }
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
    window.dispatchEvent(
      new CustomEvent('searchHistoryUpdated', {
        detail: newHistory,
      })
    );
  } catch (err) {
    console.error('保存搜索歷史失敗:', err);
  }
}

/**
 * 清空搜索歷史。
 * 數據庫存儲模式下使用樂觀更新：先更新緩存，再異步同步到數據庫。
 */
export async function clearSearchHistory(): Promise<void> {
  // 數據庫存儲模式：樂觀更新策略（包括 redis、d1、upstash）
  if (STORAGE_TYPE !== 'localstorage') {
    // 立即更新緩存
    cacheManager.cacheSearchHistory([]);

    // 觸發立即更新事件
    window.dispatchEvent(
      new CustomEvent('searchHistoryUpdated', {
        detail: [],
      })
    );

    // 異步同步到數據庫
    try {
      const res = await fetch(`/api/searchhistory`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(`清空搜索歷史失敗: ${res.status}`);
    } catch (err) {
      await handleDatabaseOperationFailure('searchHistory', err);
    }
    return;
  }

  // localStorage 模式
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SEARCH_HISTORY_KEY);
  window.dispatchEvent(
    new CustomEvent('searchHistoryUpdated', {
      detail: [],
    })
  );
}

/**
 * 刪除單條搜索歷史。
 * 數據庫存儲模式下使用樂觀更新：先更新緩存，再異步同步到數據庫。
 */
export async function deleteSearchHistory(keyword: string): Promise<void> {
  const trimmed = keyword.trim();
  if (!trimmed) return;

  // 數據庫存儲模式：樂觀更新策略（包括 redis、d1、upstash）
  if (STORAGE_TYPE !== 'localstorage') {
    // 立即更新緩存
    const cachedHistory = cacheManager.getCachedSearchHistory() || [];
    const newHistory = cachedHistory.filter((k) => k !== trimmed);
    cacheManager.cacheSearchHistory(newHistory);

    // 觸發立即更新事件
    window.dispatchEvent(
      new CustomEvent('searchHistoryUpdated', {
        detail: newHistory,
      })
    );

    // 異步同步到數據庫
    try {
      const res = await fetch(
        `/api/searchhistory?keyword=${encodeURIComponent(trimmed)}`,
        {
          method: 'DELETE',
        }
      );
      if (!res.ok) throw new Error(`刪除搜索歷史失敗: ${res.status}`);
    } catch (err) {
      await handleDatabaseOperationFailure('searchHistory', err);
    }
    return;
  }

  // localStorage 模式
  if (typeof window === 'undefined') return;

  try {
    const history = await getSearchHistory();
    const newHistory = history.filter((k) => k !== trimmed);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
    window.dispatchEvent(
      new CustomEvent('searchHistoryUpdated', {
        detail: newHistory,
      })
    );
  } catch (err) {
    console.error('刪除搜索歷史失敗:', err);
  }
}

// ---------------- 收藏相關 API ----------------

/**
 * 獲取全部收藏。
 * 數據庫存儲模式下使用混合緩存策略：優先返回緩存數據，後臺異步同步最新數據。
 */
export async function getAllFavorites(): Promise<Record<string, Favorite>> {
  // 服務器端渲染階段直接返回空
  if (typeof window === 'undefined') {
    return {};
  }

  // 數據庫存儲模式：使用混合緩存策略（包括 redis、d1、upstash）
  if (STORAGE_TYPE !== 'localstorage') {
    // 優先從緩存獲取數據
    const cachedData = cacheManager.getCachedFavorites();

    if (cachedData) {
      // 返回緩存數據，同時後臺異步更新
      fetchFromApi<Record<string, Favorite>>(`/api/favorites`)
        .then((freshData) => {
          // 只有數據真正不同時才更新緩存
          if (JSON.stringify(cachedData) !== JSON.stringify(freshData)) {
            cacheManager.cacheFavorites(freshData);
            // 觸發數據更新事件
            window.dispatchEvent(
              new CustomEvent('favoritesUpdated', {
                detail: freshData,
              })
            );
          }
        })
        .catch((err) => {
          console.warn('後臺同步收藏失敗:', err);
        });

      return cachedData;
    } else {
      // 緩存為空，直接從 API 獲取並緩存
      try {
        const freshData = await fetchFromApi<Record<string, Favorite>>(
          `/api/favorites`
        );
        cacheManager.cacheFavorites(freshData);
        return freshData;
      } catch (err) {
        console.error('獲取收藏失敗:', err);
        return {};
      }
    }
  }

  // localStorage 模式
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, Favorite>;
  } catch (err) {
    console.error('讀取收藏失敗:', err);
    return {};
  }
}

/**
 * 保存收藏。
 * 數據庫存儲模式下使用樂觀更新：先更新緩存，再異步同步到數據庫。
 */
export async function saveFavorite(
  source: string,
  id: string,
  favorite: Favorite
): Promise<void> {
  const key = generateStorageKey(source, id);

  // 數據庫存儲模式：樂觀更新策略（包括 redis、d1、upstash）
  if (STORAGE_TYPE !== 'localstorage') {
    // 立即更新緩存
    const cachedFavorites = cacheManager.getCachedFavorites() || {};
    cachedFavorites[key] = favorite;
    cacheManager.cacheFavorites(cachedFavorites);

    // 觸發立即更新事件
    window.dispatchEvent(
      new CustomEvent('favoritesUpdated', {
        detail: cachedFavorites,
      })
    );

    // 異步同步到數據庫
    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key, favorite }),
      });
      if (!res.ok) throw new Error(`保存收藏失敗: ${res.status}`);
    } catch (err) {
      await handleDatabaseOperationFailure('favorites', err);
      throw err;
    }
    return;
  }

  // localStorage 模式
  if (typeof window === 'undefined') {
    console.warn('無法在服務端保存收藏到 localStorage');
    return;
  }

  try {
    const allFavorites = await getAllFavorites();
    allFavorites[key] = favorite;
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(allFavorites));
    window.dispatchEvent(
      new CustomEvent('favoritesUpdated', {
        detail: allFavorites,
      })
    );
  } catch (err) {
    console.error('保存收藏失敗:', err);
    throw err;
  }
}

/**
 * 刪除收藏。
 * 數據庫存儲模式下使用樂觀更新：先更新緩存，再異步同步到數據庫。
 */
export async function deleteFavorite(
  source: string,
  id: string
): Promise<void> {
  const key = generateStorageKey(source, id);

  // 數據庫存儲模式：樂觀更新策略（包括 redis、d1、upstash）
  if (STORAGE_TYPE !== 'localstorage') {
    // 立即更新緩存
    const cachedFavorites = cacheManager.getCachedFavorites() || {};
    delete cachedFavorites[key];
    cacheManager.cacheFavorites(cachedFavorites);

    // 觸發立即更新事件
    window.dispatchEvent(
      new CustomEvent('favoritesUpdated', {
        detail: cachedFavorites,
      })
    );

    // 異步同步到數據庫
    try {
      const res = await fetch(`/api/favorites?key=${encodeURIComponent(key)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(`刪除收藏失敗: ${res.status}`);
    } catch (err) {
      await handleDatabaseOperationFailure('favorites', err);
      throw err;
    }
    return;
  }

  // localStorage 模式
  if (typeof window === 'undefined') {
    console.warn('無法在服務端刪除收藏到 localStorage');
    return;
  }

  try {
    const allFavorites = await getAllFavorites();
    delete allFavorites[key];
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(allFavorites));
    window.dispatchEvent(
      new CustomEvent('favoritesUpdated', {
        detail: allFavorites,
      })
    );
  } catch (err) {
    console.error('刪除收藏失敗:', err);
    throw err;
  }
}

/**
 * 判斷是否已收藏。
 * 數據庫存儲模式下使用混合緩存策略：優先返回緩存數據，後臺異步同步最新數據。
 */
export async function isFavorited(
  source: string,
  id: string
): Promise<boolean> {
  const key = generateStorageKey(source, id);

  // 數據庫存儲模式：使用混合緩存策略（包括 redis、d1、upstash）
  if (STORAGE_TYPE !== 'localstorage') {
    const cachedFavorites = cacheManager.getCachedFavorites();

    if (cachedFavorites) {
      // 返回緩存數據，同時後臺異步更新
      fetchFromApi<Record<string, Favorite>>(`/api/favorites`)
        .then((freshData) => {
          // 只有數據真正不同時才更新緩存
          if (JSON.stringify(cachedFavorites) !== JSON.stringify(freshData)) {
            cacheManager.cacheFavorites(freshData);
            // 觸發數據更新事件
            window.dispatchEvent(
              new CustomEvent('favoritesUpdated', {
                detail: freshData,
              })
            );
          }
        })
        .catch((err) => {
          console.warn('後臺同步收藏失敗:', err);
        });

      return !!cachedFavorites[key];
    } else {
      // 緩存為空，直接從 API 獲取並緩存
      try {
        const freshData = await fetchFromApi<Record<string, Favorite>>(
          `/api/favorites`
        );
        cacheManager.cacheFavorites(freshData);
        return !!freshData[key];
      } catch (err) {
        console.error('檢查收藏狀態失敗:', err);
        return false;
      }
    }
  }

  // localStorage 模式
  const allFavorites = await getAllFavorites();
  return !!allFavorites[key];
}

/**
 * 清空全部播放記錄
 * 數據庫存儲模式下使用樂觀更新：先更新緩存，再異步同步到數據庫。
 */
export async function clearAllPlayRecords(): Promise<void> {
  // 數據庫存儲模式：樂觀更新策略（包括 redis、d1、upstash）
  if (STORAGE_TYPE !== 'localstorage') {
    // 立即更新緩存
    cacheManager.cachePlayRecords({});

    // 觸發立即更新事件
    window.dispatchEvent(
      new CustomEvent('playRecordsUpdated', {
        detail: {},
      })
    );

    // 異步同步到數據庫
    try {
      const res = await fetch(`/api/playrecords`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`清空播放記錄失敗: ${res.status}`);
    } catch (err) {
      await handleDatabaseOperationFailure('playRecords', err);
      throw err;
    }
    return;
  }

  // localStorage 模式
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PLAY_RECORDS_KEY);
  window.dispatchEvent(
    new CustomEvent('playRecordsUpdated', {
      detail: {},
    })
  );
}

/**
 * 清空全部收藏
 * 數據庫存儲模式下使用樂觀更新：先更新緩存，再異步同步到數據庫。
 */
export async function clearAllFavorites(): Promise<void> {
  // 數據庫存儲模式：樂觀更新策略（包括 redis、d1、upstash）
  if (STORAGE_TYPE !== 'localstorage') {
    // 立即更新緩存
    cacheManager.cacheFavorites({});

    // 觸發立即更新事件
    window.dispatchEvent(
      new CustomEvent('favoritesUpdated', {
        detail: {},
      })
    );

    // 異步同步到數據庫
    try {
      const res = await fetch(`/api/favorites`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`清空收藏失敗: ${res.status}`);
    } catch (err) {
      await handleDatabaseOperationFailure('favorites', err);
      throw err;
    }
    return;
  }

  // localStorage 模式
  if (typeof window === 'undefined') return;
  localStorage.removeItem(FAVORITES_KEY);
  window.dispatchEvent(
    new CustomEvent('favoritesUpdated', {
      detail: {},
    })
  );
}

// ---------------- 混合緩存輔助函數 ----------------

/**
 * 清除當前用戶的所有緩存數據
 * 用於用戶登出時清理緩存
 */
export function clearUserCache(): void {
  if (STORAGE_TYPE !== 'localstorage') {
    cacheManager.clearUserCache();
  }
}

/**
 * 手動刷新所有緩存數據
 * 強制從服務器重新獲取數據並更新緩存
 */
export async function refreshAllCache(): Promise<void> {
  if (STORAGE_TYPE === 'localstorage') return;

  try {
    // 並行刷新所有數據
    const [playRecords, favorites, searchHistory] = await Promise.allSettled([
      fetchFromApi<Record<string, PlayRecord>>(`/api/playrecords`),
      fetchFromApi<Record<string, Favorite>>(`/api/favorites`),
      fetchFromApi<string[]>(`/api/searchhistory`),
    ]);

    if (playRecords.status === 'fulfilled') {
      cacheManager.cachePlayRecords(playRecords.value);
      window.dispatchEvent(
        new CustomEvent('playRecordsUpdated', {
          detail: playRecords.value,
        })
      );
    }

    if (favorites.status === 'fulfilled') {
      cacheManager.cacheFavorites(favorites.value);
      window.dispatchEvent(
        new CustomEvent('favoritesUpdated', {
          detail: favorites.value,
        })
      );
    }

    if (searchHistory.status === 'fulfilled') {
      cacheManager.cacheSearchHistory(searchHistory.value);
      window.dispatchEvent(
        new CustomEvent('searchHistoryUpdated', {
          detail: searchHistory.value,
        })
      );
    }
  } catch (err) {
    console.error('刷新緩存失敗:', err);
  }
}

/**
 * 獲取緩存狀態信息
 * 用於調試和監控緩存健康狀態
 */
export function getCacheStatus(): {
  hasPlayRecords: boolean;
  hasFavorites: boolean;
  hasSearchHistory: boolean;
  username: string | null;
} {
  if (STORAGE_TYPE === 'localstorage') {
    return {
      hasPlayRecords: false,
      hasFavorites: false,
      hasSearchHistory: false,
      username: null,
    };
  }

  const authInfo = getAuthInfoFromBrowserCookie();
  return {
    hasPlayRecords: !!cacheManager.getCachedPlayRecords(),
    hasFavorites: !!cacheManager.getCachedFavorites(),
    hasSearchHistory: !!cacheManager.getCachedSearchHistory(),
    username: authInfo?.username || null,
  };
}

// ---------------- React Hook 輔助類型 ----------------

export type CacheUpdateEvent =
  | 'playRecordsUpdated'
  | 'favoritesUpdated'
  | 'searchHistoryUpdated';

/**
 * 用於 React 組件監聽數據更新的事件監聽器
 * 使用方法：
 *
 * useEffect(() => {
 *   const unsubscribe = subscribeToDataUpdates('playRecordsUpdated', (data) => {
 *     setPlayRecords(data);
 *   });
 *   return unsubscribe;
 * }, []);
 */
export function subscribeToDataUpdates<T>(
  eventType: CacheUpdateEvent,
  callback: (data: T) => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleUpdate = (event: CustomEvent) => {
    callback(event.detail);
  };

  window.addEventListener(eventType, handleUpdate as EventListener);

  return () => {
    window.removeEventListener(eventType, handleUpdate as EventListener);
  };
}

/**
 * 預加載所有用戶數據到緩存
 * 適合在應用啟動時調用，提升後續訪問速度
 */
export async function preloadUserData(): Promise<void> {
  if (STORAGE_TYPE === 'localstorage') return;

  // 檢查是否已有有效緩存，避免重複請求
  const status = getCacheStatus();
  if (status.hasPlayRecords && status.hasFavorites && status.hasSearchHistory) {
    return;
  }

  // 後臺靜默預加載，不阻塞界面
  refreshAllCache().catch((err) => {
    console.warn('預加載用戶數據失敗:', err);
  });
}
