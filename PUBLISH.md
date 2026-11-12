# 发布指南（GitHub）

> 适用仓库：GitHub 公开仓库 `MilkySnowWay123/dsh-client-ui-skin-tianlight`（本机工作副本 `github-upload/`）。
> 内部开发树 `tianlight/` 在发布时同步同样的工具/文档改动；发布动作本身在公开仓库进行。

## 一、不可破坏的发布规则

1. **已发布的 tag 永不移动、永不重打、永不删除。** tag 一旦推送，任何内容变化都必须发**新的版本号**：发现问题就发 `2.0.1`，**不要**移动或重打 `2.0.0`。
2. **开发在 `dev` 分支进行；`main` 只包含已发布的代码。** 按源码安装的用户拿到的就是 `main` HEAD，所以 `main` 上不能有未发布提交。CI 的 `main-is-released` job 强制：push `main` 时 HEAD 必须正好是 `v<package.json 版本>` 这个 tag 指向的提交。
3. **tag 必须等于 `v` + `package.json` 的 `version`。** 发布 CI 在干净环境先校验这一条，不匹配直接失败。
4. **发布一律走 CI，且只使用一套打包工具**：`npm run check → node tools/pack.mjs → node tools/release-artifacts.mjs`。本地与 CI 用完全相同的工具，不存在第二套打包方式。

## 二、分支模型

| 分支 | 用途 | 允许的提交 |
|---|---|---|
| `dev` | 日常开发；**预发布**（`x.y.z-rc.N`）从这里切 | 功能 / 修复 / 文档；预发布 commit 与 tag |
| `main` | 只含已发布代码；**正式版**从这里切 | 仅发布 commit（由发布流程产生） |

- **预发布**（在 `dev`）：

  ```bash
  node tools/release.mjs --version 2.0.1-rc.1 --note-file notes.md
  git push origin dev
  git push origin v2.0.1-rc.1
  ```

- **正式版**：把 `dev` 合入 `main`（保留历史）→ 在 `main` 上：

  ```bash
  node tools/release.mjs patch --note-file notes.md
  git push origin main
  git push origin v2.0.1
  ```

- 发布工具会拒绝：稳定版跑在非 `main` 分支、预发布跑在非 `dev` 分支、目标 tag 已存在（本地**或远端**，只做一次只读 `git ls-remote`，`--offline` 可跳过）。
- **先推分支、再推 tag**：发布 CI 会校验稳定版 tag 可从 `origin/main` 追溯、预发布 tag 可从 `origin/dev` 追溯。

## 三、推送 `v*` tag 后 CI 做什么（干净环境）

`.github/workflows/release.yml`（`ubuntu-latest` + Node 20，无 npm 安装）：

1. 校验 tag == `v` + `package.json` version；稳定版必须可从 `origin/main` 追溯，预发布必须可从 `origin/dev` 追溯。
2. `npm run check`（build --check / test / structure --strict / audit / check-css / verify / i18n-audit）。
3. `node tools/pack.mjs` 生成安装目录（唯一打包入口）。
4. `node tools/release-artifacts.mjs --commit $GITHUB_SHA` 生成并校验 4 个附件。以下任一情况**CI 失败、不发布**：
   - 包内出现 `state/`、`assets/uploads/`、`assets/derived/`、`backup/`、`diag/`、`tools/`、`src/`、`node_modules/`、`.git`；
   - 包内文本文件出现本机路径（用户目录、非系统盘符路径、`/home/<user>/`、`/Users/<user>/`、`DeepSeek Harness(2)`）；
   - 包内 `package.json` 版本 ≠ tag 版本，或 HOST_API 在宿主/浏览器两半不一致；
   - 必需文件缺失（`lib/`、清单、`presets/`、`vendor/`、随包演示素材）。
5. 要求 `RELEASE-NOTES-v<版本>.md` 存在（Release 正文来源）。
6. `gh release create/edit`：标题取 notes 第一行；版本号含 `-` 时自动标记 **Pre-release**；上传 4 个附件（重复运行幂等，`--clobber`）。

分支/PR 的静态检查在 `.github/workflows/check.yml`（Node 20 + 22），另有 `main-is-released` 守卫。

## 四、Release 的 4 个附件

| 文件 | 说明 |
|---|---|
| `dsh-client-ui-skin-tianlight.tgz` | 不带版本号的安装包，供 `releases/latest/download/dsh-client-ui-skin-tianlight.tgz` 使用。注意：GitHub 的 latest 只指向最新**正式版**，预发布不会成为 latest |
| `dsh-client-ui-skin-tianlight-<版本>.tgz` | 与上面**同一份字节**的带版本副本 |
| `SHA256SUMS.txt` | 包内每个文件的 sha256 + 两个 tgz 自身的 sha256（每行 `<hash>  <path>`，包内路径相对包根） |
| `build-manifest.json` | `version` / `commit`（完整 git sha）/ `hostApi` / `clientSha256`（`lib/client.js` 的 sha256）/ `builtAt` |

tgz 内是单个 `dsh-client-ui-skin-tianlight/` 根目录，解压后即为插件目录（`package.json`、`skin.json`、`lib/`、`assets/`、`presets/`、`vendor/` …）。

## 五、本地复现与校验（与 CI 同款）

```powershell
npm run check
node tools/pack.mjs
# dist/release/ 下生成 4 个附件；--commit 默认取 $GITHUB_SHA 或 git rev-parse HEAD
node tools/release-artifacts.mjs
```

校验下载物（Windows）：

```powershell
Get-FileHash .\dsh-client-ui-skin-tianlight.tgz -Algorithm SHA256
# 与 SHA256SUMS.txt 中对应 tgz 行的值比较
```

校验下载物（Linux / macOS）：

```bash
# 在下载目录：只校验两个 tgz（包内文件路径此时不存在，--ignore-missing 跳过）
sha256sum -c --ignore-missing SHA256SUMS.txt
# 解压出插件目录后，在插件目录内：校验包内每个文件
cd dsh-client-ui-skin-tianlight && sha256sum -c ../SHA256SUMS.txt --ignore-missing
```

安装后的指纹（角色中枢 → 自检 / 反馈）应显示与 `build-manifest.json` 相同的 version / commit 短哈希 / clientSha256 前 12 位 / HOST_API；
`_fingerprint` 路由与 `build-manifest.json` 同源（`tools/pack.mjs` 写入包内 `build-info.json` 记录 commit）。

安装后的文件核对：用 Release 的 `SHA256SUMS.txt` 跑

```bash
node tools/verify-install.mjs <安装后的插件目录> SHA256SUMS.txt
```

输出 `完全一致：N/N 个文件…` 即通过；否则会列出 `MISMATCH` / `MISSING` / `EXTRA`（`state/`、`uploads/` 等用户数据会被忽略）。

## 六、发布到 npm（v2.0.2 起，推荐入口）

npm 包名 **dsh-client-ui-skin-tianlight**；包内容与 Release tarball 完全同源（都来自 `node tools/pack.mjs` 的 `dist/dsh-client-ui-skin-tianlight-<version>/`）。

1. 构建：`node tools/pack.mjs`。
2. 干跑：`node tools/npm-publish.mjs --dry-run`（校验包名/版本/非 private/repository/build-info=HEAD，并列出将上传的文件）。
3. 登录一次（本机）：`npm login`（浏览器/2FA）；CI 用 `NODE_AUTH_TOKEN`。
4. 上传：`node tools/npm-publish.mjs` → 发布 `dsh-client-ui-skin-tianlight@<version>` 到 registry.npmjs.org。
5. 验证：`npm view dsh-client-ui-skin-tianlight version`；可选 `npm pack dsh-client-ui-skin-tianlight@<version>` 后与 SHA256SUMS 比对。
6. npm 版本发布不可撤回（24h 内可 unpublish，尽量不用），所以先 `npm run check` 全绿、并确认要发的版本号后再上传。

> npm 上 `@dsh-external/...` 是链接安装约定、不可发布；v2.0.2 起包名统一为 `dsh-client-ui-skin-tianlight`，DSH bundle 名/浏览器模块 id/`skin.json.package` 同步修改。

## 七、安装方式（给用户）

1. 从 Release 下载 `.tgz` 与 `SHA256SUMS.txt`，按第五节校验。
2. `tar -xzf dsh-client-ui-skin-tianlight.tgz` → 得到 `dsh-client-ui-skin-tianlight/` 目录。
3. DSH Desktop 插件管理器 →「安装本地目录」指向该目录 → 重启 DSH 一次 → Ctrl+F5。

## 八、仓库内容约定

- 完整版会带上默认演示素材（约 34MB）：`assets/bg-4k.mp4`、`assets/cat.png`。单文件均低于 GitHub 100MB 限制。
- `.gitignore` 排除 `node_modules/`、`backup/`、`dist/`、`*.zip`、`diag.log`、`state/`、`assets/uploads/`、`assets/derived/`、`we-roots.json`，以及除默认两个文件外的 `assets/*`。
- `assets/uploads/`（用户上传壁纸）、`state/`（设置与缓存）、`assets/derived/`（转码产物）都是**本机用户数据**，不随仓库/发布包分发；发布或迁移时请单独保留/备份。
- `vendor/webwallgl/` 是 MIT 的 WebWallGL 3.0，随包分发请保留其 `LICENSE` 与 `README.upstream.md`。

> **不要**把开发工作目录整个拖上去：不要提交 `backup/`、`dist/`、`node_modules/`、`assets/uploads/`、`state/`、`we-roots.json`。

## 九、本地 git / SSH 前置

- Git 任意方式安装即可（GitHub Desktop 自带 git；无管理员权限时可用便携版）。
- 本机发布用 SSH（`git@github.com:...`）。Git for Windows 的 msys `sh.exe` 在受限沙箱里可能报 `couldn't create signal pipe`，旧脚本的做法仍然有效：

  ```powershell
  $env:GIT_SSH = 'C:\Windows\System32\OpenSSH\ssh.exe'
  ```

  发布工具本身只做一次只读 `git ls-remote`；即使 SSH 环境未配置，失败也只会给出警告，push 仍需你自己配置好认证。

## 十、历史：内部/公开双版本编号（已退役）

v2.0.0 起，仓库版本、GitHub Release 名称与 DSH 内安装版本统一为一个版本号。更早的流程（内部 `1.6.x` ↔ 公开 `v1.0.x` 双编号、`tools/public-release.mjs`、移动 tag）**已退役**；相关 tag 与 Release 仅作历史保留，`INTERNAL-BUILD.json` 记录最后一段映射关系。历史版本的回滚方式：重新安装上一发布版 + Ctrl+F5 + 重启 DSH。
