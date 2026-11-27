# i18n B2/B3 详细方案

> 阶段：**详细方案**（流程第 4 步）。前置：需求细分与审核已完成，
> 用户已确认三项决策。硬门槛：引擎区逐字节不变、385 项只增不减、中文环境行为不变。

## 0. 用户已确认的决策

| 决策点 | 选择 | 影响 |
|---|---|---|
| 指标名 | **翻译，同时改测试断言** | 需改 5 处测试引用 |
| 72 条拼接片段 | **重构为 `{var}` 模板** | 改视图层代码结构 |
| 马克思引文 | **使用通行英译本** | 用《共产党宣言》标准英译 |

## 1. 校准结果：指标名的三层结构

实测指标名在代码里有三种角色，**必须区别对待**：

| 角色 | 位置 | 处理 |
|---|---|---|
| **标签定义** | `METRIC_META[k].name`（行 1030–1042）、`label:` 数组（1518–1520、1919–1922） | 翻译 |
| **诊断文案** | `d.push({text: '社会化度 ' + pct(...)})`（行 555、567、1154、1828） | **模板化**为 `'社会化度 {v}'` 再翻 |
| **引擎区叙事** | 行 22/352/567 等注释与结局文案 | **不翻**（引擎区） |

关键区分：引擎区的 `'社会化度闸门'` 是注释，`STAGES`/`OUTCOMES` 里的中文是模型数据。
只有**视图层的标签**才翻译。

## 2. 测试断言的改法（用户选了「改断言」）

当前 5 处测试引用中文指标名：

| 文件 | 引用 | 改法 |
|---|---|---|
| `tests/engine.test.cjs` | 生产力、社会化度、技术渗透度 | 改查 key（`productivity`/`socialization`/`penetration`） |
| `tests/adversarial.test.cjs` | 生产力 | 同上 |
| `scripts/contract-check.cjs` | 技术渗透度 | 改查 `METRIC_META.penetration` 结构存在 |

**为什么不直接删断言**：这些断言的价值是「指标存在且语义正确」，
改查 key 后价值不变，且不再依赖中文文案。

**同时保留**：`MODEL-CONTRACT.md` 与 `README.md` 里的中文指标名不动——
文档描述的是中文版契约，仍然准确。

## 3. 分批执行

### B2a：完整短句与状态词（约 90 条）

无拼接、无歧义。例：

```
'年份' → 'Year'
'安全' / '关注' / '预警' / '成形' → 'Safe' / 'Watch' / 'Alert' / 'Forming'
'未启用' / '干预中' / '未干预' → 'Not enabled' / 'Active' / 'None'
'载入' → 'Load'
'（无）' → '(none)'
```

### B2b：72 条拼接片段 → `{var}` 模板（本版最大风险）

**改法示例**：

```js
// 改前
'引力: ' + v + ', 损毁: ' + x
// 改后
t('diag.gravity', { v: v, damage: x })   // zh: '引力: {v}, 损毁: {damage}'
```

**关键约束**：`makeTranslator` 已支持 `{var}` 插值（v2.0 已实现），无需改基础设施。

**风险**：这是**改代码结构**，v1.5 曾因插入 `h()` 导致 `branchTab` 括号失衡两次。
必须每改一批就跑 `render-probe.cjs` 确认七页片段数不降。

### B3：12 条长叙事

含《共产党宣言》引文，用通行英译：

> "In place of the old bourgeois society, with its classes and class antagonisms,
> we shall have an association, in which the free development of each is the
> condition for the free development of all."

## 4. 测试计划

| 套件 | 现有 | 新增 | 预期 |
|---|---|---|---|
| contract-check | 127 | +3（en 无中文残留 / 模板键齐全 / 指标名可翻译） | 130 |
| mount | 72 | +2（t() 支持插值 / 指标标签走翻译） | 74 |
| deeptab | 38 | +2（英文环境指标名为英文 / 中文环境不变） | 40 |
| **合计** | **385** | **+7** | **392** |

## 5. 不变量（每批都必须验证）

1. 引擎区 sha1 === `1dddd7bb…`（33196 字节）
2. 六剧本基线逐字段不变
3. `render-probe` 七页片段数不降（timeline 24 / engine 157 / branch 86 /
   metrics 271 / compare 91 / theory 100 / health 121）
4. 中文环境下界面文字逐字不变
5. 385 项现有断言全绿

## 6. 回滚策略

每批独立提交。若 B2b 引入括号失衡导致片段数下降，
`git revert` 单批即可，不影响 B2a。

## 7. 非目标

- 引擎区 275 条（永不翻译）
- 语言切换器（跟随宿主）
- 屏幕阅读器实机验证（无环境）
- 第三方翻译服务（人工保证质量）

## 8. 方案审核发现的两个漏洞与修正

### 漏洞 1：`StageTrack` / `Metric` 访问不到 `t`（会直接失败）

实测作用域：

| 组件 | 定义行 | 能否访问 `t`（行 1296） |
|---|---|---|
| timelineTab / engineTab / branchTab / metricsTab / compareTab / theoryTab / healthTab | 1492–2202 | ✅ 在 t 之后，同作用域 |
| **StageTrack** | **1175** | ❌ **在 t 之前** |
| **Metric** | **1048** | ❌ **在 t 之前** |

这两个是**模块级函数组件**，不是 `SingularityApp` 内的闭包，所以拿不到 `t`。

**修正**：给它们传 `t` 作为 prop（与 v2.0 给 `SingularityApp` 传 `locale` 同一模式）：

```js
// StageTrack
h(StageTrack, { currentId: ..., onPick: ..., t: t })
// Metric
h(Metric, { ..., t: p.t })
```

**不采用的方案**：把 `t` 提到模块级——那样会破坏「语言跟随宿主、可按实例变化」的语义。

### 漏洞 2：`METRIC_META` 是模块级常量，无法用 `t()`

`METRIC_META` 在行 1030 定义（早于 `t`），且是**常量对象**。
若把 `name` 改成 `t('metric.x')` 会立即执行并固化语言，切换语言不生效。

**修正**：`METRIC_META` 保留 key 与 color，`name` 改为**渲染时查翻译**：

```js
// 常量里改成
socialization: { key: 'socialization', color: '#22c98a' },
// 渲染时
t('metric.' + meta.key)
```

**为什么不直接把 name 设成英文**：中文环境会退化。必须双语。

### 漏洞 3（审核中新发现）：测试断言改查 key 后失去「文案正确性」保护

若测试从「查中文名」改为「查 key」，就再没人保证英文名不是乱码。

**修正**：断言改为**双向**——
- 查 key 存在（结构正确）
- 查 `locale/en.json` 里该 key 的英文值非空且不含中文（文案正确）
