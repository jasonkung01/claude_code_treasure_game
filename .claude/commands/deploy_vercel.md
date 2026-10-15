把目前本機的專案打包並部署到 Vercel，完成後回傳可瀏覽的網址 URL。

請依序執行以下步驟，任一步驟失敗就停下來回報原因，不要硬往下做：

1. **確認專案可以建置**
   - 執行 `npm install`（若 `node_modules/` 不存在）。
   - 執行 `npm run build`，確認成功並產生 `build/` 目錄。
   - 注意：本專案的 Vite 輸出目錄是 `build/`，不是預設的 `dist/`。

2. **確認 `vercel.json` 設定**
   - 若專案根目錄沒有 `vercel.json`，建立一個，內容如下：
     ```json
     {
       "framework": "vite",
       "buildCommand": "npm run build",
       "outputDirectory": "build"
     }
     ```
   - 若已存在，確認 `outputDirectory` 為 `build`，不要覆寫其他設定。

3. **確認 `.gitignore` 包含 `.vercel`**
   - 若沒有，加入一行 `.vercel`，避免部署產生的專案連結資料被提交。

4. **確認 Vercel CLI 與登入狀態**
   - 執行 `npx vercel --version` 確認 CLI 可用（不需全域安裝）。
   - 執行 `npx vercel whoami`。若顯示未登入，停止並提示使用者在 Claude Code 輸入：
     `! npx vercel login`
     登入完成後再重新執行 `/deploy_vercel`。登入屬於互動流程，請不要代替使用者完成。

5. **部署到 Vercel（正式環境）**
   - 執行 `npx vercel --prod --yes`。
   - 首次部署若出現專案連結的互動提問，依預設值（Set up and deploy? yes，框架 Vite）處理，或改用 `--yes` 的預設設定。

6. **回傳結果**
   - 從部署輸出中找出 Production URL（通常為 `https://<專案名稱>.vercel.app`）。
   - 用 `curl -I <URL>` 確認回應為 `200`。
   - 回覆使用者時，直接附上可點擊的網址。

## 注意事項（請在回覆中告知使用者）

- 本專案的後端 `server/index.mjs` 是 Express + 本機 SQLite（`data/game.db`），Vercel 的 serverless 環境無法持久化該資料庫，也不會執行 `npm run server`。
  因此部署後的網站只能以**訪客模式**遊玩；登入、註冊與分數儲存的 `/api` 呼叫會失敗。前端對這些失敗已有預設處理（`/api/me` 失敗時直接進入訪客模式）。
- 若要讓登入與分數功能在線上運作，需另外把後端改寫為 Vercel Functions 並接上雲端資料庫，這不在本指令的範圍內。
- 若部署失敗，請附上完整錯誤訊息回報，不要自行修改 `package.json` 或 `vite.config.ts`。

$ARGUMENTS
