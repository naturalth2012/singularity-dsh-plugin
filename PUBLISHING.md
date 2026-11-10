# 发布指南

本目录已整理成**可直接发布**的状态。GitHub 推送与市场 PR 需要你的账号凭证，
本机（当前环境）没有 `gh`、没有 GitHub/npm token，所以下面这一步由你执行。

---

## 0. 一次性准备：填入你的 GitHub 用户名

`package.json` 里的仓库地址目前是占位符 `CODEOWNER`，**必须先替换**：

```powershell
cd D:\AIApp\singularity-plugin
node scripts\set-repo.cjs <你的GitHub用户名>
```

然后复核（这一步会检查包名一致性、发布字段、必需文件）：

```powershell
node scripts\preflight.cjs      # 应 26/26 全部通过
node scripts\pack-check.cjs     # 确认打包产物含 8 个运行时文件
node tests\engine.test.cjs      # 26/26
node tests\mount.test.cjs       # 20/20
```

---

## 1. 发布到 GitHub

仓库已在本地初始化（分支 `main`，已有首个提交）。在 GitHub 网页上**新建空仓库**
`singularity-dsh-plugin`（不要勾选 README / .gitignore / LICENSE），然后：

```powershell
cd D:\AIApp\singularity-plugin
git remote add origin https://github.com/<你的用户名>/singularity-dsh-plugin.git
git push -u origin main
```

> 若你已安装 `gh`，也可一步完成：
> `gh repo create singularity-dsh-plugin --public --source=. --push`

推送后会触发首次认证（浏览器或 Personal Access Token）。

---

## 2. 发布到 npm（可选，但推荐）

市场条目优先使用 npm 包，装起来最快、可回滚。发布前确认包名未被占用：

```powershell
npm view singularity-dsh-plugin version   # 若报 404，说明名字可用
npm login                                  # 登录你的 npm 账号
npm publish --access public
```

> 如果 `singularity-dsh-plugin` 已被占用，改 `package.json` 的 `name`
> （同时改 `client.js` 顶部的 `id`、`cordis.patch.yml` 的 `name`、`tests/mount.test.cjs`
> 的断言），再重跑 `node scripts\preflight.cjs` 确认三处一致。

**不发布 npm 也能上架**：市场条目支持仅 GitHub 来源，安装时回退到源码下载。

---

## 3. 发布到插件市场

市场里的插件列表来自精选目录仓库
[awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)，
**不是** dshmarket 应用仓库本身。收录方式是在目录仓库提一个 PR 加一条。

生成条目与 PR 说明：

```powershell
node scripts\make-market-entry.cjs
```

产物在 `dist/`：

| 文件 | 用途 |
|------|------|
| `dist/market-entry.json` | 结构化条目（符合市场 `RegistryPlugin` 结构） |
| `dist/market-row.md` | Markdown 表格行，多数 awesome 列表直接可用 |
| `dist/market-pr.md` | 完整 PR 描述，可直接粘贴 |

然后：

1. Fork [awesome-dsh-plugin/awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)
2. 按仓库 README 的分类结构，把 `market-row.md` 那行加到 **UI / 可视化** 分类
3. 提交 PR，描述用 `dist/market-pr.md` 的内容
4. 合并后通常 **一天内**在 [dshmarket.com](https://dshmarket.com) 与
   [awesome-dsh-plugin.com](https://awesome-dsh-plugin.com) 生效，
   Harness 内「插件 → 插件市场」即可搜到

> 注意：收录 ≠ 背书。第三方代码，用户需自行判断是否信任。

---

## 4. 发布后自检

在你的 Harness 里验证市场条目可用：

```
插件 → 插件市场 → 搜索 "Singularity" → 安装
```

安装后侧栏应出现 **Singularity** 图标（order 30），点击进入全宽面板，
六个标签页：历史长河 / 演化引擎 / 三岔路口 / 指标矩阵 / 情景对比 / 理论底座。

若安装后不显示，常见原因：

- `client.js` 的 `id` 与 `package.json` 的 `name` 不一致（`preflight` 会拦住）
- 页面未刷新（F5）
- 浏览器控制台出现 `slot entry crashed`，把报错贴出来

---

## 当前状态

| 项 | 状态 |
|---|---|
| 包名 | `singularity-dsh-plugin`（已从 `@local/singularity` 改名） |
| 版本 | 1.0.0 |
| 本地 git | 已初始化，`main` 分支，首个提交完成 |
| 许可证 | MIT |
| 运行时依赖 | 0 |
| 引擎测试 | 26/26 |
| 挂载契约测试 | 20/20 |
| 预检 | 25/26（唯一未过项：仓库 URL 仍是 `CODEOWNER`，需第 0 步替换） |
| 打包产物 | 8 文件 / 90 KB |
| 已在本机 Harness 安装激活 | 是（槽位 `sidebar.panellist` order 30, active） |
