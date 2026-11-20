# v2.3.0 发版 Runbook（凭据到位后照此执行）

> 状态：**代码、文档、门禁、验收、发行附件全部就绪**；只差推送与发布凭据。
> 本机已实测不可用的三条通道（2026-11-20）：SSH `Permission denied (publickey)`、
> HTTPS `Connection was reset`、npm token `401 Unauthorized`。
> 需要用户提供：**可用的 GitHub 推送方式**（SSH key / 或带 `repo` 权限的 HTTPS token）
> 和**有效的 npm token**（`//registry.npmjs.org/:_authToken`）。

## 0. 当前状态（可直接开始）

- 分支：`dev` @ `e7c70dc`（领先 `origin/dev` 6 个提交），工作树干净；
- 版本：`package.json` / `skin.json` / `src/10-constants.js` / `lib/index.js` = **2.3.0**；
- 门禁：`npm run check` 全绿（181 tests / 44 片段 / deps 725 引用 / i18n 1468）、`npm run parity` PASS；
- 验收：[`docs/ACCEPTANCE-v2.3.0.md`](ACCEPTANCE-v2.3.0.md) 八条全部达标；
- 发行附件已在本机预构建：`dist/release/`（两个 tgz 相同、SHA256SUMS、build-manifest）；
- **本机 Desktop profile 已装 2.3.0，且 57/57 文件与 `dist/release/SHA256SUMS.txt` 逐字节一致**
  （`node tools/verify-install.mjs <profile 插件目录> dist/release/SHA256SUMS.txt`）。

## 1. 推送与合并

```bash
cd "D:/DeepSeek Harness(2)/github-upload"
git push origin dev
# 等 CI（.github/workflows/check.yml）在 dev 上全绿
git checkout main && git merge --ff-only dev
git push origin main
```

## 2. 在 main 上切版本与 tag

> `release.mjs` 会写 `RELEASE-NOTES-v2.3.0.md`；**先把详尽的发布说明复制到临时文件**再传
> `--note-file`，避免工具读写同一路径。

```bash
cp RELEASE-NOTES-v2.3.0.md /tmp/notes-2.3.0.md     # Windows: Copy-Item 到 %TEMP%
node tools/release.mjs --version 2.3.0 --note-file /tmp/notes-2.3.0.md
```

该命令会：跑 check → 重建 `lib/client.js` → 更新 CHANGELOG → snapshot → 提交 `release: v2.3.0`
→ 打 annotated tag `v2.3.0` → 生成 `dist/release/` 四个附件并打印 sha256。

## 3. 逐个推 tag（GitHub 单次 push >3 个 tag 不产生事件）

```bash
git push origin v2.3.0
node tools/verify-tag-run.mjs v2.3.0        # 确认 release.yml 的 run 存在
```

`release.yml` 会用 `RELEASE-NOTES-v2.3.0.md` 作为 GitHub Release 正文，上传四个附件。

## 4. npm 发布 + 安装校验

```bash
npm run npm:publish            # 已 dry-run 验证：57 文件 / 18.3 MiB / tag latest
node tools/verify-install.mjs <任意安装目录> dist/release/SHA256SUMS.txt
# 本机 profile 已在 2.3.0 上，可先跑：
node tools/verify-install.mjs "C:/Users/57579/.dsh/profiles/desktop/node_modules/dsh-client-ui-skin-tianlight" dist/release/SHA256SUMS.txt
```

## 5. 需要人工完成的两项

1. **完全退出 DSH 再打开**（host 只在启动时快照客户端包）：右上角天气胶囊左边出现太阳/月亮开关，
   `Alt+L` 切换；角色中枢 → 「外观」卡片；设置 → 通用 → 外观 与天光联动。
2. 在 Desktop 上确认验收 #7/#8：用 DSH 设置改外观 → 天光自动变「跟随 DSH」；重启后模式保持、首帧正确。

## 6. 回滚

- 本地预览回滚：`diag/profile-backup-before-230-20261120-233818.zip` 解压覆盖 profile 的插件目录，
  或 profile 内 `.tianlight-installer/backups/2026-11-20T15-38-21-536Z`；
- 代码回滚：`git revert`/`git reset --hard 2839b3c`（tag 未推之前）；
- tag 已推后不可移动：修问题发 2.3.1，按 `PUBLISH.md` 的补发流程。

## 7. 已知的小尾巴

- 验收 #2 的"正文段落"是在实验实例上以 hero/占位文本替代的（无模型凭据），Desktop 上可一眼复核；
- 饱和度指标用 HSV 而非 HSL（理由见验收报告 §6）；
- `dist/` 与 `screenshots/` 的产物不参与 npm 包（`files` 白名单），发行附件只在 Release 上。
