/* eslint-disable no-console,@typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';

import { getConfig } from '@/lib/config';
import { db } from '@/lib/db';

export const runtime = 'edge';

// 讀取存儲類型環境變量，默認 localstorage
const STORAGE_TYPE =
  (process.env.NEXT_PUBLIC_STORAGE_TYPE as
    | 'localstorage'
    | 'redis'
    | 'd1'
    | undefined) || 'localstorage';

// 生成簽名
async function generateSignature(
  data: string,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(data);

  // 導入密鑰
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // 生成簽名
  const signature = await crypto.subtle.sign('HMAC', key, messageData);

  // 轉換為十六進制字符串
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// 生成認證Cookie（帶簽名）
async function generateAuthCookie(username: string): Promise<string> {
  const authData: any = {
    username,
    timestamp: Date.now(),
  };

  // 使用process.env.PASSWORD作為簽名密鑰，而不是用戶密碼
  const signingKey = process.env.PASSWORD || '';
  const signature = await generateSignature(username, signingKey);
  authData.signature = signature;

  return encodeURIComponent(JSON.stringify(authData));
}

export async function POST(req: NextRequest) {
  try {
    // localstorage 模式下不支持註冊
    if (STORAGE_TYPE === 'localstorage') {
      return NextResponse.json(
        { error: '當前模式不支持註冊' },
        { status: 400 }
      );
    }

    const config = await getConfig();
    // 校驗是否開放註冊
    if (!config.UserConfig.AllowRegister) {
      return NextResponse.json({ error: '當前未開放註冊' }, { status: 400 });
    }

    const { username, password } = await req.json();

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: '用戶名不能為空' }, { status: 400 });
    }
    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: '密碼不能為空' }, { status: 400 });
    }

    // 檢查是否和管理員重複
    if (username === process.env.USERNAME) {
      return NextResponse.json({ error: '用戶已存在' }, { status: 400 });
    }

    try {
      // 檢查用戶是否已存在
      const exist = await db.checkUserExist(username);
      if (exist) {
        return NextResponse.json({ error: '用戶已存在' }, { status: 400 });
      }

      await db.registerUser(username, password);

      // 添加到配置中並保存
      config.UserConfig.Users.push({
        username,
        role: 'user',
      });
      await db.saveAdminConfig(config);

      // 註冊成功，設置認證cookie
      const response = NextResponse.json({ ok: true });
      const cookieValue = await generateAuthCookie(username);
      const expires = new Date();
      expires.setDate(expires.getDate() + 7); // 7天過期

      response.cookies.set('auth', cookieValue, {
        path: '/',
        expires,
        sameSite: 'lax', // 改為 lax 以支持 PWA
        httpOnly: false, // PWA 需要客戶端可訪問
        secure: false, // 根據協議自動設置
      });

      return response;
    } catch (err) {
      console.error('數據庫註冊失敗', err);
      return NextResponse.json({ error: '數據庫錯誤' }, { status: 500 });
    }
  } catch (error) {
    console.error('註冊接口異常', error);
    return NextResponse.json({ error: '服務器錯誤' }, { status: 500 });
  }
}
