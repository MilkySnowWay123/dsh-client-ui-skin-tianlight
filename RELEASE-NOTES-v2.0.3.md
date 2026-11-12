# 天光 TIANLIGHT v2.0.3 · 一条命令安装

## 安装

先完全退出 DeepSeek Harness（包括托盘图标），然后运行：

```bash
npx dsh-client-ui-skin-tianlight@latest
```

装完打开 DSH，页面按 Ctrl+F5。需要 Node.js 18 及以上。

## 变更

- 新增安装器（`bin/cli.mjs`、`bin/installer.mjs`），命令有三个：
  - `install`（默认）：自动找到 `$DSH_HOME` 和 `desktop` profile；备份 profile 清单；按插件管理器的格式登记精确版本和 bundle；注销旧包名；把插件文件暂存后整体替换，并逐字节校验。
  - `doctor`：只读体检，检查登记、旧包名残留、文件完整性、被禁用的 `ui-skin-tianlight` 行和用户数据。
  - `uninstall`：注销并移走插件文件，保留用户数据。
- 安装器不会修改任何 `cordis.patch.yml`，也不会动 `<profile>/tianlight/` 下的用户数据。原来是 `link:` 链接安装的，只移除链接本身，不动开发目录。
- DSH 正在运行时，安装器默认拒绝执行，避免 Windows 锁定文件导致 EPERM。
- 插件本体（`lib/`、`src/`、资源文件）与 2.0.2 完全相同，兼容范围不变：DSH `>=0.2.0-rc.1 <0.3.0`。

## 校验

- `npm run check` 全绿，测试 134/134（新增 9 个安装器测试）。
- 用 `npm pack` 生成的 tarball 通过 `npm exec` 实测了以下场景：从 2.0.2 升级、重复运行（跳过复制）、旧包名加 `link:` 链接安装的迁移（开发目录未被改动）、home 补丁里有 disabled 行时给出提示、多 profile 时的选择、卸载后重装、篡改文件后 `doctor` 报错并能用 `install` 修复。
