import { AdminConfig } from './admin.types';

// 播放記錄數據結構
export interface PlayRecord {
  title: string;
  source_name: string;
  cover: string;
  year: string;
  index: number; // 第幾集
  total_episodes: number; // 總集數
  play_time: number; // 播放進度（秒）
  total_time: number; // 總進度（秒）
  save_time: number; // 記錄保存時間（時間戳）
  search_title: string; // 搜索時使用的標題
}

// 收藏數據結構
export interface Favorite {
  source_name: string;
  total_episodes: number; // 總集數
  title: string;
  year: string;
  cover: string;
  save_time: number; // 記錄保存時間（時間戳）
  search_title: string; // 搜索時使用的標題
}

// 存儲接口
export interface IStorage {
  // 播放記錄相關
  getPlayRecord(userName: string, key: string): Promise<PlayRecord | null>;
  setPlayRecord(
    userName: string,
    key: string,
    record: PlayRecord
  ): Promise<void>;
  getAllPlayRecords(userName: string): Promise<{ [key: string]: PlayRecord }>;
  deletePlayRecord(userName: string, key: string): Promise<void>;

  // 收藏相關
  getFavorite(userName: string, key: string): Promise<Favorite | null>;
  setFavorite(userName: string, key: string, favorite: Favorite): Promise<void>;
  getAllFavorites(userName: string): Promise<{ [key: string]: Favorite }>;
  deleteFavorite(userName: string, key: string): Promise<void>;

  // 用戶相關
  registerUser(userName: string, password: string): Promise<void>;
  verifyUser(userName: string, password: string): Promise<boolean>;
  // 檢查用戶是否存在（無需密碼）
  checkUserExist(userName: string): Promise<boolean>;
  // 修改用戶密碼
  changePassword(userName: string, newPassword: string): Promise<void>;
  // 刪除用戶（包括密碼、搜索歷史、播放記錄、收藏夾）
  deleteUser(userName: string): Promise<void>;

  // 搜索歷史相關
  getSearchHistory(userName: string): Promise<string[]>;
  addSearchHistory(userName: string, keyword: string): Promise<void>;
  deleteSearchHistory(userName: string, keyword?: string): Promise<void>;

  // 用戶列表
  getAllUsers(): Promise<string[]>;

  // 管理員配置相關
  getAdminConfig(): Promise<AdminConfig | null>;
  setAdminConfig(config: AdminConfig): Promise<void>;
}

// 搜索結果數據結構
export interface SearchResult {
  id: string;
  title: string;
  poster: string;
  episodes: string[];
  source: string;
  source_name: string;
  class?: string;
  year: string;
  desc?: string;
  type_name?: string;
  douban_id?: number;
}

// 豆瓣數據結構
export interface DoubanItem {
  id: string;
  title: string;
  poster: string;
  rate: string;
  year: string;
}

export interface DoubanResult {
  code: number;
  message: string;
  list: DoubanItem[];
}
