# v1.5.0 · 可见性修复：默认玻璃可见 · 天气上桌 · 恢复默认形象 · 自检 · 反馈渠道

> 版本：`1.5.0`（`lib/client.js` **26 片段**；`BUILD`/`HOST_BUILD` = `1.5.0`）
> 针对你的反馈：① 桌宠形象可一键恢复默认；② 液态玻璃此前默认关闭且只作用于壁纸层（很容易看不到），现在**默认「柔和」生效**、加预览和界面高光；③ 天气此前只有隐藏的「环境」折叠组控件、没有显眼展示，现在**角色中枢有天气卡**（启用/城市/定位/刷新/当前天气）；④ 新增**一键自检**检查各功能响应；⑤ GitHub Issues 已确认开放，新增 issue 模板与**应用内反馈面板**。
> 无宿主路由改动：Ctrl+F5 即可；若提示宿主半需重启，重启一次 DSH 即消除。

## 1. 桌宠形象：恢复默认

角色中枢 →「桌宠形象」新增「**恢复默认形象**」按钮：调用 `tianlightLife.setMedia(null)`，移除自定义图片/视频选择、回到 `cat.png`/内联 SVG 兜底，并即时刷新列表/选择框。控制台等价：`window.tianlightLife.setMedia(null)`。

## 2. 液态玻璃：默认可见 + 预览

- 默认档位由 `off` 改为 **`soft`**：更新后无需设置即可看到（壁纸层镜面高光 + blur/saturate）。
- 效果强度提升，并**同时作用于皮肤自身的玻璃表面**（模型选择胶囊、推理档位胶囊等）：高光、模糊、饱和、内阴影随档位变化——即使没有开壁纸/场景，也能看到开关差异。
- 中枢玻璃卡新增**预览条**：切换 关闭/磨砂/柔和/真实 立即在预览条上看到该档位的玻璃效果；显示当前档与实际生效档（低电量/15fps 自动降级）。
- 关闭（off）时仍零额外合成开销。

## 3. 天气：终于“上桌”

原有天气（Open-Meteo，免 key，显式启用才联网）只藏在「壁纸 → 环境」折叠组里，所以“迟迟不见”。现在：

- 角色中枢新增**天气卡**：当前天气（描述 + 温度 + 更新时间）、启用开关、城市解析、坐标输入、使用当前定位、刷新；各状态（未启用/无位置/等待/错误/环境模块未挂载）都有明确文案。
- 底层仍复用 `src/35-context.js` 的天气控制器（新增 `globalThis.tianlightWeather` 与 `summary()`），未新增网络通道、未改默认启用策略（天气默认仍需你显式开启才会联网）。
- 天气数据也会驱动原有环境氛围（雨/雪/雾联动）。

## 4. 各个功能响应检查：一键自检

角色中枢新增「**自检**」：逐项检查生活引擎/大脑/玻璃/形象/天气/AI Agent/中枢自身，列出 PASS/FAIL 与原因，可**复制结果**。遇到功能异常时，先跑一次自检再反馈，能直接定位是哪一层没挂载/不可用。

## 5. 反馈渠道

- GitHub 仓库 **Issues 已开放**（API 实测 `has_issues: true`，当前 0 个 open issue），README 将引导到这里。
- 新增 [.github/ISSUE_TEMPLATE/feedback.yml](.github/ISSUE_TEMPLATE/feedback.yml)（反馈模板）与 [docs/FEEDBACK.md](docs/FEEDBACK.md)（反馈指南/隐私约定）。
- 角色中枢新增「**反馈**」面板：填写备注 → 复制（环境+功能状态+备注，可直接贴 Issue）、打开预填 GitHub Issue、或下载 JSON；不读取会话正文与凭据。
- 若你希望**免 GitHub 账号**提交，可后续加“本地反馈文件/邮件”链路；目前 Issues + 应用内反馈已可用（推送仓库后生效）。

## 6. 验证

- 静态链：build 26/26、test 67/67、structure --strict、audit（v1.5 六条新守卫：默认玻璃/天气暴露/恢复默认/天气+玻璃预览/自检+反馈/issue 预填）、check-css、verify、i18n（1203 键）全绿。
- Node 冒烟：**534/534 PASS**（R 58 + H 54 + L 19 + M 18 + S 71 + P 62 + U 54 + A 79 + E 15 + HIGH 46 + **W 天气 26** + **X 中枢五项 32**），构建 sha `9FC4C53D…`；证据 `diag/skinlab/runs/20261110-171748-v150-v150-node-smoke/`。
- W/X 段实测：玻璃默认 soft 与预览联动；天气 7 键 summary/六态/零请求、enable/disable/坐标/定位/刷新委派、dispose 还原；恢复默认、自检 7 项、反馈复制 payload（无会话正文/凭据）/Issue URL/JSON 下载 + objectURL 撤销；`.github/ISSUE_TEMPLATE/feedback.yml` 与 `docs/FEEDBACK.md` 存在。
- 真浏览器级与真实 Open-Meteo/定位往返仍受本会话沙箱限制（Edge Mojo 命名管道），需你在非沙箱环境点验；首次点「自检」可确认各层状态。

## 7. 升级 / 回滚 / 仓库

- 升级：Ctrl+F5；宿主无路由变化；提示宿主半需重启时重启一次。
- 回滚：`git reset --hard v1.4.0 && node tools/build.mjs`，再 Ctrl+F5。
- 仓库：`github-upload/` 同步 v1.5.0（tag）；推送见 `diag/tmp/publish-v150.ps1` 或 GitHub Desktop。
