window.__ModuleLoader__.load({
  id: 'singularity-dsh-plugin',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

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

    const STAGE_BY_ID = {};
    STAGES.forEach((st) => { STAGE_BY_ID[st.id] = st; });

    function stageOf(m, s, scores) {
      const pen = m.penetration, soc = m.socialization, abu = m.abundance;
      const meaning = s ? s.meaning : 0.3;
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

    function simulate(target) {
      const tgt = target || {};
      const years = [];
      let prev = null;
      for (let year = T0; year <= T2; year++) {
        const s = leversAt(year, tgt);
        const m = derive(s, prev);
        const scores = branchScores(s, m);        // 唯一的路径判定输入
        const info = stageOf(m, s, scores);
        years.push({
          year: year, levers: s, metrics: m,
          stage: info.stage, branchStage: info.branch, branchKey: info.branchKey || null,
          path: decidePath(scores),
          branches: scores,
        });
        prev = m;
      }
      const win = locateWindow(years);
      years.forEach((y) => {
        y.inWindow = !!(win && win.type === 'passed' === false && y.year >= win.start && y.year <= win.end);
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

    function diagnose(sim) {
      const m = sim.final.metrics;
      const sc = sim.branchScores;
      const d = [];
      if (m.collapse_risk > 0.60) d.push({ tag: '高危', text: '崩解风险 ' + Math.round(m.collapse_risk * 100) + '%：转型冲击与阶级对抗，超过了再分配与教育的吸收能力。' });
      const PATH_NAME = { feudalism: '算力封建制', social_democracy: '社会民主主义', communism: '共产主义过渡', collapse: '文明崩解' };
      const winner = decidePath(sc);
      d.push({ tag: '引力', text: '「' + PATH_NAME[winner] + '」引力 ' + Math.round(sc[winner] * 100) + '% 为四者最高，引擎据此判定终局为「' + sim.outcome.name + '」。' });
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
    const pct = (v, d) => (v * 100).toFixed(d === undefined ? 0 : d) + '%';

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
        const pts = years.map((y) => [X(y.year), Y(y.metrics[s.key])]);
        const d = pts.map((pt, i) => (i ? 'L' : 'M') + pt[0].toFixed(1) + ' ' + pt[1].toFixed(1)).join(' ');
        kids.push(h('path', { key: 'p' + s.key, className: 'se', d: d, stroke: METRIC_META[s.key].color }));
      });
      if (p.cursorYear) {
        const cx = X(p.cursorYear);
        kids.push(h('line', { key: 'cur', className: 'cur', x1: cx, y1: pad.t, x2: cx, y2: pad.t + ih }));
        const cy = years.filter((y) => y.year === p.cursorYear)[0];
        if (cy) {
          series.forEach((s) => {
            kids.push(h('circle', {
              key: 'c' + s.key, cx: cx, cy: Y(cy.metrics[s.key]), r: 3,
              fill: METRIC_META[s.key].color,
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
          h('rect', { x: 0, y: -4, width: 8, height: 3, rx: 1.5, fill: METRIC_META[s.key].color }),
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
            }))),
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
          return h('div', {
            key: st.id, className: 'sn-node' + (on ? ' on' : ''),
            style: { color: on ? st.color : 'var(--dsw-alias-label-primary)', opacity: on || st.id <= p.currentId ? 1 : 0.55 },
            onClick: () => p.onPick(st),
            title: st.thesis,
          },
            h('div', { className: 'i' }, '0' + (st.id + 1)),
            h('div', { className: 'n', style: on ? { color: st.color } : null }, st.name),
            h('div', { className: 's' }, st.thesis.slice(0, 14) + '…'));
        }));
    }

    /* ── 主组件 ── */
    function SingularityApp() {
      const [tab, setTab] = React.useState('timeline');
      const [scenario, setScenario] = React.useState('baseline');
      const [target, setTarget] = React.useState({});
      const [year, setYear] = React.useState(2035);
      const [picked, setPicked] = React.useState(null);

      const sim = React.useMemo(() => simulate(target), [target]);
      const sens = React.useMemo(() => sensitivity(target), [target]);
      const drivers = React.useMemo(() => diagnose(sim), [sim]);

      const applyScenario = (key) => {
        setScenario(key);
        setTarget(targetOf(key));
        setYear(2035);
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
              ],
            })));

        const eventCard = h('div', { className: 'sn-card' },
          h('div', { className: 'sn-card-head' }, '历史节点',
            h('span', { className: 'sn-hint' }, '按条件触发')),
          h('div', { className: 'sn-events' }, eventRows));

        return h('div', null,
          h(Hero, { outcome: sim.outcome, final: sim.final }),
          h(Scrubber, { years: sim.years, year: year, window: sim.window, onYear: setYear }),
          h(StageTrack, { currentId: curYear.stage.id, onPick: setPicked }),
          h('div', { className: 'sn-metrics' }, metricCards),
          h('div', { className: 'sn-grid2' }, chartCard, eventCard));
      };

      /* ── 引擎 ── */
      const engineTab = () => h('div', null,
        h('div', { className: 'sn-card', style: { marginBottom: 12 } },
          h('div', { className: 'sn-pad', style: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' } },
            h('div', { style: { flex: '1 1 260px', minWidth: 0 } },
              h('div', { style: { fontSize: 13, fontWeight: 650, marginBottom: 3 } }, '制度选择 · 2024 → 2050'),
              h('div', { className: 'sn-sub' }, '技术杠杆有自主趋势（无论怎么选，AI 都会前进）；制度与社会杠杆由你设定。')),
            h('button', { className: 'sn-btn sn-btn-primary', onClick: () => { setYear(2035); setTab('timeline'); } }, '应用并演化 →'))),
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
                  },
                }),
                h('div', { className: 'sn-lv-ends' }, h('span', null, lv.low), h('span', null, lv.high)));
            })))),
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
            key: k, className: 'sn-btn' + (scenario === k ? ' sn-btn-primary' : ''),
            onClick: () => applyScenario(k),
          }, SCENARIOS[k].name.split(' · ')[0]))));

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
                + '引力值最高者就是引擎实际走的那条路（两者共用同一裁决函数）。',
                sim.window
                  ? h('div', { style: { marginTop: 6, color: sim.window.type === 'passed' ? 'var(--dsw-alias-state-success-primary)' : 'var(--dsw-alias-state-error-primary)', fontWeight: 600 } },
                    sim.window.type === 'passed'
                      ? '本路径于 ' + sim.window.gate_year + ' 年跨过制度闸门。'
                      : '本路径在窗口 ' + sim.window.start + '–' + sim.window.end + ' 内未跨过制度闸门，历史被岔路接管。')
                  : h('div', { style: { marginTop: 6 } }, '本路径技术渗透始终未达阈值，未进入分岔窗口。')))),
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
                    { n: '社会民主主义', c: '#4f8cff', cond: '再分配强 · 组织度高 · 产权私有', m: 'AI 税 → 全民分红 → 公共算力', e: '体面的停滞', y: '否（产权未变）' },
                    { n: '共产主义过渡', c: '#22c98a', cond: '产权公有 · 协同高 · 团结与意义充足', m: '生产资料公有化 → 按需分配', e: '自由人联合体', y: '是' },
                    { n: '文明崩解', c: '#8b3a42', cond: '全面对抗 · 高冲击 · 凝聚流失', m: '冲突摧毁有效生产力 → 基础设施失维', e: '低技术均衡', y: '否' },
                  ].map((r, i) => h('tr', { key: i },
                    h('td', { style: { color: r.c, fontWeight: 600 } }, r.n),
                    h('td', { style: { fontSize: 11 } }, r.cond),
                    h('td', { style: { fontSize: 11 } }, r.m),
                    h('td', { style: { fontSize: 11 } }, r.e),
                    h('td', null, h('span', { className: 'sn-pill', style: { color: r.y === '是' ? '#22c98a' : 'var(--dsw-alias-label-secondary)', fontSize: 10 } }, r.y)))))))));
      };

      /* ── 指标 ── */
      const metricsTab = () => {
        const m = sim.final.metrics;
        return h('div', null,
          h('div', { className: 'sn-metrics' },
            Object.keys(METRIC_META).map((k) => h(Metric, {
              key: k, label: METRIC_META[k].name, value: m[k], color: METRIC_META[k].color,
              danger: (k === 'inequality' || k === 'shock' || k === 'replacement' || k === 'collapse_risk' || k === 'feudalism_risk') && m[k] > 0.6,
            }))),
          h('div', { className: 'sn-grid2' },
            [[{ key: 'productivity', label: '生产力' }, { key: 'labor_share', label: '劳动份额' }, { key: 'socialization', label: '社会化度' }],
              [{ key: 'collapse_risk', label: '崩解风险' }, { key: 'feudalism_risk', label: '封建化风险' }],
              [{ key: 'freedom', label: '自由实现度' }, { key: 'cohesion', label: '社会凝聚' }, { key: 'inequality', label: '不平等' }],
              [{ key: 'replacement', label: '劳动替代率' }, { key: 'shock', label: '转型冲击' }],
            ].map((series, i) => h('div', { className: 'sn-card', key: i },
              h('div', { className: 'sn-card-head' }, series.map((s) => s.label).join(' / ')),
              h('div', { className: 'sn-pad' },
                h(LineChart, { years: sim.years, series: series, cursorYear: year, window: sim.window, height: 175 }))))),
          h('div', { className: 'sn-card', style: { marginTop: 12 } },
            h('div', { className: 'sn-card-head' }, '逐年数据', h('span', { className: 'sn-hint' }, '点击行跳到该年')),
            h('div', { style: { overflowX: 'auto', maxHeight: 320, overflowY: 'auto' } },
              h('table', { className: 'sn-table' },
                h('thead', null, h('tr', null,
                  ['年份', '阶段', '渗透', '社会化', '丰裕', '替代率', '劳动份额', '不等', '自由'].map((t, i) => h('th', { key: i }, t)))),
                h('tbody', null,
                  sim.years.filter((y) => y.year % 2 === 0).map((y) => h('tr', {
                    key: y.year, style: { cursor: 'pointer' },
                    onClick: () => { setYear(y.year); setTab('timeline'); },
                  },
                    h('td', null, y.year),
                    h('td', null, h('span', { className: 'sn-pill', style: { color: y.stage.color, fontSize: 10 } }, y.stage.name)),
                    h('td', null, Math.round(y.metrics.penetration * 100) + '%'),
                    h('td', null, Math.round(y.metrics.socialization * 100) + '%'),
                    h('td', null, Math.round(y.metrics.abundance * 100) + '%'),
                    h('td', null, Math.round(y.metrics.replacement * 100) + '%'),
                    h('td', null, Math.round(y.metrics.labor_share * 100) + '%'),
                    h('td', null, Math.round(y.metrics.inequality * 100) + '%'),
                    h('td', null, Math.round(y.metrics.freedom * 100) + '%'))))))));
      };

      /* ── 对比 ── */
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
                '同样的技术，不同的制度选择。注意：六条路径的技术条件几乎相同，结局却完全相反 —— 这就是「制度决定落在哪一侧」。'))),
          h('div', { className: 'sn-card' },
            h('div', { style: { overflowX: 'auto' } },
              h('table', { className: 'sn-table' },
                h('thead', null, h('tr', null,
                  ['情景', '结局', '发展 D', '丰裕', '自由', '不平等', '窗口', ''].map((t, i) => h('th', { key: i }, t)))),
                h('tbody', null,
                  rows.map((r) => {
                    const f = r.sim.final.metrics;
                    const o = r.sim.outcome;
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
                      h('td', { style: { fontSize: 10.5 } }, r.sim.window ? r.sim.window.start + '–' + r.sim.window.end : '—'),
                      h('td', null, h('button', { className: 'sn-btn', onClick: () => applyScenario(r.key) }, '载入')));
                  }))))));
      };

      /* ── 理论 ── */
      const theoryTab = () => h('div', null,
        h('div', { className: 'sn-quote' },
          h('q', null, '“手推磨产生的是封建主的社会，蒸汽磨产生的是工业资本家的社会。”'),
          h('cite', null, '—— 马克思《哲学的贫困》')),
        h('div', { className: 'sn-theory', style: { marginBottom: 12 } },
          DYNAMICS.map((d) => h('div', { key: d.key, className: 'sn-th', style: { '--sn-c': d.color } },
            h('h4', null, d.name),
            h('div', { className: 'c' }, d.claim),
            h('div', { className: 'd' }, d.detail)))),
        h('div', { className: 'sn-card' },
          h('div', { className: 'sn-card-head' }, '本路径的判定'),
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
            ' 它的价值不在于预测哪一年会发生什么，而在于把「条件」摊开：技术提供可能性，制度决定落在哪一侧，而制度不是自动演化的 —— 它由组织起来的人写出来。模型中的每个系数都是一次可辩论的判断，你可以拨动杠杆，看它是否还站得住。')));

      const TABS = [
        { id: 'timeline', label: '历史长河' },
        { id: 'engine', label: '演化引擎' },
        { id: 'branch', label: '三岔路口' },
        { id: 'metrics', label: '指标矩阵' },
        { id: 'compare', label: '情景对比' },
        { id: 'theory', label: '理论底座' },
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
            }, t.label)))),
        h('div', { className: 'sn-body' },
          tab === 'timeline' ? timelineTab()
            : tab === 'engine' ? engineTab()
              : tab === 'branch' ? branchTab()
                : tab === 'metrics' ? metricsTab()
                  : tab === 'compare' ? compareTab()
                    : theoryTab()),
        picked ? h('div', {
          style: {
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          },
          onClick: () => setPicked(null),
        }, h('div', {
          style: {
            maxWidth: 460, width: '100%', background: 'var(--dsw-alias-bg-overlay)',
            border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 12, padding: 20,
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
