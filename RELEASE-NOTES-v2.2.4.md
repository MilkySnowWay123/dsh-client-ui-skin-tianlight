# 天光 v2.2.4

这一版不换皮肤长相，修的是**底座的四个隐患**和**发布流程本身**：玻璃默认终于和发版默认一致、0.3 的支持声明收回、客户端加载失败不再炸页面、一次推四个 tag 不触发 CI 的事故有了防线。

## 这一版做了什么

### 玻璃：默认关闭，第一次安装不再“说一套做一套”

- `tianlight.glassDepth` 的**缺键默认从 `soft` 改成 `off`**，与发版默认外观（`TL5_DEFAULT_APPEARANCE_JSON` 里的 `off`）一致。之前两处默认不一致：全新安装不显示液态玻璃、而清掉该键后又变成柔和档，两边都不是发布说明里写的样子。
- 角色中枢的提示改成「默认关闭；可开启液态玻璃（柔和/真实）……低性能设备、低电量与 15fps 会自动暂停/降级」。**低电量与 15fps 的自动暂停没有动**——这次只改默认值和文案，不动保护。
- 新增冒烟断言：隔离 home（没有该键）里 `data-tl-glass-depth=off`、`effective=off`、`live=off`，把这条默认钉死在真实 DSH 上。

### 0.3：放弃预适配，门禁收回，资料保留

- DSH 0.3.0 至今没有发布（npm `latest=0.2.2-rc.1`、`next=0.2.2-rc.3`），我们也没有在真实 0.3 build 上验证过。所以 `engines.dsh` / 官方包 peer / `skin.json.dshCompatibilityRange` 三处**回到上限 `<0.3.0-0`**：装 0.3.x 会被 DSH 门禁跳过整层，而不是加载一个可能“页面正常、玻璃全无 / 路由全 404”的皮肤。
- **资料不扔**：`docs/COMPAT-0.3.0.md` 保留 6 组 50 条宿主契约触点、§6.1（`handler` → Fetch `resource` 为什么不能顺手补——会让写路由全 405）和 13 步发版日清单；`tools/guide-diff.mjs` 继续挂在每日 canary，0.3.x 一出现在 `next`/`alpha`，范围检查会失败并开 issue 提醒。放开步骤写在 `docs/COMPATIBILITY.md` §10.5。

### 底座：28 → 43 个片段，逐字节等价

- `lib/client.js` 仍是加载器要求的**一个 ESM**（运行时体积不变、安装不会更快），但源码按边界拆开，改玻璃/宠物/设置时不再碰 200KB+ 的单文件：`12-schema`、`20-stylesheet`（拆成 base/shell/glass/hub 四层）、`30-wallpaper`、`40-companion`、`44-pet-brain`、`59b-splash-film`、`70-sidebar`、`76-role-hub`。
- 每一刀都做过等价核对：CSS 四段拼回与原 143,987 字符逐字符相同；七个 JS 片段组逐行与 v2.2.3 对齐（仅本次有意改动不同）。
- 新增 `tools/split-fragment.mjs`（默认 dry-run、强制同名 region、连续区间、顶层边界），拆分计划与剩余两个巨型安装器/组件的阶段 2 方案在 `docs/SPLIT-PLAN.md`。

### 稳定性：加载器契约失效不再炸页面

- `window.__ModuleLoader__.load({id, factory})` 是唯一无法用 try/catch 包住的点（在工厂体之前执行）。现在外层有守卫：loader 缺失/改名时只打一行具名告警并返回，页面与其他插件的模块不受影响；回归测试覆盖（155 项）。
- 宿主半新增启动自检：URL 路由注册后再同进程 GET 一次 `_manifest`，如果宿主不再分发 legacy `handler` 字段，宿主控制台会明确报「所有插件路由不可达」，并指向 `docs/COMPAT-0.3.0.md` §6.1 的整包 Fetch 迁移方案。

### 发布流程：修好“四个 tag 推完 CI 没触发”

- 根因查实：GitHub 对**单次 push 超过 3 个 tag** 不产生 push 事件。v2.2.0–v2.2.3 就是这么丢的（四个 tag、零个 release run，最后手工补了四个 Release）。
- `release.yml` 增加按 tag 的 `workflow_dispatch` 补发通道（checkout 的是该 tag，不是分支 HEAD，步骤幂等）；新增 `tools/verify-tag-run.mjs`：推完 tag 必须看到 run FOUND，缺失时退出码 3 并给出补发命令。`PUBLISH.md` 与 `release.mjs` 的收尾提示都写死了「一次一个 tag + 推完验证」。

### 文档

- 安装说明与故障排查写死：**彻底退出 DSH（含托盘）→ 确认没有 `DeepSeek Harness.exe` → 重开 → Ctrl+F5**；只按 Ctrl+F5 看到的是旧构建，判断依据给了 `_fingerprint` 与 `features` 的 Console 命令。
- 壁纸面板与 README 把「自带壁纸（紫调人物循环 `bg-4k.mp4`）」和「推荐天空壁纸（新海诚式天空，自备/URL）」分开说明，避免装完觉得货不对板。

## 验证

- 静态链全绿：`build --check` 43 片段、`test` 155/155、`structure --strict`、`deps --check`、`audit`、`check-css`、`verify`、`i18n-audit`。
- canary 四项对真实 DSH 0.2.2-rc.3 全绿：`compat-matrix=COMPATIBLE`、`hook-scan --self-check`、`upgrade-check`、`guide-diff` 无未读命中。
- 真实 DSH 0.2.2-rc.3 + headless Edge 冒烟 **8/8 PASS**：皮肤属性、`#root`、输入框、玻璃默认 off、长片开始/19.9s 结束、片尾 `#root` 可见、插件零 console error。
- 只改浏览器半 + 宿主半的自检；`HOST_API` 仍是 3、`BUILD` 随版本更新。升级后请**完全退出 DSH（含托盘）再打开**，然后 Ctrl+F5。

## 注意

- **0.3.x 本版不支持**：这是有意收回，不是回归。等 0.3.0 真发布，按 `docs/COMPAT-0.3.0.md` 验证后再开。
- `installRoleHub`（≈177KB）与 `WallpaperPanel`（≈149KB）仍是单函数/单组件，阶段 2 拆分需要上下文对象/子组件重构，未在本版做。
