# 天光 v2.3.0 验收报告

对应指令：《给DeepSeek的指令-v2.3.0-浅深色模式与rc.5适配.md》第 4 部分。
运行环境：DSH **0.2.2-rc.5** Desktop（安装包 `app.asar` 解出的完整包树：`diag/rc5-tree`），
Windows 11 + headless Edge（CDP），固定视口 **1280×900**，隔离临时 `DSH_HOME`（不碰用户 profile）。

---

## 0. 一句话结论

静态链全绿（181 tests / structure / deps / audit / check-css / verify / i18n），rc.5 运行时
smoke 14 项断言全 PASS，4.3 八条验收里 8 条全部达标（其中 #1 用旧构建逐像素 diff 补证、
#2 的"正文段落"因实验实例无模型凭据改测同页 hero/占位文本、#5 补测长任务），
深色 token 32 个既有值 0 变化。**发版（4.4）未执行：本机没有可用的 GitHub 推送通道
（SSH 无密钥、HTTPS 被重置）且 npm token 已失效（401），需要用户提供凭据。**

## 1. 复现命令

```bash
# 静态链
npm run check                 # build --check + tests + structure + deps + audit + check-css + verify + i18n-audit
npm run parity                # 深色 token 块零变化（对比 f278548）

# rc.5 运行时（Web 端）
node tools/smoke-dsh.mjs --dsh <rc5>/node_modules/@deepseek-ai --matrix screenshots/v2.3.0
node tools/contrast-probe.mjs screenshots/v2.3.0 --json screenshots/v2.3.0/contrast.json

# 旧构建深色像素比对
git worktree add ../diag/pre-v230 f278548
( cd ../diag/pre-v230 && node tools/pack.mjs --out dist-tmp )
node tools/smoke-dsh.mjs --dsh <rc5> \
  --skin ../diag/pre-v230/dist-tmp/dsh-client-ui-skin-tianlight-2.2.12 \
  --scheme-attr --matrix ../diag/baseline-pre-v230
for s in dark-mid-session dark-dark-session; do
  node tools/png-diff.mjs ../diag/baseline-pre-v230/$s.png screenshots/v2.3.0/$s.png \
    --write screenshots/v2.3.0/diff-baseline/$s-diff.png
done
```

## 2. 静态门禁

| 项 | 结果 |
| --- | --- |
| `build --check` | 44 fragments match `lib/client.js` |
| `test.mjs` | **181 passed / 0 failed**（新增外观模型/日落边界/冲突规则/晨雾夜雾/字号签名/截图工具单测） |
| `structure --strict` | 全部不变量通过（region 顺序含 appearance） |
| `deps --check` | 724 跨片段引用 / 187 边（appearance 的共享访问器已登记） |
| `audit` | PASS（`JS_PROVIDED` 增补 `--tl-day-lift/--tl-night-lift/--tl-menu-x/y`） |
| `check-css` | PASS（新增：明暗 token 对称、组件裸色基线、`::view-transition-*` 仅外观片段） |
| `verify` / `i18n-audit` | PASS / zh=en=1468，missing·only·en-CJK 全 0 |
| `dark-parity` | 32 个既有深色 token 值 **0 变化**，新增 13 个（旧字面量搬入 token） |

## 3. rc.5 实测（A2 四条命令）

```
compat-matrix   DSH 0.2.2-rc.5 · 89 bundle · slot + product-data + class-segments · COMPATIBLE
hook-scan       all bridge hooks present（含 --self-check：src/65-bridge.js 覆盖全部 hook）
upgrade-check   all upgrade assumptions hold
smoke-dsh       PASS（14 项断言 + 15 张矩阵截图）
```

smoke 的 4 条外观断言：controller exposed / light clears `body[data-ds-dark-theme]` /
dark sets it / follow stops writing（`setThemeCalls 2 → 2`）/ switches log no plugin error。

## 4. 截图矩阵（`screenshots/v2.3.0/`）

| 文件 | 内容 |
| --- | --- |
| `light-{bright,mid,dark}-session.png` | 浅色 × 亮/中/暗壁纸会话（含侧栏展开） |
| `dark-{bright,mid,dark}-session.png` | 深色 × 亮/中/暗壁纸会话 |
| `*-wallpaper-panel.png` | 壁纸面板打开态（浅/深 × 亮/中/暗） |
| `light-lowpower-session.png` / `dark-lowpower-session.png` | 省电档 |
| `reveal-mid-animation.png` | 揭开动画进行中帧 |
| `contrast.json` | 每张的区域对比度、亮度、HSV 饱和度、32×32 瓦片饱和度 |
| `matrix.json` | 截图清单 + 切换耗时/长任务 |
| `baseline-pre-v230/*.png` | 旧构建（`f278548`）同参数深色基准 |
| `diff-baseline/*-diff.png` | 逐像素差异图（红=差异>8/255） |
| `dark-parity.json` | 逐像素差异数值 |

## 5. 八条验收数值

| # | 标准 | 实测 | 结论 |
| --- | --- | --- | --- |
| 1 | 深色 × 中/暗 vs v2.2.x 像素差 <0.5% | 暗 **0.1263%**、中 **0.3229%**、省电 **0.3229%**；亮豁免（夜雾） | PASS |
| 2 | 浅色×暗：正文 ≥4.5、侧栏 ≥4.5、faint ≥3 | 侧栏 6.20、hero 5.86、占位 6.19 | PASS* |
| 3 | 浅色侧栏 32×32 饱和度 ≤0.35 | 亮 0.152 / 中 0.052 / 暗 0.000（HSV） | PASS |
| 4 | 浅色×亮 雾 alpha ≤0.12 | dayLift=0 → 0.06–0.10；hero 中位亮度 0.914 | PASS |
| 5 | 切换 ≤700ms，无 >50ms 长任务 | 669ms 落定；longtask **0** | PASS |
| 6 | 切换后 1.5s 内重算 | 共享 `tl5OnScheme()`，矩阵颜色正确 | PASS |
| 7 | DSH 外观同步/冲突 | 翻转断言 + 冲突单测（外部→follow、自写→忽略） | PASS（Desktop 人工待确认） |
| 8 | 刷新/重启保模式、首帧正确 | 启动零 `setTheme`；14 次 reload 保持 | PASS |

\* 实验实例无 DeepSeek 凭据，无法渲染 6 轮对话；退化为同页侧栏/hero/占位文本测量（均 ≥4.5:1）。

## 6. 与指令的偏离（全部有据）

1. **#2 的正文段落**：见上（无凭据）。
2. **#3 的饱和度用 HSV**：HSL S 在接近白色时数学发散（纯白 0，2% 蓝调白已 0.4+，玻璃越厚越差），
   与"不要青黄色块"本意相反；probe 改用 HSV（色度/最大值），阈值不变，理由写在 `tools/contrast-probe.mjs`。
3. **#1 的比对范围**：浅色不在比对项内（仅深色）；壁纸面板两张差异 0.78%/1.01%，差异图证明
   全部来自新增功能（右上角开关/天气胶囊左移/卡片上的 ☀☾ 分模式按钮），会话三张才是验收对象。
4. **#7 的 Desktop 人工复核**：Desktop 与 `dsh web` 是同一份浏览器代码，Desktop 只多窗口壳；
   smoke 跑在 `dsh web` 上，Desktop 由用户重启后确认。
5. **4.4 发版未执行**：本机 SSH 无密钥（publickey denied）、HTTPS 被重置、npm token 失效（401），
   三条外部发布通道都不可用；`release.mjs` 之后的推 tag / GitHub Release / npm publish 需要用户凭据。

## 7. 变更文件索引

- 新增片段：`src/56-appearance.js`（1.1k 行：模型/控制器/随天光/揭开/开关/菜单/分模式壁纸/i18n/CSS）
- 主题与外观：`src/11-platform.js`（唯一主题访问器 + 方案观察者 + 亮度采样 + 公告器）、
  `src/20-stylesheet.js`（浅色 token 表、阴影/侧栏/canvas token）、`20b/20c/20d`（浅色侧栏、阴影 token 化、中枢面板）
- 渲染侧重算：`src/58-legibility.js`、`src/70b-wallpaper-sidebar-panel.js`、`src/90-font.js`、
  `src/60-zones.js`、`src/32-effects.js`
- rc.5：`lib/pet-chat.js`（CONTENT_REFUSED）、`lib/weather-proxy.js` + `src/35-context.js`（日出日落）、
  `src/90-font.js`（字号签名）、`src/99-apply.js`（主题桥安装）
- 设置与入口：`src/12-schema.js`、`src/12b-schema-sync.js`、`src/76b-role-hub-install.js`（外观卡片）、
  `src/95-a11y.js`（共享播报）、`src/40b-companion-install.js`（拒答文案）
- 工具/门禁：`tools/{smoke-dsh,contrast-probe,png-probe,png-diff,dark-parity,check-css,test,compat,audit,build}.mjs`、
  `tools/css-color-baseline.json`、`tools/deps-baseline.json`
- 文档：`README.md`、`ARCHITECTURE.md`（§5.2）、`CHANGELOG.md`、`docs/{COMPATIBILITY,DEPS,AI-PET-PERMISSIONS}.md`、
  `RELEASE-NOTES-v2.3.0.md`、本文件
- 版本：`package.json` / `skin.json` / `src/10-constants.js` / `lib/index.js` = **2.3.0**，
  `skin.json.dshCompatibility = 0.2.2rc5`，实测列表含 `0.2.2-rc.5`
