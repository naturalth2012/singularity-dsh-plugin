'use strict';
/**
 * TX_PATTERNS — 动态诊断句的正则翻译模板。
 *
 * 为什么需要它：diagnose() 与 resolveOutcome() 生成的句子里嵌着动态数字
 * （引力 48%、劳动份额 20%、损毁 35%…）。TX 是「精确字符串 → 英文」的表，
 * 只能匹配当初写死的那组数字，数字一变就查不到，露中文。
 *
 * 每条模式：
 *   re        — 正则源码，捕获组提取数字与内嵌名字
 *   en        — 英文模板，{1} {2}… 对应捕获组
 *   translate — 需要递归过 tx() 的捕获组下标（内嵌的中文名）
 *
 * 这些句子在引擎区（契约快照内）生成，不能给引擎加 textEn 字段，
 * 所以只能在展示层用模式改写。
 */
const TX_PATTERNS = [
  {
    re: String.raw`^崩解风险 (\d+)%：转型冲击与阶级对抗，超过了再分配与教育的吸收能力。$`,
    en: 'Collapse risk {1}%: transition shock and class confrontation exceed the absorptive capacity of redistribution and education.',
  },
  {
    re: String.raw`^「(.+?)」引力 (\d+)% 为四者最高，引擎据此判定终局为「(.+?)」。$`,
    en: '"{1}" gravity at {2}% is the highest of the four; the engine therefore rules the endgame to be "{3}".',
    translate: [1, 3],
  },
  {
    re: String.raw`^「(.+?)」引力 (\d+)% 虽为当前最高，但冲突已损毁 (\d+)% 的有效产出——历史可能先于裁决坍塌，引力悬置于废墟之上。$`,
    en: '"{1}" gravity at {2}% is currently the highest, but conflict has destroyed {3}% of effective output — history may collapse before adjudication, leaving gravity suspended over the ruins.',
    translate: [1],
  },
  {
    re: String.raw`^「(.+?)」引力 (\d+)% 为当前最高，但技术渗透度仅 (\d+)%（未越过 0.68 的裁决线），分岔窗口未打开——引力悬置，历史尚未进入裁决。$`,
    en: '"{1}" gravity at {2}% is currently the highest, but technological penetration is only {3}% (below the 0.68 adjudication line); the bifurcation window has not opened — gravity is suspended and history has not yet entered adjudication.',
    translate: [1],
  },
  {
    re: String.raw`^全面对抗使有效生产力损毁 (\d+)%：工厂、电网与协作能力真实下降，而非仅仅是凝聚指标走低。$`,
    en: 'Full confrontation destroys {1}% of effective productive forces: factories, grids and coordination capacity genuinely decline, not merely a drop in cohesion metrics.',
  },
  {
    re: String.raw`^劳动份额降至 (\d+)%：以「劳动—工资—消费」为轴的社会契约已经失效，分配只能改由产权与转移支付承担。$`,
    en: 'Labor share falls to {1}%: the social contract built on work–wages–consumption has failed, and distribution can only be carried by ownership and transfers.',
  },
  {
    re: String.raw`^可及丰裕度仅 (\d+)%：对抗已摧毁 (\d+)% 的有效产出，「后稀缺」在物质层面就从未成立。$`,
    en: 'Accessible abundance is only {1}%: confrontation has destroyed {2}% of effective output; "post-scarcity" never materialized at the physical level.',
  },
  {
    re: String.raw`^可及丰裕度仅 (\d+)%：生产力很高，但它没有被社会化，「后稀缺」只存在于寡头的围墙内。$`,
    en: 'Accessible abundance is only {1}%: productivity is high but not socialized — "post-scarcity" exists only inside the oligarchs\' walls.',
  },
  {
    re: String.raw`^意义供给度 (\d+)%：劳动不再是谋生手段时，社会尚未给出替代的身份结构，这会以政治极化的形式反噬制度。$`,
    en: 'Meaning supply is {1}%: with labor no longer a means of survival, society has not offered a replacement identity structure, and this rebounds on institutions as political polarization.',
  },
  {
    re: String.raw`^社会化度 (\d+)% < 闸门 (\d+)%：技术已越线，制度没跟上 —— 这正是「资本主义陨落」的机制本身。$`,
    en: 'Socialization {1}% < gate {2}%: technology has crossed the line but institutions have not — this is precisely the mechanism of capitalism\'s fall.',
  },
  {
    re: String.raw`^AI 被吸收为一种普通的生产工具，替代率始终没有越过制度能够吸收的阈值；同时冲突已损毁 (\d+)% 的有效产出。资本主义没有陨落，但也不是安然老去——它是在内耗中停滞的。$`,
    en: 'AI is absorbed as an ordinary production tool and replacement never crosses the threshold institutions can absorb; meanwhile conflict has destroyed {1}% of effective output. Capitalism did not fall, nor did it age peacefully — it stagnates through infighting.',
  },
];

module.exports = { TX_PATTERNS };
