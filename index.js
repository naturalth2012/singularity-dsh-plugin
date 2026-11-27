/**
 * Singularity —— Host 半：把纯函数引擎暴露为三个 agent 工具。
 *
 * 引擎来源：engine.snapshot.js（client.js ENGINE 区的逐字节快照）。
 * 该文件由 contract-check 三重守护（逐字节一致 / 语法可解析 / 真实装载 + 锚点核对），
 * 所以这里直接复用，不再做第二份切片——三份引擎副本必然漂移。
 *
 * 边界（与 MODEL-CONTRACT.md §9 一致，也写在工具描述里）：
 *  - 模型是条件显微镜，不是预言机：工具回答「给定条件会走向哪」，不回答「哪年会发生什么」
 *  - 政策是前馈插值（§9.10），不是因果估计：工具不提供「政策效果」的因果断言
 *  - 工具只读：不改任何状态、不写存储
 */
import createEngine from './engine.snapshot.js';

const engine = createEngine((name) => {
  throw new Error('引擎是零依赖纯函数切片，不允许 require: ' + name);
});

const {
  LEVERS, SCENARIOS, simulate, targetOf, sensitivity,
  GATE_PEN,
} = engine;

const SCENARIO_KEYS = Object.keys(SCENARIOS);
const LEVER_KEYS = LEVERS.map((lv) => lv.key);

/** 数值钳制到 [0,1]，非数返回 null。 */
function unit(v) {
  if (typeof v !== 'number' || !isFinite(v)) return null;
  return Math.max(0, Math.min(1, v));
}

/**
 * 把工具的 levers 入参规整成引擎可用的 target。
 * 未知键丢弃（不报错——agent 可能拼错，静默忽略比中断更有用），
 * 数值钳制，非数值忽略。
 */
function normalizeLevers(input) {
  if (!input || typeof input !== 'object') return {};
  const out = {};
  Object.keys(input).forEach((k) => {
    if (LEVER_KEYS.indexOf(k) < 0) return;
    const v = unit(input[k]);
    if (v !== null) out[k] = v;
  });
  return out;
}

/** 规整 policy：年必须在 (2024, 2060]，overrides 键须是杠杆。 */
function normalizePolicy(input) {
  if (!input || typeof input !== 'object') return null;
  const year = input.year;
  if (typeof year !== 'number' || !Number.isInteger(year) || year <= 2024 || year > 2060) return null;
  const overrides = normalizeLevers(input.overrides);
  if (!Object.keys(overrides).length) return null;
  return { year, overrides };
}

/** 解析工具入参 → { target, policy }；scenario 与 levers 互斥，scenario 优先。 */
function resolveInput(args) {
  const input = args !== null && typeof args === 'object' ? args : {};
  let target;
  if (typeof input.scenario === 'string') {
    if (SCENARIO_KEYS.indexOf(input.scenario) < 0) {
      throw new Error('未知剧本 "' + input.scenario + '"。可用：' + SCENARIO_KEYS.join(' / '));
    }
    target = targetOf(input.scenario);
  } else {
    target = normalizeLevers(input.levers);
  }
  return { target, policy: normalizePolicy(input.policy) };
}

const pct = (v) => Math.round(v * 100) + '%';

/** 结局一行摘要（工具结果的可读主体）。 */
function summarize(sim) {
  const m = sim.final.metrics;
  const lines = [
    '**' + sim.outcome.name + '**（' + sim.outcome.type + '）',
    '',
    sim.outcome.detail,
    '',
    '| 读数 | 终年 ' + sim.final.year + ' |',
    '|---|---|',
    '| 发展水平 D | ' + pct(m.development) + ' |',
    '| 技术渗透 | ' + pct(m.penetration) + ' |',
    '| 社会化度 | ' + pct(m.socialization) + ' |',
    '| 可及丰裕 | ' + pct(m.abundance) + ' |',
    '| 劳动替代率 | ' + pct(m.replacement) + ' |',
    '| 不平等 | ' + pct(m.inequality) + ' |',
    '| 自由实现 | ' + pct(m.freedom) + ' |',
    '| 租金压力 | ' + pct(sim.final.rent) + ' |',
  ];
  if (sim.window) {
    lines.push('', '**分岔窗口**：' + sim.window.start + '–' + sim.window.end
      + (sim.window.type === 'passed'
        ? '（于 ' + sim.window.gate_year + ' 年跨过制度闸门）'
        : '（窗口内未跨过制度闸门，历史被岔路接管）'));
  } else {
    lines.push('', '**分岔窗口**：技术渗透始终未达 0.68，历史未进入裁决（引力悬置）。');
  }
  lines.push('', '**四引力**：' + engine.BRANCHES
    .map((b) => b.name + ' ' + pct(sim.branchScores[b.key])).join(' · '));
  if (sim.events && sim.events.length) {
    lines.push('', '**触发事件**：' + sim.events.map((e) => e.year + ' ' + e.title).join('；'));
  }
  return lines.join('\n');
}

/** 政策/杠杆的说明尾巴——每次结果都提醒边界，避免被读成因果或预言。 */
const BOUNDARY_NOTE = '\n\n> 这是条件推演：同样的技术，不同的制度选择，结局相差数倍。'
  + '它不预测哪一年会发生什么。政策在模型中是「换一条插值目标」，不是社会对政策的反应。';

export function apply(ctx) {
  ctx.inject(['tools'], (toolCtx) => {
    /* ── 1. singularity_simulate ── */
    toolCtx.effect(() => toolCtx.tools.register({
      name: 'singularity_simulate',
      description:
        '用 Singularity 社会形态演化模型跑一次 2024–2060 推演，返回结局、终年指标、租金压力、'
        + '分岔窗口与四条引力读数。输入是十四个杠杆的目标值（技术4/制度4/社会3/摩擦3，各 0–1），'
        + '或直接指定六个预设剧本之一。'
        + '用户问「如果 X 会怎样」「把某杠杆拉满还会封建吗」「共产主义需要什么条件」时使用。'
        + '这是条件推演而非预言：它不回答哪一年会发生什么。',
      parameters: {
        type: 'object',
        properties: {
          scenario: {
            type: 'string',
            enum: SCENARIO_KEYS,
            description: '预设剧本：' + SCENARIO_KEYS.join(' / ')
              + '。指定后忽略 levers。',
          },
          levers: {
            type: 'object',
            description: '十四个杠杆的目标值覆盖（0–1）。未指定的杠杆走默认：'
              + '技术四项取长期趋势，制度/社会/摩擦取 2024 现状。'
              + '可用键：' + LEVER_KEYS.join(', ') + '。',
            additionalProperties: { type: 'number' },
          },
          policy: {
            type: 'object',
            description: '政策干预：从某年起重定向制度杠杆。'
              + 'year 为 2025–2060 的整数；overrides 为要改的杠杆目标值。'
              + '注意这是前馈插值——模型不模拟社会对政策的反应。',
            properties: {
              year: { type: 'integer', description: '干预年（2025–2060）。' },
              overrides: {
                type: 'object',
                description: '被重定向的杠杆目标值（0–1）。',
                additionalProperties: { type: 'number' },
              },
            },
            required: ['year', 'overrides'],
          },
        },
        additionalProperties: false,
      },
      output: {
        schema: {
          type: 'object',
          properties: {
            outcome: { type: 'string' },
            outcomeType: { type: 'string' },
            finalYear: { type: 'number' },
            metrics: { type: 'object' },
            rent: { type: 'number' },
            window: { type: 'object' },
            branchScores: { type: 'object' },
            events: { type: 'array' },
            text: { type: 'string' },
          },
          additionalProperties: true,
        },
        render(args, value) {
          return [{ type: 'text', text: typeof value.text === 'string' ? value.text : '推演失败' }];
        },
      },
      async execute(args) {
        const { target, policy } = resolveInput(args);
        const sim = simulate(target, policy);
        return {
          outcome: sim.outcome.name,
          outcomeType: sim.outcome.type,
          finalYear: sim.final.year,
          metrics: sim.final.metrics,
          rent: sim.final.rent,
          window: sim.window || null,
          branchScores: sim.branchScores,
          events: (sim.events || []).map((e) => ({ year: e.year, title: e.title })),
          text: summarize(sim) + BOUNDARY_NOTE,
        };
      },
    }));

    /* ── 2. singularity_sensitivity ── */
    toolCtx.effect(() => toolCtx.tools.register({
      name: 'singularity_sensitivity',
      description:
        '对给定杠杆组合做敏感度分析：每个杠杆单独 ±10% 扰动，看它对终年「发展水平 D」的影响。'
        + '返回按影响绝对值降序的排名。'
        + '用户问「该动哪个杠杆最有效」「哪个变量最关键」「为什么这个剧本走成这样」时使用。',
      parameters: {
        type: 'object',
        properties: {
          scenario: {
            type: 'string',
            enum: SCENARIO_KEYS,
            description: '预设剧本（与 levers 二选一，优先）。',
          },
          levers: {
            type: 'object',
            description: '杠杆目标值覆盖（0–1），未指定的走默认。',
            additionalProperties: { type: 'number' },
          },
        },
        additionalProperties: false,
      },
      output: {
        schema: {
          type: 'object',
          properties: {
            baseline: { type: 'number' },
            items: { type: 'array' },
            text: { type: 'string' },
          },
          additionalProperties: true,
        },
        render(args, value) {
          return [{ type: 'text', text: typeof value.text === 'string' ? value.text : '敏感度分析失败' }];
        },
      },
      async execute(args) {
        const { target } = resolveInput(args);
        const sens = sensitivity(target);
        const items = sens.all.map((it) => ({ key: it.key, name: it.name, group: it.group, effect: it.effect }));
        const rows = items.map((it) => '| ' + it.name + ' | ' + it.group + ' | '
          + (it.effect >= 0 ? '+' : '') + (it.effect * 100).toFixed(2) + ' |');
        const text = [
          '**敏感度排名**（每个杠杆 ±10% 对终年发展水平 D 的影响）',
          '',
          '基线 D = ' + pct(sens.baseline),
          '',
          '| 杠杆 | 分组 | 影响（百分点） |',
          '|---|---|---|',
        ].concat(rows).concat([
          '',
          '正值 = 提高该杠杆会推高发展水平；负值 = 推高它反而降低 D（通常是摩擦类杠杆）。',
          BOUNDARY_NOTE,
        ]).join('\n');
        return { baseline: sens.baseline, items, text };
      },
    }));

    /* ── 3. singularity_compare ── */
    toolCtx.effect(() => toolCtx.tools.register({
      name: 'singularity_compare',
      description:
        '并排对照 Singularity 的六个预设剧本：结局、终年关键指标、租金压力、分岔窗口、四条引力。'
        + '用户问「六种结局分别是什么」「几条路有什么区别」「对比一下这些情景」时使用。',
      parameters: {
        type: 'object',
        properties: {
          includeRobustness: {
            type: 'boolean',
            description: '是否附带每个剧本的稳健性（±8% 扰动 ×240 次的结局一致性）。'
              + '默认 false——开启会多算 1440 次推演（约 100ms）。',
          },
        },
        additionalProperties: false,
      },
      output: {
        schema: {
          type: 'object',
          properties: {
            rows: { type: 'array' },
            text: { type: 'string' },
          },
          additionalProperties: true,
        },
        render(args, value) {
          return [{ type: 'text', text: typeof value.text === 'string' ? value.text : '对照失败' }];
        },
      },
      async execute(args) {
        const input = args !== null && typeof args === 'object' ? args : {};
        const rows = SCENARIO_KEYS.map((k) => {
          const sim = simulate(targetOf(k));
          const row = {
            scenario: k,
            name: SCENARIOS[k].name,
            outcome: sim.outcome.name,
            development: sim.final.metrics.development,
            abundance: sim.final.metrics.abundance,
            freedom: sim.final.metrics.freedom,
            inequality: sim.final.metrics.inequality,
            rent: sim.final.rent,
            window: sim.window ? (sim.window.start + '–' + sim.window.end) : null,
            winner: Object.keys(sim.branchScores)
              .sort((a, b) => sim.branchScores[b] - sim.branchScores[a])[0],
          };
          if (input.includeRobustness === true) {
            // 种子取剧本键哈希，与面板对比页同源——刷新可复算
            let h = 2166136261;
            for (let i = 0; i < k.length; i++) { h ^= k.charCodeAt(i); h = Math.imul(h, 16777619); }
            const rob = engine.robustness(targetOf(k), null, engine.mulberry32(h >>> 0));
            row.agreement = rob.agreement;
            row.dominant = rob.dominant;
          }
          return row;
        });
        const head = '| 剧本 | 结局 | 发展 D | 丰裕 | 自由 | 不平等 | 租金 | 窗口 |'
          + (input.includeRobustness === true ? ' 一致性 |' : '');
        const sep = '|---|---|---|---|---|---|---|---|' + (input.includeRobustness === true ? '---|' : '');
        const body = rows.map((r) => '| ' + r.name + ' | ' + r.outcome + ' | '
          + pct(r.development) + ' | ' + pct(r.abundance) + ' | ' + pct(r.freedom) + ' | '
          + pct(r.inequality) + ' | ' + pct(r.rent) + ' | ' + (r.window || '—') + ' |'
          + (input.includeRobustness === true ? ' ' + pct(r.agreement) + ' |' : ''));
        const text = [
          '**六种世界**（同样的技术，不同的制度选择）',
          '',
          head, sep,
        ].concat(body).concat([
          '',
          '注意：六条路径的技术条件几乎相同，结局却完全相反——制度决定落在哪一侧。',
          BOUNDARY_NOTE,
        ]).join('\n');
        return { rows, text };
      },
    }));
  });
}
