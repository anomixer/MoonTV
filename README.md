# MoonTV

<div align="center">
  <img src="public/logo.png" alt="LibreTV Logo" width="120">
</div>

> 🎬 **MoonTV** 是一個開箱即用的、跨平台的影視聚合播放器。它基於 **Next.js 14** + **Tailwind&nbsp;CSS** + **TypeScript** 構建，支援多資源搜尋、線上播放、收藏同步、播放記錄、本地/雲端儲存，讓你可以隨時隨地暢享海量免費影視內容。

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-14-000?logo=nextdotjs)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-38bdf8?logo=tailwindcss)
![TypeScript](https://img.shields.io/badge/TypeScript-4.x-3178c6?logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green)
![Docker Ready](https://img.shields.io/badge/Docker-ready-blue?logo=docker)

</div>

---

## ✨ 功能特性

- 🔍 **多源聚合搜尋**：內建數十個免費資源站點，一次搜尋立刻返回全源結果。
- 📄 **豐富詳情頁**：支援劇集列表、演員、年份、簡介等完整資訊展示。
- ▶️ **流暢線上播放**：整合 HLS.js & ArtPlayer。
- ❤️ **收藏 + 繼續觀看**：支援 Redis/D1 儲存，多端同步進度。
- 📱 **PWA**：離線快取、安裝到桌面/主屏，行動端原生體驗。
- 🌗 **響應式佈局**：桌面側邊欄 + 行動底部導覽，自適應各種螢幕尺寸。
- 🚀 **極簡部署**：一條 Docker 命令即可將完整服務跑起來，或免費部署到 Vercel 和 Cloudflare。
- 👿 **智慧去廣告**：自動跳過影片中的切片廣告（實驗性）

<details>
  <summary>點選檢視專案截圖</summary>
  <img src="public/screenshot.png" alt="專案截圖" style="max-width:600px">
</details>

## 🗺 目錄

- [技術棧](#技術棧)
- [部署](#部署)
- [Docker Compose 最佳實踐](#Docker-Compose-最佳實踐)
- [環境變數](#環境變數)
- [配置說明](#配置說明)
- [管理員配置](#管理員配置)
- [AndroidTV 使用](#AndroidTV-使用)
- [Roadmap](#roadmap)
- [安全與隱私提醒](#安全與隱私提醒)

## 技術棧

| 分類      | 主要依賴                                                                                              |
| --------- | ----------------------------------------------------------------------------------------------------- |
| 前端框架  | [Next.js 14](https://nextjs.org/) · App Router                                                        |
| UI & 樣式 | [Tailwind&nbsp;CSS 3](https://tailwindcss.com/)                                                       |
| 語言      | TypeScript 4                                                                                          |
| 播放器    | [ArtPlayer](https://github.com/zhw2590582/ArtPlayer) · [HLS.js](https://github.com/video-dev/hls.js/) |
| 程式碼品質  | ESLint · Prettier · Jest                                                                              |
| 部署      | Docker · Vercel · CloudFlare pages                                                                    |

## 部署

本專案**支援 Vercel、Docker 和 Cloudflare** 部署。

儲存支援矩陣

|               | Docker | Vercel | Cloudflare |
| :-----------: | :----: | :----: | :--------: |
| localstorage  |   ✅   |   ✅   |     ✅     |
|  原生 redis   |   ✅   |        |            |
| Cloudflare D1 |        |        |     ✅     |
| Upstash Redis |   ☑️   |   ✅   |     ☑️     |

✅：經測試支援

☑️：理論上支援，未測試

除 localstorage 方式外，其他方式都支援多賬戶、記錄同步和管理頁面

### Vercel 部署

#### 普通部署（localstorage）

1. **Fork** 本倉庫到你的 GitHub 賬戶。
2. 登陸 [Vercel](https://vercel.com/)，點選 **Add New → Project**，選擇 Fork 後的倉庫。
3. （強烈建議）設定 PASSWORD 環境變數。
4. 保持預設設定完成首次部署。
5. 如需自定義 `config.json`，請直接修改 Fork 後倉庫中該檔案。
6. 每次 Push 到 `main` 分支將自動觸發重新構建。

部署完成後即可通過分配的域名訪問，也可以繫結自定義域名。

#### Upstash Redis 支援

0. 完成普通部署並成功訪問。
1. 在 [upstash](https://upstash.com/) 註冊賬號並新建一個 Redis 例項，名稱任意。
2. 複製新資料庫的 **HTTPS ENDPOINT 和 TOKEN**
3. 返回你的 Vercel 專案，新增環境變數 **UPSTASH_URL 和 UPSTASH_TOKEN**，值為第二步複製的 endpoint 和 token
4. 設定環境變數 NEXT_PUBLIC_STORAGE_TYPE，值為 **upstash**；設定 USERNAME 和 PASSWORD 作為站長賬號
5. 重試部署

### Cloudflare 部署

**Cloudflare Pages 的環境變數儘量設定為祕鑰而非文字**

#### 普通部署（localstorage）

1. **Fork** 本倉庫到你的 GitHub 賬戶。
2. 登陸 [Cloudflare](https://cloudflare.com)，點選 **計算（Workers）-> Workers 和 Pages**，點選建立
3. 選擇 Pages，匯入現有的 Git 儲存庫，選擇 Fork 後的倉庫
4. 構建命令填寫 **pnpm install --frozen-lockfile && pnpm run pages:build**，預設框架為無，構建輸出目錄為 `.vercel/output/static`
5. 保持預設設定完成首次部署。進入設定，將相容性標誌設定為 `nodejs_compat`
6. （強烈建議）首次部署完成後進入設定，新增 PASSWORD 祕鑰（變數和機密下），而後重試部署。
7. 如需自定義 `config.json`，請直接修改 Fork 後倉庫中該檔案。
8. 每次 Push 到 `main` 分支將自動觸發重新構建。

#### D1 支援

0. 完成普通部署並成功訪問
1. 點選 **儲存和資料庫 -> D1 SQL 資料庫**，建立一個新的資料庫，名稱隨意
2. 進入剛建立的資料庫，點選左上角的 Explore Data，將[D1 初始化](D1初始化.md) 中的內容貼上到 Query 視窗後點選 **Run All**，等待執行完成
3. 返回你的 pages 專案，進入 **設定 -> 繫結**，新增繫結 D1 資料庫，選擇你剛建立的資料庫，變數名稱填 **DB**
4. 設定環境變數 NEXT_PUBLIC_STORAGE_TYPE，值為 **d1**；設定 USERNAME 和 PASSWORD 作為站長賬號
5. 重試部署

### Docker 部署

#### 1. 直接執行（最簡單）

```bash
# 拉取預構建映象
docker pull ghcr.io/senshinya/moontv:latest

# 執行容器
# -d: 後臺執行  -p: 對映埠 3000 -> 3000
docker run -d --name moontv -p 3000:3000 ghcr.io/senshinya/moontv:latest
```

訪問 `http://伺服器 IP:3000` 即可。（需自行到伺服器控制檯放通 `3000` 埠）

## Docker Compose 最佳實踐

若你使用 docker compose 部署，以下是一些 compose 示例

### local storage 版本

```yaml
services:
  moontv:
    image: ghcr.io/senshinya/moontv:latest
    container_name: moontv
    restart: unless-stopped
    ports:
      - '3000:3000'
    environment:
      - PASSWORD=your_password
    # 如需自定義配置，可掛載檔案
    # volumes:
    #   - ./config.json:/app/config.json:ro
```

### Redis 版本（推薦，多賬戶資料隔離，跨裝置同步）

```yaml
services:
  moontv-core:
    image: ghcr.io/senshinya/moontv:latest
    container_name: moontv
    restart: unless-stopped
    ports:
      - '3000:3000'
    environment:
      - USERNAME=admin
      - PASSWORD=admin_password
      - NEXT_PUBLIC_STORAGE_TYPE=redis
      - REDIS_URL=redis://moontv-redis:6379
      - NEXT_PUBLIC_ENABLE_REGISTER=true
    networks:
      - moontv-network
    depends_on:
      - moontv-redis
    # 如需自定義配置，可掛載檔案
    # volumes:
    #   - ./config.json:/app/config.json:ro
  moontv-redis:
    image: redis
    container_name: moontv-redis
    restart: unless-stopped
    networks:
      - moontv-network
    # 如需持久化
    # volumes:
    #   - ./data:/data
networks:
  moontv-network:
    driver: bridge
```

## 自動同步最近更改

建議在 fork 的倉庫中啟用本倉庫自帶的 GitHub Actions 自動同步功能（見 `.github/workflows/sync.yml`）。

如需手動同步主倉庫更新，也可以使用 GitHub 官方的 [Sync fork](https://docs.github.com/cn/github/collaborating-with-issues-and-pull-requests/syncing-a-fork) 功能。

## 安全與隱私提醒

### 強烈建議設定密碼保護

為了您的安全和避免潛在的法律風險，我們**強烈建議**在部署時設定密碼保護：

- **避免公開訪問**：不設定密碼的例項任何人都可以訪問，可能被惡意利用
- **防範版權風險**：公開的影片搜尋服務可能面臨版權方的投訴舉報
- **保護個人隱私**：設定密碼可以限制訪問範圍，保護您的使用記錄

### 部署建議

1. **設定環境變數 `PASSWORD`**：為您的例項設定一個強密碼
2. **僅供個人使用**：請勿將您的例項連結公開分享或傳播
3. **遵守當地法律**：請確保您的使用行為符合當地法律法規