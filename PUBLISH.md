# GitHub 发布指南

> 不想装 git：直接用 `D:\DeepSeek Harness(2)\github-upload` 里的内容拖到 GitHub 网页。该目录已排除 `assets/` 视频、`backup/`、`dist/`，约 2MB；不要直接拖整个 `skin-tianlight/`，否则 33–37MB 的视频会超过网页单文件限制。

## 前置：安装 git

这台机器目前**没有 git**。任选一种：

```powershell
winget install --id Git.Git -e --source winget      # 推荐
# 或者安装 GitHub Desktop（图形化，自带 git）
```

装完重开终端，确认：`git --version`

## 一、仓库地址

`package.json` 里已移除原先的 `OWNER` 占位仓库字段，避免推上去后首页链接 404。想加仓库元数据，再补：

```json
"repository": { "type": "git", "url": "git+https://github.com/<你的用户名>/dsh-client-ui-skin-tianlight.git" },
"homepage": "https://github.com/<你的用户名>/dsh-client-ui-skin-tianlight#readme",
"bugs": { "url": "https://github.com/<你的用户名>/dsh-client-ui-skin-tianlight/issues" }
```

## 二、确认要提交什么

`.gitignore` 已排除：`node_modules/`、`backup/`、`dist/`、`*.zip`、`diag.log`、**`assets/` 里的素材**（只保留 `assets/README.md`）。

所以仓库里只有代码与文档（`lib/` 产物 + `src/` 源码 + `tools/` + `vendor/webwallgl/`），约 **1.5 MB**，不含视频和桌宠图——这既是为了仓库轻量，也是因为素材版权归各自权利方。`vendor/webwallgl/` 是 MIT 的 WebWallGL 3.0，随包分发请保留其 `LICENSE` 与 `README.upstream.md`。

想连素材一起传（自己承担版权责任）：删掉 `.gitignore` 里这两行

```gitignore
assets/*
!assets/README.md
```

## 三、本地验证

```powershell
cd "D:\DeepSeek Harness(2)\skin-tianlight"
node tools/build.mjs --check
node tools/test.mjs
node tools/structure.mjs --strict
node tools/audit.mjs
node tools/check-css.mjs
node tools/verify.mjs
```

或者一条：`npm run check`（不需要 DSH 安装，CI 里跑的就是它）

## 四、建库并推送

在 GitHub 网页上新建一个**空仓库**（不要勾选 README / .gitignore / license，本地已有），然后：

```powershell
cd "D:\DeepSeek Harness(2)\skin-tianlight"
git init -b main
git add .
git status                    # 看一眼：应当没有 assets/*.mp4、没有 backup/、没有 node_modules
git commit -m "feat: tianlight skin for DSH web"
git remote add origin https://github.com/<你的用户名>/dsh-client-ui-skin-tianlight.git
git push -u origin main
```

首次推送会要求认证：用 **Personal Access Token**（GitHub → Settings → Developer settings → Tokens）当密码，或提前装好 Git Credential Manager。

## 五、推上去之后会自动发生什么

`.github/workflows/check.yml` 会在每次 push / PR 时用 Node 20 跑 `npm run check`：

```
test → structure → audit → check-css → verify
```

任何一项退化，仓库首页会直接显示红叉。这条 CI 不需要 DSH，所以云端也能跑；需要 DSH 的两项（`upgrade-check`、`resolve-selectors`）留在本地 `npm run upgrade`。

## 六、之后的每一次改动

```powershell
npm run check                 # 先确保没退化
git add -A
git commit -m "fix: ..."
git push
```

DSH 升级后额外跑一次：

```powershell
npm run upgrade               # upgrade-check + resolve-selectors
```

## 不建议做的事

- **不要让仓库包含 `backup/`**：那是本机快照，会把 100+ KB 的历史副本带进 Git 历史，且每次改都快照
- **不要把临时日志带进仓库**：诊断路由已移除；旧目录里的 `diag.log` 也请忽略
- **不要把 `node_modules/` 里的链接提交**：那是 junction/symlink，推上去会变成指向本机路径的坏链接
