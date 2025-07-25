/* eslint-disable @typescript-eslint/no-explicit-any,no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { getStorage } from '@/lib/db';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
  if (storageType === 'localstorage') {
    return NextResponse.json(
      {
        error: '不支持本地存儲進行管理員配置',
      },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();

    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const username = authInfo.username;

    const {
      SiteName,
      Announcement,
      SearchDownstreamMaxPage,
      SiteInterfaceCacheTime,
      ImageProxy,
    } = body as {
      SiteName: string;
      Announcement: string;
      SearchDownstreamMaxPage: number;
      SiteInterfaceCacheTime: number;
      ImageProxy: string;
    };

    // 參數校驗
    if (
      typeof SiteName !== 'string' ||
      typeof Announcement !== 'string' ||
      typeof SearchDownstreamMaxPage !== 'number' ||
      typeof SiteInterfaceCacheTime !== 'number' ||
      typeof ImageProxy !== 'string'
    ) {
      return NextResponse.json({ error: '參數格式錯誤' }, { status: 400 });
    }

    const adminConfig = await getConfig();
    const storage = getStorage();

    // 權限校驗
    if (username !== process.env.USERNAME) {
      // 管理員
      const user = adminConfig.UserConfig.Users.find(
        (u) => u.username === username
      );
      if (!user || user.role !== 'admin') {
        return NextResponse.json({ error: '權限不足' }, { status: 401 });
      }
    }

    // 更新緩存中的站點設置
    adminConfig.SiteConfig = {
      SiteName,
      Announcement,
      SearchDownstreamMaxPage,
      SiteInterfaceCacheTime,
      ImageProxy,
    };

    // 寫入數據庫
    if (storage && typeof (storage as any).setAdminConfig === 'function') {
      await (storage as any).setAdminConfig(adminConfig);
    }

    return NextResponse.json(
      { ok: true },
      {
        headers: {
          'Cache-Control': 'no-store', // 不緩存結果
        },
      }
    );
  } catch (error) {
    console.error('更新站點配置失敗:', error);
    return NextResponse.json(
      {
        error: '更新站點配置失敗',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
