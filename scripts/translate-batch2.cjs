'use strict';
/**
 * translate-batch2.cjs — 第二批翻译：事件叙事、杠杆说明、结局文案、理论正文。
 * 与 translate-data.cjs 的 NOUNS 合并使用。
 */

const BATCH2 = {
  // ── 事件名（含阶段标记）──
  '算力瓶颈 · 前史': 'Compute bottleneck · prehistory',
  '认知外包元年 · 前史': 'Year of cognitive outsourcing · prehistory',
  '白领滑坡 · 中段': 'White-collar slide · mid',
  '劳动份额警戒线 · 后段': 'Labor share warning line · late',

  // ── 事件叙事 ──
  '训练成本指数上升，算力成为新的石油。谁掌握晶圆厂与数据中心，谁掌握制高点。':
    'Training costs rise exponentially; compute becomes the new oil. Whoever controls fabs and data centers holds the high ground.',
  '代码、文案、诊断、合同起草被批量外包给模型。个体产出上限被抬高，议价能力却被压低。':
    'Code, copy, diagnosis and contract drafting are outsourced to models in bulk. Individual output ceilings rise while bargaining power falls.',
  '入门级白领岗位消失快于退休自然减员。青年失业与「学历贬值」同时抬升，中产开始收缩。':
    'Entry-level white-collar jobs vanish faster than natural attrition. Youth unemployment and credential devaluation rise together; the middle class begins to shrink.',
  '劳动收入占国民收入的比重跌破关键阈值，「以劳动换生存」的经济学基础失效。':
    'Labor\'s share of national income falls below a critical threshold; the economic basis of "work for survival" fails.',

  // ── 杠杆名与端点 ──
  '教育与再技能': 'Education and reskilling',
  '劳动者组织度': 'Labor organization',
  '生产资料全社会共有': 'Social ownership of all means of production',
  '全球统一治理': 'Global unified governance',
  '以职业定义自我': 'Identity defined by occupation',
  '一次性学历教育': 'One-shot credential education',
  '终身学习 + AI 导师': 'Lifelong learning + AI tutor',
  '高度原子化': 'Highly atomized',
  '强共同体认同': 'Strong communal identity',
  '寡头俘获国家': 'Oligarchs capture the state',
  '劳动时间缩短': 'Working time shortened',
  '生产资料公有化': 'Socialization of means of production',
  '国家职能收缩': 'State functions contract',
  '基础设施失维': 'Infrastructure left to decay',

  // ── 杠杆说明 ──
  'AI 在认知劳动上的相对能力（1.0 = 人类专家均值）。越过阈值后，认知劳动的边际价值开始崩塌。':
    'AI\'s relative capability in cognitive labor (1.0 = average human expert). Past the threshold, the marginal value of cognitive labor collapses.',
  '单位算力成本之倒数。决定「智能」能否像自来水一样普惠供应。':
    'The inverse of unit compute cost. It determines whether intelligence can be supplied universally, like tap water.',
  '机器在物理世界替代人类劳作的覆盖度，决定物质生产的边际人力成本。':
    'How broadly machines replace human labor in the physical world; it sets the marginal labor cost of material production.',
  '能源是算力与自动化的最终物理约束。能源越丰裕，AI 越不被成本拦截。':
    'Energy is the ultimate physical constraint on compute and automation. The more abundant it is, the less cost blocks AI.',
  '税收与转移支付力度。决定 AI 红利流向资本还是流向全体成员。':
    'The strength of taxation and transfers. It decides whether the AI dividend flows to capital or to all members of society.',
  '核心生产资料（算力、模型、能源、自动化产能）由社会共有的比例。':
    'The share of core means of production (compute, models, energy, automated capacity) held in common.',
  '跨国协调能力。低协同下强者独占 AI，形成算力殖民。':
    'Capacity for transnational coordination. With low coordination, the strong monopolize AI and compute colonialism emerges.',
  '劳动者在分配谈判中的议价能力。': 'Workers\' bargaining power in distribution negotiations.',
  '社会为「后劳动时代」提供意义结构的能力。低值导致大规模身份危机。':
    'Society\'s capacity to supply meaning structures for a post-labor era. Low values produce mass identity crises.',
  '人力资本更新速度，决定劳动者转型阵痛的时长。':
    'The speed of human capital renewal; it determines how long the transition pain lasts for workers.',
  '社会信任与合作意愿。它是制度能否落地的暗物质。':
    'Social trust and willingness to cooperate — the dark matter that decides whether institutions can take hold.',
  '技术替代速度与制度适应速度之间的落差。它是这段历史真正的主角。':
    'The gap between how fast technology replaces labor and how fast institutions adapt. This is the real protagonist of the story.',
  '分配矛盾激化程度。过高会摧毁生产力，过低则制度惰性不除。':
    'The intensity of distributional conflict. Too high destroys productivity; too low leaves institutional inertia intact.',
  '资本对规则制定权的掌控。这是「AI 封建主义」岔路的引力。':
    'Capital\'s grip on rule-making. This is the gravity pulling toward the AI-feudalism path.',

  // ── 诊断句（完整句，非片段）──
  '「算力封建制」引力 45% 为四者最高，引擎据此判定终局为「算力封建制」。':
    '"Compute feudalism" gravity at 45% is the highest of the four; the engine therefore rules the endgame to be "compute feudalism".',
  '劳动份额降至 25%：以「劳动—工资—消费」为轴的社会契约已经失效，分配只能改由产权与转移支付承担。':
    'Labor share falls to 25%: the social contract built on work-wages-consumption has failed, and distribution can only be carried by ownership and transfers.',
  '可及丰裕度仅 49%：生产力很高，但它没有被社会化，「后稀缺」只存在于寡头的围墙内。':
    'Accessible abundance is only 49%: productivity is high but not socialized — "post-scarcity" exists only inside the oligarchs\' walls.',
  '意义供给度 22%：劳动不再是谋生手段时，社会尚未给出替代的身份结构，这会以政治极化的形式反噬制度。':
    'Meaning supply is 22%: with labor no longer a means of survival, society has not offered a replacement identity structure, and this rebounds on institutions as political polarization.',

  // ── 结局/分支文案 ──
  'AI 的生产力没有消失，只是被垄断成了领地。': 'AI productivity did not vanish; it was monopolized into fiefdoms.',
  '生产力极高、自由极低。资本主义以消灭市场的方式完成自我终结。':
    'Productivity very high, freedom very low. Capitalism ends itself by abolishing the market.',
  '在资本主义框架内实现了「体面的停滞」——但产权结构未变，故而不是共产主义。':
    'It achieves dignified stagnation within capitalism — but ownership is unchanged, so it is not communism.',
  '生产力的社会化与占有的社会化重新对齐，历史继续向前。':
    'Socialized production and socialized ownership realign; history moves on.',
  '冲突真实摧毁有效生产力，历史不是前进也不是改良，而是退回更早的形态。':
    'Confrontation genuinely destroys effective productivity; history neither advances nor reforms but falls back to an earlier form.',
  '体面的停滞（产权 ≥0.62 时本路径失效）': 'Dignified stagnation (this path fails at ownership ≥0.62)',
  'AI 能力一路冲高，再分配与公共产权几乎不动。这是「什么都不做」的世界。':
    'AI capability soars while redistribution and public ownership barely move. This is the world of doing nothing.',
  '以 AI 税与全民分红吸收冲击，劳动者重新组织，但产权结构仍是私有。':
    'An AI tax and universal dividend absorb the shock and labor reorganizes, but ownership remains private.',
  '资本俘获度拉满、全球协同归零，AI 成为新领主的封地。':
    'Capital capture maxed out and global coordination at zero: AI becomes the fiefdom of new lords.',
  '公共产权与再分配同步推进，全球协同成型，转型冲击被制度吸收。':
    'Public ownership and redistribution advance together, global coordination takes shape, and institutions absorb the transition shock.',
  '断崖式失业叠加全面对抗，生产力被摧毁，退回低技术均衡。':
    'Cliff-edge unemployment plus full confrontation destroys productivity and falls back to a low-tech equilibrium.',
  '算力、能源、自动化产能全部充裕且共有，按需分配，劳动成为自我实现。':
    'Compute, energy and automated capacity are all abundant and held in common; distribution follows need and labor becomes self-realization.',
  'AI 与自动化把社会总生产力推过「后稀缺」门槛。':
    'AI and automation push total social productivity past the post-scarcity threshold.',
  '红利归谁，由产权与分配制度决定，而不是由技术决定。':
    'Who gets the dividend is decided by ownership and distribution, not by technology.',
  '同样的 AI，可以变成寡头领地，也可以变成公共基础设施。技术只提供可能性，制度决定它落在哪一侧。':
    'The same AI can become an oligarchic fiefdom or public infrastructure. Technology only offers possibilities; institutions decide which side it lands on.',
  '制度不是自动演化的，它由组织起来的人写出来。':
    'Institutions do not evolve on their own; organized people write them.',
  '劳动者组织度、全球协同、意义供给——这些「软」变量才是分岔点的真正坐标。历史没有必然性，只有条件：条件是可以通过斗争与治理被创造的。':
    'Labor organization, global coordination and meaning supply — these "soft" variables are the true coordinates of the bifurcation. History has no inevitability, only conditions: conditions can be created through struggle and governance.',
  '当单位智能与单位能量的成本趋近于零，物质与服务的边际成本也随之趋近于零。生产力第一次不再需要以「多数人就业」为前提来维持。':
    'As the cost of unit intelligence and unit energy approaches zero, so does the marginal cost of goods and services. For the first time productivity no longer requires majority employment to sustain itself.',

  // ── 阶段长文（thesis/detail）──
  '少数寡头占有算力、模型与自动化产能，多数人靠「模型配额」与「数据劳动」苟活。法律形式仍保留市场与民主，实质分配却由封地决定。这是资本主义的胜利，也是它的终点——':
    'A few oligarchs own compute, models and automated capacity, while most survive on "model quotas" and "data labor". Market and democracy remain in legal form, but real distribution is decided by fiefdoms. This is capitalism\'s victory and also its endpoint —',
  // ── 第十三轮补充：理论底座四条动力学与阶段标签 ──
  "生产关系": "Relations of production",
  "历史主体": "Historical subject",
  "技术条件": "Technological conditions",
  "分配制度": "Distribution regime",
  "L2 · 2024 起点固定": "L2 · 2024 baseline fixed",
  "社会化度 23%   闸门 48%：技术已越线，制度没跟上 —— 这正是「资本主义陨落」的机制本身。": "Socialization 23% vs gate 48%: technology has crossed the line but institutions have not — this is precisely the mechanism of capitalism's fall.",
  "社会化度 {a}%   闸门 {b}%：技术已越线，制度没跟上 —— 这正是「资本主义陨落」的机制本身。": "Socialization {a}% vs gate {b}%: technology has crossed the line but institutions have not — this is precisely the mechanism of capitalism's fall.",
  "旁支 · 生产力被摧毁": "Offshoot · productive forces destroyed",
  "旁支 · 分配改良，产权未动": "Offshoot · distribution reformed, ownership untouched",
  "旁支 · 历史停在原地": "Offshoot · history stalls in place",
  // ── 第十三轮补充：理论底座四条动力学与阶段标签 ──
  "生产关系": "Relations of production",
  "历史主体": "Historical subject",
  "技术条件": "Technological conditions",
  "分配制度": "Distribution regime",
  "L2 · 2024 起点固定": "L2 · 2024 baseline fixed",
  "社会化度 23%   闸门 48%：技术已越线，制度没跟上 —— 这正是「资本主义陨落」的机制本身。": "Socialization 23% vs gate 48%: technology has crossed the line but institutions have not — this is precisely the mechanism of capitalism's fall.",
  "社会化度 {a}%   闸门 {b}%：技术已越线，制度没跟上 —— 这正是「资本主义陨落」的机制本身。": "Socialization {a}% vs gate {b}%: technology has crossed the line but institutions have not — this is precisely the mechanism of capitalism's fall.",
  "旁支 · 生产力被摧毁": "Offshoot · productive forces destroyed",
  "旁支 · 分配改良，产权未动": "Offshoot · distribution reformed, ownership untouched",
  "旁支 · 历史停在原地": "Offshoot · history stalls in place",
  // ── 封建制结局的完整 detail（含结尾句，之前漏了）──
  "少数寡头占有算力、模型与自动化产能，多数人靠「模型配额」与「数据劳动」苟活。法律形式仍保留市场与民主，实质分配却由封地决定。这是资本主义的胜利，也是它的终点——市场被自己的技术杀死。": "A few oligarchs own compute, models and automated capacity, while most survive on \"model quotas\" and \"data labor\". Market and democracy remain in legal form, but real distribution is decided by fiefdoms. This is capitalism's victory and also its endpoint — the market is killed by its own technology.",
  // ── 第二十二轮 ──
  "2024 起点固定": "2024 baseline fixed",
  "资本俘获度": "Capital capture",
};

module.exports = { BATCH2 };
