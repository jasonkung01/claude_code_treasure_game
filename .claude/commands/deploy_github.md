把目前本機的專案建置後部署到 GitHub Pages，完成後回傳可瀏覽的網址 URL。

請依序執行以下步驟，任一步驟失敗就停下來回報原因，不要硬往下做。不要替使用者建立 GitHub 帳號或repo，也不要代替使用者完成登入。

1. **確認 git 倉庫與 remote**
   - 執行 `git rev-parse --is-inside-work-tree`。若不是 git 倉庫，停止並告訴使用者：本專案尚未初始化 git，需要先提供 GitHub repo 網址（例如 `https://github.com/<帳號>/<repo>.git`），確認後再執行 `git init` 與 `git remote add origin <網址>`。
   - 執行 `git remote get-url origin`。若沒有 origin，同上停止並詢問。
   - 從 origin 解析出 `<帳號>` 與 `<repo>`（支援 https 與 ssh 格式）。

2. **確認推送權限**
   - 執行 `git ls-remote origin` 確認可以連到 remote。
   - 若失敗（常見原因為未登入或權限不足），停止並提示使用者在 Claude Code 輸入對應的登入指令，例如：
     `! gh auth login`（需先安裝 GitHub CLI），或設定好 Git 的憑證後再重新執行 `/deploy_github`。

3. **確認 npm 依賴**
   - 若 `node_modules/` 不存在，執行 `npm install`。

4. **以正確的 base 路徑建置**
   - GitHub Pages 專案站點的網址是 `https://<帳號>.github.io/<repo>/`，因此建置時必須帶入 base 路徑：
     `VITE_BASE=/<repo>/ npm run build`
   - `vite.config.ts` 已讀取 `VITE_BASE`，未設定時為 `/`（給 Vercel 用，不要改動）。
   - 建置完成後確認 `build/index.html` 內的資源路徑以 `/<repo>/assets/` 開頭。若不是，停止並回報。

5. **部署到 gh-pages 分支**
   - 執行 `npx gh-pages -d build -m "Deploy to GitHub Pages"`。
   - 這會把 `build/` 的內容推送到 remote 的 `gh-pages` 分支，不會動到 main 分支的原始碼。
   - 若出現錯誤，完整回報錯誤訊息，不要修改 `package.json`。

6. **確認 GitHub Pages 來源設定（僅首次需要）**
   - 若已安裝 GitHub CLI，執行 `gh api repos/<帳號>/<repo>/pages` 查看設定。
   - 若 Pages 尚未啟用，或來源不是 `gh-pages` 分支，提示使用者到 GitHub 的 **Settings → Pages**，將 Source 設為 **Deploy from a branch**，Branch 選 **gh-pages**、資料夾選 **/ (root)**。這一步需要使用者自己在網頁上操作。

7. **回傳結果**
   - 網址為 `https://<帳號>.github.io/<repo>/`。
   - 首次部署後 GitHub Pages 可能需要 1–5 分鐘才會生效。用 `curl -I` 檢查回應是否為 `200`，若為 404 請等待後再試一次，並向使用者說明狀況。
   - 回覆使用者時，直接附上可點擊的網址。

## 注意事項（請在回覆中告知使用者）

- 後端 `server/index.mjs` 是 Express + 本機 SQLite，GitHub Pages 只提供靜態檔案，無法執行後端。部署後的網站只能以**訪客模式**遊玩，登入與分數儲存的 `/api` 呼叫會失敗（前端會自動進入訪客模式）。
- 每次重新部署只要再執行 `/deploy_github`，不需要重新設定 Pages。
- 若部署失敗，請附上完整錯誤訊息回報，不要自行修改 `package.json` 或 `vite.config.ts` 以外的檔案。

$ARGUMENTS
