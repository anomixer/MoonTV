import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST() {
  const response = NextResponse.json({ ok: true });

  // 清除認證cookie
  response.cookies.set('auth', '', {
    path: '/',
    expires: new Date(0),
    sameSite: 'lax', // 改為 lax 以支持 PWA
    httpOnly: false, // PWA 需要客戶端可訪問
    secure: false, // 根據協議自動設置
  });

  return response;
}
