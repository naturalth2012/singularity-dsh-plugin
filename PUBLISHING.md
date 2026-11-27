# 发布指南

本目录已整理成**可直接发布**的状态。GitHub 推送与市场 PR 需要你的账号凭证，
本机（当前环境）没有 `gh`、没有 GitHub/npm token，所以下面这一步由你执行。

---

## 0. 一次性准备：填入你的 GitHub 用户名

`package.json` 里的仓库地址目前是占位符 `CODEOWNER`，**必须先替换**：

```powershell
cd D:\DeepseekAPP\Singularity
node scripts\set-repo.cjs <你的GitHub用户名>
```

然后复核（这一步会检查包名一致性、发布字段、必需文件）：

```powershell
npm run verify                  # 六套件全绿（见下方自动计数）
node scripts\pack-check.cjs     # 确认打包产物含 12 个运行时文件
```

<!-- counts:auto -->

| 套件 | 结果 |
|---|---|
| 契约一致性 | 89/89 |
| 模型行为 | 78/78 |
| 对抗回归 | 24/24 |
| 插件契约与渲染 | 50/50 |
| 深层渲染冒烟 | 25/25 |
| 发布一致性 | 33/33 |
| **合计** | **299/299** |

以上计数由 `npm run counts` 自动生成，手工编辑无效。

<!-- /counts:auto -->

---

## 1. 发布到 GitHub

仓库已在本地初始化（分支 `main`，已有首个提交）。在 GitHub 网页上**新建空仓库**
`singularity-dsh-plugin`（不要勾选 README / .gitignore / LICENSE），然后：

```powershell
cd D:\DeepseekAPP\Singularity
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
| `dist/<owner>__<repo>.yml` | 市场条目（按官方 `contributing.md` 规范，一个文件一个插件） |
| `dist/market-pr.md` | 完整 PR 描述，可直接粘贴 |

然后：

1. Fork [awesome-dsh-plugin/awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)
2. 只新增 `data/plugins/<owner>__<repo>.yml` 一个文件（**不要**手写 `npm:` 字段，会被校验拒绝）
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
| 包名 | `singularity-dsh-plugin` |
| 版本 | 见 `package.json`（当前 1.5.0） |
| 本地 git | `main` 分支 |
| 许可证 | MIT |
| 运行时依赖 | 0 |
| 打包产物 | 12 文件（`npm run pack-check` 实测） |
| 已在本机 Harness 安装激活 | 是（槽位 `sidebar.panellist` order 30, active） |
| 插件市场 | 已收录（awesome-dsh-plugin PR #18788 已合并） |
| 测试计数 | 见本文件第 0 节的自动计数块 |
