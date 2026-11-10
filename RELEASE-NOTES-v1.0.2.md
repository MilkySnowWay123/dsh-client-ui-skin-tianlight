# v1.0.2 · 更名天光 + DSH 0.2.0–0.2.2 全兼容

> **天光（TIANLIGHT）** for DSH：显示名统一为「天光」，并在 DSH **0.2.0 / 0.2.1 / 0.2.2** 三份真实安装上完成兼容性实证。
> 公开版本名为 **v1.0.2**（仓库内部构建 `1.6.3`，`BUILD`/`HOST_BUILD` = `1.6.3`）。升级后 Ctrl+F5 即可，通常无需重启 DSH。

## 🏷️ 更名：显示名统一为「天光」

- 皮肤管理器与 README 里显示的名字统一为 **天光**（英文名保持 `TIANLIGHT`），去掉旧显示名前缀。
- **只是显示文本变化**：skin id、包名（`@dsh-external/dsh-client-ui-skin-tianlight`）、body 属性（`data-dsh-tianlight`）、布线行（`ui-skin-tianlight`）、全部设置键与本地 `state/` 数据都不变 → **旧用户无迁移成本**，安装/启用方式与目录结构不变。

## ✅ DSH 三版本兼容性实证（2026-11-10）

对 0.2.0-rc.2 / 0.2.1-rc.5 / 0.2.2-rc.1 三份真实安装各跑 `compat-matrix` + `hook-scan` + `upgrade-check`：

| DSH 版本 | bundles | 钩子层 | 客户端契约 | verdict |
|---|---|---|---|---|
| 0.2.0-rc.2 | 72 | slot + product-data + class-segments | 11/11 true | **COMPATIBLE** |
| 0.2.1-rc.5 | 77 | slot + product-data + class-segments | 11/11 true | **COMPATIBLE** |
| 0.2.2-rc.1 | 86 | slot + product-data + class-segments | 11/11 true | **COMPATIBLE** |

- slot 钩子（`sidebar` / `conversation.input.model`）、产品 `data-*`（`data-composer-card` / `data-sidebar-collapsed` / `data-trigger-menu` / `data-slot`）、类名分段（`_sidebarCol` / `_card` / `_trigger*` / `_bubble` / `_menu` / `_panel`+`_mask`）与 `[data-chat-running]` 三条线全在。
- `data-message-bubble` 仅 0.2.2 有（0.2.0 / 0.2.1 由 `_bubble` 段兜底，属预期前进兼容）。
- `hook-scan` 三份日志均 `all bridge hooks present`；`upgrade-check` 三份均 `all upgrade assumptions hold`。
- **结论**：同一份构建 + 同一套 CSS 直接适配三条线，**没有版本 if 分支**——桥按 Slot → 产品 data → 类名分段分层发现。

## 📋 本版其它

- 仍未包含任何功能变化：液态玻璃 v2、侧栏「新会话」玻璃化、主界面天气胶囊、桌宠/角色中枢、权限与限额均与 v1.0.1 相同。
- 修复沿用 v1.0.1：壁纸左上角的常驻晨光装饰已移除。

## ✅ 验证

- 静态链：build/build --check 26/26、test 67/67、structure --strict、audit（v1.6.3 新守卫 2 条：显示名不含旧前缀 + DSH 三版本兼容声明）、check-css、verify、i18n-audit（zh=en 1216 键）全绿。
- Node 级隔离冒烟：**631/631 PASS**（v1.6.2 的 626 条回归 + 5 条新增 S78–S82：名称 / 兼容元数据 / 兼容证据），构建 sha `926f6f17…`（`lib/client.js` 1,300,780 B）；同一 build sha 复跑同样 631/631 PASS。
- 兼容实证证据：`diag/skinlab/evidence/compat-v163/`（matrix.json + hookscan/upgrade-check ×3）。

## 🔄 升级 / 回滚

- 升级：覆盖安装目录后 **Ctrl+F5**；本版无宿主路由改动，通常无需重启 DSH（若提示「宿主半待重启」则重启一次）。
- 回滚：重新安装 v1.0.1（内部 1.6.2）+ Ctrl+F5。

## 🧾 许可

- 本仓库代码 MIT；`vendor/` 内第三方组件（WebWallGL MIT、we-wallpaper MIT、wcap Unlicense）随包保留各自许可。
