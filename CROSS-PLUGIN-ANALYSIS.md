# Singularity × 本地插件群 对比吸收分析

> 时间：2026-11-25 ｜ 对象：本机已安装/已开发的 6 个插件 ｜ 方法：逐一阅读核心模块源码取证。
>
> **分类学前提（为什么不能照搬）**：Singularity 是**封闭世界的前瞻推演模型**——没有外部数据源，
> 输入全是「判断值拨杆」，输出是 2024–2060 的形态演化。其余插件分属三个不同类别：
> 实时数据情报（yangtze-highway-intel、jiangsu-housing-intel、iptv）、知识库参考（movie-kb、middle-earth-atlas、three-body-atlas）、
> 量化分析器（quant-lab——最接近但仍是「描述历史数据」而非「推演未来」）。
> 因此本分析只吸收**工程方法论**，不吸收领域数据与业务逻辑；文末列出明确不该吸收的部分。

---

## 一、逐插件对比总表

| 插件 | 类别 | 核心资产 | Singularity 已有？ | 可吸收 |
|---|---|---|---|---|
| quant-lab | 量化分析 | 纯函数分析内核（960 行，16 个导出）、OLS 显著性/Hurst、成本回测、4 个 agent 工具 | 引擎纯函数 ✔ / 显著性 ✘ / 回测 ✘ / 工具 ✘ | ★★★ 工具暴露、显著性思维、回测纪律 |
| jiangsu-housing-intel | 数据情报 | DATA-CONTRACT.md、采集三重校验、纯分析引擎、Jenks 梯队、信号分级+历史留存 | 契约 ✘ / 校验 ✘ / 信号分级（部分，diagnose tags） | ★★★ 模型契约、启动期断言、历史留存 |
| yangtze-highway-intel | 实时路况 | 12 通道缓存、锚点自校准脚本、agent 工具、常用路线持久化 | 缓存 N/A / 校准 ✘ / 工具 ✘ | ★★ 校准脚本文化、工具暴露 |
| middle-earth-atlas | 知识库 | 剧透分级（白名单）、快照持久化（版本化+验证）、journey 逐角色事件流 | 分级 ✘ / 持久化 ✘ / 事件流（有 EVENTS，但静态） | ★★ 渐进披露、快照存储 |
| movie-knowledge-base | 知识库 | 权重化推荐引擎、读写双通道工具、TMDB 增强 | 推荐 N/A / 工具 ✘ | ★ 工具读写双通道思路 |
| dsh-lantern / dsh-context / dshmarket / token-dashboard | Harness 基建 | 面板外系统（P2P、上下文可视化、市场） | — | ✘ 类别不同 |

**反向吸收**（Singularity 值得输出的东西）：内联引擎零依赖自包含（所有逻辑一个文件即可装载）；`diagnose()` 结构归因叙事（quant-lab 的信号解释、housing 的信号都比它薄）；「引力场 vs 闸门」的双层裁决可视化。

---

## 二、吸收清单（按价值排序）

### A1 ★★★ 把模型暴露为 agent 工具（来自 quant-lab:503 / yangtze:646 / movie-kb）

**现状**：Singularity 只有面板，agent 无法触达模型。而引擎层（`simulate`/`sensitivity`/`diagnose`/`targetOf`）全是纯函数——工具化的边际成本极低。

**方案**：注册 3 个工具（仿 quant-lab 的 `ctx.inject(['tools'], …)`）：
- `singularity_simulate`：入参 = 拨杆覆盖值 + 剧本 key；出参 = 结局、终年指标、窗口、路径引力、触发事件（JSON）。
- `singularity_sensitivity`：入参 = 拨杆；出参 = ±10% 敏感度排名。
- `singularity_compare`：无参；出参 = 六剧本对照表。

**为什么对预测模型特别重要**：面板是「人拨杆看结果」，工具是「对话中问假如」——`@如果开源扩散拉满还会封建吗` 直接由 agent 代答。预测模型的价值随可问性增长，这是六情景静态面板给不了的。

### A2 ★★★ 引擎独立成纯模块 + MODEL-CONTRACT.md（来自 housing 的 DATA-CONTRACT + quant-lab 的 analytics.js）

**现状**：引擎埋在 `client.js` factory 体内，测试靠**正则截取 factory 函数体 + 花括号配对**提取符号（engine.test.cjs:12-44）——每次改 client.js 结构都可能弄断测试装载，且 client 与测试之间没有共享契约。

**方案**：
1. 把数据层+引擎（约 370 行）抽出为 `engine.js`（纯函数，无 React），client.js `import` 它；测试直接 `import`——删掉整个字符串手术装载器。
2. 写 `MODEL-CONTRACT.md`：指标定义、系数表、闸门值、裁决规则、已知偏差（COLLAPSE_GAIN 非对称、social 上限 0.70）。测试断言对照契约编号。housing 的实践证明：**契约文档是防止「系数漂移无人知晓」的唯一机制**——本次审计发现的 P0 问题，正是契约缺失的后果。

### A3 ★★★ 校准与回测纪律（来自 yangtze/scripts/calibrate.mjs + quant-lab runBacktest）

**现状**：14 个系数全是「可辩论的判断」（README 自己承认），但没有任何机制让辩论落地。yangtze 用校准脚本让锚点贴合真实路网；quant-lab 用回测让策略面对历史数据。

**方案（预测模型版回测）**：`scripts/backtest.cjs` + 面板新标签「模型体检」：
- 把 **1900–2020 已收尾的历史片段**编码为伪情景（第二次工业化→劳动力转移、1970s 自动化→劳动份额、平台经济→俘获上升、1929/2008→冲击传导），跑引擎，对照史实方向做定性断言（劳动份额应降、俘获应升……）。
- 输出**「模型不能重现的历史」清单**——如同回测报告里的失败策略。这份清单比任何文案都更能维持「这是显微镜不是预言」的诚实。
- 每次改系数后必须跑：校准回归测试（calibrate.mjs 的迭代收敛思路可用于调 `COLLAPSE_GAIN`）。

### A4 ★★ 不确定性表达：蒙特卡洛结局云（来自 quant-lab 显著性思维）

**现状**：结局是点估计；引力百分比给出虚假精度（本次审计 P0-1 的根源之一就是单点裁决）。

**方案**：MC 模式——全拨杆 ±8% 扰动 × 200 次 → 结局分布直方图（「封建 62% / 崩解 21% / …」）。把「引力百分比」（同一参数下的归一化比较）与「结局概率」（参数不确定性下的分布）在 UI 上明确分开，后者才是用户真正想问的。quant-lab 的教训：**没有分布的预测都是修辞**。

### A5 ★★ 快照持久化 + 不信任式校验（来自 middle-earth storage.js）

**现状**：拨杆/剧本选择只活在 React state，**刷新即丢**——用户调好的参数组合没有任何留存。

**方案**：照抄 middle-earth 模式：版本化快照（`{v, target, scenario, year}`）→ localStorage，注入 `store` 以保持可测；加载时对**当前** LEVERS 键集校验，无效键**逐项丢弃而非整体拒绝**（「陈旧存档是损失的便利，不是值得报错的异常」——storage.js:15 的原则）。

### A6 ★★ 启动期数据校验（来自 housing collector 的三重校验精神，转用于静态数据）

**现状**：`targetOf()` 原样复制 SCENARIOS 里的键，`leversAt()` 只读已知键——**剧本 values 里的拼错键被静默忽略**（如 `labour_power` 不会报错，只是不生效）。对无外部数据的模型，静态数据就是它的「采集层」，同样的警觉应当适用。

**方案**：启动断言 + 测试：SCENARIOS.values 的每个键必须 ∈ LEVERS 键集；事件 `cond` 引用的指标键必须 ∈ derive 输出。一行 `Object.keys` 循环，堵住「改杠杆名后剧本静默失效」这类未来 bug。

### A7 ★ 渐进式披露（来自 middle-earth spoiler.js 白名单）

**现状/前瞻**：P3 计划新增 15 杠杆（14→29），全平铺会毁掉「演化引擎」页的可用性。

**方案**：spoiler.js 的白名单分级思路 → 「基础 8 杠杆 / 高级全部」两层披露；STAGES 卡片同理（先 thesis，展开 detail+数值口径）。注意 spoiler.js 注释里的教训：**分级字段表必须与数据键显式对齐**，靠黑名单漏词必然失效。

### A8 ★ locale 真正接线（来自所有插件的完整 zh/en）

**现状**：package.json 声明注入 `@deepseek-ai/dsh-client-locale`，但 client.js **从未使用**；`en.json` 只有 meta 两行，全部 UI 文案硬编码中文。声明了不用的注入应删除；或者把 LEVERS/EVENTS/结局文案迁入 locale（工作量中等，可在 P3 新杠杆时顺带做——新文案反正要写两遍）。

### A9 ★ 运行历史与信号分级（来自 housing analysis.js 的 history/alerts）

**方案**：保留用户最近 N 次推断（参数+结局+时间），面板可回看「我上次的判断」；diagnose 的 tags 升级为 warn/info/good 三级（housing 的 LEVEL_ORDER 排序权重模式），高危项置顶。

---

## 三、明确不吸收的（类别护栏）

| 不吸收 | 理由 |
|---|---|
| 实时采集层（yangtze 路况栅格、housing 爬虫、iptv HLS） | 预测模型无外部数据源；引入实时数据会把「条件显微镜」变成数据仪表盘，类别错位 |
| TMDB 式外源增强（movie-kb） | 同上；且引入 API key 依赖违背 Singularity 的零运行时依赖卖点 |
| 权重化推荐引擎（movie-kb recommend） | 解决「候选集排序」，与「条件→形态推演」是不同问题域 |
| Jenks 自然断点梯队（housing） | 梯队是横截面比较工具；Singularity 的四路径是理论类别，不该被数据驱动切分 |
| 地图/瓦片/P2P/市场等基建 | 与模型无关 |

---

## 四、落地顺序（与 AUDIT-FIXES.md 合并）

1. **v1.0.1 修 bug**：AUDIT-FIXES 的 P0 三项（文案条件化、崩解无门槛通道、inWindow）。
2. **v1.1 结构**：A2 引擎抽模块 + MODEL-CONTRACT.md（先行，为后续一切铺路）→ A6 启动断言 → A5 快照持久化。
3. **v1.2 能力**：A1 agent 工具 ×3 → A4 蒙特卡洛结局云 → A9 运行历史。
4. **v1.3 诚实性**：A3 回测/校准脚本 + 「模型体检」标签 → P1-2 系数透明化。
5. **v2.0 动力学**：AUDIT-FIXES P2 反馈回路 → P3 新杠杆（分批，A7 渐进披露护栏）。
