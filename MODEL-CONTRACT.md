# Singularity 模型契约

> 版本 **2.2.0** ｜ 对应代码 `client.js` 引擎区（ENGINE-BEGIN…ENGINE-END）
> 本文档是模型假设的**可核对清单**。代码里任何常数或公式的改动，都必须同步更新本文档；
> `scripts/contract-check.cjs` 在回归中拦截二者的漂移。

Singularity 是一个**预测模型**，不是数据展示面板。它的输出不是「事实」，而是
「给定这些假设，2060 年的社会形态会落在哪一支」。因此本文档的首要目的是让读者
能够**质疑假设本身**——每一条公式、每一个系数都可被指出问题。

---

## 1. 时间轴与插值

| 符号 | 值 | 含义 |
|------|-----|------|
| `T0` | 2024 | 起点年 |
| `T1` | 2050 | 插值终点年（杠杆抵达目标值） |
| `T2` | 2060 | 推演终点年 |

逐年推进 `year = 2024 … 2060`，共 **37 个年度快照**。

**杠杆插值**（`leversAt`）：

```
u  = clamp((year - T0) / (T1 - T0))
t  = u^0.78   （技术杠杆，早期快）
     u^1.90   （制度杠杆，滞后明显）
     u^1.45   （社会杠杆）
     u        （摩擦杠杆，线性）
值 = lerp(NOW[k], 目标值[k], smooth(t))       smooth(t) = t²(3−2t)
```

制度滞后于技术是这个模型的核心叙事，`u^1.90` 与 `u^0.78` 的对比就是它的数学表达。

**目标值解析**：若用户未指定某杠杆，技术杠杆取 `TECH_TREND`（自主趋势），
其余取 `NOW`（现状保持）。

---

## 2. 十四个杠杆

技术（`TECH_KEYS`，插值指数 0.78）：

| key | 名称 | 现状 `now` | 自主趋势 | 含义 |
|-----|------|-----------|---------|------|
| `cognition` | AI 认知能力 | 0.42 | 0.93 | AI 在认知劳动上的相对能力 |
| `compute` | 算力丰裕度 | 0.38 | 0.86 | 单位算力成本之倒数 |
| `automation` | 实体自动化率 | 0.30 | 0.80 | 机器替代物理劳作的覆盖度 |
| `energy` | 能源自给度 | 0.35 | 0.74 | 算力与自动化的最终物理约束 |

制度（`INST_KEYS`，插值指数 1.90 —— 最滞后）：

| key | 名称 | 现状 | 含义 |
|-----|------|------|------|
| `redistribution` | 再分配强度 | 0.28 | 税收与转移支付力度 |
| `public_ownership` | 公共产权占比 | 0.18 | 核心生产资料的公有比例 |
| `coordination` | 全球协同度 | 0.25 | 跨国协调能力 |
| `labor_power` | 劳动者组织度 | 0.32 | 劳动者议价能力 |

社会（`SOCIAL_KEYS`，插值指数 1.45）：

| key | 名称 | 现状 | 含义 |
|-----|------|------|------|
| `meaning` | 意义供给度 | 0.22 | 后劳动时代的意义结构供给 |
| `education` | 教育与再技能 | 0.35 | 人力资本更新速度 |
| `solidarity` | 社会团结度 | 0.33 | 社会信任与合作意愿 |

摩擦（线性插值）：

| key | 名称 | 现状 | 含义 |
|-----|------|------|------|
| `transition_shock` | 转型冲击强度 | 0.55 | 技术替代与制度适应之间的落差 |
| `conflict` | 阶级对抗烈度 | 0.45 | 分配矛盾激化程度 |
| `capture` | 资本俘获度 | 0.52 | 资本对规则制定权的掌控 |

**合计 14 个杠杆**：技术 4 + 制度 4 + 社会 3 + 摩擦 3。

---

## 3. 派生指标（`derive`）

```
tech        = 0.30·cognition + 0.25·compute + 0.25·automation + 0.20·energy
potential   = 0.20 + 0.80·tech                        技术潜力（知识不因战争消失）
devastation = clamp(0.70·clamp((conflict−0.50)/0.50)
                  + 0.30·clamp((transition_shock−0.50)/0.50))
productivity= potential · (1 − devastation)            有效产出（被冲突真实摧毁）

cogEff      = clamp((cognition − 0.28)/0.62)
raw         = 0.55·automation + 0.45·cogEff
gross       = 0.92·(1 − exp(−2.4·raw))                 毛替代压力
replacement = clamp(gross · (1 − 0.30·education))      净岗位替代

labor_share = clamp(0.62 − 0.42·replacement − 0.12·capture, 0.05, 0.62)
socialization=0.45·public_ownership + 0.35·redistribution + 0.20·coordination
abundance   = clamp(productivity · (0.45 + 0.55·socialization))   可及丰裕度
penetration = clamp(0.60·gross + 0.40·clamp((potential−0.22)/0.78))  技术渗透度
pace        = clamp((gross − prev.gross)/0.030)
shock       = clamp(0.58·transition_shock + 0.42·pace)

inequality  = clamp(0.26 + 0.60·replacement·(1−0.60·redistribution)
                    + 0.22·capture − 0.20·public_ownership, 0.16, 0.96)
development = clamp(0.42·abundance + 0.18·meaning + 0.12·solidarity
                    + 0.12·education + 0.16·socialization)
freedom     = clamp(0.34·abundance + 0.24·(1−capture) + 0.22·meaning + 0.20·labor_power)
cohesion    = clamp(0.42·solidarity + 0.33·(1−conflict) + 0.25·meaning
                    + 0.15·(1−shock) − 0.12·inequality)
collapse_risk = clamp(0.44·conflict + 0.34·shock + 0.20·capture
                    − 0.46·redistribution − 0.22·education − 0.18·solidarity)
feudalism_risk= clamp(0.46·capture + 0.24·(1−public_ownership)
                    + 0.18·(1−coordination) + 0.12·(1−redistribution))
```

**关键设计说明**：`penetration`（阶段推进）用 `gross` 与 `potential`，**不**使用
`replacement`，因此教育不会反向阻碍阶段推进（这是 v1.0.0 修复的教育悖论）。

---

## 4. 三区裁决语义

引擎按**终年（2060）状态**把任何参数组合划入三个互斥分区，结局由分区决定：

| 分区 | 条件 | 结局 |
|------|------|------|
| **毁灭区** | `devastation > 0.5` | 文明崩解（物理入口，**先于一切裁决**） |
| **裁决区** | `penetration ≥ GATE_PEN (0.68)` 且未毁灭 | 引力最高者决定 |
| **悬置区** | `penetration < 0.68` 且未毁灭 | 停滞的资本主义 |

**判定顺序**（`stageOf`）：

```
1. devastation > 0.5           → 文明崩解（物理入口）
2. penetration < 0.38          → 算法资本主义
3. penetration < 0.56          → 极化资本主义
4. penetration < 0.68          → 分岔点（尚未裁决）
5. 裁决区：decidePath(scores)
   ├─ collapse          → 文明崩解
   ├─ feudalism         → 算力封建制
   ├─ social_democracy  → 改良资本主义
   └─ communism         → 按社会化度内部分档：
        socialization < 0.48              → 未竟的过渡
        abundance < 0.58 或 meaning < 0.46 → 过渡社会
        abundance < 0.78 或 socialization < 0.72 → 共产主义初级形态
        否则                                → 自由人联合体
```

**悬置区的诚实性**：引力数值永远在计算，但只有裁决区里「引力最高者 = 实际结局」
成立。悬置区的引力是**悬置**的，`diagnose()` 会明确输出「引力悬置，历史尚未进入
裁决」，而不会声称引擎「据此判定」——这是 v1.0.1 修复的假因果问题。

---

## 5. 四条引力（`branchScores`）

先算原始分，再**归一化为百分比**（四项和为 1）：

```
captureEffect = capture · (0.55 + 0.20·(1−public_ownership)
                         + 0.15·(1−coordination) + 0.10·(1−redistribution))
feudalism     = captureEffect

reformRoom    = clamp((0.62 − public_ownership)/0.62)
social_democracy = (0.34·redistribution + 0.24·labor_power + 0.12·(1−capture))
                   · (0.45 + 0.55·reformRoom)

communism     = 0.42·public_ownership + 0.24·coordination
                + 0.16·solidarity + 0.18·meaning

collapse      = COLLAPSE_GAIN · clamp(
                  0.45·clamp((conflict−0.45)/0.55)
                + 0.25·clamp((shock−0.45)/0.55)
                + 0.30·clamp((0.55−cohesion)/0.55))
```

`decidePath` 取四项中最大者（平局时按 `Object.keys` 顺序，实际由 `>` 严格比较
决定首个最大值）。

---

## 6. 闸门常数

| 常数 | 值 | 作用 |
|------|-----|------|
| `GATE_PEN` | **0.68** | 技术越线阈值：越过才打开分岔窗口，引力才进入裁决 |
| `GATE_SOC` | **0.48** | 社会化度闸门：共产主义引力占优时，低于此值只能到「未竟的过渡」 |
| `COLLAPSE_GAIN` | **1.8** | 崩解引力的增益系数（见第 8 节非对称说明） |
| 毁灭区阈值 | **0.5** | `devastation > 0.5` 直入文明崩解 |
| 带伤停滞阈值 | **0.25** | 悬置区内 `devastation > 0.25` 时使用「带伤的停滞」文案 |

---

## 7. 阶段轨道与窗口

**主轨七阶段**（`STAGES`，id 0–6）：商业资本主义 → 算法资本主义 → 极化资本主义
→ 分岔点 → 过渡社会 → 共产主义初级形态 → 自由人联合体。

**旁支阶段**（`EXTRA_STAGES`）：

| id | key | 名称 |
|----|-----|------|
| 7 | `feudalism` | 算力封建制 |
| 8 | `social_democracy` | 改良资本主义 |
| 9 | `collapse` | 崩解 |
| 10 | `stalled` | 未竟的过渡 |

**分岔窗口**（`locateWindow`）：

```
start   = 首个 penetration ≥ 0.56 的年份
crossed = 首个 penetration ≥ 0.68 的年份
passed  = 首个 penetration ≥ 0.68 且 socialization ≥ 0.48 的年份

若 passed 存在 → { start, end: passed,  type: 'passed',  gate_year: passed }
否则          → { start, end: crossed, type: 'blocked', gate_year: null }
```

窗口内所有年份标记 `inWindow = true`（**两种类型都标记**）。

**窗口不是裁决时刻（v1.5 明示）**：裁决使用 **2060 终年**的引力，而窗口标记的是
「技术越线至闸门关闭」的敏感区间。两者可能给出不同的胜者——实测 3000 组随机参数中
578 个有窗口样本里至少 6 个满足「窗口末年胜者 ≠ 终年胜者」（如窗口末 collapse →
终年 communism）。UI 在检测到该情况时显示「晚期反转」标注。
读法：窗口告诉你历史最敏感的区间，终年引力告诉你引擎实际定案的方向，二者不可混同。

**引力上限非对称（v1.5 明示）**：四条引力理论上限并不相等——
`collapse` 因 `COLLAPSE_GAIN = 1.8` 高于其余三条的 1.0，`social_democracy` 因
`reformRoom` 折减上限约 0.70。四条并排显示会**低估**社民路径的真实可能性。
另有一条未在早期声明、v1.5 补注的路径依赖：5000 组随机样本中社民胜出 255 次，
**255/255 全部伴随 `public_ownership < 0.62`**（产权已高度公有化时改良空间为 0）。

### 7.1 阶段可达性（v1.8 明示）

`STAGES` 数组有 7 个主轨阶段（id 0–6），但 `stageOf` **不会返回 id 0**：

```
if (pen < 0.38) return STAGE_BY_ID[1];   // 算法资本主义 —— 最低档
```

没有 stage 0（商业资本主义）的返回分支。实测 20000 组随机参数 × 37 年
= **74 万个年份快照中 stage 0 出现 0 次**。

**读法**：`STAGES[0]` 是**前史标注**，用于叙事与阶段轨道展示（「我们从哪来」），
不是引擎会返回的运行时状态。这不影响任何结局或指标计算，但会让读者误以为
「2024 年应该处于商业资本主义」——实际上引擎在 2024 年就返回 stage 2。

对照：stage 6（自由人联合体）**是可达的**，只是条件极严（需同时满足
`pen≥0.68`、communism 引力胜、`soc≥0.72`、`abu≥0.78`、`meaning≥0.46`）。
六剧本中「全域共享」可稳定到达；随机空间里极罕见（另一批无种子 20000 组中出现 4 组）。
「不可达」与「稀有」是两件事，不可混为一谈。

### 7.2 2024 起点固定（v1.8 明示）

`leversAt(2024)` 的 `u = 0`，所有杠杆取 `NOW` 基准值，因此
**2024 年技术渗透度恒为 0.4008，与用户如何拨杠杆完全无关**
（杠杆全零与全拉满，首年渗透度完全相同）。

这是插值起点的设计使然，不是 bug。但它造成一个观感问题：时间轴停在 2024 时
显示的阶段恒为「极化资本主义」，而叙事上 2024 应是前史向算法资本主义的过渡。
面板在阶段轨道上把 stage 0 标为「前史」以缓解这一错位。

### 7.3 岔路前阶段由技术单变量决定（v1.8 明示，P1-3）

`pen < GATE_PEN`（0.68）时，`stageOf` 只看 `penetration`：

```
pen < 0.38 → stage 1
pen < 0.56 → stage 2
pen < 0.68 → stage 3
```

制度、社会、意义杠杆在此阶段**完全不参与阶段判定**。实测：固定 `pen`，
扫遍 socialization / abundance / meaning 的全网格（1625 个样本），阶段恒定不变。

**这是模型最该被质疑的简化之一**：它意味着「一个制度完全崩溃但技术仍在推进的世界」
与「一个制度健全的世界」在前三阶段看起来一样。制度杠杆只在越过 0.68 闸门后
才开始裁决历史方向。改动此逻辑会改变全部基线，已排入 v2.0。

---

## 8. 结局文案分桶（`resolveOutcome`）

| 触发条件 | 结局名 | 类型 |
|---------|--------|------|
| stage id 10 | 未竟的过渡 | transition |
| stage id 9（devastation > 0.5） | 文明崩解 | offshoot |
| stage id 7 | 算力封建制 | offshoot |
| stage id 8 | 社会民主主义终点 | offshoot |
| stage id 6 | 自由人联合体 | main |
| stage id 5 | 共产主义初级形态 | main |
| stage id 4 | 过渡社会 | transition |
| 兜底且 `devastation > 0.25` | 停滞的资本主义（带伤版） | offshoot |
| 兜底其余 | 停滞的资本主义 | offshoot |

带伤版文案：`旁支 · 带伤的停滞` / 「技术没有强到能摧毁旧秩序，而对抗先消耗了
它的耐心。」并注明冲突摧毁了 `devastation×100%` 的有效产出。

---

## 8b. 租金压力（v1.2 · 只读显示指标，不参与裁决）

**租金压力 `rentPressure(s)`**：当期杠杆状态的即时读数，衡量「产出分配
在多大程度上依赖垄断性占有而非生产率」。权重沿用「后稀缺沙盘」的
技术租金占比公式，经六剧本 + 20000 随机态校准（2026-11-25）：

```
rentPressure = (0.50·(1−public_ownership) + 0.20·(1−energy) + 0.30·capture)
             × (0.35 + 0.65·cognition)
```

**三档阈值（`RENT_BANDS`，校准定稿）**：

| 档位 | 阈值 | 语义 |
|------|------|------|
| 关注 watch | ≥ 0.45 | 租金积累进入可见区间 |
| 预警 warn | ≥ 0.60 | 租金化路径正在形成 |
| 成形 formed | ≥ 0.75 | 技术封建主义稳态成形 |

校准分离度：techno_feudalism 峰值 0.76（2038 越预警线）→ 成形；
collapse 0.68（2039）→ 预警；baseline 0.59 → 关注；social_democracy
0.53 → 关注；planned_transition 峰值 0.48、终值 0.32 → 消退；
commons 峰值 0.45、终值 0.08 → 深处安全。六剧本等级与结局语义一一对应。

**`rent` 年度字段**：`simulate()` 的每个 `years[i]` 行携带
`rent = rentPressure(levers)`（只读，[0,1] 值域）。

**`findCrossing(years, get, threshold)`**：在逐年行上返回首次
`get(row) >= threshold` 的 `{ year, value }`，无越线返回 `null`。
纯查询函数；`get` 是行选择器，可复用于租金以外的任何年度序列。

**单一裁决函数承诺**：`rentPressure` 不出现在 `decidePath` 调用链中
（contract-check 以函数体断言机器强制）。它只服务于指标矩阵展示与
越线预警，不改变任何结局判定。

---

## 8c. 政策干预与稳健性（v1.3 · 只读实验层，不改变模型语义）

**政策 `policy = { year, overrides }`**：`year` 为 (2024, 2060] 整数；
`overrides` 的键必须是已知杠杆键，值 clamp 到 [0,1]。非法即抛错
（沿用 v1.1 场景键校验风格）。

**`leversPolicyAt(year, tgt, policy)`**：干预年前与 `leversAt` **完全一致**；
从干预年起，从「干预年的原轨迹值」**无缝衔接**向政策目标重插值
（组指数沿用 0.78/1.90/1.45），未被 override 的杠杆沿原轨迹。

**`simulate(target, policy)`**：第二可选参。不传时与 v1.2 结果逐字节一致；
每年行追加只读标记 `policyActive = year >= policy.year`。

**`robustness(target, policy, rng?)`**（蒙特卡洛，吸收自理论文档
「输出统计分布而非单一结果」）：默认 240 次，target 各杠杆 ±0.08
均匀扰动、政策 override ±0.04；返回 `{ runs, outcomes, dominant,
agreement }`。`rng` 可注入，测试用种子保证确定性。

**`reversal(target, policy)`**（反方读法）：对四个制度杠杆做 ±0.05
步进扫描，返回翻转当前结局的**最小单杠杆干预**
`{ lever, from, to, outcome, delta }`；无任何单杠杆可翻转 → `null`
（结论稳健的强信号）。

**`mulberry32(seed)`**（v1.4）：种子随机数生成器（返回 [0,1) 函数），
供显示层确定性统计使用——情景对比页的稳健性列以剧本键哈希为种子，
刷新可复算。纯显示辅助，不进任何裁决链。

**政策不持久化**：政策状态只存在于当前会话（不入 localStorage），
载入剧本即清空——政策是**实验**，不是世界观。

**单一裁决函数承诺（扩展）**：`decidePath` 函数体不引用
`rentPressure` / policy / `robustness` / `reversal`（机器断言强制）。

---

## 9. 已知非对称与局限（**请重点质疑这里**）

1. **`COLLAPSE_GAIN = 1.8` 高于其他三条路径的 1.0**。这使崩解引力在随机参数空间
   中赢面偏大（实测约 23.8%）。理由是「崩解是正反馈过程，其引力应随自身实现而
   增强」；但这个系数没有独立实证依据，是模型中最应被质疑的设定。
2. **社会民主主义引力上限约 0.70**（因 `reformRoom` 折减），共产主义与算力封建
   上限接近 1.0。归一化后四项并排显示，会**低估**社民路径的真实可能性。
3. **社会民主主义路径存在未声明的路径依赖**：5000 组随机样本中该路径胜出的
   100% 伴随 `public_ownership < 0.62`。产权已高度公有化时，改良空间为 0。
4. **模型是前馈直线推演，不是动力学系统**。所有摩擦变量是外生拨杆，社会对自身
   状态没有反馈，没有内生临界点，只有两个人工闸门（0.68 / 0.48）。这是 v1 的
   结构性限制，v2 计划引入四条反馈回路。
5. **`education` 只影响 `replacement` 与 `development`，不影响 `penetration`**。
   这是有意为之（避免教育悖论），但也意味着教育无法延缓技术渗透。
6. **`tech` 权重中 `cognition` 0.30 最高**，隐含「认知能力是技术变革首要驱动」
   的判断；若认为算力或能源更关键，需调整此权重。
7. **事件触发采用「首次满足即命中」**（`triggeredEvents`），且年份单调不减，
   因此事件年份是该条件首次成立的年份，而非剧本预设年份。
8. **生态天花板不在模型域内**（v1.2 吸收自「后稀缺沙盘」R2 反驳）：位置品、
   注意力与生态容量类稀缺不可自动化，`abundance` 上限不受 `energy` 单杠杆
   支配；模型中的「丰裕」只对标准化物质与服务产出成立，按需分配的物理上限
   并未建模。
9. **租金压力是静态函数，非动力学反馈**（v1.2）：`rentPressure` 是当期杠杆的
   即时读数，无存量积累、无对占有结构的反噬回路；它与第 4 项（前馈直线推演）
   同源，但在新增指标上单独声明——读者不应把越线年份当作动力学预测。
10. **政策重定向仍是前馈插值**（v1.3）：override 后的曲线沿用原组指数，
    不引入内生制度反馈——政策在模型中是「换一条插值目标」，不是「社会对
    政策的反应」。干预年与力度的组合在分布上可比较（robustness），但
    单次轨迹的「政策效果」不可当作因果估计。

---

## 10. 契约核对方式

```bash
node scripts/contract-check.cjs    # 文档与代码一致性
node tests/engine.test.cjs         # 模型行为
node tests/adversarial.test.cjs    # 对抗回归（分布/一致性/稳定性/诚实性）
node tests/mount.test.cjs          # 插件契约与渲染
node tests/deeptab.test.cjs        # 深层渲染冒烟
node scripts/preflight.cjs         # 发布一致性
```

## 11. 对外接口（v1.6）

引擎除了面板，还通过三个 **agent 工具**暴露（`index.js`，Host 侧）：

| 工具 | 入参 | 用途 |
|---|---|---|
| `singularity_simulate` | `scenario` 或 `levers`（+ 可选 `policy`） | 跑一次推演，返回结局与读数 |
| `singularity_sensitivity` | `scenario` 或 `levers` | ±10% 敏感度排名 |
| `singularity_compare` | 可选 `includeRobustness` | 六剧本对照 |

**实现约束**：工具从 `engine.snapshot.js` 装载引擎（不做第二份切片——三份副本必然漂移），
只读、无状态。契约核对脚本会**真实装载 index.js 并执行三个工具**，断言结果与
`simulate` 直调一致。

**边界**（也写在工具描述里）：工具是条件推演而非预言，不回答「哪一年会发生什么」；
政策是前馈插值（§9.10），不提供因果估计。

## 12. 校准报告（v1.6）

`docs/calibration.json` 由 `npm run calibrate` 生成，记录：随机参数空间的结局/引力分布、
租金分位、三条已知非对称的实测值、六剧本锚点。面板「模型体检」页只读展示它。

**两条一致性约束**（由测试守护）：
1. 报告与同种子重算必须**逐组相同**（`tests/adversarial.test.cjs` F 组）
2. 面板内联的 `HEALTH_DATA` 必须与报告一致（`contract-check` §7h）——
   注入后忘记重跑 `npm run calibrate` 会被抓到

`contract-check.cjs` 断言：本文档声明的杠杆数、阶段数、四个闸门常数、三区阈值
与代码一致；引擎区不含 React/DOM 引用；每个杠杆 key 在本文档中都被提及。
