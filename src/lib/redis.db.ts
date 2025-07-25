/* eslint-disable no-console, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import { createClient, RedisClientType } from 'redis';

import { AdminConfig } from './admin.types';
import { Favorite, IStorage, PlayRecord } from './types';

// 搜索歷史最大條數
const SEARCH_HISTORY_LIMIT = 20;

// 添加Redis操作重試包裝器
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (err: any) {
      const isLastAttempt = i === maxRetries - 1;
      const isConnectionError =
        err.message?.includes('Connection') ||
        err.message?.includes('ECONNREFUSED') ||
        err.message?.includes('ENOTFOUND') ||
        err.code === 'ECONNRESET' ||
        err.code === 'EPIPE';

      if (isConnectionError && !isLastAttempt) {
        console.log(
          `Redis operation failed, retrying... (${i + 1}/${maxRetries})`
        );
        console.error('Error:', err.message);

        // 等待一段時間後重試
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));

        // 嘗試重新連接
        try {
          const client = getRedisClient();
          if (!client.isOpen) {
            await client.connect();
          }
        } catch (reconnectErr) {
          console.error('Failed to reconnect:', reconnectErr);
        }

        continue;
      }

      throw err;
    }
  }

  throw new Error('Max retries exceeded');
}

export class RedisStorage implements IStorage {
  private client: RedisClientType;

  constructor() {
    this.client = getRedisClient();
  }

  // ---------- 播放記錄 ----------
  private prKey(user: string, key: string) {
    return `u:${user}:pr:${key}`; // u:username:pr:source+id
  }

  async getPlayRecord(
    userName: string,
    key: string
  ): Promise<PlayRecord | null> {
    const val = await withRetry(() =>
      this.client.get(this.prKey(userName, key))
    );
    return val ? (JSON.parse(val) as PlayRecord) : null;
  }

  async setPlayRecord(
    userName: string,
    key: string,
    record: PlayRecord
  ): Promise<void> {
    await withRetry(() =>
      this.client.set(this.prKey(userName, key), JSON.stringify(record))
    );
  }

  async getAllPlayRecords(
    userName: string
  ): Promise<Record<string, PlayRecord>> {
    const pattern = `u:${userName}:pr:*`;
    const keys: string[] = await withRetry(() => this.client.keys(pattern));
    if (keys.length === 0) return {};
    const values = await withRetry(() => this.client.mGet(keys));
    const result: Record<string, PlayRecord> = {};
    keys.forEach((fullKey: string, idx: number) => {
      const raw = values[idx];
      if (raw) {
        const rec = JSON.parse(raw) as PlayRecord;
        // 截取 source+id 部分
        const keyPart = fullKey.replace(`u:${userName}:pr:`, '');
        result[keyPart] = rec;
      }
    });
    return result;
  }

  async deletePlayRecord(userName: string, key: string): Promise<void> {
    await withRetry(() => this.client.del(this.prKey(userName, key)));
  }

  // ---------- 收藏 ----------
  private favKey(user: string, key: string) {
    return `u:${user}:fav:${key}`;
  }

  async getFavorite(userName: string, key: string): Promise<Favorite | null> {
    const val = await withRetry(() =>
      this.client.get(this.favKey(userName, key))
    );
    return val ? (JSON.parse(val) as Favorite) : null;
  }

  async setFavorite(
    userName: string,
    key: string,
    favorite: Favorite
  ): Promise<void> {
    await withRetry(() =>
      this.client.set(this.favKey(userName, key), JSON.stringify(favorite))
    );
  }

  async getAllFavorites(userName: string): Promise<Record<string, Favorite>> {
    const pattern = `u:${userName}:fav:*`;
    const keys: string[] = await withRetry(() => this.client.keys(pattern));
    if (keys.length === 0) return {};
    const values = await withRetry(() => this.client.mGet(keys));
    const result: Record<string, Favorite> = {};
    keys.forEach((fullKey: string, idx: number) => {
      const raw = values[idx];
      if (raw) {
        const fav = JSON.parse(raw) as Favorite;
        const keyPart = fullKey.replace(`u:${userName}:fav:`, '');
        result[keyPart] = fav;
      }
    });
    return result;
  }

  async deleteFavorite(userName: string, key: string): Promise<void> {
    await withRetry(() => this.client.del(this.favKey(userName, key)));
  }

  // ---------- 用戶註冊 / 登錄 ----------
  private userPwdKey(user: string) {
    return `u:${user}:pwd`;
  }

  async registerUser(userName: string, password: string): Promise<void> {
    // 簡單存儲明文密碼，生產環境應加密
    await withRetry(() => this.client.set(this.userPwdKey(userName), password));
  }

  async verifyUser(userName: string, password: string): Promise<boolean> {
    const stored = await withRetry(() =>
      this.client.get(this.userPwdKey(userName))
    );
    if (stored === null) return false;
    return stored === password;
  }

  // 檢查用戶是否存在
  async checkUserExist(userName: string): Promise<boolean> {
    // 使用 EXISTS 判斷 key 是否存在
    const exists = await withRetry(() =>
      this.client.exists(this.userPwdKey(userName))
    );
    return exists === 1;
  }

  // 修改用戶密碼
  async changePassword(userName: string, newPassword: string): Promise<void> {
    // 簡單存儲明文密碼，生產環境應加密
    await withRetry(() =>
      this.client.set(this.userPwdKey(userName), newPassword)
    );
  }

  // 刪除用戶及其所有數據
  async deleteUser(userName: string): Promise<void> {
    // 刪除用戶密碼
    await withRetry(() => this.client.del(this.userPwdKey(userName)));

    // 刪除搜索歷史
    await withRetry(() => this.client.del(this.shKey(userName)));

    // 刪除播放記錄
    const playRecordPattern = `u:${userName}:pr:*`;
    const playRecordKeys = await withRetry(() =>
      this.client.keys(playRecordPattern)
    );
    if (playRecordKeys.length > 0) {
      await withRetry(() => this.client.del(playRecordKeys));
    }

    // 刪除收藏夾
    const favoritePattern = `u:${userName}:fav:*`;
    const favoriteKeys = await withRetry(() =>
      this.client.keys(favoritePattern)
    );
    if (favoriteKeys.length > 0) {
      await withRetry(() => this.client.del(favoriteKeys));
    }
  }

  // ---------- 搜索歷史 ----------
  private shKey(user: string) {
    return `u:${user}:sh`; // u:username:sh
  }

  async getSearchHistory(userName: string): Promise<string[]> {
    return withRetry(
      () => this.client.lRange(this.shKey(userName), 0, -1) as Promise<string[]>
    );
  }

  async addSearchHistory(userName: string, keyword: string): Promise<void> {
    const key = this.shKey(userName);
    // 先去重
    await withRetry(() => this.client.lRem(key, 0, keyword));
    // 插入到最前
    await withRetry(() => this.client.lPush(key, keyword));
    // 限制最大長度
    await withRetry(() => this.client.lTrim(key, 0, SEARCH_HISTORY_LIMIT - 1));
  }

  async deleteSearchHistory(userName: string, keyword?: string): Promise<void> {
    const key = this.shKey(userName);
    if (keyword) {
      await withRetry(() => this.client.lRem(key, 0, keyword));
    } else {
      await withRetry(() => this.client.del(key));
    }
  }

  // ---------- 獲取全部用戶 ----------
  async getAllUsers(): Promise<string[]> {
    const keys = await withRetry(() => this.client.keys('u:*:pwd'));
    return keys
      .map((k) => {
        const match = k.match(/^u:(.+?):pwd$/);
        return match ? match[1] : undefined;
      })
      .filter((u): u is string => typeof u === 'string');
  }

  // ---------- 管理員配置 ----------
  private adminConfigKey() {
    return 'admin:config';
  }

  async getAdminConfig(): Promise<AdminConfig | null> {
    const val = await withRetry(() => this.client.get(this.adminConfigKey()));
    return val ? (JSON.parse(val) as AdminConfig) : null;
  }

  async setAdminConfig(config: AdminConfig): Promise<void> {
    await withRetry(() =>
      this.client.set(this.adminConfigKey(), JSON.stringify(config))
    );
  }
}

// 單例 Redis 客戶端
function getRedisClient(): RedisClientType {
  const globalKey = Symbol.for('__MOONTV_REDIS_CLIENT__');
  let client: RedisClientType | undefined = (global as any)[globalKey];

  if (!client) {
    const url = process.env.REDIS_URL;
    if (!url) {
      throw new Error('REDIS_URL env variable not set');
    }

    // 創建客戶端，配置重連策略
    client = createClient({
      url,
      socket: {
        // 重連策略：指數退避，最大30秒
        reconnectStrategy: (retries: number) => {
          console.log(`Redis reconnection attempt ${retries + 1}`);
          if (retries > 10) {
            console.error('Redis max reconnection attempts exceeded');
            return false; // 停止重連
          }
          return Math.min(1000 * Math.pow(2, retries), 30000); // 指數退避，最大30秒
        },
        connectTimeout: 10000, // 10秒連接超時
        // 設置no delay，減少延遲
        noDelay: true,
      },
      // 添加其他配置
      pingInterval: 30000, // 30秒ping一次，保持連接活躍
    });

    // 添加錯誤事件監聽
    client.on('error', (err) => {
      console.error('Redis client error:', err);
    });

    client.on('connect', () => {
      console.log('Redis connected');
    });

    client.on('reconnecting', () => {
      console.log('Redis reconnecting...');
    });

    client.on('ready', () => {
      console.log('Redis ready');
    });

    // 初始連接，帶重試機制
    const connectWithRetry = async () => {
      try {
        await client!.connect();
        console.log('Redis connected successfully');
      } catch (err) {
        console.error('Redis initial connection failed:', err);
        console.log('Will retry in 5 seconds...');
        setTimeout(connectWithRetry, 5000);
      }
    };

    connectWithRetry();

    (global as any)[globalKey] = client;
  }

  return client;
}
