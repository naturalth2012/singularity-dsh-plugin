/* engine.snapshot.js —— 由 scripts/extract-engine.cjs 自动生成，勿手改。
 * 来源：singularity-dsh-plugin client.js ENGINE 区（ENGINE-BEGIN…ENGINE-END）
 * 生成于客户端版本见 package.json；上游 commit 522e3ad。
 * 契约规范：MODEL-CONTRACT.md（含 §8b 租金压力、§8c 政策干预、§9 已知非对称）。
 * 上游仓库：https://github.com/naturalth2012/singularity-dsh-plugin (MIT)
 * 本文件为衍生作品，携带上游版权声明：Copyright (c) 2026 naturalth2012。
 * 重新生成：node scripts/extract-engine.cjs
 *
 * 用法（ESM）：import createEngine from "./engine.snapshot.js";
 *              const engine = createEngine((name) => { throw new Error(name); });
 */
/* eslint-disable */

export default function createEngine(requires) {
  void requires;   // 引擎区零依赖；参数保留以便宿主注入（游戏侧可传入受限 require）

/* ══════════════════════════════════════════════════════════════
       ENGINE-BEGIN  引擎区（第 1–2 节）
       ------------------------------------------------------------------
       本区是纯预测模型，只依赖 ECMAScript 内置对象（Math / JSON / Object /
       Array）。它不得引用 React、document、window、localStorage 或任何视图
       符号——这样引擎才能被测试与 contract-check 单独提取、逐条核对假设。

       对外契约见 MODEL-CONTRACT.md；常数漂移由 scripts/contract-check.cjs
       在回归中拦截。改动本区任何公式或常数，必须同步更新该文档。
       ══════════════════════════════════════════════════════════════ */

    /* ══════════════════════════════════════════════════════════════
       1. 数据层
       ══════════════════════════════════════════════════════════════ */
    const T0 = 2024, T1 = 2050, T2 = 2060;
    const GATE_SOC = 0.48;      // 社会化度闸门
    const GATE_PEN = 0.68;      // 技术越线阈值
    const COLLAPSE_GAIN = 1.8;  // 崩解引力增益（模型中最需被质疑的系数）

    const TECH_KEYS = ['cognition', 'compute', 'automation', 'energy'];
    const INST_KEYS = ['redistribution', 'public_ownership', 'coordination', 'labor_power'];
    const SOCIAL_KEYS = ['meaning', 'education', 'solidarity'];

    const LEVERS = [
      { key: 'cognition', name: 'AI 认知能力', group: '技术', low: '工具型 AI', high: '超人级通用智能', now: 0.42, desc: 'AI 在认知劳动上的相对能力（1.0 = 人类专家均值）。越过阈值后，认知劳动的边际价值开始崩塌。' },
      { key: 'compute', name: '算力丰裕度', group: '技术', low: '稀缺昂贵', high: '近乎免费', now: 0.38, desc: '单位算力成本之倒数。决定「智能」能否像自来水一样普惠供应。' },
      { key: 'automation', name: '实体自动化率', group: '技术', low: '手工劳动', high: '全自动物质生产', now: 0.30, desc: '机器在物理世界替代人类劳作的覆盖度，决定物质生产的边际人力成本。' },
      { key: 'energy', name: '能源自给度', group: '技术', low: '化石能源依赖', high: '聚变/光伏过剩', now: 0.35, desc: '能源是算力与自动化的最终物理约束。能源越丰裕，AI 越不被成本拦截。' },

      { key: 'redistribution', name: '再分配强度', group: '制度', low: '无转移支付', high: '全民基本收入 + 公共品全覆盖', now: 0.28, desc: '税收与转移支付力度。决定 AI 红利流向资本还是流向全体成员。' },
      { key: 'public_ownership', name: '公共产权占比', group: '制度', low: '完全私有', high: '生产资料全社会共有', now: 0.18, desc: '核心生产资料（算力、模型、能源、自动化产能）由社会共有的比例。' },
      { key: 'coordination', name: '全球协同度', group: '制度', low: '零和博弈', high: '全球统一治理', now: 0.25, desc: '跨国协调能力。低协同下强者独占 AI，形成算力殖民。' },
      { key: 'labor_power', name: '劳动者组织度', group: '制度', low: '原子化个体', high: '集体谈判', now: 0.32, desc: '劳动者在分配谈判中的议价能力。' },

      { key: 'meaning', name: '意义供给度', group: '社会', low: '以职业定义自我', high: '多元价值观', now: 0.22, desc: '社会为「后劳动时代」提供意义结构的能力。低值导致大规模身份危机。' },
      { key: 'education', name: '教育与再技能', group: '社会', low: '一次性学历教育', high: '终身学习 + AI 导师', now: 0.35, desc: '人力资本更新速度，决定劳动者转型阵痛的时长。' },
      { key: 'solidarity', name: '社会团结度', group: '社会', low: '高度原子化', high: '强共同体认同', now: 0.33, desc: '社会信任与合作意愿。它是制度能否落地的暗物质。' },

      { key: 'transition_shock', name: '转型冲击强度', group: '摩擦', low: '渐进平滑', high: '断崖式失业', now: 0.55, desc: '技术替代速度与制度适应速度之间的落差。它是这段历史真正的主角。' },
      { key: 'conflict', name: '阶级对抗烈度', group: '摩擦', low: '协商妥协', high: '全面对抗', now: 0.45, desc: '分配矛盾激化程度。过高会摧毁生产力，过低则制度惰性不除。' },
      { key: 'capture', name: '资本俘获度', group: '摩擦', low: '强监管制衡', high: '寡头俘获国家', now: 0.52, desc: '资本对规则制定权的掌控。这是「AI 封建主义」岔路的引力。' },
    ];

    const LEVER_BY_KEY = {};
    LEVERS.forEach((l) => { LEVER_BY_KEY[l.key] = l; });
    const NOW = {};
    LEVERS.forEach((l) => { NOW[l.key] = l.now; });

    const TECH_TREND = { cognition: 0.93, compute: 0.86, automation: 0.80, energy: 0.74 };

    const SCENARIOS = {
      baseline: { name: '基准线 · 技术狂奔，制度滞后', desc: 'AI 能力一路冲高，再分配与公共产权几乎不动。这是「什么都不做」的世界。', values: {} },
      social_democracy: {
        name: '社会民主主义 · 红利全民分红', desc: '以 AI 税与全民分红吸收冲击，劳动者重新组织，但产权结构仍是私有。',
        values: { redistribution: 0.76, labor_power: 0.62, meaning: 0.52, capture: 0.30, transition_shock: 0.42, education: 0.62 },
      },
      techno_feudalism: {
        name: '算力封建制 · 寡头俘获', desc: '资本俘获度拉满、全球协同归零，AI 成为新领主的封地。',
        values: { capture: 0.90, coordination: 0.10, public_ownership: 0.05, redistribution: 0.08, labor_power: 0.12, meaning: 0.15, transition_shock: 0.80 },
      },
      planned_transition: {
        name: '计划性转型 · 有组织的过渡', desc: '公共产权与再分配同步推进，全球协同成型，转型冲击被制度吸收。',
        values: { public_ownership: 0.58, redistribution: 0.64, coordination: 0.72, education: 0.72, meaning: 0.58, solidarity: 0.62, transition_shock: 0.38, labor_power: 0.55, capture: 0.25 },
      },
      collapse: {
        name: '崩解 · 高冲击 + 高对抗', desc: '断崖式失业叠加全面对抗，生产力被摧毁，退回低技术均衡。',
        values: { transition_shock: 0.95, conflict: 0.92, coordination: 0.12, solidarity: 0.14, redistribution: 0.12, meaning: 0.12, capture: 0.85 },
      },
      commons: {
        name: '全域共享 · 后稀缺共产主义', desc: '算力、能源、自动化产能全部充裕且共有，按需分配，劳动成为自我实现。',
        values: {
          cognition: 0.92, compute: 0.90, automation: 0.90, energy: 0.92, redistribution: 0.90,
          public_ownership: 0.92, coordination: 0.88, meaning: 0.86, education: 0.82,
          solidarity: 0.80, transition_shock: 0.24, conflict: 0.18, capture: 0.08, labor_power: 0.60,
        },
      },
    };

    /* 场景键名启动校验（v1.1）：SCENARIOS 的 values 键若拼错，simulate 会静默
       忽略它（targetOf 直接复制键值，leversAt 查不到就回落到默认趋势），
       剧本于是悄悄失效、且没有任何报错。这里在模块加载时一次性拦住拼写错误，
       让错误在开发阶段就暴露，而不是变成「这个剧本看起来没效果」的悬案。 */
    Object.keys(SCENARIOS).forEach((scenarioKey) => {
      const sc = SCENARIOS[scenarioKey];
      if (!sc || !sc.values) return;
      Object.keys(sc.values).forEach((leverKey) => {
        if (!LEVER_BY_KEY[leverKey]) {
          throw new Error('[singularity] 场景 "' + scenarioKey + '" 含未知杠杆键 "'
            + leverKey + '"，请检查拼写；合法键见 LEVERS 定义');
        }
      });
    });

    const STAGES = [
      { id: 0, key: 'mercantile', name: '商业资本主义', short: '前史', color: '#7b8ba3', thesis: '机器是人的延伸，资本靠雇佣劳动攫取剩余。', detail: '蒸汽、工厂与流水线把分散的手工业聚合为社会化大生产。生产资料私人占有与生产社会化之间的张力，自此成为历史的主轴。', keys: ['雇佣劳动', '私人占有', '商品交换', '利润动机'] },
      { id: 1, key: 'algorithmic', name: '算法资本主义', short: 'AI 渗入', color: '#4f8cff', thesis: 'AI 进入生产与治理，算法成为新的车间与监工。', detail: '推荐、预测与自动化决策渗透进生产调度、信贷、招聘与舆论。数据成为核心生产资料，平台成为新的地理单元：生产率上升，劳动份额下降。', keys: ['数据要素', '平台垄断', '算法管理', '劳动份额下滑'] },
      { id: 2, key: 'polarization', name: '极化资本主义', short: '裂谷', color: '#f5a524', thesis: '认知劳动被大规模替代，中产塌陷，两极加速。', detail: '当 AI 的认知能力越过临界阈值，白领岗位以远快于制度适应的速度消失。收入分布从橄榄形裂为沙漏形；「无用阶级」第一次进入政治议程。这是最危险的一段：制度惰性与技术速度之间的落差本身就是冲击。', keys: ['中产塌陷', '制度滞后', '身份危机', '民粹上升'], danger: true },
      { id: 3, key: 'bifurcation', name: '分岔点', short: '历史窗口', color: '#a879ff', thesis: '算力与红利归谁——四条岔路同时打开。', detail: '分岔点不是一个时刻，而是一个窗口。窗口内四条引力同时作用：寡头俘获 → 算力封建制；再分配改良 → 社会民主主义；公共产权 + 全球协同 → 共产主义过渡；全面对抗 → 文明崩解。引力最高者定义下一个世纪。', keys: ['路径依赖', '制度竞争', '窗口期', '产权争夺'], branches: ['算力封建制', '社会民主主义', '共产主义过渡', '文明崩解'] },
      { id: 4, key: 'transition', name: '过渡社会', short: '混合期', color: '#2ed3d3', thesis: '生产资料逐步公有化，劳动从谋生手段中解放出一部分。', detail: '公共算力与公共数据成为像自来水一样的基础设施；全民分红替代了部分工资。「劳动—工资—消费」的循环被部分解耦，社会开始试验：不靠出卖劳动，也能有尊严地生活。', keys: ['公共算力', '全民分红', '劳动时间下降', '按需分配试点'] },
      { id: 5, key: 'lower_communism', name: '共产主义初级形态', short: '按劳到按需', color: '#22c98a', thesis: '物质不再稀缺，分配原则从「按劳动」转向「按需要」。', detail: '自动化产能与能源过剩，使基本生活品近乎零边际成本。分配不再以劳动时间为中介，阶级的经济基础被抽空，国家的主要职能从统治转向协调。', keys: ['按需分配', '阶级消解', '国家职能收缩', '劳动自愿化'] },
      { id: 6, key: 'free_individuals', name: '自由人联合体', short: '自由王国', color: '#e6edf7', thesis: '每个人的自由发展，是一切人自由发展的条件。', detail: '劳动不再是谋生手段，而是自我确证与创造。稀缺被重新定义为注意力、创造力与意义——但这一次，稀缺不再由产权来分配。', keys: ['自由发展', '联合体', '劳动即需要', '意义经济'] },
    ];

    const EXTRA_STAGES = {
      feudalism: { id: 7, name: '算力封建制', short: '旁支', color: '#f45b68' },
      social_democracy: { id: 8, name: '改良资本主义', short: '支线', color: '#4f8cff' },
      collapse: { id: 9, name: '崩解', short: '旁支', color: '#8b3a42' },
      stalled: { id: 10, name: '未竟的过渡', short: '支线', color: '#2ed3d3' },
    };

    const BRANCHES = [
      { key: 'feudalism', name: '算力封建制', color: '#f45b68', condition: '资本俘获国家 · 产权私有放大俘获 · 协同崩塌', path: ['算力寡头化', '数据圈地', '全民配额制', '形式民主'], outcome: '生产力极高、自由极低。资本主义以消灭市场的方式完成自我终结。' },
      { key: 'social_democracy', name: '社会民主主义', color: '#4f8cff', condition: '再分配强 · 劳动者组织度高 · 产权仍以私有为主', path: ['AI 税', '全民分红', '公共算力', '劳动时间缩短'], outcome: '在资本主义框架内实现了「体面的停滞」——但产权结构未变，故而不是共产主义。' },
      { key: 'communism', name: '共产主义过渡', color: '#22c98a', condition: '公共产权高 · 全球协同高 · 团结与意义充足', path: ['生产资料公有化', '按需分配试点', '国家职能收缩', '自由人联合体'], outcome: '生产力的社会化与占有的社会化重新对齐，历史继续向前。' },
      { key: 'collapse', name: '文明崩解', color: '#8b3a42', condition: '全面对抗 · 高转型冲击 · 社会凝聚流失', path: ['断崖式失业', '财政与协作耗尽', '基础设施失维', '低技术均衡'], outcome: '冲突真实摧毁有效生产力，历史不是前进也不是改良，而是退回更早的形态。' },
    ];

    const DYNAMICS = [
      { key: 'force', name: '生产力', color: '#4f8cff', claim: 'AI 与自动化把社会总生产力推过「后稀缺」门槛。', detail: '当单位智能与单位能量的成本趋近于零，物质与服务的边际成本也随之趋近于零。生产力第一次不再需要以「多数人就业」为前提来维持。' },
      { key: 'relation', name: '生产关系', color: '#f5a524', claim: '红利归谁，由产权与分配制度决定，而不是由技术决定。', detail: '同样的 AI，可以变成寡头领地，也可以变成公共基础设施。技术只提供可能性，制度决定它落在哪一侧。' },
      { key: 'subject', name: '历史主体', color: '#22c98a', claim: '制度不是自动演化的，它由组织起来的人写出来。', detail: '劳动者组织度、全球协同、意义供给——这些「软」变量才是分岔点的真正坐标。历史没有必然性，只有条件：条件是可以通过斗争与治理被创造的。' },
    ];

    const EVENTS = [
      { key: 'gpu', year: 2024, title: '算力瓶颈', phase: '前史', text: '训练成本指数上升，算力成为新的石油。谁掌握晶圆厂与数据中心，谁掌握制高点。', cond: () => true },
      { key: 'copilot', year: 2026, title: '认知外包元年', phase: '前史', text: '代码、文案、诊断、合同起草被批量外包给模型。个体产出上限被抬高，议价能力却被压低。', cond: (s) => s.cognition > 0.50 },
      { key: 'white_collar', year: 2029, title: '白领滑坡', phase: '中段', text: '入门级白领岗位消失快于退休自然减员。青年失业与「学历贬值」同时抬升，中产开始收缩。', cond: (s, m) => m.replacement > 0.42 },
      { key: 'data_labor', year: 2031, title: '数据劳动化', phase: '中段', text: '所有人的行为都被采集为训练燃料，而这些人从未被列为「生产者」。', cond: (s) => s.capture > 0.55 },
      { key: 'ubi', year: 2033, title: '全民基本收入试点', phase: '中段', text: '若干国家以 AI 税为资金来源试点 UBI。它既是缓冲垫，也是把矛盾往后推的止痛药。', cond: (s, m) => s.redistribution > 0.45 && m.replacement > 0.50 },
      { key: 'public_compute', year: 2036, title: '公共算力基建', phase: '后段', text: '「算力即公用事业」立法通过：像电网一样，基础模型与算力向全社会开放。', cond: (s) => s.public_ownership > 0.40 },
      { key: 'global_accord', year: 2039, title: '全球 AI 治理协定', phase: '后段', text: '跨国算力与模型治理框架生效，算力殖民被制度性阻断。', cond: (s) => s.coordination > 0.55 },
      { key: 'labor_share', year: 2042, title: '劳动份额警戒线', phase: '后段', text: '劳动收入占国民收入的比重跌破关键阈值，「以劳动换生存」的经济学基础失效。', cond: (s, m) => m.labor_share < 0.40 && m.replacement > 0.60 },
      { key: 'domain_wall', year: 2044, title: '围墙内的后稀缺', phase: '后段', text: '生产力早已过剩，但它被产权圈在围墙内：围墙外的人在排队领配额，围墙内在讨论注意力经济。', cond: (s, m) => m.abundance < 0.55 && m.productivity > 0.80 && s.capture > 0.60 },
      { key: 'breakdown', year: 2046, title: '基础设施失维', phase: '终章', text: '对抗消耗了财政与协作能力，电网、医疗与教育系统开始出现物理性的退化。', cond: (s, m) => m.collapse_risk > 0.55 && m.cohesion < 0.25 },
      { key: 'need_based', year: 2048, title: '按需分配制度化', phase: '终章', text: '食物、住房、医疗、教育、算力实现近乎零边际成本供给，按需分配写入制度。', cond: (s, m) => m.abundance > 0.70 && s.public_ownership > 0.60 },
      { key: 'class_dissolve', year: 2052, title: '阶级的经济基础消失', phase: '终章', text: '当生产资料不再稀缺、劳动不再是生存资格的凭证，阶级赖以存在的经济条件被抽空。', cond: (s, m) => m.development > 0.72 && s.public_ownership > 0.70 },
      { key: 'free_union', year: 2058, title: '自由人联合体', phase: '终章', text: '国家职能收缩为协调与保障；劳动成为自我实现的方式，「每个人自由发展」第一次有了物质前提。', cond: (s, m) => m.development > 0.84 },
    ];

    /* ══════════════════════════════════════════════════════════════
       2. 引擎
       ══════════════════════════════════════════════════════════════ */
    const clamp = (x, lo, hi) => Math.max(lo === undefined ? 0 : lo, Math.min(hi === undefined ? 1 : hi, x));
    const smooth = (x) => { const t = clamp(x); return t * t * (3 - 2 * t); };
    const lerp = (a, b, t) => a + (b - a) * t;

    function leversAt(year, target) {
      const u = clamp((year - T0) / (T1 - T0));
      const out = {};
      LEVERS.forEach((lv) => {
        const k = lv.key;
        const a = NOW[k];
        let b = target[k];
        if (b === undefined || b === null) b = TECH_KEYS.indexOf(k) >= 0 ? TECH_TREND[k] : a;
        let t;
        if (TECH_KEYS.indexOf(k) >= 0) t = Math.pow(u, 0.78);
        else if (INST_KEYS.indexOf(k) >= 0) t = Math.pow(u, 1.90);
        else if (SOCIAL_KEYS.indexOf(k) >= 0) t = Math.pow(u, 1.45);
        else t = u;
        out[k] = clamp(lerp(a, b, smooth(t)));
      });
      return out;
    }

    /* v1.3 E1a：政策干预 —— 干预年前后分段插值（纯函数）。
       干预年前与 leversAt 完全一致；从干预年起，从「干预年的原轨迹值」
       无缝衔接向政策目标重插值（无跳变），组指数沿用 0.78/1.90/1.45。
       未被 override 的杠杆沿原轨迹；override 值钳制到 [0,1]。 */
    function validatePolicy(policy) {
      if (!Number.isInteger(policy.year) || policy.year <= T0 || policy.year > T2) {
        throw new Error('政策干预年必须是 (' + T0 + ', ' + T2 + '] 的整数，收到 ' + policy.year);
      }
      if (!policy.overrides || typeof policy.overrides !== 'object') {
        throw new Error('政策 overrides 必须是对象');
      }
      const bad = Object.keys(policy.overrides).filter((k) => !LEVER_BY_KEY[k]);
      if (bad.length) throw new Error('政策 override 含未知杠杆键: ' + bad.join(', '));
    }

    function leversPolicyAt(year, tgt, policy) {
      const base = leversAt(year, tgt);
      if (year < policy.year) return base;
      const span = T2 - policy.year;
      const u = span > 0 ? clamp((year - policy.year) / span) : 1;
      const out = {};
      LEVERS.forEach((lv) => {
        const k = lv.key;
        const ov = policy.overrides[k];
        if (ov === undefined || ov === null) { out[k] = base[k]; return; }
        let t;
        if (TECH_KEYS.indexOf(k) >= 0) t = Math.pow(u, 0.78);
        else if (INST_KEYS.indexOf(k) >= 0) t = Math.pow(u, 1.90);
        else if (SOCIAL_KEYS.indexOf(k) >= 0) t = Math.pow(u, 1.45);
        else t = u;
        out[k] = clamp(lerp(base[k], clamp(ov), smooth(t)));
      });
      return out;
    }

    function derive(s, prev) {
      const tech = 0.30 * s.cognition + 0.25 * s.compute + 0.25 * s.automation + 0.20 * s.energy;
      const potential = 0.20 + 0.80 * tech;   // 技术潜力（知识不会因战争消失）

      // 损毁：全面对抗 + 转型冲击真实摧毁有效产出（工厂、电网、协作）
      const devastation = clamp(0.70 * clamp((s.conflict - 0.50) / 0.50)
        + 0.30 * clamp((s.transition_shock - 0.50) / 0.50));
      const productivity = potential * (1 - devastation);

      const cogEff = clamp((s.cognition - 0.28) / 0.62);
      const raw = 0.55 * s.automation + 0.45 * cogEff;
      const gross = 0.92 * (1 - Math.exp(-2.4 * raw));          // 毛替代压力
      const replacement = clamp(gross * (1 - 0.30 * s.education)); // 净岗位替代

      const laborShare = clamp(0.62 - 0.42 * replacement - 0.12 * s.capture, 0.05, 0.62);
      const socialization = 0.45 * s.public_ownership + 0.35 * s.redistribution + 0.20 * s.coordination;
      const abundance = clamp(productivity * (0.45 + 0.55 * socialization));

      // 阶段推进用不受损毁、不受教育影响的「技术潜力」，避免教育悖论
      const penetration = clamp(0.60 * gross + 0.40 * clamp((potential - 0.22) / 0.78));

      let pace = 0;
      if (prev) pace = clamp((gross - prev.gross) / 0.030);
      const shock = clamp(0.58 * s.transition_shock + 0.42 * pace);

      const inequality = clamp(0.26 + 0.60 * (replacement * (1 - 0.60 * s.redistribution))
        + 0.22 * s.capture - 0.20 * s.public_ownership, 0.16, 0.96);
      const development = clamp(0.42 * abundance + 0.18 * s.meaning + 0.12 * s.solidarity
        + 0.12 * s.education + 0.16 * socialization);
      const freedom = clamp(0.34 * abundance + 0.24 * (1 - s.capture)
        + 0.22 * s.meaning + 0.20 * s.labor_power);
      const cohesion = clamp(0.42 * s.solidarity + 0.33 * (1 - s.conflict)
        + 0.25 * s.meaning + 0.15 * (1 - shock) - 0.12 * inequality);
      const collapseRisk = clamp(0.44 * s.conflict + 0.34 * shock + 0.20 * s.capture
        - 0.46 * s.redistribution - 0.22 * s.education - 0.18 * s.solidarity);
      const feudalismRisk = clamp(0.46 * s.capture + 0.24 * (1 - s.public_ownership)
        + 0.18 * (1 - s.coordination) + 0.12 * (1 - s.redistribution));

      return {
        potential, devastation, gross,
        productivity, replacement, labor_share: laborShare, socialization, abundance,
        penetration, development, inequality, freedom, cohesion, shock,
        collapse_risk: collapseRisk, feudalism_risk: feudalismRisk,
      };
    }

    /* v1.2 R4：租金压力 —— 只读显示指标（吸收自「后稀缺沙盘」的技术租金占比 R）。
       权重原样沿用来源模型（p→public_ownership、e→energy、b→capture、a→cognition），
       2026-11-25 经六剧本 + 20000 随机态校准：0.45/0.60/0.75 三档与结局语义完全分离
       （techno_feudalism 2038 成形 / collapse 2039 预警 / commons 终值 0.08 深处安全）。
       它是当期杠杆的即时读数，不参与 decidePath —— 单一裁决函数承诺保持为真。 */
    function rentPressure(s) {
      return clamp((0.50 * (1 - s.public_ownership) + 0.20 * (1 - s.energy) + 0.30 * s.capture)
        * (0.35 + 0.65 * s.cognition));
    }
    const RENT_BANDS = { watch: 0.45, warn: 0.60, formed: 0.75 };

    /* v1.4 B2：种子随机数（mulberry32）—— 显示层确定性统计（如情景对比页的
       稳健性一致性列）用它派生种子，刷新页面数字不抖动；同时满足「显示即
       引擎输出」的可复算延伸。纯函数、零依赖、不进任何裁决链。 */
    function mulberry32(seed) {
      let a = seed >>> 0;
      return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    const STAGE_BY_ID = {};
    STAGES.forEach((st) => { STAGE_BY_ID[st.id] = st; });

    function stageOf(m, s, scores) {
      const pen = m.penetration, soc = m.socialization, abu = m.abundance;
      const meaning = s ? s.meaning : 0.3;
      // 物理崩解先于一切裁决（AUDIT-FIXES P0-2）：对抗真实摧毁生产力时，
      // 历史不必越过技术阈值就可以坍塌。这是「文明崩解」的物理入口；
      // 引力入口仍在渗透越过 GATE_PEN 之后。全零参数 devastation=0，不触发。
      if (m.devastation > 0.5) return { stage: EXTRA_STAGES.collapse, branch: true, branchKey: 'collapse' };
      if (pen < 0.38) return { stage: STAGE_BY_ID[1], branch: false };
      if (pen < 0.56) return { stage: STAGE_BY_ID[2], branch: false };
      if (pen < GATE_PEN) return { stage: STAGE_BY_ID[3], branch: false };

      // 唯一的岔路裁决：引力场胜出者决定走哪条路
      const path = scores ? decidePath(scores) : 'feudalism';
      if (path === 'collapse') return { stage: EXTRA_STAGES.collapse, branch: true, branchKey: 'collapse' };
      if (path === 'feudalism') return { stage: EXTRA_STAGES.feudalism, branch: true, branchKey: 'feudalism' };
      if (path === 'social_democracy') return { stage: EXTRA_STAGES.social_democracy, branch: true, branchKey: 'social_democracy' };

      // 共产主义引力占优：闸门只做「走到哪一步」的分级
      if (soc < GATE_SOC) return { stage: EXTRA_STAGES.stalled, branch: true, branchKey: 'stalled' };
      if (abu < 0.58 || meaning < 0.46) return { stage: STAGE_BY_ID[4], branch: false };
      if (abu < 0.78 || soc < 0.72) return { stage: STAGE_BY_ID[5], branch: false };
      return { stage: STAGE_BY_ID[6], branch: false };
    }

    function branchScores(s, m) {
      const captureEffect = s.capture * (
        0.55 + 0.20 * (1 - s.public_ownership) + 0.15 * (1 - s.coordination)
        + 0.10 * (1 - s.redistribution));
      const feudalism = captureEffect;
      const reformRoom = clamp((0.62 - s.public_ownership) / 0.62);
      const social = (0.34 * s.redistribution + 0.24 * s.labor_power
        + 0.12 * (1 - s.capture)) * (0.45 + 0.55 * reformRoom);
      const comm = 0.42 * s.public_ownership + 0.24 * s.coordination
        + 0.16 * s.solidarity + 0.18 * s.meaning;
      const cohesion = m ? m.cohesion : 0.5;
      const shock = m ? m.shock : s.transition_shock;
      const collapse = COLLAPSE_GAIN * clamp(
        0.45 * clamp((s.conflict - 0.45) / 0.55)
        + 0.25 * clamp((shock - 0.45) / 0.55)
        + 0.30 * clamp((0.55 - cohesion) / 0.55));
      const raw = { feudalism, social_democracy: social, communism: comm, collapse };
      const total = Object.values(raw).reduce((a, b) => a + b, 0) || 1;
      return {
        feudalism: feudalism / total,
        social_democracy: social / total,
        communism: comm / total,
        collapse: collapse / total,
      };
    }

    function decidePath(scores) {
      let best = 'feudalism', bv = -1;
      Object.keys(scores).forEach((k) => {
        if (scores[k] > bv) { bv = scores[k]; best = k; }
      });
      return best;
    }

    function locateWindow(years) {
      let start = null, passed = null, crossed = null;
      years.forEach((y) => {
        const m = y.metrics;
        if (start === null && m.penetration >= 0.56) start = y.year;
        if (crossed === null && m.penetration >= GATE_PEN) crossed = y.year;
        if (passed === null && m.penetration >= GATE_PEN && m.socialization >= GATE_SOC) passed = y.year;
      });
      if (start === null) return null;
      if (passed !== null) return { start: start, end: passed, type: 'passed', gate_year: passed };
      return { start: start, end: crossed, type: 'blocked', gate_year: null };
    }

    function resolveOutcome(stageInfo, m) {
      const id = stageInfo.stage.id;
      if (id === 10) return { type: 'transition', name: '未竟的过渡', color: '#2ed3d3', stageLabel: '支线 · 引力占优但闸门未过', thesis: '方向对了，但没能在窗口关闭前跨过制度闸门。', detail: '共产主义引力占优，公共产权与协同的方向被选择了，但社会化度始终没到闸门阈值，历史停在过渡的门口。', keys: ['引力占优', '闸门未过', '方向对了', '窗口关闭'] };
      if (id === 9) return { type: 'offshoot', name: '文明崩解', color: '#8b3a42', stageLabel: '旁支 · 生产力被摧毁', thesis: '生产力被摧毁得比生产关系更快。', detail: '断崖式失业叠加全面对抗，战争、封锁与基础设施失维把人类拉回低技术均衡。它甚至不是退回资本主义，而是退回更早的形态。', keys: ['生产破坏', '技术封锁', '人口收缩', '低技术均衡'] };
      if (id === 7) return { type: 'offshoot', name: '算力封建制', color: '#f45b68', stageLabel: '旁支 · 资本主义的自我终结', thesis: 'AI 的生产力没有消失，只是被垄断成了领地。', detail: '少数寡头占有算力、模型与自动化产能，多数人靠「模型配额」与「数据劳动」苟活。法律形式仍保留市场与民主，实质分配却由封地决定。这是资本主义的胜利，也是它的终点——市场被自己的技术杀死。', keys: ['寡头领地', '算力配额', '无用阶级', '形式民主'] };
      if (id === 8) return { type: 'offshoot', name: '社会民主主义终点', color: '#4f8cff', stageLabel: '支线 · 体面的停滞', thesis: '分配被改良了，产权没有被触碰。', detail: 'AI 税与全民分红吸收了冲击，社会保住了体面；但核心生产资料仍归私有，因此它不是共产主义，而是「有缓冲垫的资本主义」。', keys: ['AI 税', '全民分红', '劳动时间缩短', '产权不变'] };
      if (id === 6) return { type: 'main', name: '自由人联合体', color: '#e6edf7', stageLabel: '主线 · 共产主义高级形态', thesis: '每个人的自由发展，是一切人自由发展的条件。', detail: '物质稀缺被消解，劳动从谋生手段变为自我确证。国家职能收缩为协调与保障，阶级不再有经济基础。', keys: ['按需分配', '阶级消解', '劳动即需要', '自由发展'] };
      if (id === 5) return { type: 'main', name: '共产主义初级形态', color: '#22c98a', stageLabel: '主线 · 按劳到按需', thesis: '分配不再以劳动时间为中介，阶级的经济基础被抽空。', detail: '算力、能源与自动化产能成为公共基础设施，基本生活品近乎零边际成本，「按需分配」已制度化，但创造型劳动与意义供给尚未完全展开。', keys: ['公共产权', '按需分配', '阶级消解', '国家职能收缩'] };
      if (id === 4) return { type: 'transition', name: '过渡社会', color: '#2ed3d3', stageLabel: '主线 · 混合形态', thesis: '方向对了，但丰裕度与意义供给还没跟上。', detail: '公共产权与全球协同已建立，但可及丰裕度仍不足以支撑按需分配。社会停在「一部分按需、一部分按劳」的混合状态。', keys: ['公共算力', '全民分红', '按需试点', '尚未完成'] };
      // P0-1：兜底桶拆分（AUDIT-FIXES）。旧版把两种完全不同的失败合并进
      // 「停滞的资本主义」，导致高冲突世界（损毁 90%、生产力 4%）拿到
      // 「生产力略有提升」的正面文案。 devastated 已在 stageOf 里筛过一次
      // （>0.5 进崩解），这里 0.25–0.5 的灰域是「带伤的停滞」：技术确实没强到
      // 打开分岔窗口，但冲突已经真实消耗了产出——文案必须反映这两种状态。
      if (m.devastation > 0.25) return { type: 'stagnant', name: '停滞的资本主义', color: '#7b8ba3', stageLabel: '旁支 · 带伤的停滞', thesis: '技术没有强到能摧毁旧秩序，而对抗先消耗了它的耐心。', detail: 'AI 被吸收为一种普通的生产工具，替代率始终没有越过制度能够吸收的阈值；同时冲突已损毁 ' + Math.round(m.devastation * 100) + '% 的有效产出。资本主义没有陨落，但也不是安然老去——它是在内耗中停滞的。', keys: ['工具化 AI', '内耗停滞', '制度惯性', '未发生的历史'] };
      return { type: 'stagnant', name: '停滞的资本主义', color: '#7b8ba3', stageLabel: '旁支 · 历史停在原地', thesis: '技术没有强到能摧毁旧秩序，旧秩序也没有弱到必须改写自己。', detail: 'AI 被吸收为一种普通的生产工具：生产力略有提升，劳动份额缓慢下滑，但替代率始终没有越过制度能够吸收的阈值。资本主义没有陨落，只是又老化了三十年。', keys: ['工具化 AI', '缓慢挤压', '制度惯性', '未发生的历史'] };
    }

    function triggeredEvents(years) {
      const ordered = EVENTS.slice().sort((a, b) => a.year - b.year);
      const out = [];
      let floor = years[0].year;
      ordered.forEach((ev) => {
        let hit = null;
        for (let i = 0; i < years.length; i++) {
          const y = years[i];
          if (y.year < floor) continue;
          let ok = false;
          try { ok = ev.cond(y.levers, y.metrics); } catch (e) { ok = false; }
          if (ok) { hit = y; break; }
        }
        if (!hit) return;
        floor = hit.year;
        out.push({ key: ev.key, title: ev.title, phase: ev.phase, year: hit.year, text: ev.text, drift: hit.year - ev.year, stage: hit.stage.name });
      });
      return out;
    }

    function simulate(target, policy) {
      const tgt = target || {};
      // v1.3 E1b：第二可选参 policy = { year, overrides }。
      // 不传时与 v1.2 行为逐字节一致（结果指标层面；行新增 policyActive 标记，
      // 同 v1.2 rent 字段先例）。
      const pol = (policy && policy.overrides) ? policy : null;
      if (pol) validatePolicy(pol);
      const years = [];
      let prev = null;
      for (let year = T0; year <= T2; year++) {
        const s = pol ? leversPolicyAt(year, tgt, pol) : leversAt(year, tgt);
        const m = derive(s, prev);
        const scores = branchScores(s, m);        // 唯一的路径判定输入
        const info = stageOf(m, s, scores);
        years.push({
          year: year, levers: s, metrics: m,
          rent: rentPressure(s),
          policyActive: !!(pol && year >= pol.year),
          stage: info.stage, branchStage: info.branch, branchKey: info.branchKey || null,
          path: decidePath(scores),
          branches: scores,
        });
        prev = m;
      }
      const win = locateWindow(years);
      years.forEach((y) => {
        // P0-3：两种窗口类型统一标记「年份落在窗口内」。
        // 旧写法 `win.type === 'passed' === false` 解析为 (win.type==='passed')===false，
        // 只标 blocked 型，passed 型窗口标记全丢（死代码 bug，见 AUDIT-FIXES.md）。
        y.inWindow = !!(win && y.year >= win.start && y.year <= win.end);
      });
      const finalYear = years[years.length - 1];
      const info = stageOf(finalYear.metrics, finalYear.levers, finalYear.branches);
      return {
        years: years,
        final: finalYear,
        outcome: resolveOutcome(info, finalYear.metrics),
        finalStage: info.stage,
        window: win,
        branchScores: finalYear.branches,
        events: triggeredEvents(years),
      };
    }

    function targetOf(key) {
      const sc = SCENARIOS[key];
      if (!sc) return {};
      const t = {};
      Object.keys(sc.values).forEach((k) => { t[k] = sc.values[k]; });
      return t;
    }

    /* v1.2 R5：越线查询 —— 在 simulate 的逐年行上找首次达到 threshold 的年份。
       纯查询函数，不改模型状态；get 是行选择器（如 y => y.rent），故可复用于
       租金压力以外的任何年度序列。 */
    function findCrossing(years, get, threshold) {
      for (let i = 0; i < years.length; i++) {
        const v = get(years[i]);
        if (v >= threshold) return { year: years[i].year, value: v };
      }
      return null;
    }

    function sensitivity(target) {
      const tgt = {};
      LEVERS.forEach((lv) => { tgt[lv.key] = target[lv.key] !== undefined ? target[lv.key] : (TECH_KEYS.indexOf(lv.key) >= 0 ? TECH_TREND[lv.key] : NOW[lv.key]); });
      const base = simulate(tgt).final.metrics.development;
      const delta = 0.10;
      const rows = LEVERS.map((lv) => {
        const plus = Object.assign({}, tgt); plus[lv.key] = clamp(tgt[lv.key] + delta);
        const minus = Object.assign({}, tgt); minus[lv.key] = clamp(tgt[lv.key] - delta);
        const dp = simulate(plus).final.metrics.development;
        const dm = simulate(minus).final.metrics.development;
        return { key: lv.key, name: lv.name, group: lv.group, effect: (dp - dm) / 2 };
      });
      rows.sort((a, b) => Math.abs(b.effect) - Math.abs(a.effect));
      return { baseline: base, delta: delta, items: rows.slice(0, 8), all: rows };
    }

    /* v1.3 E2：蒙特卡洛稳健性 —— 输出统计分布而非单一确定性结果
       （吸收自理论文档 §3.2）。默认 240 次：target 各杠杆 ±0.08 均匀扰动，
       政策 override ±0.04；rng 可注入（测试用种子保证确定性）。
       纯统计函数，不改模型状态。 */
    function robustness(target, policy, rng) {
      const rand = rng || Math.random;
      const fill = (t) => {
        const out = {};
        LEVERS.forEach((lv) => {
          out[lv.key] = t[lv.key] !== undefined ? t[lv.key]
            : (TECH_KEYS.indexOf(lv.key) >= 0 ? TECH_TREND[lv.key] : NOW[lv.key]);
        });
        return out;
      };
      const jitter = (t, amp) => {
        const out = {};
        LEVERS.forEach((lv) => { out[lv.key] = clamp(t[lv.key] + (rand() * 2 - 1) * amp); });
        return out;
      };
      const RUNS = 240;
      const base = fill(target || {});
      const counts = {};
      for (let i = 0; i < RUNS; i++) {
        const t2 = jitter(base, 0.08);
        let pol2 = null;
        if (policy && policy.overrides) {
          const ov = {};
          Object.keys(policy.overrides).forEach((k) => {
            ov[k] = clamp(base[k] + (policy.overrides[k] - base[k]) + (rand() * 2 - 1) * 0.04);
          });
          pol2 = { year: policy.year, overrides: ov };
        }
        const name = simulate(t2, pol2).outcome.name;
        counts[name] = (counts[name] || 0) + 1;
      }
      const outcomes = Object.keys(counts)
        .map((name) => ({ name: name, count: counts[name], pct: counts[name] / RUNS }))
        .sort((a, b) => b.count - a.count);
      return { runs: RUNS, outcomes: outcomes, dominant: outcomes[0].name, agreement: outcomes[0].pct };
    }

    /* v1.3 E3：反方读法 —— 找出翻转当前结局所需的最小单杠杆干预。
       对四个制度杠杆做 ±0.05 步进扫描（至多 ±1.0），返回
       { lever, from, to, outcome, delta }；任何单杠杆极端化都无法翻转
       时返回 null（结论稳健的强信号）。 */
    function reversal(target, policy) {
      const tgt = {};
      LEVERS.forEach((lv) => {
        tgt[lv.key] = target && target[lv.key] !== undefined ? target[lv.key]
          : (TECH_KEYS.indexOf(lv.key) >= 0 ? TECH_TREND[lv.key] : NOW[lv.key]);
      });
      const baseName = simulate(tgt, policy).outcome.name;
      const SCAN = ['public_ownership', 'redistribution', 'coordination', 'capture'];
      let best = null;
      SCAN.forEach((k) => {
        for (let step = 1; step <= 20; step++) {
          const d = step * 0.05;
          const up = Object.assign({}, tgt); up[k] = clamp(tgt[k] + d);
          let found = null;
          if (simulate(up, policy).outcome.name !== baseName) {
            found = { lever: k, from: tgt[k], to: up[k], outcome: simulate(up, policy).outcome.name, delta: d };
          } else {
            const dn = Object.assign({}, tgt); dn[k] = clamp(tgt[k] - d);
            if (simulate(dn, policy).outcome.name !== baseName) {
              found = { lever: k, from: tgt[k], to: dn[k], outcome: simulate(dn, policy).outcome.name, delta: d };
            }
          }
          if (found) { if (!best || found.delta < best.delta) best = found; break; }
        }
      });
      return best;
    }

    function diagnose(sim) {
      const m = sim.final.metrics;
      const sc = sim.branchScores;
      const d = [];
      if (m.collapse_risk > 0.60) d.push({ tag: '高危', text: '崩解风险 ' + Math.round(m.collapse_risk * 100) + '%：转型冲击与阶级对抗，超过了再分配与教育的吸收能力。' });
      const PATH_NAME = { feudalism: '算力封建制', social_democracy: '社会民主主义', communism: '共产主义过渡', collapse: '文明崩解' };
      const winner = decidePath(sc);
      // P0-1：「引擎据此判定」是强因果陈述，只在渗透越过裁决线（分岔窗口已打开）
      // 时为真。低技术世界引力再高也只是「悬置」——历史根本没进入裁决环节
      // （AUDIT-FIXES：随机 2000 组中 783 组共产主义引力胜出而结局停滞）。
      if (m.penetration >= GATE_PEN) {
        d.push({ tag: '引力', text: '「' + PATH_NAME[winner] + '」引力 ' + Math.round(sc[winner] * 100) + '% 为四者最高，引擎据此判定终局为「' + sim.outcome.name + '」。' });
      } else if (m.devastation > 0.25) {
        d.push({ tag: '引力', text: '「' + PATH_NAME[winner] + '」引力 ' + Math.round(sc[winner] * 100) + '% 虽为当前最高，但冲突已损毁 ' + Math.round(m.devastation * 100) + '% 的有效产出——历史可能先于裁决坍塌，引力悬置于废墟之上。' });
      } else {
        d.push({ tag: '引力', text: '「' + PATH_NAME[winner] + '」引力 ' + Math.round(sc[winner] * 100) + '% 为当前最高，但技术渗透度仅 ' + Math.round(m.penetration * 100) + '%（未越过 0.68 的裁决线），分岔窗口未打开——引力悬置，历史尚未进入裁决。' });
      }
      if (winner === 'collapse') d.push({ tag: '损毁', text: '全面对抗使有效生产力损毁 ' + Math.round(m.devastation * 100) + '%：工厂、电网与协作能力真实下降，而非仅仅是凝聚指标走低。' });
      if (m.labor_share < 0.35) d.push({ tag: '结构', text: '劳动份额降至 ' + Math.round(m.labor_share * 100) + '%：以「劳动—工资—消费」为轴的社会契约已经失效，分配只能改由产权与转移支付承担。' });
      if (m.abundance < 0.55) {
        if (m.devastation > 0.35) {
          d.push({ tag: '瓶颈', text: '可及丰裕度仅 ' + Math.round(m.abundance * 100) + '%：对抗已摧毁 ' + Math.round(m.devastation * 100) + '% 的有效产出，「后稀缺」在物质层面就从未成立。' });
        } else {
          d.push({ tag: '瓶颈', text: '可及丰裕度仅 ' + Math.round(m.abundance * 100) + '%：生产力很高，但它没有被社会化，「后稀缺」只存在于寡头的围墙内。' });
        }
      }
      if (sim.final.levers.meaning < 0.45) d.push({ tag: '软约束', text: '意义供给度 ' + Math.round(sim.final.levers.meaning * 100) + '%：劳动不再是谋生手段时，社会尚未给出替代的身份结构，这会以政治极化的形式反噬制度。' });
      if (m.socialization < GATE_SOC && m.penetration >= 0.56) d.push({ tag: '闸门', text: '社会化度 ' + Math.round(m.socialization * 100) + '% < 闸门 ' + Math.round(GATE_SOC * 100) + '%：技术已越线，制度没跟上 —— 这正是「资本主义陨落」的机制本身。' });
      return d;
    }

    /* ══════════════════════════════════════════════════════════════
       ENGINE-END  引擎区结束
       ------------------------------------------------------------------
       以上符号构成模型契约的完整表面：LEVERS / LEVER_BY_KEY / NOW /
       SCENARIOS / TECH_TREND / STAGES / EXTRA_STAGES / BRANCHES /
       DYNAMICS / EVENTS / 三个闸门常数 / simulate / targetOf /
       sensitivity / diagnose / decidePath / stageOf / branchScores /
       rentPressure / findCrossing / RENT_BANDS / leversPolicyAt /
       robustness / reversal / mulberry32（政策干预见契约 §8c）。
       视图区只消费这些符号，不得反向修改模型状态。
       ══════════════════════════════════════════════════════════════ */

  return {
    LEVERS, LEVER_BY_KEY, NOW, SCENARIOS, TECH_TREND, TECH_KEYS,
    STAGES, EXTRA_STAGES, BRANCHES, DYNAMICS, EVENTS,
    GATE_PEN, GATE_SOC, COLLAPSE_GAIN, T0, T1, T2,
    simulate, targetOf, sensitivity, diagnose, decidePath, stageOf, branchScores,
    rentPressure, findCrossing, RENT_BANDS, leversPolicyAt, robustness, reversal, mulberry32,
  };
}