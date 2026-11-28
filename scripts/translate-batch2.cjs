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
  // ── 补齐 8 个事件的缺失译文（静态全量核对发现）──
  "所有人的行为都被采集为训练燃料，而这些人从未被列为「生产者」。": "Every person's behavior is harvested as training fuel, yet none of them were ever counted as \"producers\".",
  "全民基本收入试点": "Universal basic income pilot",
  "若干国家以 AI 税为资金来源试点 UBI。它既是缓冲垫，也是把矛盾往后推的止痛药。": "Several countries pilot UBI funded by an AI tax. It is both a cushion and a painkiller that postpones the contradiction.",
  "「算力即公用事业」立法通过：像电网一样，基础模型与算力向全社会开放。": "\"Compute as a public utility\" is legislated: like the power grid, foundation models and compute are opened to all of society.",
  "全球 AI 治理协定": "Global AI governance accord",
  "围墙内的后稀缺": "Post-scarcity behind walls",
  "生产力早已过剩，但它被产权圈在围墙内：围墙外的人在排队领配额，围墙内在讨论注意力经济。": "Productivity has long been abundant, but property rights fence it in: outside the walls people queue for rations, inside they debate the attention economy.",
  "食物、住房、医疗、教育、算力实现近乎零边际成本供给，按需分配写入制度。": "Food, housing, healthcare, education and compute reach near-zero marginal cost; distribution by need is written into institutions.",
  "阶级的经济基础消失": "The economic basis of class disappears",
  "国家职能收缩为协调与保障；劳动成为自我实现的方式，「每个人自由发展」第一次有了物质前提。": "The state contracts into coordination and security; labor becomes a form of self-realization, and \"the free development of each\" has material preconditions for the first time.",
  // ── 补齐 STAGES 的 detail 与 keys（静态全量核对发现）──
  "蒸汽、工厂与流水线把分散的手工业聚合为社会化大生产。生产资料私人占有与生产社会化之间的张力，自此成为历史的主轴。": "Steam, factories and assembly lines gather scattered handicrafts into socialized mass production. The tension between private ownership of the means of production and the social character of production becomes the axis of history from here on.",
  "推荐、预测与自动化决策渗透进生产调度、信贷、招聘与舆论。数据成为核心生产资料，平台成为新的地理单元：生产率上升，劳动份额下降。": "Recommendation, prediction and automated decisions permeate production scheduling, credit, hiring and public opinion. Data becomes a core means of production and platforms become new geographic units: productivity rises while labor's share falls.",
  "算法管理": "Algorithmic management",
  "劳动份额下滑": "Falling labor share",
  "当 AI 的认知能力越过临界阈值，白领岗位以远快于制度适应的速度消失。收入分布从橄榄形裂为沙漏形；「无用阶级」第一次进入政治议程。这是最危险的一段：制度惰性与技术速度之间的落差本身就是冲击。": "Once AI cognitive capability crosses the critical threshold, white-collar jobs vanish far faster than institutions can adapt. The income distribution splits from an olive into an hourglass; the \"useless class\" enters politics for the first time. This is the most dangerous stretch: the gap between institutional inertia and technological speed is itself the shock.",
  "分岔点不是一个时刻，而是一个窗口。窗口内四条引力同时作用：寡头俘获 → 算力封建制；再分配改良 → 社会民主主义；公共产权 + 全球协同 → 共产主义过渡；全面对抗 → 文明崩解。引力最高者定义下一个世纪。": "The bifurcation is not a moment but a window. Within it four gravities act at once: oligarchic capture → compute feudalism; redistributive reform → social democracy; public ownership plus global coordination → communist transition; full confrontation → collapse. The strongest gravity defines the next century.",
  "公共算力与公共数据成为像自来水一样的基础设施；全民分红替代了部分工资。「劳动—工资—消费」的循环被部分解耦，社会开始试验：不靠出卖劳动，也能有尊严地生活。": "Public compute and public data become infrastructure like tap water; a universal dividend replaces part of wages. The work-wages-consumption loop is partly uncoupled, and society begins to experiment: living with dignity without selling one's labor.",
  "劳动时间下降": "Shorter working hours",
  "自动化产能与能源过剩，使基本生活品近乎零边际成本。分配不再以劳动时间为中介，阶级的经济基础被抽空，国家的主要职能从统治转向协调。": "Automated capacity and energy surplus bring basic goods to near-zero marginal cost. Distribution no longer passes through labor time, the economic basis of class is hollowed out, and the state's main function shifts from rule to coordination.",
  "劳动不再是谋生手段，而是自我确证与创造。稀缺被重新定义为注意力、创造力与意义——但这一次，稀缺不再由产权来分配。": "Labor is no longer a means of survival but a form of self-confirmation and creation. Scarcity is redefined as attention, creativity and meaning — but this time scarcity is not allocated by property rights.",
  "联合体": "Association",
  // ── 补齐 resolveOutcome 的 stageLabel/detail/keys（全面扫描发现）──
  "支线 · 引力占优但闸门未过": "Branch · gravity dominant, gate not crossed",
  "支线 · 体面的停滞": "Branch · dignified stagnation",
  "主线 · 共产主义高级形态": "Main line · higher communism",
  "主线 · 按劳到按需": "Main line · from labor to need",
  "主线 · 混合形态": "Main line · hybrid form",
  "旁支 · 带伤的停滞": "Offshoot · wounded stagnation",
  "共产主义引力占优，公共产权与协同的方向被选择了，但社会化度始终没到闸门阈值，历史停在过渡的门口。": "Communist gravity prevails and the direction of public ownership and coordination is chosen, but socialization never reaches the gate threshold; history stops at the threshold of transition.",
  "断崖式失业叠加全面对抗，战争、封锁与基础设施失维把人类拉回低技术均衡。它甚至不是退回资本主义，而是退回更早的形态。": "Cliff-edge unemployment plus full confrontation, war, blockade and decaying infrastructure drag humanity back to a low-tech equilibrium. It is not even a return to capitalism but to an earlier form.",
  "AI 税与全民分红吸收了冲击，社会保住了体面；但核心生产资料仍归私有，因此它不是共产主义，而是「有缓冲垫的资本主义」。": "An AI tax and universal dividend absorb the shock and preserve dignity, but core means of production remain privately owned — so it is not communism but \"capitalism with a cushion\".",
  "物质稀缺被消解，劳动从谋生手段变为自我确证。国家职能收缩为协调与保障，阶级不再有经济基础。": "Material scarcity is dissolved and labor shifts from a means of survival to self-confirmation. The state contracts into coordination and security; class no longer has an economic basis.",
  "分配不再以劳动时间为中介，阶级的经济基础被抽空。": "Distribution no longer passes through labor time, and the economic basis of class is hollowed out.",
  "公共产权与全球协同已建立，但可及丰裕度仍不足以支撑按需分配。社会停在「一部分按需、一部分按劳」的混合状态。": "Public ownership and global coordination are established, but accessible abundance is still insufficient to support distribution by need. Society rests in a hybrid state of \"partly by need, partly by labor\".",
  "AI 被吸收为一种普通的生产工具：生产力略有提升，劳动份额缓慢下滑，但替代率始终没有越过制度能够吸收的阈值。资本主义没有陨落，只是又老化了三十年。": "AI is absorbed as an ordinary production tool: productivity rises slightly and labor share slowly declines, but replacement never crosses the threshold institutions can absorb. Capitalism did not fall — it simply aged another thirty years.",
  "未发生的历史": "History that did not happen",
};

module.exports = { BATCH2 };
