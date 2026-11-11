# GitHub 发布指南

> 不想用命令行 git：也可以把本仓库目录里的内容拖到 GitHub 网页。仓库已包含默认演示素材 `assets/bg-main.mp4`、`assets/bg-4k.mp4`、`assets/cat.png`（约 71MB，单文件均低于 GitHub 100MB 限制）；`backup/`、`dist/`、`node_modules/` 与 `assets/uploads/` 不会进仓库。**不要**直接把开发工作目录整个拖上去，以免带上备份、临时文件和用户上传。

## 前置：准备 git

任选一种安装方式（GitHub Desktop 自带 git；没有管理员权限时也可用便携版）：

```powershell
winget install --id Git.Git -e --source winget
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

完整版会带上默认素材：

```text
assets/bg-main.mp4   37MB
assets/bg-4k.mp4     33MB
assets/cat.png      0.5MB
```

`.gitignore` 仍然排除 `node_modules/`、`backup/`、`dist/`、`*.zip`、`diag.log`、`assets/uploads/` 以及除上述三个文件外的 `assets/*`。自加的其它壁纸不会被提交。`assets/uploads/` 属于**用户数据**（皮肤运行时上传的壁纸），不属于发布包；发布或迁移时请单独保留/备份。

约 **71MB**，单文件都低于 GitHub 100MB 限制。素材版权归各自权利方；只想要轻量代码仓库时，删除这三个文件再提交即可。`vendor/webwallgl/` 是 MIT 的 WebWallGL 3.0，随包分发请保留其 `LICENSE` 与 `README.upstream.md`。

## 三、本地验证

```powershell
cd <本仓库目录>
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
cd <本仓库目录>
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

## 公开仓库版本命名（CI 契约）

> 适用于 `github-upload/`（GitHub 镜像仓库）。`.github/workflows/check.yml` 的 `package (tag)` 任务会校验 **tag 必须等于 `v` + package.json 的 version**；不匹配会让 tag 的 CI 变红，也不会上传发行包。

- **内部仓库 `tianlight/`** 使用内部版本号（v1.6.x），内部 tag 继续按内部版本打。
- **公开仓库（GitHub 镜像）** 使用公开版本号（v1.0.x）：改**三处**发布标记——`package.json` / `skin.json` / `lib/index.js` 的 `BUILD`——然后重新 `node tools/build.mjs` 生成 `lib/client.js`；同时写入 `INTERNAL-BUILD.json` 记录对应的内部版本/tag/内部构建 sha，避免追溯困难。**`HOST_API`（宿主/客户端路由契约握手）是手改的路由版本，发布工具不改它**：公开/内部构建说同一个路由契约；原 `src/10-constants.js` 的 `HOST_BUILD` 已由 `HOST_API` 取代并在发布时保持不动。
- 公开 tag 与公开版本一一对应（例如 tag `v1.0.1` ↔ package version `1.0.1`），这样 CI 的 static + package 两个 job 全绿，并自动产出 `dist/` 发行包 artifact。
- 内部 tag（如 `v1.6.2`）也可以留在公开仓库里作为构建来源记录，它们的 CI 同样通过（tag 等于其所在提交的包版本）。

### 一条命令生成公开构建

```powershell
# 在公开镜像 checkout 里执行（先由内部仓库同步 tracked 文件）
node tools/public-release.mjs --dir <镜像目录> --version 1.0.2 --internal-version 1.6.3 --internal-tag v1.6.3 --internal-sha <内部 client 的 sha256>
```

该工具会改**三处**发布标记（`package.json` / `skin.json` / `lib/index.js` 的 `BUILD`；`HOST_API` 不碰）、写入 `INTERNAL-BUILD.json`、重新构建 `lib/client.js`（一致性校验：产物必须由被改过的源码生成），并打印后续的静态链、`node tools/pack.mjs`、commit/tag/push 命令（工具本身不执行 git）。

### 为什么这样做

- CI 的 tag/version 契约保证"发出去的 tag 一定能打包、包版本和 tag 一致"，用户从 tag 安装不会拿到版本错位的包。
- 内部迭代仍用 v1.6.x 连续编号，公开版本用 v1.0.x 独立编号，两者通过 `INTERNAL-BUILD.json` 与 release notes 互相映射。
### 公开 Release 自动创建

.github/workflows/release.yml 会在每次 push 到 main 时运行（也可手动 workflow_dispatch）：它扫描仓库根目录的 RELEASE-NOTES-v*.md，对每个已存在的 tag 用仓库自带的 GITHUB_TOKEN 调用 gh release create 创建 GitHub Release（标题取文件第一行、正文用文件内容），已存在的 Release 自动跳过。

- 发布新公开版本时：把 diag/tmp/github-release-v<公开版本>.md 复制到镜像仓库根目录并命名为 RELEASE-NOTES-v<公开版本>.md，随本次 push 一起提交，Release 会自动建好。
- 补建历史 Release：把对应 RELEASE-NOTES-*.md 放进镜像根目录后 push 一次 main（或手动 dispatch）即可，幂等。
- 该流程只需要仓库自身的 Actions token，不需要维护者提供个人 token。
