window.__ModuleLoader__.load({
  id: 'singularity-dsh-plugin',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

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

    /* ══════════════════════════════════════════════════════════════
       3. 样式（仅用主题 token，数据色视为图示用色）
       ══════════════════════════════════════════════════════════════ */
    const CSS = `
    .sn-root{display:flex;flex-direction:column;height:100%;min-height:0;overflow:hidden;
      background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);}
    .sn-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap;
      padding:14px 18px;border-bottom:1px solid var(--dsw-alias-border-l1);flex:none;}
    .sn-title{font-size:16px;font-weight:650;letter-spacing:-.01em;margin:0}
    .sn-sub{font-size:11.5px;color:var(--dsw-alias-label-secondary);margin:2px 0 0}
    .sn-tabs{display:flex;gap:4px;margin-left:auto;flex-wrap:wrap}
    .sn-tab{border:1px solid transparent;background:transparent;color:var(--dsw-alias-label-secondary);
      font:inherit;font-size:12.5px;padding:5px 11px;border-radius:7px;cursor:pointer;transition:.15s}
    .sn-tab:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
    .sn-tab-on{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-border-l2);
      color:var(--dsw-alias-label-primary);font-weight:600}
    .sn-body{flex:1;overflow-y:auto;padding:16px 18px 40px;min-height:0}

    .sn-card{border:1px solid var(--dsw-alias-border-l1);border-radius:12px;
      background:var(--dsw-alias-bg-layer-1)}
    .sn-card-head{display:flex;align-items:center;justify-content:space-between;gap:10px;
      padding:11px 15px;border-bottom:1px solid var(--dsw-alias-border-l1);font-size:13px;font-weight:600}
    .sn-card-head .sn-hint{font-size:11px;font-weight:400;color:var(--dsw-alias-label-secondary)}
    .sn-pad{padding:15px}

    .sn-hero{border:1px solid var(--dsw-alias-border-l2);border-radius:14px;padding:18px 20px;margin-bottom:14px;
      background:var(--dsw-alias-bg-layer-1);position:relative;overflow:hidden}
    .sn-hero:before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--sn-accent,var(--dsw-alias-brand-primary))}
    .sn-hero-top{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap}
    .sn-eyebrow{font-size:10px;letter-spacing:.14em;text-transform:uppercase;
      color:var(--dsw-alias-label-secondary);font-weight:700;margin-bottom:6px}
    .sn-hero h2{font-size:22px;margin:0 0 5px;letter-spacing:-.02em;line-height:1.25}
    .sn-thesis{font-size:13px;color:var(--dsw-alias-label-secondary);line-height:1.6;max-width:600px}
    .sn-pill{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:650;
      padding:4px 10px;border-radius:999px;border:1px solid currentColor;white-space:nowrap}
    .sn-keys{display:flex;gap:6px;flex-wrap:wrap;margin-top:11px}
    .sn-key{font-size:11px;padding:3px 9px;border-radius:6px;
      background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);
      color:var(--dsw-alias-label-secondary)}
    .sn-verdict{margin-top:13px;padding:11px 13px;border-radius:9px;font-size:12.5px;line-height:1.7;
      background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);
      border-left:2px solid var(--sn-accent,var(--dsw-alias-brand-primary))}

    .sn-metrics{display:flex;flex-wrap:wrap;gap:9px;margin-bottom:14px}
    .sn-metric{flex:1 1 118px;min-width:0;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;
      padding:9px 11px;background:var(--dsw-alias-bg-layer-1);position:relative;overflow:hidden}
    .sn-metric .k{font-size:10px;color:var(--dsw-alias-label-secondary);margin-bottom:4px;white-space:nowrap;
      overflow:hidden;text-overflow:ellipsis}
    .sn-metric .v{font-size:19px;font-weight:650;line-height:1;letter-spacing:-.03em;
      font-variant-numeric:tabular-nums}
    .sn-metric .v small{font-size:11px;font-weight:500;color:var(--dsw-alias-label-secondary);margin-left:1px}
    .sn-metric .bar{position:absolute;left:0;bottom:0;height:2px;transition:width .2s}

    .sn-scrub{border:1px solid var(--dsw-alias-border-l1);border-radius:12px;
      background:var(--dsw-alias-bg-layer-1);padding:14px 16px 8px;margin-bottom:14px}
    .sn-scrub-head{display:flex;align-items:baseline;justify-content:space-between;gap:10px;flex-wrap:wrap}
    .sn-year{font-size:28px;font-weight:650;letter-spacing:-.03em;line-height:1;
      font-variant-numeric:tabular-nums}
    .sn-year span{font-size:12px;font-weight:500;color:var(--dsw-alias-label-secondary);margin-left:9px;letter-spacing:0}
    .sn-scrub-note{font-size:11.5px;color:var(--dsw-alias-label-secondary);margin-top:5px}
    .sn-rail{position:relative;height:34px;margin-top:14px}
    .sn-rail-bg,.sn-rail-fill{position:absolute;left:0;right:0;top:15px;height:4px;border-radius:3px;overflow:hidden;display:flex}
    .sn-rail-bg{background:var(--dsw-alias-bg-layer-2)}
    .sn-policy-mark{position:absolute;top:-2px;width:0;height:0;
      border-left:5px solid transparent;border-right:5px solid transparent;
      border-top:7px solid var(--dsw-alias-state-warning-primary,#e0a63a);
      transform:translateX(-5px)}
    .sn-rail-fill{background:var(--dsw-alias-bg-layer-2)}
    .sn-seg{height:100%;flex:none}
    .sn-range{-webkit-appearance:none;appearance:none;position:absolute;left:0;right:0;top:3px;
      width:100%;height:26px;background:transparent;cursor:grab;margin:0}
    .sn-range:active{cursor:grabbing}
    .sn-range::-webkit-slider-runnable-track{height:26px;background:transparent}
    .sn-range::-webkit-slider-thumb{-webkit-appearance:none;width:15px;height:15px;border-radius:50%;
      background:var(--dsw-alias-label-primary);border:2.5px solid var(--dsw-alias-bg-base);
      box-shadow:0 0 0 1.5px var(--dsw-alias-brand-primary);margin-top:-6px}
    .sn-range::-moz-range-thumb{width:13px;height:13px;border-radius:50%;
      background:var(--dsw-alias-label-primary);border:2.5px solid var(--dsw-alias-bg-base)}
    .sn-ends{display:flex;justify-content:space-between;font-size:10px;
      color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;padding-bottom:2px}

    .sn-track{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;margin-bottom:14px}
    .sn-node{flex:1 1 0;min-width:110px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;
      padding:8px 10px;background:var(--dsw-alias-bg-layer-1);cursor:pointer;transition:.15s;overflow:hidden}
    .sn-node:hover{background:var(--dsw-alias-bg-layer-2)}
    .sn-node.on{border-color:currentColor;background:var(--dsw-alias-bg-layer-2)}
    .sn-node .i{font-size:9px;opacity:.55;font-variant-numeric:tabular-nums}
    .sn-node .n{font-size:11.5px;font-weight:650;margin:2px 0 1px;line-height:1.3;
      white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .sn-node .s{font-size:9.5px;color:var(--dsw-alias-label-secondary);line-height:1.3;
      white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

    .sn-grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
    @media(max-width:900px){.sn-grid2{grid-template-columns:1fr}}

    .sn-events{display:flex;flex-direction:column;max-height:280px;overflow-y:auto;padding:4px 15px 12px}
    .sn-ev{display:flex;gap:10px;padding:8px 0;border-bottom:1px dashed var(--dsw-alias-border-l1)}
    .sn-ev:last-child{border-bottom:none}
    .sn-ev .y{font-size:11px;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary);
      width:34px;flex:none;padding-top:1px}
    .sn-ev .dot{width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-brand-primary);
      flex:none;margin-top:5px}
    .sn-ev .b{flex:1;min-width:0}
    .sn-ev .t{font-size:12px;font-weight:600;margin-bottom:1px}
    .sn-ev .x{font-size:11px;color:var(--dsw-alias-label-secondary);line-height:1.55}

    .sn-levers{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
    @media(max-width:820px){.sn-levers{grid-template-columns:1fr}}
    .sn-lv{border:1px solid var(--dsw-alias-border-l1);border-radius:10px;padding:10px 12px;
      background:var(--dsw-alias-bg-layer-1)}
    .sn-lv-top{display:flex;align-items:baseline;justify-content:space-between;gap:8px}
    .sn-lv-name{font-size:12px;font-weight:600}
    .sn-lv-val{font-size:12px;font-weight:650;font-variant-numeric:tabular-nums}
    .sn-lv-desc{font-size:10.5px;color:var(--dsw-alias-label-secondary);line-height:1.5;margin:3px 0 7px}
    .sn-lv input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:4px;border-radius:3px;
      background:var(--dsw-alias-bg-layer-2);cursor:pointer;margin:0}
    .sn-lv input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:12px;height:12px;
      border-radius:50%;background:var(--dsw-alias-label-primary);
      border:2px solid var(--dsw-alias-bg-base);box-shadow:0 0 0 1px var(--dsw-alias-border-l2)}
    .sn-lv input[type=range]::-moz-range-thumb{width:10px;height:10px;border-radius:50%;
      background:var(--dsw-alias-label-primary);border:2px solid var(--dsw-alias-bg-base)}
    .sn-lv-ends{display:flex;justify-content:space-between;font-size:9px;
      color:var(--dsw-alias-label-secondary);margin-top:4px}
    .sn-group-title{font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;
      color:var(--dsw-alias-label-secondary);margin:14px 0 7px}
    .sn-group-title:first-child{margin-top:0}

    .sn-btn{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);
      color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;padding:6px 12px;
      border-radius:7px;cursor:pointer;transition:.15s}
    .sn-btn:hover{background:var(--dsw-alias-bg-layer-1);border-color:var(--dsw-alias-label-secondary)}
    .sn-btn-primary{background:var(--dsw-alias-brand-primary);border-color:transparent;
      color:var(--dsw-alias-bg-base);font-weight:650}
    .sn-btn-primary:hover{opacity:.9;background:var(--dsw-alias-brand-primary)}

    /* v1.9 a11y：键盘焦点可见。用 :focus-visible 而非 :focus，
       这样鼠标点击不显示焦点环，键盘导航才显示。 */
    .sn-root :focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
    .sn-node:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px;border-radius:8px}
    .sn-tab:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}
    .sn-table tbody tr:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}
    .sn-heat-cell:focus-visible rect,.sn-root [role="gridcell"]:focus-visible rect{
      stroke:var(--dsw-alias-brand-primary);stroke-width:2.5}
    /* 杠杆滑块：键盘聚焦时给轨道一圈提示 */
    .sn-lv input[type=range]:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:4px}

    .sn-branches{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}
    @media(max-width:820px){.sn-branches{grid-template-columns:1fr}}
    .sn-br{border:1px solid var(--dsw-alias-border-l1);border-radius:11px;padding:13px;
      background:var(--dsw-alias-bg-layer-1);position:relative;overflow:hidden}
    .sn-br:before{content:"";position:absolute;left:0;top:0;bottom:0;width:2.5px;background:var(--sn-c)}
    .sn-br.win{border-color:var(--sn-c)}
    .sn-br-name{font-size:13px;font-weight:650;margin-bottom:2px}
    .sn-br-cond{font-size:10.5px;color:var(--dsw-alias-label-secondary);line-height:1.45;
      min-height:30px;margin-bottom:9px}
    .sn-br-num{font-size:22px;font-weight:650;line-height:1;font-variant-numeric:tabular-nums}
    .sn-br-num small{font-size:10px;font-weight:500;color:var(--dsw-alias-label-secondary);margin-left:3px}
    .sn-br-bar{height:4px;border-radius:2px;background:var(--dsw-alias-bg-layer-2);
      overflow:hidden;margin:7px 0 10px}
    .sn-br-bar div{height:100%;background:var(--sn-c)}
    .sn-br-path{font-size:10.5px;color:var(--dsw-alias-label-secondary);line-height:1.7;margin:0;padding:0;list-style:none}
    .sn-br-path li{padding-left:11px;position:relative}
    .sn-br-path li:before{content:"";position:absolute;left:2px;top:7px;width:3px;height:3px;
      border-radius:50%;background:var(--sn-c)}
    .sn-br-out{font-size:10.5px;color:var(--dsw-alias-label-secondary);line-height:1.55;
      margin-top:9px;padding-top:9px;border-top:1px dashed var(--dsw-alias-border-l1)}

    .sn-table{width:100%;border-collapse:collapse;font-size:12px}
    .sn-table th{text-align:left;padding:8px 10px;font-size:10px;letter-spacing:.06em;
      text-transform:uppercase;color:var(--dsw-alias-label-secondary);font-weight:700;
      border-bottom:1px solid var(--dsw-alias-border-l2);white-space:nowrap}
    .sn-table td{padding:8px 10px;border-bottom:1px solid var(--dsw-alias-border-l1);
      vertical-align:middle;font-variant-numeric:tabular-nums}
    .sn-table tr:last-child td{border-bottom:none}
    .sn-table tbody tr:hover{background:var(--dsw-alias-bg-layer-2)}
    .sn-num{font-variant-numeric:tabular-nums}

    .sn-sens{display:grid;grid-template-columns:130px 1fr 48px;gap:9px;align-items:center;
      padding:4px 0;font-size:11.5px}
    .sn-sens-name{color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;
      text-overflow:ellipsis}
    .sn-sens-track{height:12px;background:var(--dsw-alias-bg-layer-2);border-radius:4px;
      position:relative;overflow:hidden}
    .sn-sens-zero{position:absolute;left:50%;top:0;bottom:0;width:1px;
      background:var(--dsw-alias-border-l2)}
    .sn-sens-fill{position:absolute;top:2px;height:8px;border-radius:2px}
    .sn-sens-val{text-align:right;font-variant-numeric:tabular-nums;
      color:var(--dsw-alias-label-secondary)}

    .sn-drivers{display:flex;flex-direction:column;gap:9px}
    .sn-drv{display:flex;gap:9px;align-items:flex-start}
    .sn-drv-tag{font-size:9.5px;font-weight:700;padding:1px 7px;border-radius:5px;
      border:1px solid currentColor;flex:none;margin-top:1px;white-space:nowrap}
    .sn-drv-text{font-size:11.5px;color:var(--dsw-alias-label-secondary);line-height:1.65}

    .sn-theory{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px}
    @media(max-width:820px){.sn-theory{grid-template-columns:1fr}}
    .sn-th{border:1px solid var(--dsw-alias-border-l1);border-radius:11px;padding:14px;
      background:var(--dsw-alias-bg-layer-1);border-top:2px solid var(--sn-c)}
    .sn-th h4{margin:0 0 7px;font-size:13px;color:var(--sn-c)}
    .sn-th .c{font-size:11.5px;line-height:1.6;padding-left:9px;margin-bottom:8px;
      border-left:2px solid var(--sn-c)}
    .sn-th .d{font-size:11px;color:var(--dsw-alias-label-secondary);line-height:1.7}

    .sn-quote{border:1px solid var(--dsw-alias-border-l2);border-radius:11px;padding:16px 18px;
      background:var(--dsw-alias-bg-layer-1);margin-bottom:14px}
    .sn-quote q{font-size:14px;line-height:1.7;display:block;quotes:none}
    .sn-quote cite{display:block;margin-top:7px;font-size:11px;
      color:var(--dsw-alias-label-secondary);font-style:normal}

    .sn-empty{padding:24px;text-align:center;font-size:12px;
      color:var(--dsw-alias-label-secondary)}
    .sn-chart{display:block;width:100%;overflow:visible}
    .sn-chart .ax{stroke:var(--dsw-alias-border-l1);stroke-width:1}
    .sn-chart .gl{stroke:var(--dsw-alias-border-l1);stroke-width:1;stroke-dasharray:2 4;opacity:.5}
    .sn-chart .lb{fill:var(--dsw-alias-label-secondary);font-size:9px;font-variant-numeric:tabular-nums}
    .sn-chart .se{fill:none;stroke-width:2;stroke-linejoin:round;stroke-linecap:round}
    .sn-chart .cur{stroke:var(--dsw-alias-label-secondary);stroke-width:1;stroke-dasharray:3 3;opacity:.65}
    .sn-chart .band{opacity:.10}
    `;

    /* ══════════════════════════════════════════════════════════════
       4. UI
       ══════════════════════════════════════════════════════════════ */
    /* ── 杠杆状态持久化（v1.1）──────────────────────────────────────
       刷新页面不该丢失用户拨了半天的滑块。这里只持久化「模型输入」
       （杠杆目标值 + 场景选择），不持久化浏览态（当前标签页、时间轴年份、
       选中事件）——那些是阅读位置，不是模型假设。

       两条设计要点：
       1. target 是稀疏对象：{} 表示「全部走默认趋势」，与 14 键全量语义不同。
          因此原样存取，不做补全，避免把「未指定」变成「锁死为当前默认值」。
       2. scenario 必须与 target 一起校验：手调过杠杆后，剧本按钮不应继续
          高亮（否则界面声称「你在 baseline」，实际跑的是手调参数）。
          不一致时置 null，现有 `scenario === k` 比较自然不点亮任何按钮。
    ──────────────────────────────────────────────────────────────── */
    const STORE_KEY = 'singularity:state:v1';
    const STORE_VERSION = 1;

    /** 读取持久化状态；任何异常或不合规数据都静默回退默认值。 */
    function loadPersisted() {
      const fallback = { target: {}, scenario: 'baseline' };
      let raw;
      try {
        if (typeof window === 'undefined' || !window.localStorage) return fallback;
        raw = window.localStorage.getItem(STORE_KEY);
      } catch (e) {
        return fallback;                       // 隐私模式 / 存储被禁用
      }
      if (!raw) return fallback;
      let data;
      try {
        data = JSON.parse(raw);
      } catch (e) {
        return fallback;                       // 损坏数据
      }
      if (!data || data.v !== STORE_VERSION) return fallback;

      // target：逐键校验，未知键丢弃，数值钳制到 [0,1]（与滑块行为一致）
      const target = {};
      if (data.target && typeof data.target === 'object') {
        Object.keys(data.target).forEach((k) => {
          if (!LEVER_BY_KEY[k]) return;        // 杠杆集合已变，旧键作废
          const v = data.target[k];
          if (typeof v !== 'number' || !isFinite(v)) return;
          target[k] = Math.max(0, Math.min(1, v));
        });
      }

      // scenario：与 target 一致性校验
      let scenario = data.scenario;
      const validScenario = typeof scenario === 'string' && !!SCENARIOS[scenario];
      if (!validScenario) {
        scenario = 'baseline';
      } else {
        // 若 target 与该剧本的目标值不一致，说明用户手调过 → 不高亮任何剧本
        const ref = targetOf(scenario);
        const keys = Object.keys(target).concat(Object.keys(ref));
        const diverged = keys.some((k) => target[k] !== ref[k]);
        if (diverged) scenario = null;
      }
      return { target: target, scenario: scenario };
    }

    /** 写入持久化状态；失败（如配额满）不影响使用。 */
    function savePersisted(target, scenario) {
      try {
        if (typeof window === 'undefined' || !window.localStorage) return;
        window.localStorage.setItem(STORE_KEY, JSON.stringify({
          v: STORE_VERSION,
          target: target,
          scenario: scenario,
        }));
      } catch (e) { /* 存储不可用：静默放弃持久化，不影响当前会话 */ }
    }

    const pct = (v, d) => (v * 100).toFixed(d === undefined ? 0 : d) + '%';

    /* ── v1.4 B5：分享深链 —— 显式快照：只有点「分享」才写 URL。
       编码 base64url(JSON)；解码复用持久化的 clamp/白名单校验，
       坏数据静默忽略。policy 不入 localStorage 但可入深链（实验可分享）。 */
    function b64urlEncode(obj) {
      try {
        const json = JSON.stringify(obj);
        if (typeof btoa === 'function') {
          return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        }
        return Buffer.from(json, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      } catch (e) { return null; }
    }
    function b64urlDecode(str) {
      try {
        let s = str.replace(/-/g, '+').replace(/_/g, '/');
        while (s.length % 4) s += '=';
        const json = typeof atob === 'function'
          ? decodeURIComponent(escape(atob(s)))
          : Buffer.from(s, 'base64').toString('utf8');
        return JSON.parse(json);
      } catch (e) { return null; }
    }
    /** 解析深链参数 → { target, policy, scenario } | null。校验规则与 loadPersisted 同源。 */
    function parseShareUrl(search) {
      if (!search) return null;
      let m = /[?&]t=([A-Za-z0-9_-]+)/.exec(search);
      const t = m ? b64urlDecode(m[1]) : null;
      if (!t || typeof t !== 'object') return null;
      const target = {};
      Object.keys(t).forEach((k) => {
        if (!LEVER_BY_KEY[k]) return;
        const v = t[k];
        if (typeof v !== 'number' || !isFinite(v)) return;
        target[k] = Math.max(0, Math.min(1, v));
      });
      if (!Object.keys(target).length) return null;
      let policy = null;
      m = /[?&]p=([A-Za-z0-9_-]+)/.exec(search);
      const p = m ? b64urlDecode(m[1]) : null;
      if (p && typeof p === 'object' && Number.isInteger(p.year) && p.year > T0 && p.year <= T2
        && p.overrides && typeof p.overrides === 'object') {
        const ov = {};
        Object.keys(p.overrides).forEach((k) => {
          if (!LEVER_BY_KEY[k]) return;
          const v = p.overrides[k];
          if (typeof v !== 'number' || !isFinite(v)) return;
          ov[k] = Math.max(0, Math.min(1, v));
        });
        if (Object.keys(ov).length) policy = { year: p.year, overrides: ov };
      }
      return { target: target, policy: policy };
    }

    const METRIC_META = {
      development: { name: '发展水平 D', color: '#a879ff' },
      productivity: { name: '生产力', color: '#4f8cff' },
      replacement: { name: '劳动替代率', color: '#f45b68' },
      labor_share: { name: '劳动份额', color: '#f5a524' },
      socialization: { name: '社会化度', color: '#22c98a' },
      abundance: { name: '可及丰裕度', color: '#2ed3d3' },
      penetration: { name: '技术渗透度', color: '#6ba1ff' },
      inequality: { name: '不平等', color: '#f45b68' },
      freedom: { name: '自由实现度', color: '#e6edf7' },
      cohesion: { name: '社会凝聚', color: '#22c98a' },
      shock: { name: '转型冲击', color: '#f5a524' },
      collapse_risk: { name: '崩解风险', color: '#8b3a42' },
      feudalism_risk: { name: '封建化风险', color: '#f45b68' },
    };

    const TAG_COLOR = { 高危: '#f45b68', 引力: '#a879ff', 损毁: '#8b3a42', 结构: '#4f8cff', 瓶颈: '#f5a524', 软约束: '#2ed3d3', 闸门: '#22c98a' };
    const GROUP_COLOR = { 技术: '#4f8cff', 制度: '#a879ff', 社会: '#2ed3d3', 摩擦: '#f5a524' };

    function Metric(p) {
      return h('div', { className: 'sn-metric' },
        h('div', { className: 'k' }, p.label),
        h('div', { className: 'v', style: { color: p.danger ? 'var(--dsw-alias-state-error-primary)' : undefined } },
          Math.round(p.value * 100), h('small', null, '%')),
        h('div', { className: 'bar', style: { width: (p.value * 100) + '%', background: p.danger ? 'var(--dsw-alias-state-error-primary)' : p.color } }));
    }

    function LineChart(p) {
      const years = p.years;
      const series = p.series;
      const W = 640, H = p.height || 200;
      const pad = { l: 30, r: 10, t: 22, b: 20 };
      const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
      const x0 = years[0].year, x1 = years[years.length - 1].year;
      const X = (y) => pad.l + ((y - x0) / (x1 - x0)) * iw;
      const Y = (v) => pad.t + ih - clamp(v) * ih;

      const kids = [];
      if (p.window) {
        const a = X(p.window.start), b = X(p.window.end);
        kids.push(h('rect', {
          key: 'band', className: 'band', x: a, y: pad.t,
          width: Math.max(b - a, 2), height: ih,
          fill: p.window.type === 'passed' ? '#22c98a' : '#f45b68',
        }));
      }
      [0, 0.25, 0.5, 0.75, 1].forEach((g) => {
        const y = pad.t + ih - g * ih;
        kids.push(h('line', { key: 'g' + g, className: 'gl', x1: pad.l, y1: y, x2: W - pad.r, y2: y }));
        kids.push(h('text', { key: 'gt' + g, className: 'lb', x: pad.l - 5, y: y + 3, textAnchor: 'end' }, Math.round(g * 100)));
      });
      series.forEach((s) => {
        // v1.4 B1：get 访问器——默认读 row.metrics[key]；租金等非 metrics
        // 字段（如 row.rent）由调用方传 get 行选择器。零破坏扩展。
        const get = s.get || ((row) => row.metrics[s.key]);
        const pts = years.map((y) => [X(y.year), Y(get(y))]);
        const d = pts.map((pt, i) => (i ? 'L' : 'M') + pt[0].toFixed(1) + ' ' + pt[1].toFixed(1)).join(' ');
        kids.push(h('path', { key: 'p' + s.key, className: 'se', d: d, stroke: s.color || METRIC_META[s.key].color }));
      });
      if (p.cursorYear) {
        const cx = X(p.cursorYear);
        kids.push(h('line', { key: 'cur', className: 'cur', x1: cx, y1: pad.t, x2: cx, y2: pad.t + ih }));
        const cy = years.filter((y) => y.year === p.cursorYear)[0];
        if (cy) {
          series.forEach((s) => {
            const get = s.get || ((row) => row.metrics[s.key]);
            kids.push(h('circle', {
              key: 'c' + s.key, cx: cx, cy: Y(get(cy)), r: 3,
              fill: s.color || METRIC_META[s.key].color,
            }));
          });
        }
      }
      kids.push(h('line', { key: 'ax', className: 'ax', x1: pad.l, y1: pad.t + ih, x2: W - pad.r, y2: pad.t + ih }));
      [x0, 2030, 2040, 2050, x1].forEach((yr, i) => {
        if ([x0, 2030, 2040, 2050, x1].indexOf(yr) !== i) return;
        kids.push(h('text', { key: 'x' + yr, className: 'lb', x: X(yr), y: H - 5, textAnchor: 'middle' }, yr));
      });
      series.forEach((s, i) => {
        kids.push(h('g', { key: 'lg' + s.key, transform: 'translate(' + (pad.l + i * 108) + ',' + (pad.t - 9) + ')' },
          h('rect', { x: 0, y: -4, width: 8, height: 3, rx: 1.5, fill: s.color || METRIC_META[s.key].color }),
          h('text', { className: 'lb', x: 12, y: 0 }, s.label)));
      });

      return h('svg', { className: 'sn-chart', viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'xMidYMid meet' }, kids);
    }

    function Hero(p) {
      const o = p.outcome;
      const f = p.final.metrics;
      return h('div', { className: 'sn-hero', style: { '--sn-accent': o.color } },
        h('div', { className: 'sn-hero-top' },
          h('div', { style: { flex: '1 1 260px', minWidth: 0 } },
            h('div', { className: 'sn-eyebrow' }, o.stageLabel),
            h('h2', { style: { color: o.color } }, o.name),
            h('div', { className: 'sn-thesis' }, o.thesis),
            h('div', { className: 'sn-keys' }, o.keys.map((k, i) => h('span', { className: 'sn-key', key: i }, k)))),
          h('div', { className: 'sn-pill', style: { color: o.color } },
            o.type === 'main' ? '主线结局' : o.type === 'transition' ? '未完成' : o.type === 'stagnant' ? '停滞结局' : '旁支结局')),
        h('div', { className: 'sn-verdict' }, o.detail),
        h('div', { style: { display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 11, fontSize: 11, color: 'var(--dsw-alias-label-secondary)' } },
          h('span', null, '发展水平 ', h('b', { style: { color: 'var(--dsw-alias-label-primary)' } }, pct(f.development))),
          h('span', null, '可及丰裕 ', h('b', { style: { color: 'var(--dsw-alias-label-primary)' } }, pct(f.abundance))),
          h('span', null, '自由实现 ', h('b', { style: { color: 'var(--dsw-alias-label-primary)' } }, pct(f.freedom))),
          h('span', null, '不平等 ', h('b', { style: { color: 'var(--dsw-alias-label-primary)' } }, pct(f.inequality)))));
    }

    function Scrubber(p) {
      const years = p.years;
      const a = years[0].year, b = years[years.length - 1].year;
      const segs = [];
      let cur = null;
      years.forEach((y) => {
        if (!cur || cur.id !== y.stage.id) {
          cur = { id: y.stage.id, color: y.stage.color, start: y.year, end: y.year };
          segs.push(cur);
        }
        cur.end = y.year;
      });
      const curYear = years.filter((y) => y.year === p.year)[0] || years[0];
      return h('div', { className: 'sn-scrub' },
        h('div', { className: 'sn-scrub-head' },
          h('div', null,
            h('div', { className: 'sn-year' }, p.year, h('span', null, curYear.stage.name)),
            h('div', { className: 'sn-scrub-note' },
              '技术渗透 ' + pct(curYear.metrics.penetration) + ' · 社会化度 ' + pct(curYear.metrics.socialization)
              + (p.window ? ' · 窗口 ' + p.window.start + '–' + p.window.end + (p.window.type === 'passed' ? '（制度跟上）' : '（制度错过）') : ''))),
          h('div', { style: { display: 'flex', gap: 6 } },
            h('button', { className: 'sn-btn', onClick: () => p.onYear(Math.max(a, p.year - 1)) }, '◀'),
            h('button', { className: 'sn-btn', onClick: () => p.onYear(Math.min(b, p.year + 1)) }, '▶'))),
        h('div', { className: 'sn-rail' },
          h('div', { className: 'sn-rail-bg' },
            segs.map((s, i) => h('div', {
              key: i, className: 'sn-seg',
              style: { width: ((s.end - s.start + 1) / (b - a + 1) * 100) + '%', background: s.color, opacity: 0.75 },
            })),
            p.policyYear && p.policyYear >= a && p.policyYear <= b
              ? h('div', { className: 'sn-policy-mark', style: { left: ((p.policyYear - a) / (b - a + 1) * 100) + '%' }, title: '政策干预年 ' + p.policyYear })
              : null),
          h('input', {
            className: 'sn-range', type: 'range', min: a, max: b, step: 1, value: p.year,
            'aria-label': '年份', onChange: (e) => p.onYear(parseInt(e.target.value, 10)),
          })),
        h('div', { className: 'sn-ends' }, h('span', null, a), h('span', null, '←/→ 切换年份'), h('span', null, b)));
    }

    function StageTrack(p) {
      return h('div', { className: 'sn-track' },
        STAGES.map((st) => {
          const on = st.id === p.currentId;
          // v1.8：stage 0 是「前史」——stageOf 不会返回它（契约 §7.1）。
          // 明确标注，避免读者以为 2024 年引擎会判定为「商业资本主义」。
          const prehistory = st.id === 0;
          // v1.9 a11y：改 <button> —— 原生语义 + 原生 Enter/Space + 原生焦点环
          return h('button', {
            key: st.id, type: 'button', className: 'sn-node' + (on ? ' on' : ''),
            'aria-pressed': on,
            'aria-label': '阶段 ' + (st.id + 1) + ' ' + st.name + (prehistory ? '（前史标注，引擎不返回此阶段）' : ''),
            style: { color: on ? st.color : 'var(--dsw-alias-label-primary)', opacity: on || st.id <= p.currentId ? 1 : 0.55 },
            onClick: () => p.onPick(st),
            title: prehistory
              ? st.thesis + '\n\n（前史标注：引擎不返回此阶段，阶段判定最低为「算法资本主义」——契约 §7.1）'
              : st.thesis,
          },
            h('div', { className: 'i' }, '0' + (st.id + 1)),
            h('div', { className: 'n', style: on ? { color: st.color } : null },
              st.name,
              prehistory
                ? h('span', {
                  style: {
                    fontSize: 8.5, fontWeight: 500, marginLeft: 4, padding: '1px 4px',
                    borderRadius: 3, background: 'var(--dsw-alias-bg-layer-2)',
                    color: 'var(--dsw-alias-label-secondary)', verticalAlign: 'middle',
                  },
                  title: '引擎不返回此阶段（契约 §7.1）',
                }, '前史')
                : null),
            h('div', { className: 's' }, st.thesis.slice(0, 14) + '…'));
        }));
    }

    /* ── 错误边界（v1.7 T-A1）──
       为什么需要：7 个标签页各是几百行 JSX 三元表达式，任一页运行时抛异常，
       React 18 会卸载整棵树 → 白屏，用户连切换标签的机会都没有。
       这不是假想风险：v1.5 插入 h(...) 时括号算错就导致分岔点卡整体不渲染。

       设计决策：
       1) 只包内容区（sn-body），不包整棵树 —— 标签栏存活，用户可切到别的页
       2) key={tab} 强制切页时重建 boundary，实现「切页自动恢复」
       3) 不隐藏错误：明确说是插件缺陷，给堆栈与复制按钮，便于反馈 */
    class SnErrorBoundary extends React.Component {
      constructor(props) {
        super(props);
        this.state = { error: null, info: null };
        this.handleReset = this.handleReset.bind(this);
        this.handleCopy = this.handleCopy.bind(this);
      }

      static getDerivedStateFromError(error) {
        return { error: error };
      }

      componentDidCatch(error, info) {
        this.setState({ info: info });
      }

      handleReset() {
        this.setState({ error: null, info: null });
      }

      handleCopy() {
        const err = this.state.error;
        const detail = [
          'Singularity 面板渲染异常',
          '标签页: ' + this.props.tabLabel,
          '错误: ' + (err && err.message ? err.message : String(err)),
          '堆栈: ' + (err && err.stack ? err.stack : '（无）'),
          '组件栈: ' + (this.state.info && this.state.info.componentStack
            ? this.state.info.componentStack.slice(0, 1200) : '（无）'),
        ].join('\n');
        try {
          if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(detail);
          }
        } catch (e) { /* 剪贴板不可用时静默 —— 用户仍可手动选中文本 */ }
      }

      render() {
        if (!this.state.error) return this.props.children;
        const err = this.state.error;
        return h('div', { className: 'sn-card', style: { margin: 12 } },
          h('div', { className: 'sn-card-head', style: { color: '#d64550' } }, '这一页渲染出错了'),
          h('div', { className: 'sn-pad' },
            h('div', { style: { fontSize: 12.5, lineHeight: 1.8, marginBottom: 10 } },
              '这是插件自身的缺陷，不是你的操作问题。模型引擎没有受影响——'
              + '切到其他标签页可以继续使用，或者点下面的按钮重试。'),
            h('div', {
              style: {
                padding: '8px 10px', borderRadius: 6, background: 'var(--dsw-alias-bg-layer-2)',
                fontFamily: 'ui-monospace, monospace', fontSize: 11, lineHeight: 1.6,
                whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 10,
                maxHeight: 160, overflowY: 'auto',
              },
            }, String(err && err.message ? err.message : err)),
            h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
              h('button', {
                type: 'button', className: 'sn-btn', onClick: this.handleReset,
                'aria-label': '重试渲染当前标签页',
              }, '重试'),
              h('button', {
                type: 'button', className: 'sn-btn', onClick: this.handleCopy,
                'aria-label': '复制错误详情',
              }, '复制错误详情'),
              h('span', {
                style: {
                  fontSize: 10.5, color: 'var(--dsw-alias-label-secondary)',
                  alignSelf: 'center', lineHeight: 1.5,
                },
              }, '当前标签页：' + (this.props.tabLabel || '未知')))));
      }
    }

    /* ── 主组件 ── */
    function SingularityApp() {
      // v1.4 B5：深链恢复优先级 URL > localStorage > 默认（坏数据静默忽略）
      const [deepLink] = React.useState(() => {
        try { return parseShareUrl(typeof window !== 'undefined' ? window.location.search : ''); }
        catch (e) { return null; }
      });
      const [tab, setTab] = React.useState('timeline');
      // 惰性初始化：只在首次挂载时读一次 localStorage，避免每次渲染都读盘。
      const [restored] = React.useState(loadPersisted);
      const [scenario, setScenario] = React.useState(deepLink ? null : restored.scenario);
      const [target, setTarget] = React.useState(deepLink ? deepLink.target : restored.target);
      const [year, setYear] = React.useState(2035);
      const [picked, setPicked] = React.useState(null);
      // v1.3 E1：政策沙盒状态。政策是实验不是世界观 —— 不入持久化，
      // 载入剧本即清空（契约 §8c）。深链可带政策（实验可分享）。
      const [policy, setPolicy] = React.useState(deepLink ? deepLink.policy : null);
      const [ioMsg, setIoMsg] = React.useState('');
      // v1.4 B4：热力图基准模式（'default' 全域 / 'neighborhood' 当前邻域）
      const [heatMode, setHeatMode] = React.useState('default');

      // 杠杆或场景变化即写回；浏览态与政策态（tab / year / picked / policy）不参与持久化。
      // 审核修复（v1.4 审核）：深链会话（?t=…）不写回 localStorage——否则打开
      // 别人分享的推演会静默覆盖用户自己保存的状态。用户一旦手动操作
      // （改滑块/载入剧本），deepLinkLocked 解除，恢复常规持久化。
      const [deepLinkLocked, setDeepLinkLocked] = React.useState(!!deepLink);
      React.useEffect(() => {
        if (deepLinkLocked) return;
        savePersisted(target, scenario);
      }, [target, scenario, deepLinkLocked]);

      /* v1.7 T-A4：恢复默认 —— 清空杠杆改写、政策干预与剧本选择，
         回到「未改写」状态。不弹确认框：拨杠杆是低风险操作，
         弹框反而烦人；按钮文案已明确说明作用范围。
         同时解锁 deep link：用户主动重置后，URL 参数不该再压着状态。 */
      const resetTarget = React.useCallback(() => {
        setTarget({});
        setPolicy(null);
        setScenario('baseline');
        setDeepLinkLocked(false);
      }, []);

      const sim = React.useMemo(() => simulate(target, policy), [target, policy]);
      const sens = React.useMemo(() => sensitivity(target), [target]);
      const drivers = React.useMemo(() => diagnose(sim), [sim]);
      // v1.3 X2：无政策幽灵轨迹（政策激活时才有意义，否则不计算）
      const ghostSim = React.useMemo(
        () => (policy && policy.overrides ? simulate(target) : null), [target, policy]);
      // v1.3 E2/E3：稳健性与最小翻转（240+80 次 simulate，可接受；政策/目标变化才重算）
      const rob = React.useMemo(() => robustness(target, policy), [target, policy]);
      const rev = React.useMemo(() => reversal(target, policy), [target, policy]);
      // v1.5 T4（P1-1）：晚期反转标注。引擎以 2060 终年引力定案，而「窗口」标记的
      // 是技术越线至闸门关闭的敏感区间——两者可能不同。实测 578 个有窗口样本中
      // 至少 6 个满足「窗口末年胜者 ≠ 终年胜者」，所以这不是理论可能性。
      // 引擎零改动：这里只比较引擎已输出的逐年 path 与终年 path。
      const lateReversal = React.useMemo(() => {
        if (!sim.window) return null;
        const yEnd = sim.years.filter((y) => y.year === sim.window.end)[0];
        if (!yEnd || yEnd.path === sim.final.path) return null;
        return { atYear: sim.window.end, from: yEnd.path, to: sim.final.path };
      }, [sim]);
      // v1.4 B3：reversal 翻转环 —— 反方读法的几何化。箭头两端都是引擎输出
      // 坐标（当前终局 + 按 rev.to 重跑后的终局），不发明任何几何。
      // 必须留在 App 级：metricsTab 按标签条件调用，hooks 不能进 tab 函数体。
      const revPoint = React.useMemo(() => {
        if (!rev) return null;
        const flipped = simulate(Object.assign({}, target, (o => { o[rev.lever] = rev.to; return o; })({})), policy);
        const fm = flipped.final.metrics;
        return { x: fm.penetration, y: fm.socialization, outcome: flipped.outcome.name };
      }, [rev, target, policy]);

      // v1.2 R7 / v1.4 B4：租金热力图参数扫描。默认模式：其余杠杆取默认值
      // （tech 走趋势、制度/社会取 NOW），仅 override 格子的
      // public_ownership × capture —— 与当前滑块无关，只算一次（49 次 simulate）。
      // 邻域模式：以当前 (产权, 捕获) 为中心 ±三档（步长 1/6，clamp [0,1]）重扫。
      //
      // 审核修复（v1.4 审核）：行序必须与 SVG 显示轴一致。产权轴在图上自上而下
      // 是「高→低」（poSteps 降序），而此前构造用升序 steps，导致颜色与点击目标
      // 上下颠倒。现在统一为降序：row 0 = 最高产权。
      const heatGrid = React.useMemo(() => {
        const ASC = [0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6, 1];
        const DESC = [1, 5 / 6, 4 / 6, 3 / 6, 2 / 6, 1 / 6, 0];
        const base = {};
        LEVERS.forEach((lv) => {
          base[lv.key] = TECH_KEYS.indexOf(lv.key) >= 0 ? TECH_TREND[lv.key] : NOW[lv.key];
        });
        let poAxis = DESC, capAxis = ASC;
        if (heatMode === 'neighborhood') {
          const po = target.public_ownership !== undefined ? target.public_ownership : NOW.public_ownership;
          const cap = target.capture !== undefined ? target.capture : NOW.capture;
          const offsets = [-3, -2, -1, 0, 1, 2, 3];
          poAxis = offsets.slice().reverse().map((d) => clamp(po + d / 6));  // 高→低
          capAxis = offsets.map((d) => clamp(cap + d / 6));                  // 低→高
        }
        return poAxis.map((po) => capAxis.map((cap) => {
          const t2 = Object.assign({}, base, { public_ownership: po, capture: cap });
          return simulate(t2).final;
        }));
      }, [heatMode, target.public_ownership, target.capture]);
      // 与 heatGrid 同源的轴值（显示与点击都读它，杜绝再次错位）
      const heatAxis = React.useMemo(() => {
        const ASC = [0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6, 1];
        const DESC = [1, 5 / 6, 4 / 6, 3 / 6, 2 / 6, 1 / 6, 0];
        if (heatMode !== 'neighborhood') return { po: DESC, cap: ASC };
        const po = target.public_ownership !== undefined ? target.public_ownership : NOW.public_ownership;
        const cap = target.capture !== undefined ? target.capture : NOW.capture;
        const offsets = [-3, -2, -1, 0, 1, 2, 3];
        return {
          po: offsets.slice().reverse().map((d) => clamp(po + d / 6)),
          cap: offsets.map((d) => clamp(cap + d / 6)),
        };
      }, [heatMode, target.public_ownership, target.capture]);
      const rentBand = (v) =>
        v >= RENT_BANDS.formed ? 3 : v >= RENT_BANDS.warn ? 2 : v >= RENT_BANDS.watch ? 1 : 0;
      const RENT_COLORS = ['#2f9e63', '#e0a63a', '#e07b39', '#d64550'];
      const RENT_LABELS = ['安全', '关注', '预警', '成形'];

    /* HEALTH-DATA-BEGIN
       v1.6 T5：模型体检数据 —— 由 scripts/inject-calibration.cjs 从
       docs/calibration.json 注入，勿手改。重跑：npm run calibrate
       （生成 → 注入 → 契约断言三者一致）
       HEALTH-DATA-END */
    const HEALTH_DATA = {"generatedAt":"2026-11-27T08:26:17.972Z","version":"1.8.0","commit":"5534922","seed":42,"samples":2000,"note":"构建期生成的采样报告。固定种子，同版本同输出。这是某次采样的结果，不是「模型真理」。","outcomeDistribution":[{"name":"停滞的资本主义","count":1322,"pct":66.1},{"name":"文明崩解","count":455,"pct":22.8},{"name":"算力封建制","count":76,"pct":3.8},{"name":"过渡社会","count":70,"pct":3.5},{"name":"未竟的过渡","count":40,"pct":2},{"name":"共产主义初级形态","count":20,"pct":1},{"name":"社会民主主义终点","count":17,"pct":0.9}],"winnerDistribution":[{"key":"communism","count":922,"pct":46.1},{"key":"feudalism","count":499,"pct":25},{"key":"collapse","count":476,"pct":23.8},{"key":"social_democracy","count":103,"pct":5.2}],"rentQuantiles":{"p10":0.15,"p25":0.224,"p50":0.304,"p75":0.424,"p90":0.55,"bands":{"safe":78.7,"watch":14.7,"warn":5,"formed":1.7}},"asymmetries":{"collapseGain":{"value":1.8,"winRatePct":23.8,"caveat":"该系数是编译期常量，本脚本无法从外部扫描不同取值。此处的胜率是「当前系数下」的实测值；契约 §9.1 的质疑（系数无独立实证依据）依然成立。"},"socialDemocracy":{"totalSamples":5000,"wins":255,"winsWithLowPublicOwnership":255,"pathDependencyConfirmed":true,"caveat":"reformRoom 折减使该路径在 public_ownership ≥ 0.62 时失效——这不是采样噪声，是公式的必然结果。"},"chattering":{"samples":300,"maxFlips":3,"histogram":{"0":68,"1":201,"2":30,"3":1},"caveat":"前馈模型无内生临界点，路径翻转只发生在两个人工闸门附近，因此抖动天然有限。"}},"stageReachability":{"samples":20000,"yearSnapshots":740000,"stages":[{"id":0,"name":"商业资本主义","count":0,"pct":0},{"id":1,"name":"算法资本主义","count":109334,"pct":14.8},{"id":2,"name":"极化资本主义","count":362221,"pct":48.9},{"id":3,"name":"分岔点","count":140068,"pct":18.9},{"id":4,"name":"过渡社会","count":15277,"pct":2.1},{"id":5,"name":"共产主义初级形态","count":2663,"pct":0.4},{"id":6,"name":"自由人联合体","count":0,"pct":0},{"id":7,"name":"算力封建制","count":20795,"pct":2.8},{"id":8,"name":"改良资本主义","count":3222,"pct":0.4},{"id":9,"name":"崩解","count":76150,"pct":10.3},{"id":10,"name":"未竟的过渡","count":10270,"pct":1.4}],"structurallyUnreachable":[{"id":0,"name":"商业资本主义","groups":0,"reason":"stageOf 最低只返回 STAGE_BY_ID[1]（pen<0.38 → 算法资本主义），没有 stage 0 的返回分支。"}],"rareButReachable":[{"id":6,"name":"自由人联合体","groups":0,"note":"需同时满足 pen≥0.68、communism 引力胜、soc≥0.72、abu≥0.78、meaning≥0.46。六剧本中「全域共享」可稳定到达；随机空间里极罕见（另一批 20000 组无种子采样中出现 4 组，约 0.02%；本固定种子批次为 0 组）。"}],"start2024":{"penetrationWhenLeversZero":0.4008,"penetrationWhenLeversFull":0.4008,"fixed":true,"caveat":"2024 年 u=0，所有杠杆取 NOW 基准值，因此首年渗透度与杠杆无关。这是插值起点的设计使然，不是 bug；但它意味着时间轴停在 2024 时显示的阶段恒为「极化资本主义」，而叙事上 2024 应是前史向算法资本主义的过渡。"},"techOnlyBeforeGate":{"samples":1625,"verified":true,"caveat":"pen < GATE_PEN 时，固定渗透度扫遍制度/社会/意义全网格，阶段恒定不变——制度杠杆在岔路前不参与阶段判定。这是 P1-3 的核心，也是模型最该被质疑的简化之一。"}},"anchors":[{"scenario":"baseline","name":"基准线 · 技术狂奔，制度滞后","outcome":"算力封建制","rent":0.59,"development":0.363},{"scenario":"social_democracy","name":"社会民主主义 · 红利全民分红","outcome":"社会民主主义终点","rent":0.527,"development":0.516},{"scenario":"techno_feudalism","name":"算力封建制 · 寡头俘获","outcome":"算力封建制","rent":0.761,"development":0.267},{"scenario":"planned_transition","name":"计划性转型 · 有组织的过渡","outcome":"共产主义初级形态","rent":0.322,"development":0.658},{"scenario":"collapse","name":"崩解 · 高冲击 + 高对抗","outcome":"文明崩解","rent":0.684,"development":0.132},{"scenario":"commons","name":"全域共享 · 后稀缺共产主义","outcome":"自由人联合体","rent":0.076,"development":0.863}]};

      const applyScenario = (key) => {
        setScenario(key);
        setTarget(targetOf(key));
        setYear(2035);
        setPolicy(null);   // v1.3：载入剧本即清空政策（契约 §8c）
        setIoMsg('');
        setDeepLinkLocked(false);   // 用户主动操作 → 恢复持久化
      };

      /* v1.4 B5/B6：分享与存档。显式快照语义：点按钮才生成。 */
      const shareLink = () => {
        const enc = (o) => b64urlEncode(o);
        const params = [];
        const tEnc = enc(target);
        if (tEnc) params.push('t=' + tEnc);
        if (policy && policy.overrides && Object.keys(policy.overrides).length) {
          const pEnc = enc(policy);
          if (pEnc) params.push('p=' + pEnc);
        }
        if (!params.length) { setIoMsg('当前无可分享状态'); return; }
        const url = (typeof window !== 'undefined' && window.location)
          ? window.location.origin + window.location.pathname + '?' + params.join('&')
          : '?' + params.join('&');
        try { if (typeof window !== 'undefined' && window.history) window.history.replaceState(null, '', url); } catch (e) { /* 忽略 */ }
        const done = () => setIoMsg('链接已复制：' + url.slice(0, 60) + (url.length > 60 ? '…' : ''));
        if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(done, () => setIoMsg('请手动复制地址栏链接'));
        } else { setIoMsg('请手动复制地址栏链接'); }
      };
      const exportJson = () => {
        try {
          const payload = {
            app: 'singularity', v: STORE_VERSION, date: new Date().toISOString().slice(0, 10),
            target: target, scenario: scenario, policy: policy,
          };
          const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'singularity-state-' + payload.date + '.json';
          document.body.appendChild(a); a.click(); a.remove();
          setIoMsg('存档已导出');
        } catch (e) { setIoMsg('导出失败：' + e.message); }
      };
      const importJson = (file) => {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const data = JSON.parse(String(reader.result));
            if (!data || data.app !== 'singularity' || data.v !== STORE_VERSION) {
              setIoMsg('存档版本不符，已忽略'); return;
            }
            const t = {};
            Object.keys(data.target || {}).forEach((k) => {
              if (!LEVER_BY_KEY[k]) return;
              const v = data.target[k];
              if (typeof v !== 'number' || !isFinite(v)) return;
              t[k] = Math.max(0, Math.min(1, v));
            });
            setTarget(t);
            setScenario(typeof data.scenario === 'string' && SCENARIOS[data.scenario] ? data.scenario : null);
            setPolicy(data.policy && data.policy.overrides && Object.keys(data.policy.overrides).length
              ? { year: data.policy.year, overrides: data.policy.overrides } : null);
            setYear(2035);
            setIoMsg('存档已导入');
            setDeepLinkLocked(false);
          } catch (e) { setIoMsg('存档解析失败，已忽略'); }
        };
        reader.readAsText(file);
      };

      const curYear = sim.years.filter((y) => y.year === year)[0] || sim.years[0];

      /* ── 时间轴 ── */
      const timelineTab = () => {
        const metricCards = ['productivity', 'replacement', 'labor_share', 'abundance',
          'socialization', 'inequality', 'freedom', 'shock'].map((k) => h(Metric, {
          key: k,
          label: METRIC_META[k].name,
          value: curYear.metrics[k],
          color: METRIC_META[k].color,
          danger: (k === 'inequality' || k === 'shock' || k === 'replacement') && curYear.metrics[k] > 0.6,
        }));

        const eventRows = sim.events.length === 0
          ? h('div', { className: 'sn-empty' }, '本路径未触发关键节点。')
          : sim.events.map((e) => h('div', { className: 'sn-ev', key: e.key },
            h('div', { className: 'y' }, e.year),
            h('div', { className: 'dot' }),
            h('div', { className: 'b' },
              h('div', { className: 't' }, e.title + ' · ' + e.phase),
              h('div', { className: 'x' }, e.text))));

        const chartCard = h('div', { className: 'sn-card' },
          h('div', { className: 'sn-card-head' }, '演化轨迹',
            h('span', { className: 'sn-hint' }, '2024 → 2060')),
          h('div', { className: 'sn-pad' },
            h(LineChart, {
              years: sim.years, cursorYear: year, window: sim.window, height: 210,
              series: [
                { key: 'penetration', label: '技术渗透度' },
                { key: 'socialization', label: '社会化度' },
                { key: 'abundance', label: '可及丰裕度' },
                { key: 'rent', label: '租金压力', get: (row) => row.rent, color: '#e0a63a' },
              ],
            })));

        const eventCard = h('div', { className: 'sn-card' },
          h('div', { className: 'sn-card-head' }, '历史节点',
            h('span', { className: 'sn-hint' }, '按条件触发')),
          h('div', { className: 'sn-events' }, eventRows));

        return h('div', null,
          h(Hero, { outcome: sim.outcome, final: sim.final }),
          h(Scrubber, { years: sim.years, year: year, window: sim.window, onYear: setYear, policyYear: policy ? policy.year : null }),
          h(StageTrack, { currentId: curYear.stage.id, onPick: setPicked }),
          h('div', { className: 'sn-metrics' }, metricCards),
          h('div', { className: 'sn-grid2' }, chartCard, eventCard));
      };

      /* ── 引擎 ── */
      const engineTab = () => {
        // E1-UI：干预点 vs 闸门窗口（「机会窗口」徽标）
        const POLICY_KEYS = ['public_ownership', 'redistribution', 'coordination', 'capture'];
        const POLICY_LEVERS = POLICY_KEYS.map((k) => LEVER_BY_KEY[k]);
        const winBadge = !policy ? null
          : !sim.window ? { t: '窗口未开', c: 'var(--dsw-alias-label-secondary)' }
            : policy.year < sim.window.start ? { t: '干预在分岔窗口前 · 预防性', c: '#4f8cff' }
              : policy.year <= sim.window.end ? { t: '干预在分岔窗口内 · 决定性', c: '#e0a63a' }
                : { t: '干预在分岔窗口后 · 补救性', c: 'var(--dsw-alias-label-secondary)' };
        return h('div', null,
        h('div', { className: 'sn-card', style: { marginBottom: 12 } },
          h('div', { className: 'sn-pad', style: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' } },
            h('div', { style: { flex: '1 1 260px', minWidth: 0 } },
              h('div', { style: { fontSize: 13, fontWeight: 650, marginBottom: 3 } }, '制度选择 · 2024 → 2050'),
              h('div', { className: 'sn-sub' }, '技术杠杆有自主趋势（无论怎么选，AI 都会前进）；制度与社会杠杆由你设定。')),
            h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
              // v1.7 T-A4：恢复默认 —— 拨乱杠杆后不必刷新页面
              h('button', {
                className: 'sn-btn', type: 'button', onClick: resetTarget,
                title: '清空所有杠杆改写与政策干预，回到剧本默认值',
                'aria-label': '恢复默认杠杆与政策',
              }, '恢复默认'),
              h('button', { className: 'sn-btn sn-btn-primary', onClick: () => { setYear(2035); setTab('timeline'); } }, '应用并演化 →')))),
        ['技术', '制度', '社会', '摩擦'].map((g) => h('div', { key: g },
          h('div', { className: 'sn-group-title', style: { color: GROUP_COLOR[g] } }, g),
          h('div', { className: 'sn-levers' },
            LEVERS.filter((lv) => lv.group === g).map((lv) => {
              const overridden = target[lv.key] !== undefined;
              const v = overridden ? target[lv.key] : (TECH_KEYS.indexOf(lv.key) >= 0 ? TECH_TREND[lv.key] : NOW[lv.key]);
              return h('div', { className: 'sn-lv', key: lv.key },
                h('div', { className: 'sn-lv-top' },
                  h('span', { className: 'sn-lv-name' }, lv.name,
                    h('span', { style: { fontSize: 9, fontWeight: 500, color: 'var(--dsw-alias-label-secondary)', marginLeft: 5 } },
                      overridden ? '已改写' : '默认')),
                  h('span', { className: 'sn-lv-val', style: { color: GROUP_COLOR[g] } }, v.toFixed(2))),
                h('div', { className: 'sn-lv-desc' }, lv.desc),
                h('input', {
                  type: 'range', min: 0, max: 100, step: 1, value: Math.round(v * 100),
                  'aria-label': lv.name,
                  onChange: (e) => {
                    const nv = parseInt(e.target.value, 10) / 100;
                    setTarget((t) => { const n = Object.assign({}, t); n[lv.key] = nv; return n; });
                    setDeepLinkLocked(false);
                  },
                }),
                h('div', { className: 'sn-lv-ends' }, h('span', null, lv.low), h('span', null, lv.high)));
            })))),
        h('div', { className: 'sn-card', style: { marginTop: 14 } },
          h('div', { className: 'sn-card-head' },
            '政策沙盒',
            h('span', { className: 'sn-hint' }, '从干预年起重定向制度杠杆 · 不持久化'),
            policy ? h('button', { className: 'sn-btn', onClick: () => setPolicy(null) }, '清除干预') : null),
          h('div', { className: 'sn-pad' },
            policy && winBadge ? h('div', { style: { marginBottom: 10 } },
              h('span', { className: 'sn-pill', style: { color: winBadge.c, fontSize: 10 } }, winBadge.t))
              : null,
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' } },
              h('span', { style: { fontSize: 12, fontWeight: 600 } }, '干预年'),
              h('input', {
                type: 'range', min: 2025, max: 2060, step: 1,
                value: policy ? policy.year : 2040,
                'aria-label': '政策干预年',
                style: { flex: '1 1 160px' },
                onChange: (e) => {
                  const ny = parseInt(e.target.value, 10);
                  setPolicy((p) => ({ year: ny, overrides: (p && p.overrides) || {} }));
                },
              }),
              h('span', { className: 'sn-lv-val' }, policy ? policy.year : '未启用')),
            h('div', { className: 'sn-levers' },
              POLICY_LEVERS.map((lv) => {
                const on = policy && policy.overrides[lv.key] !== undefined;
                const pv = on ? policy.overrides[lv.key] : (target[lv.key] !== undefined ? target[lv.key] : NOW[lv.key]);
                return h('div', { className: 'sn-lv', key: lv.key },
                  h('div', { className: 'sn-lv-top' },
                    h('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' } },
                      h('input', {
                        type: 'checkbox',
                        checked: !!on,
                        onChange: (e) => {
                          const want = e.target.checked;
                          setPolicy((p) => {
                            const baseYear = p ? p.year : 2040;
                            const ov = Object.assign({}, (p && p.overrides) || {});
                            if (want) ov[lv.key] = target[lv.key] !== undefined ? target[lv.key] : NOW[lv.key];
                            else delete ov[lv.key];
                            return Object.keys(ov).length ? { year: baseYear, overrides: ov } : null;
                          });
                        },
                      }),
                      lv.name,
                      h('span', { style: { fontSize: 9, fontWeight: 500, color: 'var(--dsw-alias-label-secondary)' } }, on ? '干预中' : '未干预')),
                    h('span', { className: 'sn-lv-val', style: { color: GROUP_COLOR[lv.group] } }, pv.toFixed(2))),
                  h('input', {
                    type: 'range', min: 0, max: 100, step: 1, value: Math.round(pv * 100),
                    disabled: !on, 'aria-label': lv.name + '（政策）',
                    onChange: (e) => {
                      const nv = parseInt(e.target.value, 10) / 100;
                      setPolicy((p) => ({ year: p ? p.year : 2040, overrides: Object.assign({}, p.overrides, (obj => { obj[lv.key] = nv; return obj; })({})) }));
                    },
                  }));
              })),
            h('div', { style: { fontSize: 10.5, color: 'var(--dsw-alias-label-secondary)', marginTop: 8 } },
              '政策是从干预年起对制度杠杆的重定向（无缝衔接原轨迹），不是社会对政策的反应 —— 见契约 §8c 与 §9。'))),
        h('div', { className: 'sn-grid2', style: { marginTop: 14 } },
          h('div', { className: 'sn-card' },
            h('div', { className: 'sn-card-head' }, '关键变量', h('span', { className: 'sn-hint' }, '±10% 扰动对终点的影响')),
            h('div', { className: 'sn-pad' },
              (function () {
                const max = Math.max.apply(null, sens.items.map((i) => Math.abs(i.effect)).concat([0.01]));
                return sens.items.map((it) => {
                  const w = (Math.abs(it.effect) / max) * 48;
                  const pos = it.effect >= 0;
                  return h('div', { className: 'sn-sens', key: it.key },
                    h('span', { className: 'sn-sens-name' }, it.name),
                    h('div', { className: 'sn-sens-track' },
                      h('div', { className: 'sn-sens-zero' }),
                      h('div', {
                        className: 'sn-sens-fill',
                        style: {
                          left: (pos ? 50 : 50 - w) + '%', width: w + '%',
                          background: pos ? 'var(--dsw-alias-state-success-primary)' : 'var(--dsw-alias-state-error-primary)',
                        },
                      })),
                    h('span', { className: 'sn-sens-val' }, (pos ? '+' : '') + (it.effect * 100).toFixed(1)));
                });
              })())),
          h('div', { className: 'sn-card' },
            h('div', { className: 'sn-card-head' }, '结构归因', h('span', { className: 'sn-hint' }, '为什么是这个结局')),
            h('div', { className: 'sn-pad' },
              h('div', { className: 'sn-drivers' },
                drivers.map((d, i) => h('div', { className: 'sn-drv', key: i },
                  h('span', { className: 'sn-drv-tag', style: { color: TAG_COLOR[d.tag] } }, d.tag),
                  h('span', { className: 'sn-drv-text' }, d.text))))))),
        h('div', { style: { marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' } },
          Object.keys(SCENARIOS).map((k) => h('button', {
            key: k, type: 'button', className: 'sn-btn' + (scenario === k ? ' sn-btn-primary' : ''),
            'aria-pressed': scenario === k,
            onClick: () => applyScenario(k),
          }, SCENARIOS[k].name.split(' · ')[0]))));
      };

      /* ── 三岔路口 ── */
      const branchTab = () => {
        const sc = sim.branchScores;
        const winner = decidePath(sc);   // 与引擎共用同一个裁决函数
        return h('div', null,
          h('div', { className: 'sn-card', style: { marginBottom: 12 } },
            h('div', { className: 'sn-pad' },
              h('div', { style: { fontSize: 14, fontWeight: 650, marginBottom: 5 } }, '分岔点 · 历史橱窗'),
              h('div', { className: 'sn-sub', style: { lineHeight: 1.7, maxWidth: 700 } },
                '分岔点不是一个时刻，而是一个窗口。窗口内四条引力同时作用于社会，'
                + (sim.window
                  ? '引力值最高者就是引擎实际走的那条路（两者共用同一裁决函数）。'
                  : '本路径技术渗透未越过 0.68 的裁决线：引力数值仍在计算，但历史尚未进入裁决，处于悬置状态。'),
                // v1.5 T4（P1-2）：引力上限非对称的明示（契约 §9.1 / §9.2）
                h('div', { style: { marginTop: 6, fontSize: 10.5, color: 'var(--dsw-alias-label-secondary)', lineHeight: 1.65 } },
                  '引力上限并不相等：崩解系数 1.8（正反馈补偿）、共产与封建接近 1.0，'
                  + '而社民因「改良空间」折减上限约 0.70。四条并排显示会低估社民路径的真实可能性——'
                  + '这是模型的已知非对称，不是四者等概率。'),
                sim.window
                  ? h('div', { style: { marginTop: 6, color: sim.window.type === 'passed' ? 'var(--dsw-alias-state-success-primary)' : 'var(--dsw-alias-state-error-primary)', fontWeight: 600 } },
                    sim.window.type === 'passed'
                      ? '本路径于 ' + sim.window.gate_year + ' 年跨过制度闸门。'
                      : '本路径在窗口 ' + sim.window.start + '–' + sim.window.end + ' 内未跨过制度闸门，历史被岔路接管。')
                  : h('div', { style: { marginTop: 6 } }, '本路径技术渗透始终未达阈值，未进入分岔窗口。'),
                // v1.5 T4（P1-1）：晚期反转标注 —— 窗口末年胜者 ≠ 终年胜者时明示
                lateReversal
                  ? h('div', { style: { marginTop: 6, padding: '5px 8px', borderRadius: 5, background: 'rgba(224,166,58,.12)', color: '#e0a63a', fontSize: 11, lineHeight: 1.6 } },
                    '晚期反转：窗口末年（' + lateReversal.atYear + '）引力最高者为「'
                    + (BRANCHES.filter((b) => b.key === lateReversal.from)[0] || {}).name
                    + '」，但引擎以 2060 终年引力定案，最终走向「'
                    + (BRANCHES.filter((b) => b.key === lateReversal.to)[0] || {}).name
                    + '」。窗口标记的是敏感区间，不是裁决时刻。')
                  : null))),
          h('div', { className: 'sn-branches' },
            BRANCHES.map((b) => {
              const v = sc[b.key];
              return h('div', { key: b.key, className: 'sn-br' + (b.key === winner ? ' win' : ''), style: { '--sn-c': b.color } },
                h('div', { className: 'sn-br-name', style: { color: b.color } }, b.name),
                h('div', { className: 'sn-br-cond' }, b.condition),
                h('div', { className: 'sn-br-num', style: { color: b.color } },
                  Math.round(v * 100), h('small', null, '% 引力')),
                h('div', { className: 'sn-br-bar' }, h('div', { style: { width: (v * 100) + '%' } })),
                h('ul', { className: 'sn-br-path' }, b.path.map((x, i) => h('li', { key: i }, x))),
                h('div', { className: 'sn-br-out' }, b.outcome));
            })),
          h('div', { className: 'sn-card', style: { marginTop: 12 } },
            h('div', { className: 'sn-card-head' }, '路径对照'),
            h('div', { style: { overflowX: 'auto' } },
              h('table', { className: 'sn-table' },
                h('thead', null, h('tr', null,
                  ['路径', '必要条件', '核心机制', '终点', '是否共产主义'].map((t, i) => h('th', { key: i }, t)))),
                h('tbody', null,
                  [
                    { n: '算力封建制', c: '#f45b68', cond: '寡头俘获国家 · 产权私有放大俘获', m: '算力寡头化 → 数据圈地 → 配额制', e: '生产力极高、自由极低', y: '否' },
                    { n: '社会民主主义', c: '#4f8cff', cond: '再分配强 · 组织度高 · 产权私有', m: 'AI 税 → 全民分红 → 公共算力', e: '体面的停滞（产权 ≥0.62 时本路径失效）', y: '否（产权未变）' },
                    { n: '共产主义过渡', c: '#22c98a', cond: '产权公有 · 协同高 · 团结与意义充足', m: '生产资料公有化 → 按需分配', e: '自由人联合体', y: '是' },
                    { n: '文明崩解', c: '#8b3a42', cond: '全面对抗 · 高冲击 · 凝聚流失', m: '冲突摧毁有效生产力 → 基础设施失维', e: '低技术均衡', y: '否' },
                  ].map((r, i) => h('tr', { key: i },
                    h('td', { style: { color: r.c, fontWeight: 600 } }, r.n),
                    h('td', { style: { fontSize: 11 } }, r.cond),
                    h('td', { style: { fontSize: 11 } }, r.m),
                    h('td', { style: { fontSize: 11 } }, r.e),
                    h('td', null, h('span', { className: 'sn-pill', style: { color: r.y === '是' ? '#22c98a' : 'var(--dsw-alias-label-secondary)', fontSize: 10 } }, r.y)))))))));
      };

      /* v1.3 E2/E3：稳健性卡（蒙特卡洛分布 + 最小翻转反方读法）。
         独立定义、在 dispatcher 处与 branchTab 拼接，避免改动上方的巨型表达式。 */
      const ROB_COLORS = ['#2f9e63', '#e0a63a', '#4f8cff', '#8b3a42', '#7b8ba3', '#f45b68'];
      const robustCard = h('div', { className: 'sn-card', style: { marginTop: 12 } },
        h('div', { className: 'sn-card-head' }, '稳健性 · 蒙特卡洛',
          h('span', { className: 'sn-hint' }, '±8% 扰动 × 240 次 · 分布而非单点')),
        h('div', { className: 'sn-pad' },
          h('div', { style: { position: 'relative', height: 16, borderRadius: 8, overflow: 'hidden', display: 'flex', marginBottom: 6 } },
            rob.outcomes.map((o, i) => h('div', {
              key: o.name,
              style: {
                flex: o.count + ' 1 0',
                background: ROB_COLORS[i % 6],
                opacity: 0.85,
                borderRight: i < rob.outcomes.length - 1 ? '2px solid var(--dsw-alias-bg-base)' : 'none',
              },
            }))),
          h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 11, marginBottom: 8 } },
            rob.outcomes.map((o, i) => h('span', { key: o.name },
              h('span', { style: { color: ROB_COLORS[i % 6], fontWeight: 600 } }, '■'),
              ' ' + o.name + ' ' + Math.round(o.pct * 100) + '%')),
            h('span', { style: { marginLeft: 'auto', fontWeight: 600 } }, '一致性 ' + Math.round(rob.agreement * 100) + '%')),
          h('div', { style: { fontSize: 11.5, lineHeight: 1.7 } },
            rev
              ? h('span', null,
                h('b', null, '反方读法：'), '把「', LEVER_BY_KEY[rev.lever].name, '」从 ',
                Math.round(rev.from * 100) + '% 调到 ' + Math.round(rev.to * 100) + '%（Δ' + Math.round(rev.delta * 100) + '），结局即翻转为「', rev.outcome, '」——本结论对该杠杆敏感。')
              : h('span', null,
                h('b', null, '反方读法：'), '±8% 扰动与任何单制度杠杆极端化都无法翻转本结论——在当前参数域内，它是稳健的。'))));
      const branchTabWithRobust = () => h('div', null, branchTab(), robustCard);

      /* ── 指标 ── */
      const metricsTab = () => {
        const m = sim.final.metrics;
        const rentFinal = sim.final.rent;
        const rentBandV = rentBand(rentFinal);
        const rentCross = findCrossing(sim.years, (y) => y.rent, RENT_BANDS.warn);
        const rentPeak = sim.years.reduce((a, b) => (b.rent > a.rent ? b : a), sim.years[0]);
        const px = (v) => 36 + v * 272;
        const py = (v) => 228 - v * 216;
        const cur = sim.years.filter((y) => y.year === year)[0] || sim.final;
        const traj = sim.years.map((y) => px(y.metrics.penetration).toFixed(1) + ',' + py(y.metrics.socialization).toFixed(1)).join(' ');
        // v1.3 X2：政策激活时叠加无政策幽灵轨迹（灰虚线）+ 干预年圆环 —— 两条
        // 轨迹的分叉即「制度选择改变历史」的可视化。
        const ghostActive = !!(policy && policy.overrides && ghostSim);
        const ghostTraj = ghostActive
          ? ghostSim.years.map((y) => px(y.metrics.penetration).toFixed(1) + ',' + py(y.metrics.socialization).toFixed(1)).join(' ')
          : null;
        const ghostYear = ghostActive
          ? ghostSim.years.filter((y) => y.year === year)[0] || ghostSim.final : null;
        const curPo = target.public_ownership !== undefined ? target.public_ownership : NOW.public_ownership;
        const curCap = target.capture !== undefined ? target.capture : NOW.capture;
        // R6：相图 —— 渗透×社会化平面上的历史轨迹；阴影 = 封建稳态域（x≥0.68 且 y<0.48）
        const phaseSvg = h('svg', { viewBox: '0 0 320 244', style: { width: '100%', display: 'block' } },
          h('rect', { x: px(GATE_PEN), y: py(GATE_SOC), width: 308 - px(GATE_PEN), height: 228 - py(GATE_SOC), fill: 'rgba(244,91,104,.13)' }),
          h('text', { x: px(GATE_PEN) + 6, y: py(GATE_SOC) + 16, fontSize: 9, fill: '#f45b68' }, '封建稳态域'),
          h('line', { x1: 36, y1: 228, x2: 308, y2: 228, stroke: 'rgba(140,150,170,.5)' }),
          h('line', { x1: 36, y1: 12, x2: 36, y2: 228, stroke: 'rgba(140,150,170,.5)' }),
          h('line', { x1: px(GATE_PEN), y1: 12, x2: px(GATE_PEN), y2: 228, stroke: 'rgba(244,91,104,.5)', strokeDasharray: '4 3' }),
          h('line', { x1: 36, y1: py(GATE_SOC), x2: 308, y2: py(GATE_SOC), stroke: 'rgba(46,211,138,.5)', strokeDasharray: '4 3' }),
          h('text', { x: px(GATE_PEN) + 4, y: 20, fontSize: 8.5, fill: 'rgba(200,205,220,.85)' }, '闸门 0.68'),
          h('text', { x: 42, y: py(GATE_SOC) - 4, fontSize: 8.5, fill: 'rgba(200,205,220,.85)' }, '闸门 0.48'),
          h('polyline', { points: traj, fill: 'none', stroke: '#4f8cff', strokeWidth: 2, strokeLinejoin: 'round' }),
          revPoint ? h('g', { key: 'revArrow' },
            h('line', {
              x1: px(cur.metrics.penetration), y1: py(cur.metrics.socialization),
              x2: px(revPoint.x), y2: py(revPoint.y),
              stroke: '#e0a63a', strokeWidth: 1.5, strokeDasharray: '3 3',
            }),
            h('circle', { cx: px(revPoint.x), cy: py(revPoint.y), r: 5, fill: 'none', stroke: '#e0a63a', strokeWidth: 1.5, strokeDasharray: '2 2' }),
            h('text', {
              x: px(revPoint.x) + 7, y: py(revPoint.y) + 3, fontSize: 8.5, fill: '#e0a63a',
            }, '若翻转：' + revPoint.outcome)) : null,
          ghostActive ? h('polyline', { points: ghostTraj, fill: 'none', stroke: 'rgba(150,158,175,.75)', strokeWidth: 1.5, strokeDasharray: '5 4' }) : null,
          ghostActive ? h('circle', {
            cx: px(sim.years.filter((y) => y.year >= policy.year)[0].metrics.penetration),
            cy: py(sim.years.filter((y) => y.year >= policy.year)[0].metrics.socialization),
            r: 5, fill: 'none', stroke: '#e0a63a', strokeWidth: 2,
          }) : null,
          ghostActive ? h('circle', { cx: px(ghostYear.metrics.penetration), cy: py(ghostYear.metrics.socialization), r: 3.5, fill: 'rgba(150,158,175,.9)' }) : null,
          h('circle', { cx: px(cur.metrics.penetration), cy: py(cur.metrics.socialization), r: 4.5, fill: '#e6edf7', stroke: '#4f8cff', strokeWidth: 2 }),
          h('text', { x: 176, y: 240, fontSize: 9.5, fill: 'rgba(160,170,190,.9)' }, '渗透度 →'),
          h('text', { x: 12, y: 120, fontSize: 9.5, fill: 'rgba(160,170,190,.9)', transform: 'rotate(-90 12 120)' }, '社会化度 →'));
        // v1.4 B4：热力图 —— 7×7 参数扫描，颜色 = 终局租金档；点击载入两杆。
        // 审核修复：轴值改用 App 级 heatAxis（与 heatGrid 构造同源，杜绝行序错位）。
        // v1.9 a11y：热力图单元格键盘可达。
        // 49 个格子若全给 tabIndex=0 会产生 49 个 Tab 停靠点，体验极差，
        // 所以用 roving tabindex：只有当前选中格 tabIndex=0，其余 -1，
        // 方向键在网格内移动（WAI-ARIA grid 标准做法）。
        const heatSelected = (() => {
          for (let r = 0; r < heatAxis.po.length; r++) {
            for (let c = 0; c < heatAxis.cap.length; c++) {
              if (Math.abs(heatAxis.po[r] - curPo) < 0.084 && Math.abs(heatAxis.cap[c] - curCap) < 0.084) return { r: r, c: c };
            }
          }
          return { r: 3, c: 3 };
        })();
        const heatPick = (po, cap) => {
          setTarget((t2) => { const n = Object.assign({}, t2); n.public_ownership = po; n.capture = cap; return n; });
          setDeepLinkLocked(false);
        };
        const heatSvg = h('svg', {
          viewBox: '0 0 296 292', style: { width: '100%', display: 'block' },
          role: 'grid', 'aria-label': '参数扫描热力图：公共产权 × 资本捕获，颜色表示终局租金档位。方向键移动，回车载入。',
        },
          heatGrid.map((row, r) => row.map((cell, c) => {
            const po = heatAxis.po[r];
            const cap = heatAxis.cap[c];
            const on = Math.abs(po - curPo) < 0.084 && Math.abs(cap - curCap) < 0.084;
            const isFocus = r === heatSelected.r && c === heatSelected.c;
            const label = '产权 ' + Math.round(po * 100) + '% × 捕获 ' + Math.round(cap * 100)
              + '% → ' + RENT_LABELS[rentBand(cell.rent)];
            return h('g', {
              key: r + '-' + c, style: { cursor: 'pointer' },
              role: 'gridcell',
              tabIndex: isFocus ? 0 : -1,
              'aria-label': label,
              'aria-selected': on,
              onClick: () => heatPick(po, cap),
              onKeyDown: (e) => {
                const key = e && e.key;
                let nr = r, nc = c, moved = false;
                if (key === 'Enter' || key === ' ') { e.preventDefault(); heatPick(po, cap); return; }
                if (key === 'ArrowUp') { nr = Math.max(0, r - 1); moved = true; }
                else if (key === 'ArrowDown') { nr = Math.min(heatAxis.po.length - 1, r + 1); moved = true; }
                else if (key === 'ArrowLeft') { nc = Math.max(0, c - 1); moved = true; }
                else if (key === 'ArrowRight') { nc = Math.min(heatAxis.cap.length - 1, c + 1); moved = true; }
                if (!moved) return;
                e.preventDefault();
                // 焦点移交给目标格：同一 SVG 内按 data 属性查找
                const svg = e.currentTarget && e.currentTarget.ownerSVGElement;
                if (svg) {
                  const nodes = svg.querySelectorAll('[role="gridcell"]');
                  const idx = nr * heatAxis.cap.length + nc;
                  if (nodes && nodes[idx]) nodes[idx].focus();
                }
              },
            },
              h('title', null, label),
              h('rect', {
                x: 30 + c * 37, y: 6 + r * 37, width: 34, height: 34, rx: 4,
                fill: RENT_COLORS[rentBand(cell.rent)], opacity: 0.88,
                stroke: on ? 'var(--dsw-alias-label-primary)' : 'none', strokeWidth: on ? 1.5 : 0,
              }));
          })),
          h('text', { x: 168, y: 286, fontSize: 9.5, fill: 'rgba(160,170,190,.9)' },
            heatMode === 'neighborhood' ? '公共产权（邻域 ±0.5）→' : '公共产权 →'),
          h('text', { x: 12, y: 140, fontSize: 9.5, fill: 'rgba(160,170,190,.9)', transform: 'rotate(-90 12 140)' },
            heatMode === 'neighborhood' ? '资本捕获（邻域 ±0.5）→' : '资本捕获 →'),
          h('text', { x: 26, y: 28, fontSize: 8, fill: 'rgba(160,170,190,.8)', textAnchor: 'end' },
            Math.round(Math.max.apply(null, heatAxis.po) * 100) / 100),
          h('text', { x: 26, y: 250, fontSize: 8, fill: 'rgba(160,170,190,.8)', textAnchor: 'end' },
            Math.round(Math.min.apply(null, heatAxis.po) * 100) / 100));
        return h('div', null,
          h('div', { className: 'sn-metrics' },
            Object.keys(METRIC_META).map((k) => h(Metric, {
              key: k, label: METRIC_META[k].name, value: m[k], color: METRIC_META[k].color,
              danger: (k === 'inequality' || k === 'shock' || k === 'replacement' || k === 'collapse_risk' || k === 'feudalism_risk') && m[k] > 0.6,
            }))),
          h('div', { className: 'sn-card', style: { marginBottom: 12 } },
            h('div', { className: 'sn-card-head' }, '租金压力', h('span', { className: 'sn-hint' }, '垄断占有对分配的绑定程度 · 三档 0.45 / 0.60 / 0.75')),
            h('div', { className: 'sn-pad' },
              h('div', { style: { position: 'relative', height: 16, borderRadius: 8, overflow: 'hidden', display: 'flex', marginBottom: 6 } },
                [{ w: 45, c: RENT_COLORS[0] }, { w: 15, c: RENT_COLORS[1] }, { w: 15, c: RENT_COLORS[2] }, { w: 25, c: RENT_COLORS[3] }].map((seg, i) =>
                  h('div', { key: i, style: { flex: seg.w + ' 1 0', background: seg.c, opacity: 0.8 } })),
                h('div', { style: { position: 'absolute', left: 'calc(' + (rentFinal * 100).toFixed(1) + '% - 1px)', top: -3, width: 2, height: 22, background: 'var(--dsw-alias-label-primary)' } })),
              h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--dsw-alias-label-secondary)', marginBottom: 8 } },
                ['0', '0.45', '0.60', '0.75', '1'].map((t2, i) => h('span', { key: i }, t2))),
              h('div', { style: { fontSize: 12 } },
                h('span', { className: 'sn-pill', style: { color: RENT_COLORS[rentBandV] } }, RENT_LABELS[rentBandV] + ' · ' + Math.round(rentFinal * 100) + '%'),
                h('span', { style: { marginLeft: 10, fontSize: 11, color: 'var(--dsw-alias-label-secondary)' } },
                  '峰值 ' + Math.round(rentPeak.rent * 100) + '%（' + rentPeak.year + '）｜ 预警首年 ' + (rentCross ? rentCross.year : '—')))),
          h('div', { className: 'sn-grid2' },
            [[{ key: 'productivity', label: '生产力' }, { key: 'labor_share', label: '劳动份额' }, { key: 'socialization', label: '社会化度' }],
              [{ key: 'collapse_risk', label: '崩解风险' }, { key: 'feudalism_risk', label: '封建化风险' }],
              [{ key: 'freedom', label: '自由实现度' }, { key: 'cohesion', label: '社会凝聚' }, { key: 'inequality', label: '不平等' }],
              [{ key: 'replacement', label: '劳动替代率' }, { key: 'shock', label: '转型冲击' }],
            ].map((series, i) => h('div', { className: 'sn-card', key: i },
              h('div', { className: 'sn-card-head' }, series.map((s) => s.label).join(' / ')),
              h('div', { className: 'sn-pad' },
                h(LineChart, { years: sim.years, series: series, cursorYear: year, window: sim.window, height: 175 }))))),
          h('div', { className: 'sn-grid2', style: { marginBottom: 12 } },
            h('div', { className: 'sn-card' },
              h('div', { className: 'sn-card-head' }, '相图 · 渗透×社会化',
                h('span', { className: 'sn-hint' },
                  ghostActive ? '灰虚线 = 无政策幽灵轨迹 · 圆环 = 干预年 · 黄虚环 = 反方翻转点'
                    : revPoint ? '黄虚环 = 反方读法翻转点' : '虚线为闸门 0.68 / 0.48')),
              h('div', { className: 'sn-pad' }, phaseSvg)),
            h('div', { className: 'sn-card' },
              h('div', { className: 'sn-card-head' }, '租金热力图 · 产权×捕获',
                h('span', { style: { display: 'flex', gap: 6, alignItems: 'center' } },
                  h('span', { className: 'sn-hint' }, '点击格子载入该组合'),
                  h('button', {
                    className: 'sn-btn' + (heatMode === 'default' ? ' sn-btn-primary' : ''),
                    type: 'button', 'aria-pressed': heatMode === 'default',
                    onClick: () => setHeatMode('default'), title: '全域扫描（其余杠杆取默认值）',
                  }, '全域'),
                  h('button', {
                    className: 'sn-btn' + (heatMode === 'neighborhood' ? ' sn-btn-primary' : ''),
                    type: 'button', 'aria-pressed': heatMode === 'neighborhood',
                    onClick: () => setHeatMode('neighborhood'), title: '以当前产权×捕获为中心 ±0.5 重扫',
                  }, '邻域'))),
              h('div', { className: 'sn-pad' }, heatSvg))),
          h('div', { className: 'sn-card', style: { marginTop: 12 } },
            h('div', { className: 'sn-card-head' }, '逐年数据', h('span', { className: 'sn-hint' }, '点击行跳到该年')),
            h('div', { style: { overflowX: 'auto', maxHeight: 320, overflowY: 'auto' } },
              h('table', { className: 'sn-table' },
                h('thead', null, h('tr', null,
                  ['年份', '阶段', '渗透', '社会化', '丰裕', '替代率', '劳动份额', '不等', '自由', '租金'].map((t, i) => h('th', { key: i }, t)))),
                h('tbody', null,
                  sim.years.filter((y) => y.year % 2 === 0).map((y) => h('tr', {
                    key: y.year, style: { cursor: 'pointer' },
                    // v1.9 a11y：表格行不能是 button，用 role + tabIndex + Enter/Space
                    role: 'button', tabIndex: 0,
                    'aria-label': '跳到 ' + y.year + ' 年（' + y.stage.name + '）',
                    onClick: () => { setYear(y.year); setTab('timeline'); },
                    onKeyDown: (e) => {
                      if (e && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        setYear(y.year);
                        setTab('timeline');
                      }
                    },
                  },
                    h('td', null, y.year),
                    h('td', null, h('span', { className: 'sn-pill', style: { color: y.stage.color, fontSize: 10 } }, y.stage.name)),
                    h('td', null, Math.round(y.metrics.penetration * 100) + '%'),
                    h('td', null, Math.round(y.metrics.socialization * 100) + '%'),
                    h('td', null, Math.round(y.metrics.abundance * 100) + '%'),
                    h('td', null, Math.round(y.metrics.replacement * 100) + '%'),
                    h('td', null, Math.round(y.metrics.labor_share * 100) + '%'),
                    h('td', null, Math.round(y.metrics.inequality * 100) + '%'),
                    h('td', null, Math.round(y.metrics.freedom * 100) + '%'),
                    h('td', { style: { color: y.rent >= 0.60 ? '#e07b39' : undefined } },
                      Math.round(y.rent * 100) + '%')))))))));
      };

      /* ── 对比 ── */
      // v1.4 B2：六剧本租金终值 + 种子化稳健性（App 级缓存一次，约 1440 次 simulate）。
      // 种子 = 剧本键哈希 → 刷新页面数字不抖动（显示即引擎输出的可复算延伸）。
      const compareStats = React.useMemo(() => {
        const hash = (str) => {
          let x = 2166136261;
          for (let i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619); }
          return x >>> 0;
        };
        const out = {};
        Object.keys(SCENARIOS).forEach((k) => {
          const sim2 = simulate(targetOf(k));
          const rob2 = robustness(targetOf(k), null, mulberry32(hash(k)));
          out[k] = { rent: sim2.final.rent, agreement: rob2.agreement, dominant: rob2.dominant };
        });
        return out;
      }, []);
      const compareTab = () => {
        const rows = Object.keys(SCENARIOS).map((k) => {
          const s = simulate(targetOf(k));
          return { key: k, name: SCENARIOS[k].name, desc: SCENARIOS[k].desc, sim: s };
        });
        return h('div', null,
          h('div', { className: 'sn-card', style: { marginBottom: 12 } },
            h('div', { className: 'sn-pad' },
              h('div', { style: { fontSize: 14, fontWeight: 650, marginBottom: 5 } }, '六种世界'),
              h('div', { className: 'sn-sub', style: { lineHeight: 1.7, maxWidth: 720 } },
                '同样的技术，不同的制度选择。注意：六条路径的技术条件几乎相同，结局却完全相反 —— 这就是「制度决定落在哪一侧」。'),
              h('div', { className: 'sn-sub', style: { marginTop: 4 } },
                '「一致性」= ±8% 扰动 × 240 次中主结局的占比（种子化，刷新可复算）；越低说明该结局越脆弱。')),
          h('div', { className: 'sn-card' },
            h('div', { style: { overflowX: 'auto' } },
              h('table', { className: 'sn-table' },
                h('thead', null, h('tr', null,
                  ['情景', '结局', '发展 D', '丰裕', '自由', '不平等', '租金', '一致性', '窗口', ''].map((t, i) => h('th', { key: i }, t)))),
                h('tbody', null,
                  rows.map((r) => {
                    const f = r.sim.final.metrics;
                    const o = r.sim.outcome;
                    const st = compareStats[r.key];
                    return h('tr', { key: r.key },
                      h('td', null,
                        h('div', { style: { fontWeight: 600, fontSize: 12 } }, r.name),
                        h('div', { style: { fontSize: 10, color: 'var(--dsw-alias-label-secondary)' } }, r.desc.slice(0, 26) + '…')),
                      h('td', null, h('span', { className: 'sn-pill', style: { color: o.color, fontSize: 10 } }, o.name)),
                      h('td', null, Math.round(f.development * 100) + '%'),
                      h('td', null, Math.round(f.abundance * 100) + '%'),
                      h('td', null, Math.round(f.freedom * 100) + '%'),
                      h('td', { style: { color: f.inequality > 0.6 ? 'var(--dsw-alias-state-error-primary)' : undefined } },
                        Math.round(f.inequality * 100) + '%'),
                      h('td', { style: { color: st.rent >= RENT_BANDS.warn ? '#e07b39' : undefined } },
                        Math.round(st.rent * 100) + '%'),
                      h('td', { style: { color: st.agreement < 0.6 ? '#e0a63a' : undefined }, title: '±8% 扰动 ×240 次的主结局占比（种子化可复算）' },
                        Math.round(st.agreement * 100) + '%'),
                      h('td', { style: { fontSize: 10.5 } }, r.sim.window ? r.sim.window.start + '–' + r.sim.window.end : '—'),
                      h('td', null, h('button', { className: 'sn-btn', onClick: () => applyScenario(r.key) }, '载入')));
                  })))))));
      };

      /* ── 模型体检（v1.6 T5）──
         只读展示构建期生成的采样报告（HEALTH_DATA）。设计原则：
         1) 不在运行时重算 2000 次 simulate（tab 切换会卡）
         2) 必须显示数据生成时间、版本、commit、种子——读者要知道这是某次采样的
            结果，不是「模型真理」
         3) 每条数据配一句「它在质疑什么」，对应契约 §9 条目 */
      const healthTab = () => {
        const d = HEALTH_DATA;
        const barRow = (label, pctVal, color, sub) => h('div', { key: label, style: { marginBottom: 7 } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 3 } },
            h('span', null, label, sub ? h('span', { style: { fontSize: 10, color: 'var(--dsw-alias-label-secondary)', marginLeft: 6 } }, sub) : null),
            h('span', { style: { fontVariantNumeric: 'tabular-nums', fontWeight: 600 } }, pctVal + '%')),
          h('div', { style: { height: 7, borderRadius: 4, background: 'var(--dsw-alias-bg-layer-2)', overflow: 'hidden' } },
            h('div', { style: { width: Math.min(100, pctVal) + '%', height: '100%', background: color } })));

        const OUT_COLORS = { '停滞的资本主义': '#7b8ba3', '文明崩解': '#8b3a42', '算力封建制': '#f45b68',
          '过渡社会': '#4f8cff', '未竟的过渡': '#e0a63a', '共产主义初级形态': '#22c98a', '社会民主主义终点': '#6ba1ff' };
        const WIN_NAMES = { communism: '共产主义过渡', feudalism: '算力封建制', collapse: '文明崩解', social_democracy: '社会民主主义' };

        // 租金分位带：把 p10–p90 画成一条渐变轨
        const rq = d.rentQuantiles;
        const rentTrack = h('div', { style: { position: 'relative', height: 18, borderRadius: 9, overflow: 'hidden', display: 'flex', marginBottom: 5 } },
          [{ w: 45, c: RENT_COLORS[0], t: '安全 <0.45' }, { w: 15, c: RENT_COLORS[1], t: '关注' },
            { w: 15, c: RENT_COLORS[2], t: '预警' }, { w: 25, c: RENT_COLORS[3], t: '成形 ≥0.75' }]
            .map((seg) => h('div', { key: seg.t, title: seg.t, style: { flex: seg.w + ' 1 0', background: seg.c, opacity: 0.8 } })),
          [rq.p10, rq.p50, rq.p90].map((v, i) => h('div', {
            key: i, title: ['p10', 'p50', 'p90'][i] + ' = ' + v,
            style: {
              position: 'absolute', left: 'calc(' + (v * 100).toFixed(1) + '% - 1px)', top: -2,
              width: i === 1 ? 2 : 1, height: 22,
              background: i === 1 ? 'var(--dsw-alias-label-primary)' : 'rgba(255,255,255,.45)',
            },
          })));

        return h('div', null,
          // 元信息条：诚实性的第一道
          h('div', { className: 'sn-card', style: { marginBottom: 12 } },
            h('div', { className: 'sn-pad' },
              h('div', { style: { fontSize: 14, fontWeight: 650, marginBottom: 5 } }, '模型体检 · 采样报告'),
              h('div', { className: 'sn-sub', style: { lineHeight: 1.7, maxWidth: 720 } },
                d.note || '构建期生成的采样报告。'),
              h('div', { style: { display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 7, fontSize: 10.5, color: 'var(--dsw-alias-label-secondary)' } },
                h('span', null, '生成于 ' + (d.generatedAt || '—').slice(0, 19).replace('T', ' ')),
                h('span', null, '版本 ' + (d.version || '—')),
                h('span', null, 'commit ' + (d.commit || '—')),
                h('span', null, '种子 ' + d.seed + ' · ' + d.samples + ' 组随机参数')))),

          h('div', { className: 'sn-grid2' },
            // 结局分布
            h('div', { className: 'sn-card' },
              h('div', { className: 'sn-card-head' }, '结局分布',
                h('span', { className: 'sn-hint' }, '均匀随机参数空间')),
              h('div', { className: 'sn-pad' },
                d.outcomeDistribution.map((o) => barRow(o.name, o.pct, OUT_COLORS[o.name] || '#7b8ba3', o.count + ' 组')),
                h('div', { style: { fontSize: 10.5, color: 'var(--dsw-alias-label-secondary)', marginTop: 8, lineHeight: 1.65 } },
                  '质疑：停滞占三分之二，说明「技术足够但制度没跟上」是这个模型的默认结局。'
                  + '若你认为现实中制度演化更快，这个比例就是你该反驳的地方。'))),
            // 引力分布
            h('div', { className: 'sn-card' },
              h('div', { className: 'sn-card-head' }, '引力胜者分布',
                h('span', { className: 'sn-hint' }, '同一批样本')),
              h('div', { className: 'sn-pad' },
                d.winnerDistribution.map((w) => barRow(WIN_NAMES[w.key] || w.key, w.pct,
                  BRANCHES.filter((b) => b.key === w.key)[0] ? BRANCHES.filter((b) => b.key === w.key)[0].color : '#7b8ba3', w.count + ' 组')),
                h('div', { style: { fontSize: 10.5, color: 'var(--dsw-alias-label-secondary)', marginTop: 8, lineHeight: 1.65 } },
                  '质疑（契约 §9.1）：崩解引力系数 1.8 高于其余三条的 1.0，实测崩解胜率 '
                  + d.asymmetries.collapseGain.winRatePct + '%。这个系数没有独立实证依据——'
                  + '它是本模型最该被质疑的设定。')))),

          h('div', { className: 'sn-card', style: { marginTop: 12 } },
            h('div', { className: 'sn-card-head' }, '租金压力分布',
              h('span', { className: 'sn-hint' }, '终年租金 · 分位数与四档占比')),
            h('div', { className: 'sn-pad' },
              rentTrack,
              h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--dsw-alias-label-secondary)', marginBottom: 10 } },
                h('span', null, '0'), h('span', null, '0.45'), h('span', null, '0.60'), h('span', null, '0.75'), h('span', null, '1')),
              h('div', { style: { display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 11.5 } },
                [['p10', rq.p10], ['p25', rq.p25], ['中位', rq.p50], ['p75', rq.p75], ['p90', rq.p90]].map((kv) =>
                  h('span', { key: kv[0] }, h('span', { style: { color: 'var(--dsw-alias-label-secondary)' } }, kv[0] + ' '), h('b', null, kv[1]))),
                h('span', { style: { marginLeft: 'auto' } },
                  '四档：安全 ' + rq.bands.safe + '% · 关注 ' + rq.bands.watch + '% · 预警 ' + rq.bands.warn + '% · 成形 ' + rq.bands.formed + '%')),
              h('div', { style: { fontSize: 10.5, color: 'var(--dsw-alias-label-secondary)', marginTop: 8, lineHeight: 1.65 } },
                '质疑（契约 §9.9）：租金是当期杠杆的即时读数，无存量积累、无对占有结构的反噬回路。'
                + '不要把越线年份当作动力学预测。'))),

          h('div', { className: 'sn-card', style: { marginTop: 12 } },
            h('div', { className: 'sn-card-head' }, '已知非对称（契约 §9 的自查）'),
            h('div', { className: 'sn-pad' },
              h('div', { style: { display: 'grid', gap: 10 } },
                h('div', { style: { padding: '8px 10px', borderRadius: 6, background: 'var(--dsw-alias-bg-layer-2)' } },
                  h('div', { style: { fontWeight: 600, fontSize: 12, marginBottom: 4 } }, '§9.1 崩解系数偏高'),
                  h('div', { style: { fontSize: 11, lineHeight: 1.7 } },
                    'COLLAPSE_GAIN = ' + d.asymmetries.collapseGain.value + '（其余三条 1.0），实测胜率 '
                    + d.asymmetries.collapseGain.winRatePct + '%。' + d.asymmetries.collapseGain.caveat)),
                h('div', { style: { padding: '8px 10px', borderRadius: 6, background: 'var(--dsw-alias-bg-layer-2)' } },
                  h('div', { style: { fontWeight: 600, fontSize: 12, marginBottom: 4 } }, '§9.2/9.3 社民路径依赖'),
                  h('div', { style: { fontSize: 11, lineHeight: 1.7 } },
                    '5000 组随机中社民胜出 ' + d.asymmetries.socialDemocracy.wins + ' 次，其中 '
                    + d.asymmetries.socialDemocracy.winsWithLowPublicOwnership + ' 次伴随产权 <0.62'
                    + (d.asymmetries.socialDemocracy.pathDependencyConfirmed ? '（100% 路径依赖已确认）' : '') + '。'
                    + d.asymmetries.socialDemocracy.caveat)),
                h('div', { style: { padding: '8px 10px', borderRadius: 6, background: 'var(--dsw-alias-bg-layer-2)' } },
                  h('div', { style: { fontWeight: 600, fontSize: 12, marginBottom: 4 } }, '§9.4 前馈而非动力学'),
                  h('div', { style: { fontSize: 11, lineHeight: 1.7 } },
                    '300 组样本中路径最多翻转 ' + d.asymmetries.chattering.maxFlips + ' 次。'
                    + d.asymmetries.chattering.caveat))))),

          // v1.8：阶段可达性 —— 区分「结构性不可达」与「稀有但可达」
          h('div', { className: 'sn-card', style: { marginTop: 12 } },
            h('div', { className: 'sn-card-head' }, '阶段可达性',
              h('span', { className: 'sn-hint' }, d.stageReachability.samples + ' 组 × 37 年 = '
                + (d.stageReachability.yearSnapshots / 10000).toFixed(0) + ' 万年份快照')),
            h('div', { className: 'sn-pad' },
              h('div', { style: { fontSize: 11, color: 'var(--dsw-alias-label-secondary)', marginBottom: 8, lineHeight: 1.65 } },
                '七阶段轨道里，有一个阶段引擎从不返回——这不是数据缺失，是判定逻辑的边界。'),
              (d.stageReachability.structurallyUnreachable || []).map((u) => h('div', {
                key: 'u' + u.id,
                style: { padding: '8px 10px', borderRadius: 6, background: 'rgba(214,69,80,.10)', marginBottom: 8 },
              },
                h('div', { style: { fontWeight: 600, fontSize: 12, marginBottom: 3, color: '#d64550' } },
                  '结构性不可达：' + u.name),
                h('div', { style: { fontSize: 11, lineHeight: 1.7 } }, u.reason),
                h('div', { style: { fontSize: 10.5, lineHeight: 1.6, marginTop: 4, color: 'var(--dsw-alias-label-secondary)' } },
                  '实测：' + d.stageReachability.samples + ' 组随机参数中出现 ' + u.groups + ' 次。'
                  + '它在阶段轨道上标为「前史」——用于叙事，不是运行时状态。'))),
              (d.stageReachability.rareButReachable || []).map((r) => h('div', {
                key: 'r' + r.id,
                style: { padding: '8px 10px', borderRadius: 6, background: 'var(--dsw-alias-bg-layer-2)', marginBottom: 8 },
              },
                h('div', { style: { fontWeight: 600, fontSize: 12, marginBottom: 3 } },
                  '稀有但可达：' + r.name),
                h('div', { style: { fontSize: 11, lineHeight: 1.7 } }, r.note))),
              h('div', { style: { padding: '8px 10px', borderRadius: 6, background: 'var(--dsw-alias-bg-layer-2)' } },
                h('div', { style: { fontWeight: 600, fontSize: 12, marginBottom: 3 } }, '2024 起点固定'),
                h('div', { style: { fontSize: 11, lineHeight: 1.7 } },
                  '杠杆全零时首年渗透度 ' + d.stageReachability.start2024.penetrationWhenLeversZero
                  + '，全拉满时 ' + d.stageReachability.start2024.penetrationWhenLeversFull
                  + (d.stageReachability.start2024.fixed ? '——完全相同。' : '——不同。')),
                h('div', { style: { fontSize: 10.5, lineHeight: 1.6, marginTop: 4, color: 'var(--dsw-alias-label-secondary)' } },
                  d.stageReachability.start2024.caveat)),
              h('div', { style: { padding: '8px 10px', borderRadius: 6, background: 'var(--dsw-alias-bg-layer-2)', marginTop: 8 } },
                h('div', { style: { fontWeight: 600, fontSize: 12, marginBottom: 3 } }, '岔路前由技术单变量决定'),
                h('div', { style: { fontSize: 11, lineHeight: 1.7 } },
                  d.stageReachability.techOnlyBeforeGate.caveat)))),

          // 六剧本锚点：读者可核对面板显示与采样报告是否一致
          h('div', { className: 'sn-card', style: { marginTop: 12 } },
            h('div', { className: 'sn-card-head' }, '六剧本锚点',
              h('span', { className: 'sn-hint' }, '用于核对面板与报告是否一致')),
            h('div', { style: { overflowX: 'auto' } },
              h('table', { className: 'sn-table' },
                h('thead', null, h('tr', null, ['剧本', '结局', '终年租金', '发展 D'].map((t, i) => h('th', { key: i }, t)))),
                h('tbody', null, d.anchors.map((a) => h('tr', { key: a.scenario },
                  h('td', { style: { fontSize: 11 } }, a.name),
                  h('td', null, h('span', { className: 'sn-pill', style: { fontSize: 10 } }, a.outcome)),
                  h('td', null, Math.round(a.rent * 100) + '%'),
                  h('td', null, Math.round(a.development * 100) + '%'))))))));
      };

      /* ── 理论 ── */
      const theoryTab = () => {
        // R2：四张反驳卡 —— 每张都可攻击本模型的结论
        const REBUTTALS = [
          { id: 'R1', name: '技术封建化', cond: '智能化快于公有化', impact: '认知劳动贬值先于产权变革，主线路径被截断，历史滑入算力封建制。', reply: '双闸门 GATE_PEN 0.68 ∧ GATE_SOC 0.48 + feudalism 引力；v1.2 租金压力指标为其显性预警读数。' },
          { id: 'R2', name: '生态天花板', cond: '位置品与生态容量不可自动化', impact: '丰裕度无法归零，按需分配存在物理上限，「后稀缺」永远不完整。', reply: '契约 §9 声明模型域边界：abundance 只对标准化物质与服务产出成立。' },
          { id: 'R3', name: '计算问题', cond: '算力不等于偏好加总', impact: '计划面临信息与激励双重难题，协调杠杆可能只是纸面能力。', reply: 'meaning / coordination 杠杆是定性 proxies；契约 §9 声明此为模型最强假设之一。' },
          { id: 'R4', name: '路径依赖', cond: '同一技术基础，制度多解', impact: '历史不存在单线宿命，任何「必然论」都会被反例削弱。', reply: '四条引力路径并行竞争的设计本身 —— 引擎从不断言唯一终点。' },
        ];
        /* v1.8：阶段语义的已知局限（P1-3 披露）。三条都是实测确认的，
           不是推测——契约 §7.1–§7.3 有对应声明，模型体检页有数据。 */
        const STAGE_LIMITS = [
          {
            id: 'L1', title: '阶段 0 不可达',
            fact: 'STAGES[0]「商业资本主义」是前史标注，stageOf 最低只返回「算法资本主义」。'
              + '20000 组随机参数 × 37 年 = 74 万个年份快照中，它出现 0 次。',
            why: '它用于叙事与阶段轨道展示（我们从哪来），不是引擎会返回的运行时状态。',
          },
          {
            id: 'L2', title: '2024 起点固定',
            fact: '2024 年所有杠杆取 NOW 基准值，技术渗透度恒为 0.4008——'
              + '杠杆全零与全拉满，首年渗透度完全相同。',
            why: '插值起点的设计使然。副作用是时间轴停在 2024 时显示的阶段恒为「极化资本主义」，'
              + '而叙事上 2024 应是前史向算法资本主义的过渡。阶段轨道已把 stage 0 标为「前史」。',
          },
          {
            id: 'L3', title: '岔路前阶段由技术单变量决定',
            fact: '渗透度未越过 0.68 时，stageOf 只看 penetration。'
              + '固定渗透度、扫遍制度/社会/意义全网格（1625 个样本），阶段恒定不变。',
            why: '这是本模型最该被质疑的简化之一：一个制度完全崩溃但技术仍在推进的世界，'
              + '与一个制度健全的世界，在前三阶段看起来一样。制度杠杆只在越线后才开始裁决方向。',
          },
        ];
        return h('div', null,
        h('div', { className: 'sn-quote' },
          h('q', null, '“手推磨产生的是封建主的社会，蒸汽磨产生的是工业资本家的社会。”'),
          h('cite', null, '—— 马克思《哲学的贫困》')),
        h('div', { className: 'sn-theory', style: { marginBottom: 12 } },
          DYNAMICS.map((d) => h('div', { key: d.key, className: 'sn-th', style: { '--sn-c': d.color } },
            h('h4', null, d.name),
            h('div', { className: 'c' }, d.claim),
            h('div', { className: 'd' }, d.detail)))),
        h('div', { className: 'sn-card', style: { marginBottom: 12 } },
          h('div', { className: 'sn-card-head' }, '合取命题 · 两个闸门缺一不可', h('span', { className: 'sn-hint' }, '真实常数 0.68 ∧ 0.48')),
          h('div', { className: 'sn-pad' },
            h('div', { style: { fontSize: 12.5, lineHeight: 1.8, marginBottom: 10 } },
              '技术渗透 ≥ 0.68 ∧ 社会化 ≥ 0.48 同时越过闸门，历史才指向共产主义方向；缺任一项，落入其他稳态（算力封建 / 改良停滞 / 崩解）。单凭技术或单凭意愿，都不构成充分条件。'),
            h('table', { className: 'sn-table' },
              h('thead', null, h('tr', null, ['来源变量', '含义', '引擎杠杆'].map((t2, i) => h('th', { key: i }, t2)))),
              h('tbody', null,
                [['a', '智能化水平', 'cognition / compute / automation'],
                  ['m', '物质生产自动化', 'automation'],
                  ['e', '能源与物质丰裕', 'energy'],
                  ['p', '产权公有化', 'public_ownership'],
                  ['b', '资本捕获 / 寡头化', 'capture'],
                  ['g', '组织与协商能力', 'redistribution / coordination / education'],
                ].map((row, i) => h('tr', { key: i },
                  h('td', null, row[0]), h('td', null, row[1]), h('td', null, row[2]))))))),
        h('div', { className: 'sn-grid2', style: { marginBottom: 12 } },
          REBUTTALS.map((rb) => h('div', { className: 'sn-card', key: rb.id },
            h('div', { className: 'sn-card-head' }, rb.id + ' · ' + rb.name, h('span', { className: 'sn-hint' }, rb.cond)),
            h('div', { className: 'sn-pad' },
              h('div', { style: { fontSize: 11.5, lineHeight: 1.7 } }, rb.impact),
              h('div', { style: { fontSize: 11, lineHeight: 1.7, marginTop: 6, color: 'var(--dsw-alias-label-secondary)' } },
                h('b', { style: { color: 'var(--dsw-alias-label-primary)' } }, '模型回应：'), rb.reply))))),
        // v1.8：阶段语义的已知局限 —— 实测确认，非推测
        h('div', { className: 'sn-card', style: { marginBottom: 12 } },
          h('div', { className: 'sn-card-head' }, '已知局限 · 阶段语义',
            h('span', { className: 'sn-hint' }, '契约 §7.1–§7.3')),
          h('div', { className: 'sn-pad', style: { display: 'grid', gap: 10 } },
            STAGE_LIMITS.map((lim) => h('div', {
              key: lim.id,
              style: { padding: '9px 11px', borderRadius: 6, background: 'var(--dsw-alias-bg-layer-2)' },
            },
              h('div', { style: { fontWeight: 600, fontSize: 12, marginBottom: 4 } }, lim.id + ' · ' + lim.title),
              h('div', { style: { fontSize: 11, lineHeight: 1.7 } }, lim.fact),
              h('div', { style: { fontSize: 11, lineHeight: 1.7, marginTop: 4, color: 'var(--dsw-alias-label-secondary)' } },
                h('b', { style: { color: 'var(--dsw-alias-label-primary)' } }, '为什么：'), lim.why))))),
        h('div', { className: 'sn-card' },          h('div', { className: 'sn-card-head' }, '本路径的判定'),
          h('div', { className: 'sn-pad' },
            h('div', { style: { display: 'flex', gap: 9, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' } },
              h('span', { className: 'sn-pill', style: { color: sim.outcome.color } }, sim.outcome.name),
              h('span', { className: 'sn-hint', style: { fontSize: 11, color: 'var(--dsw-alias-label-secondary)' } }, sim.outcome.stageLabel)),
            h('div', { style: { fontSize: 12, color: 'var(--dsw-alias-label-secondary)', lineHeight: 1.8, marginBottom: 12 } }, sim.outcome.detail),
            h('div', { className: 'sn-drivers' },
              drivers.map((d, i) => h('div', { className: 'sn-drv', key: i },
                h('span', { className: 'sn-drv-tag', style: { color: TAG_COLOR[d.tag] } }, d.tag),
                h('span', { className: 'sn-drv-text' }, d.text)))))),
        h('div', { className: 'sn-quote', style: { marginTop: 12 } },
          h('q', null, '“代替那存在着阶级和阶级对立的资产阶级旧社会的，将是这样一个联合体，在那里，每个人的自由发展是一切人的自由发展的条件。”'),
          h('cite', null, '—— 马克思、恩格斯《共产党宣言》')),
        h('div', { className: 'sn-card' },
          h('div', { className: 'sn-pad', style: { fontSize: 11.5, color: 'var(--dsw-alias-label-secondary)', lineHeight: 1.8 } },
            h('b', { style: { color: 'var(--dsw-alias-label-primary)' } }, '这是一个模拟器，不是预言。'),
            ' 它的价值不在于预测哪一年会发生什么，而在于把「条件」摊开：技术提供可能性，制度决定落在哪一侧，而制度不是自动演化的 —— 它由组织起来的人写出来。模型中的每个系数都是一次可辩论的判断，你可以拨动杠杆，看它是否还站得住。')),
        h('div', { style: { marginTop: 14, marginBottom: 4, fontSize: 11, color: 'var(--dsw-alias-label-secondary)', textAlign: 'center' } },
          '启发式推演模型 · 参数为机制性定性标定，未经计量估计 · 不构成任何现实预测'));
      };

      const TABS = [
        { id: 'timeline', label: '历史长河' },
        { id: 'engine', label: '演化引擎' },
        { id: 'branch', label: '三岔路口' },
        { id: 'metrics', label: '指标矩阵' },
        { id: 'compare', label: '情景对比' },
        { id: 'theory', label: '理论底座' },
        { id: 'health', label: '模型体检' },
      ];

      return h('div', { className: 'sn-root' },
        h('div', { className: 'sn-head' },
          h('div', { style: { minWidth: 0 } },
            h('h1', { className: 'sn-title' }, 'Singularity'),
            h('div', { className: 'sn-sub' }, 'AI 时代的社会形态演化模拟')),
          h('div', { className: 'sn-tabs' },
            TABS.map((t) => h('button', {
              key: t.id, className: 'sn-tab' + (tab === t.id ? ' sn-tab-on' : ''),
              onClick: () => setTab(t.id),
            }, t.label))),
          h('div', { style: { display: 'flex', gap: 6, alignItems: 'center' } },
            h('button', { className: 'sn-btn', onClick: shareLink, title: '把当前推演编码为链接（显式快照）' }, '分享'),
            h('button', { className: 'sn-btn', onClick: exportJson, title: '导出 JSON 存档' }, '导出'),
            h('button', {
              className: 'sn-btn', title: '导入 JSON 存档',
              onClick: () => { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
                inp.onchange = () => { if (inp.files && inp.files[0]) importJson(inp.files[0]); };
                inp.click();
              },
            }, '导入')),
          ioMsg ? h('div', { style: { flexBasis: '100%', fontSize: 10.5, color: 'var(--dsw-alias-label-secondary)' } }, ioMsg) : null),
        h('div', { className: 'sn-body' },
          h(SnErrorBoundary, {
            key: tab,
            tabLabel: (TABS.filter((t) => t.id === tab)[0] || {}).label || tab,
          },
          tab === 'timeline' ? timelineTab()
            : tab === 'engine' ? engineTab()
              : tab === 'branch' ? branchTabWithRobust()
                : tab === 'metrics' ? metricsTab()
                  : tab === 'compare' ? compareTab()
                  : tab === 'health' ? healthTab()
                    : theoryTab())),
        picked ? h('div', {
          style: {
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          },
          onClick: () => setPicked(null),
          // v1.9 a11y：遮罩可 Esc 关闭 + 对话框语义
          onKeyDown: (e) => { if (e && e.key === 'Escape') { e.preventDefault(); setPicked(null); } },
          role: 'presentation',
        }, h('div', {
          role: 'dialog', 'aria-modal': 'true', 'aria-label': picked.name + ' · 阶段详情',
          // 打开时把焦点移入对话框，关闭时（卸载）浏览器归还给触发元素
          ref: (el) => { if (el && typeof el.focus === 'function') el.focus(); },
          tabIndex: -1,
          style: {
            maxWidth: 460, width: '100%', background: 'var(--dsw-alias-bg-overlay)',
            border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 12, padding: 20,
            outline: 'none',
          },
          onClick: (e) => e.stopPropagation(),
        },
          h('div', { style: { fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--dsw-alias-label-secondary)', fontWeight: 700 } },
            '阶段 0' + (picked.id + 1)),
          h('h3', { style: { margin: '5px 0 9px', fontSize: 17, color: picked.color } }, picked.name),
          h('div', { style: { fontSize: 13, lineHeight: 1.5, marginBottom: 11, color: picked.color } }, picked.thesis),
          h('div', { style: { fontSize: 12, lineHeight: 1.8, color: 'var(--dsw-alias-label-secondary)', marginBottom: 13 } }, picked.detail),
          h('div', { className: 'sn-keys' }, picked.keys.map((k, i) => h('span', { className: 'sn-key', key: i }, k))),
          h('div', { style: { textAlign: 'right', marginTop: 15 } },
            h('button', { className: 'sn-btn', onClick: () => setPicked(null) }, '关闭')))) : null);
    }

    /* ══════════════════════════════════════════════════════════════
       5. 侧栏图标
       ══════════════════════════════════════════════════════════════ */
    function PanelIcon(props) {
      const size = typeof props.size === 'number' ? props.size : 18;
      const on = !!props.active;
      return h('svg', {
        viewBox: '0 0 24 24', width: size, height: size, 'aria-hidden': true,
        style: { display: 'block' },
      },
        h('circle', {
          cx: 12, cy: 12, r: 8.5, fill: 'none',
          stroke: on ? 'var(--dsw-alias-brand-primary)' : 'currentColor',
          strokeWidth: 1.6,
        }),
        h('path', {
          d: 'M12 3.5c-3 3.2-3 13.3 0 17M12 3.5c3 3.2 3 13.3 0 17M3.5 12h17',
          fill: 'none',
          stroke: on ? 'var(--dsw-alias-brand-primary)' : 'currentColor',
          strokeWidth: 1.2, opacity: 0.75,
        }));
    }

    /* ══════════════════════════════════════════════════════════════
       6. 注册
       ══════════════════════════════════════════════════════════════ */
    const PANEL_ID = 'singularity';

    return {
      inject: ['slots'],
      apply(ctx) {
        // 样式随 Client run 安装与卸载
        const styleEl = document.createElement('style');
        styleEl.setAttribute('data-plugin-css', 'singularity-dsh-plugin');
        styleEl.textContent = CSS;
        document.head.appendChild(styleEl);
        ctx.effect(() => () => { styleEl.remove(); }, 'singularity: stylesheet');

        ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main', key: PANEL_ID,
        }, SingularityApp));

        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist', id: PANEL_ID, order: 30,
          label: () => 'Singularity',
        }, PanelIcon));
      },
    };
  },
});
