# MoonTV

<div align="center">
  <img src="public/logo.png" alt="LibreTV Logo" width="120">
</div>

> 🎬 **MoonTV** 是一個開箱即用的、跨平台的影視聚合播放器。它基於 **Next.js 14** + **Tailwind CSS** + **TypeScript** 構建，支援多資源搜尋、線上播放、收藏同步、播放記錄、本機/雲端儲存，讓你可以隨時隨地暢享海量免費影視內容。

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-14-000?logo=nextdotjs)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-38bdf8?logo=tailwindcss)
![TypeScript](https://img.shields.io/badge/TypeScript-4.x-3178c6?logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green)
![Docker Ready](https://img.shields.io/badge/Docker-ready-blue?logo=docker)

</div>

---

## ✨ 功能特性

- 🔍 **多源聚合搜尋**：內建數十個免費資源站點，一次搜尋立即返回全源結果。
- 📄 **豐富詳情頁**：支援劇集列表、演員、年份、簡介等完整資訊展示。
- ▶️ **流暢線上播放**：整合 HLS.js & ArtPlayer。
- ❤️ **收藏 + 繼續觀看**：支援 Redis/D1/Upstash 儲存，多端同步進度。
- 📱 **PWA**：離線快取、安裝到桌面/主畫面，行動端原生體驗。
- 🌗 **響應式佈局**：桌面側邊欄 + 行動底部導覽，自適應各種螢幕尺寸。
- 🚀 **極簡部署**：一條 Docker 指令即可將完整服務跑起來，或免費部署到 Vercel 與 Cloudflare。
- 👿 **智慧去廣告**：自動跳過影片中的切片廣告（實驗性）

<details>
  <summary>點擊查看專案截圖</summary>
  <img src="public/screenshot1.png" alt="專案截圖" style="max-width:600px">
  <img src="public/screenshot2.png" alt="專案截圖" style="max-width:600px">
  <img src="public/screenshot3.png" alt="專案截圖" style="max-width:600px">
</details>

## 🗺 目錄

- [技術棧](#技術棧)
- [部署](#部署)
- [Docker Compose 最佳實踐](#docker-compose-最佳實踐)
- [環境變數](#環境變數)
- [設定說明](#設定說明)
- [管理員設定](#管理員設定)
- [AndroidTV 使用](#androidtv-使用)
- [Roadmap](#roadmap)
- [安全與隱私提醒](#安全與隱私提醒)
- [License](#license)
- [致謝](#致謝)

## 技術棧

| 分類      | 主要依賴                                                                                              |
| --------- | ----------------------------------------------------------------------------------------------------- |
| 前端框架  | [Next.js 14](https://nextjs.org/) · App Router                                                        |
| UI & 樣式 | [Tailwind CSS 3](https://tailwindcss.com/)                                                            |
| 語言      | TypeScript 4                                                                                          |
| 播放器    | [ArtPlayer](https://github.com/zhw2590582/ArtPlayer) · [HLS.js](https://github.com/video-dev/hls.js/) |
| 程式碼品質 | ESLint · Prettier · Jest                                                                              |
| 部署      | Docker · Cloudflare Pages                                                                             |

## 部署

本專案推薦使用 **Cloudflare Pages 或 Docker** 進行部署。

儲存支援矩陣

|               | Docker | Cloudflare |
| :-----------: | :----: | :--------: |
| localstorage  |   ✅   |     ✅     |
| 原生 redis    |   ✅   |            |
| Cloudflare D1 |        |     ✅     |
| Upstash Redis |   ☑️   |     ☑️     |

✅：經測試支援

☑️：理論上支援，未測試

除 localstorage 方式外，其他方式皆支援多帳戶、記錄同步與管理頁面

### Cloudflare 部署 (推薦)


**Cloudflare Pages 的環境變數儘量設定為密鑰而非純文字**

#### 普通部署（localstorage）

1. **Fork** 本倉庫到你的 GitHub 帳號。
2. 登入 [Cloudflare](https://cloudflare.com)，點擊 **計算（Workers）→ Workers 和 Pages**，點擊建立。
3. 選擇 Pages，匯入現有 Git 儲存庫，選擇 Fork 後的倉庫。
4. 建置指令填入 **pnpm install --frozen-lockfile && pnpm run pages:build**；預設框架為「無」，**建置輸出目錄**為 `.vercel/output/static`。
5. 保持預設設定完成首次部署。進入設定，將相容性旗標設定為 `nodejs_compat`（直接貼上即可）。
6. 首次部署完成後，進入設定新增 PASSWORD 密鑰（變數與機密），再重新部署。
7. 若需自訂 `config.json`，請直接修改 Fork 後倉庫中的該檔案。
8. 每次 Push 至 `main` 分支將自動觸發重新建置。

#### D1 支援

0. 完成普通部署並成功訪問。
1. 點擊 **儲存和資料庫 → D1 SQL 資料庫**，建立新的資料庫，名稱隨意。
2. 進入剛建立的資料庫，點擊左上角的 Explore Data，將 [D1 初始化](D1初始化.md) 內容貼到 Query 視窗後點擊 **Run All**，等待執行完成。
3. 回到你的 Pages 專案，進入 **設定 → 綁定**，新增綁定 D1 資料庫，選擇剛建立的資料庫，變數名稱填 **DB**。
4. 設定環境變數 NEXT_PUBLIC_STORAGE_TYPE 為 **d1**；設定 USERNAME 與 PASSWORD 作為站長帳號。
5. 重新部署。

### Docker 部署

#### 1. 直接執行（最簡單，localstorage）

```bash
# 拉取預建置映像
docker pull ghcr.io/senshinya/moontv:latest

# 執行容器
# -d: 背景執行  -p: 對應埠 3000 -> 3000
docker run -d --name moontv -p 3000:3000 --env PASSWORD=your_password ghcr.io/senshinya/moontv:latest
```

造訪 `http://伺服器 IP:3000` 即可。（需自行於伺服器控制台開放 `3000` 埠）

## Docker Compose 最佳實踐

若你使用 docker compose 部署，以下為部分 compose 範例

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
    # 若需自訂設定，可掛載檔案
    # volumes:
    #   - ./config.json:/app/config.json:ro
```

### Redis 版本（推薦，多帳戶資料隔離，跨裝置同步）

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
    # 若需自訂設定，可掛載檔案
    # volumes:
    #   - ./config.json:/app/config.json:ro
  moontv-redis:
    image: redis
    container_name: moontv-redis
    restart: unless-stopped
    networks:
      - moontv-network
    # 若需持久化
    # volumes:
    #   - ./data:/data
networks:
  moontv-network:
    driver: bridge
```

## 自動同步最近更改

建議在 fork 的倉庫中啟用本倉庫自帶的 GitHub Actions 自動同步功能（見 `.github/workflows/sync.yml`）。

若需手動同步主倉庫更新，也可以使用 GitHub 官方的 [Sync fork](https://docs.github.com/cn/github/collaborating-with-issues-and-pull-requests/syncing-a-fork) 功能。

## 環境變數

| 變數                              | 說明                                         | 可選值                           | 預設值                                                                                                                     |
| --------------------------------- | -------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| USERNAME                          | 非 localstorage 部署時的管理員帳號           | 任意字串                         | （空）                                                                                                                     |
| PASSWORD                          | 非 localstorage 部署時為管理員密碼           | 任意字串                         | （空）                                                                                                                     |
| SITE_NAME                         | 站點名稱                                     | 任意字串                         | MoonTV                                                                                                                     |
| ANNOUNCEMENT                      | 站點公告                                     | 任意字串                         | 本網站僅提供影視搜尋服務，所有內容均來自第三方網站。本站不儲存任何影片資源，不對任何內容之準確性、合法性、完整性負責。 |
| NEXT_PUBLIC_STORAGE_TYPE          | 播放記錄/收藏的儲存方式                      | localstorage、redis、d1、upstash | localstorage                                                                                                               |
| REDIS_URL                         | redis 連線 URL                               | 連線 URL                         | 空                                                                                                                         |
| UPSTASH_URL                       | upstash redis 連線 URL                       | 連線 URL                         | 空                                                                                                                         |
| UPSTASH_TOKEN                     | upstash redis 連線 Token                     | 連線 Token                       | 空                                                                                                                         |
| NEXT_PUBLIC_ENABLE_REGISTER       | 是否開放註冊（僅非 localstorage 有效）       | true / false                     | false                                                                                                                      |
| NEXT_PUBLIC_SEARCH_MAX_PAGE       | 搜尋介面可拉取的最大頁數                     | 1-50                             | 5                                                                                                                          |
| NEXT_PUBLIC_IMAGE_PROXY           | 預設的瀏覽器端圖片代理                       | URL 前綴                         | （空）                                                                                                                     |
| NEXT_PUBLIC_DOUBAN_PROXY          | 預設的瀏覽器端豆瓣資料代理                   | URL 前綴                         | （空）                                                                                                                     |
| NEXT_PUBLIC_DISABLE_YELLOW_FILTER | 關閉色情內容過濾                             | true/false                       | false                                                                                                                      |

## 設定說明

所有可自訂項集中在根目錄的 `config.json`：

```json
{
  "cache_time": 7200,
  "api_site": {
    "dyttzy": {
      "api": "http://caiji.dyttzyapi.com/api.php/provide/vod",
      "name": "電影天堂資源",
      "detail": "http://caiji.dyttzyapi.com"
    }
    // ...更多站點
  },
  "custom_category": [
    {
      "name": "華語",
      "type": "movie",
      "query": "華語"
    }
  ]
}
```

- `cache_time`：介面快取時間（秒）。
- `api_site`：你可以增刪或替換任何資源站，欄位說明：
  - `key`：唯一識別，保持小寫字母/數字。
  - `api`：資源站提供的 `vod` JSON API 根地址。
  - `name`：在介面中顯示的名稱。
  - `detail`：（可選）部分無法透過 API 取得劇集詳情的站點，需要提供網頁詳情根 URL，用於擷取。
- `custom_category`：自訂分類設定，用於在導覽中新增個人化影視分類。以 type + query 作為唯一識別。支援以下欄位：
  - `name`：分類顯示名稱（可選，如不提供則使用 query 作為顯示名）
  - `type`：分類型別，支援 `movie`（電影）或 `tv`（劇集）
  - `query`：搜尋關鍵字，用於在豆瓣 API 中搜尋相關內容

custom_category 支援的自訂分類已知如下：

- movie：熱門、最新、經典、豆瓣高分、冷門佳片、華語、歐美、韓國、日本、動作、喜劇、愛情、科幻、懸疑、恐怖、治癒
- tv：熱門、美劇、英劇、韓劇、日劇、國產劇、港劇、日本動畫、綜藝、紀錄片

也可輸入如「哈利波特」，效果等同於豆瓣搜尋

MoonTV 支援標準的蘋果 CMS V10 API 格式。

修改後 **無需重新建置**，服務會在啟動時讀取一次。

## 管理員設定

**該特性目前僅支援透過非 localstorage 儲存的部署方式使用**

支援在執行時動態變更服務設定

設定環境變數 USERNAME 與 PASSWORD 即為站長使用者，站長可設定使用者為管理員

站長或管理員訪問 `/admin` 即可進行管理員設定

## AndroidTV 使用

目前該專案可以配合 [OrionTV](https://github.com/zimplexing/OrionTV) 在 Android TV 上使用，可以直接作為 OrionTV 後端

暫時收藏夾與播放記錄和網頁端隔離，後續會支援同步使用者資料

## Roadmap

- [x] 深色模式
- [x] 持久化儲存
- [x] 多帳戶

## 安全與隱私提醒

### 請設定密碼保護並關閉公網註冊

為了您的安全與避免潛在法律風險，我們要求在部署時設定密碼保護並**強烈建議關閉公網註冊**：

- **避免公開訪問**：未設定密碼的實例任何人都可以訪問，可能被惡意利用
- **防範版權風險**：公開的影片搜尋服務可能面臨版權方的投訴舉報
- **保護個人隱私**：設定密碼可以限制訪問範圍，保護您的使用記錄

### 部署要求

1. **設定環境變數 `PASSWORD`**：為您的實例設定一個強密碼
2. **僅供個人使用**：請勿將您的實例連結公開分享或傳播
3. **遵守當地法律**：請確保您的使用行為符合當地法律法規

### 重要聲明

- 本專案僅供學習與個人使用
- 請勿將部署的實例用於商業用途或公開服務
- 如因公開分享導致的任何法律問題，使用者需自行承擔責任
- 專案開發者不對使用者的使用行為承擔任何法律責任

## License

[MIT](LICENSE) © 2025 MoonTV & Contributors

## 致謝

- [ts-nextjs-tailwind-starter](https://github.com/theodorusclarence/ts-nextjs-tailwind-starter) — 專案最初基於該腳手架。
- [LibreTV](https://github.com/LibreSpark/LibreTV) — 受到啟發，站在巨人肩膀上。
- [ArtPlayer](https://github.com/zhw2590582/ArtPlayer) — 強大的網頁影片播放器。
- [HLS.js](https://github.com/video-dev/hls.js) — 讓瀏覽器支援 HLS 串流播放。
- 感謝所有提供免費影視介面之站點。
