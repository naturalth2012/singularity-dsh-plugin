# v2.2 需求细分：calibration 数据串 i18n

> 阶段 1／8：需求细分。本文件只做分类与边界划定，不做方案。

## 1. 实测数据

`docs/calibration.json` 共 **40 个中文字符串字段**。按用途分三类：

### A 类：引擎语义 —— 永不翻译（26 个）

这些是**模型语义常量**，且部分是**查找键**，翻译会让功能直接失效。

| 字段 | 数量 | 判定依据 |
|---|---|---|
| `outcomeDistribution[].name` | 7 | **`OUT_COLORS[o.name]` 用作查找键**——翻译后取不到颜色，全部回退灰 |
| `stageReachability.stages[].name` | 11 | 引擎 `STAGES` 的镜像；**实测在 client.js 里出现 0 次（从不渲染）** |
| `stageReachability.structurallyUnreachable[].name` | 1 | 同上 |
| `stageReachability.rareButReachable[].name` | 1 | 同上 |
| `anchors[].outcome` | 6 | 引擎结局名，且与 `outcomeDistribution` 同源 |
| **合计** | **26** | |

**A 类的硬证据**：`OUT_COLORS = { '停滞的资本主义': '#7b8ba3', ... }`，
渲染时 `OUT_COLORS[o.name] || '#7b8ba3'`。翻译 `name` 会让**全部 7 个结局条变灰**。

> 审核修正：初稿写「24 个」，实测 **26 个**（7+11+1+1+6）。
> 且 `stages` 11 个**根本不渲染**——它们是给 JSON 读者看的，不是 UI 元素。

### B 类：可翻译长文案（8 个）

纯渲染文本，无查找用途。

| # | 字段路径 | 字数 |
|---|---|---|
| 1 | `note` | 42 |
| 2 | `asymmetries.collapseGain.caveat` | 70 |
| 3 | `asymmetries.socialDemocracy.caveat` | 65 |
| 4 | `asymmetries.chattering.caveat` | 37 |
| 5 | `stageReachability.structurallyUnreachable[0].reason` | 65 |
| 6 | `stageReachability.rareButReachable[0].note` | 131 |
| 7 | `stageReachability.start2024.caveat` | 115 |
| 8 | `stageReachability.techOnlyBeforeGate.caveat` | 87 |

### C 类：anchors 剧本显示名（6 个，可翻）

`anchors[].name` 形如「基准线 · 技术狂奔，制度滞后」。审核确认：
渲染用 `a.name`，查找键是 **`a.scenario`**（`h('tr', { key: a.scenario })`），
所以 `name` 是**纯显示文本，可翻译**。

### 数量校验

`A(26) + B(8) + C(6) = 40`，与实测中文字段总数**完全吻合**。

## 2. 关键约束（实测，非推测）

| 约束 | 证据 |
|---|---|
| 文案全部硬编码在 `scripts/calibrate.cjs` | 行 172/196/204/210/221/225/234/241，全部单字符串无模板变量 |
| 链路三层 | `calibrate.cjs` → `docs/calibration.json` → `inject-calibration.cjs` → `client.js` 的 `HEALTH_DATA` |
| `inject` 用白名单 slim 映射 | 只带 11 个字段；新增字段必须同步改 slim |
| `client.js` 读取点是**函数内** | `healthTab` 是 `SingularityApp` 内的闭包，**能直接看到 `t`**——不像 B2a 的模块级组件 |
| 现有断言查中文 | 翻译后需保证中文环境逐字不变 |

## 3. 与 v2.1 的差异（为什么这次更简单）

v2.1 最难的问题是 `StageTrack`/`Metric` 定义在 `t` **之前**，拿不到翻译函数。
**v2.2 没有这个问题**——`healthTab` 是闭包内的箭头函数，`t` 在作用域里。

风险从「作用域」转移到「数据链路」：JSON 结构变化必须三层同步，
任一层漏改会导致字段 `undefined` 而非报错（静默失败）。

## 4. 边界划定

### 做
- B 类 8 条长文案 + C 类 6 条剧本名的英文版
- `calibration.json` 增加平行 `*En` 字段
- `inject-calibration.cjs` 的 slim 白名单同步
- `client.js` 按当前 locale 选字段，缺失时回退中文
- 中文环境行为逐字不变（硬不变量）

### 不做
- **A 类 24 个引擎语义**（翻译会让结局色条全灰）
- 不改 `calibrate.cjs` 的**计算逻辑**（只加 `*En` 字面量）
- 不改引擎区
- 不引入运行时网络请求（保持构建期注入）
- 不为 calibration 单独做语言切换器

## 5. 验收标准

1. 英文环境下体检页 10 条文案显示英文，中文环境**逐字不变**
2. `docs/calibration.json` 与 `client.js` 的 `HEALTH_DATA` 仍一致（现有契约断言）
3. 结局色条**7 个颜色全部正常**（证明 A 类未被误翻）
4. 新增 `*En` 字段全部非空、无中文残留
5. 测试总数只增不减
6. 引擎区零漂移

## 6. 需求审核（阶段 2／8）

对上述需求逐条实证复核，抓到 **3 个错误**和 **1 个新发现的失败模式**。

### 错误 1：A 类数量算错（24 → 26）

初稿写「24 个」，实测 7+11+1+1+6 = **26**。已修正。
数量对不上说明我当时是估的，不是数的——这正是审核要抓的。

### 错误 2：B 类表格有凑数行

初稿表格列了 9 行，第 9 行「`anchors[].name` 15×6」被重复列在 C 类，
第 10 行是空的「（预留）」。实际 B 类只有 **8** 条。已修正。

修正后 `A(26) + B(8) + C(6) = 40`，与实测总数**完全吻合**——
这是比「看起来合理」强得多的验证。

### 错误 3：`stages[].name` 根本不渲染

初稿把它列进 A 类（作为「引擎镜像」），但实测 `stageReachability.stages`
在 client.js 里**出现 0 次**。它只是给 JSON 读者看的，不是 UI 元素。
保留在 A 类（不翻）是对的，但**理由要说对**：不是「怕翻译破坏功能」，
而是「根本不上屏，翻了也没用」。

### 新发现的失败模式：slim 白名单漏改 = 静默失败

`inject-calibration.cjs` 用**显式白名单** `slim` 只带 11 个字段。
若在 `calibration.json` 加了 `caveatEn` 但忘了改 `slim`：

```
calibration.json 有 caveatEn
  → slim 不映射 → HEALTH_DATA 无 caveatEn
  → client 读 d.caveatEn === undefined
  → 渲染空字符串，不报错、不崩溃
```

**这是静默失败**，比崩溃危险——测试若只查「页面能渲染」会全绿，
但英文用户看到的是空白。

**方案必须显式处理**：
1. `slim` 逐个字段映射（不用展开运算符，避免带出多余字段）
2. `client` 读取时 `d.caveatEn || d.caveat` 兜底
3. **新增契约断言**：`calibration.json` 里每个 `*En` 字段，
   必须在 `HEALTH_DATA` 里也存在且非空

### 审核确认成立的三条

| 断言 | 证据 |
|---|---|
| `anchors[].name` 可翻 | 渲染 `a.name`，查找键是 `a.scenario`（`key: a.scenario`） |
| `healthTab` 能看见 `t` | 定义行 2327，`SingularityApp` 行 1572，`t` 行 1576——是闭包 |
| 文案全硬编码 | calibrate.cjs 行 172/196/204/210/221/225/234/241，无模板变量 |

## 7. 待确认（需用户决策）

1. **`*En` 平行字段 vs 嵌套 `{zh,en}`**
   我判定用**平行字段** `caveatEn`。理由：现有断言 `joined.includes('该系数是编译期常量')`
   直接查字符串；若 `caveat` 变成对象，这条断言会静默失效（`includes` 对象 → false）。

2. **`anchors[].name` 确认可翻**（剧本显示名，非查找键）。

