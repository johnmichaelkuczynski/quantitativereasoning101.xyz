import { chatJson } from "./ai";
import { logger } from "./logger";

/**
 * Fixed, criterion-referenced blueprint for the Quantitative Reasoning course.
 *
 * Every assessment administration (baseline, each week, and every free
 * self-assessment) is a PARALLEL FORM of this same blueprint: one item per
 * domain, in the same order, testing the same skill at the same difficulty.
 * Because the yardstick never changes, pre/post scores are directly comparable
 * and growth is measurable. Item CONTENT is generated fresh and de-duplicated
 * against everything ever shown, so forms never overlap or repeat.
 *
 * Each domain maps to existing course topic slugs so the blueprint stays
 * aligned with the curriculum (light-touch: map first, only fill clear gaps).
 */
export type BlueprintDomain = {
  key: string;
  title: string;
  /** The criterion skill the item must measure. */
  skill: string;
  /** Difficulty anchor so parallel forms stay equivalent in difficulty. */
  difficulty: string;
  /** Existing course topic slugs this domain draws on. */
  topicSlugs: string[];
};

export const BLUEPRINT: BlueprintDomain[] = [
  {
    key: "proportional-ratio",
    title: "Proportional & ratio reasoning",
    skill:
      "Set up and solve a proportion, ratio, rate, or unit-conversion problem in a real-world context.",
    difficulty: "college-freshman, single proportion or two-step rate",
    topicSlugs: [
      "number-sense",
      "fractions-decimals-percents",
      "ratios-proportions",
      "unit-conversions",
    ],
  },
  {
    key: "percent-finance",
    title: "Percentages & financial math",
    skill:
      "Compute a percent change, percent of a total, simple/compound interest, or other everyday financial quantity.",
    difficulty: "college-freshman, one or two computational steps",
    topicSlugs: ["fractions-decimals-percents", "financial-math", "rates-of-change"],
  },
  {
    key: "descriptive-stats",
    title: "Descriptive statistics",
    skill:
      "Compute or interpret mean, median, mode, range, or spread for a small data set, or choose the right summary measure.",
    difficulty: "college-freshman, small data set given inline",
    topicSlugs: ["descriptive-statistics", "data-visualization"],
  },
  {
    key: "probability",
    title: "Probability",
    skill:
      "Compute a basic, conditional, or compound probability, or reason about independence/expected value.",
    difficulty: "college-freshman, single- or two-event scenario",
    topicSlugs: ["probability-basics", "conditional-probability", "distributions"],
  },
  {
    key: "linear-exp-modeling",
    title: "Linear & exponential modeling",
    skill:
      "Build, evaluate, or interpret a linear or exponential model (slope/rate, intercept, growth/decay) from a described situation.",
    difficulty: "college-freshman, write or evaluate a model from a scenario",
    topicSlugs: [
      "linear-equations",
      "linear-functions",
      "systems-of-equations",
      "quadratics",
      "exponentials-logs",
      "function-modeling",
      "inequalities",
    ],
  },
  {
    key: "data-interpretation",
    title: "Data & graph interpretation",
    skill:
      "Read a described table, chart, or graph and draw a correct quantitative conclusion, including spotting a misleading framing.",
    difficulty: "college-freshman, interpret values described in words",
    topicSlugs: ["data-visualization", "quantitative-arguments", "correlation-regression"],
  },
  {
    key: "statistical-inference",
    title: "Statistical inference & estimation",
    skill:
      "Reason about sampling, estimation, margin of error, confidence, correlation vs. causation, or a regression trend.",
    difficulty: "college-freshman, conceptual + light computation",
    topicSlugs: ["sampling-confidence", "correlation-regression", "distributions"],
  },
];

export type GeneratedItem = {
  domain: string;
  domainTitle: string;
  position: number;
  prompt: string;
  correctAnswer: string;
  explanation: string;
  hint: string | null;
};

/** Normalize a prompt so near-duplicates collide on comparison. */
export function normalizePrompt(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

type Gen = {
  prompt: string;
  correctAnswer: string;
  explanation: string;
  hint?: string;
};

const rnd = (min: number, max: number) =>
  min + Math.floor(Math.random() * (max - min + 1));
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]!;

/**
 * Domain-specific deterministic item generators, one per blueprint domain.
 *
 * These are the offline fallback used only when LLM generation fails for a
 * domain. Each generator MUST measure the same criterion skill (and roughly the
 * same difficulty) as its blueprint domain, so a fallback form is still a valid
 * parallel form — never a generic algebra question standing in for probability,
 * statistics, etc. Numbers are randomized so repeated fallbacks don't repeat.
 */
const FALLBACK_GENERATORS: Record<string, () => Gen> = {
  // Proportion / rate in a real-world context.
  "proportional-ratio": () => {
    const per = rnd(2, 8);
    const unit = rnd(3, 9);
    const k = rnd(3, 12);
    const items = ["cookies", "widgets", "miles", "pages", "bricks"];
    const noun = pick(items);
    const total = unit * k;
    const answer = per * k;
    return {
      prompt: `A recipe uses $${per}$ cups of flour for every $${unit}$ ${noun}. At the same rate, how many cups of flour are needed for $${total}$ ${noun}?`,
      correctAnswer: String(answer),
      explanation: `The rate is $${per}/${unit}$ cups per ${noun.replace(
        /s$/,
        "",
      )}. For $${total}$ ${noun}: $${per}/${unit} \\times ${total} = ${answer}$ cups.`,
      hint: "Set up a proportion: cups/items stays constant.",
    };
  },
  // Percent change / sale price.
  "percent-finance": () => {
    const base = rnd(4, 25) * 10;
    const pct = pick([10, 15, 20, 25, 40, 50]);
    const sale = base * (1 - pct / 100);
    return {
      prompt: `A jacket costs $\\$${base}$. It is on sale for $${pct}\\%$ off. What is the sale price in dollars?`,
      correctAnswer: String(sale),
      explanation: `A $${pct}\\%$ discount keeps $${100 - pct}\\%$ of the price: $${base} \\times ${
        (100 - pct) / 100
      } = ${sale}$ dollars.`,
      hint: "Sale price = original × (1 − discount%).",
    };
  },
  // Mean of a small inline data set.
  "descriptive-stats": () => {
    const n = 5;
    const vals = Array.from({ length: n }, () => rnd(2, 20));
    const sum = vals.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    return {
      prompt: `Find the mean of the data set: $${vals.join(", ")}$.`,
      correctAnswer: String(mean),
      explanation: `Add the values: $${vals.join(" + ")} = ${sum}$. Divide by $${n}$: $${sum}/${n} = ${mean}$.`,
      hint: "Mean = sum of values ÷ how many values.",
    };
  },
  // Basic probability as a reduced fraction.
  probability: () => {
    const target = rnd(2, 6);
    const others = rnd(2, 8);
    const total = target + others;
    const g = gcd(target, total);
    const color = pick(["red", "blue", "green"]);
    return {
      prompt: `A bag contains $${target}$ ${color} marbles and $${others}$ other marbles. If you draw one marble at random, what is the probability it is ${color}? Give your answer as a fraction.`,
      correctAnswer: `${target / g}/${total / g}`,
      explanation: `There are $${total}$ marbles total and $${target}$ ${color} ones, so $P = ${target}/${total} = ${
        target / g
      }/${total / g}$.`,
      hint: "Probability = favorable outcomes ÷ total outcomes.",
    };
  },
  // Evaluate a linear model (fixed fee + per-unit rate).
  "linear-exp-modeling": () => {
    const fee = rnd(2, 9) * 10;
    const rate = rnd(5, 30);
    const months = rnd(3, 12);
    const total = fee + rate * months;
    return {
      prompt: `A gym charges a $\\$${fee}$ sign-up fee plus $\\$${rate}$ per month. Write the total cost as a model and find the cost after $${months}$ months.`,
      correctAnswer: String(total),
      explanation: `The model is $C = ${fee} + ${rate}m$. At $m = ${months}$: $C = ${fee} + ${rate} \\times ${months} = ${total}$ dollars.`,
      hint: "Cost = fixed fee + (rate × months).",
    };
  },
  // Read described data and draw a conclusion (total across a table).
  "data-interpretation": () => {
    const days = ["Mon", "Tue", "Wed", "Thu"];
    const vals = days.map(() => rnd(5, 40));
    const total = vals.reduce((a, b) => a + b, 0);
    return {
      prompt: `A shop's daily sales were ${days
        .map((d, i) => `${d}: $${vals[i]}$`)
        .join(", ")}. What were the total sales over these four days?`,
      correctAnswer: String(total),
      explanation: `Add each day's value: $${vals.join(" + ")} = ${total}$.`,
      hint: "Sum the values shown for each day.",
    };
  },
  // Inference: margin-of-error confidence interval.
  "statistical-inference": () => {
    const p = rnd(40, 60);
    const moe = pick([2, 3, 4, 5]);
    return {
      prompt: `A poll finds $${p}\\%$ of voters support a measure, with a margin of error of $\\pm${moe}\\%$. Based on this, the plausible range for true support is between what two percentages?`,
      correctAnswer: `${p - moe}% to ${p + moe}%`,
      explanation: `A margin of error of $\\pm${moe}\\%$ means the interval is $${p} - ${moe}$ to $${p} + ${moe}$, i.e. $${
        p - moe
      }\\%$ to $${p + moe}\\%$.`,
      hint: "Subtract and add the margin of error to the reported percentage.",
    };
  },
};

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * Guaranteed-unique, DOMAIN-VALID fallback so repeated LLM failures never repeat
 * and never substitute an off-domain item. Picks the generator that matches the
 * domain's criterion skill and regenerates until the prompt is unseen.
 */
function fallbackItem(domain: BlueprintDomain, excludeNorm: Set<string>): Gen {
  const generate = FALLBACK_GENERATORS[domain.key];
  if (!generate) {
    // Should never happen: every blueprint domain has a generator. Fail loudly
    // rather than silently substituting an off-domain item.
    throw new Error(`No fallback generator for assessment domain "${domain.key}"`);
  }
  let fallback: Gen;
  let tries = 0;
  do {
    fallback = generate();
    tries += 1;
  } while (excludeNorm.has(normalizePrompt(fallback.prompt)) && tries < 50);
  return fallback;
}

/**
 * Generate one full parallel form: one item per blueprint domain, none of which
 * collide (normalized) with `excludeNorm`. `excludeList` is the human-readable
 * list of prompts handed to the model so it actively avoids overlap.
 */
export async function generateAssessmentForm(
  excludeNorm: Set<string>,
  excludeList: string[],
): Promise<GeneratedItem[]> {
  const items: GeneratedItem[] = [];
  const batchGenerated: string[] = [];

  for (let i = 0; i < BLUEPRINT.length; i++) {
    const domain = BLUEPRINT[i]!;
    let gen: Gen | null = null;

    for (let attempt = 0; attempt < 3 && !gen; attempt++) {
      const exclude = [...excludeList, ...batchGenerated];
      try {
        const candidate = await chatJson<Gen>(
          `You write ONE quantitative-reasoning assessment item for a college freshman that measures this exact skill: "${domain.skill}". Difficulty anchor: ${domain.difficulty}. The item is part of a fixed-blueprint diagnostic, so it MUST stay on this skill and at this difficulty. Hard rules: (1) The problem must NOT be a paraphrase of, and must NOT share the same numbers/answer as, any prompt in the EXCLUDE list. (2) Use $...$ for inline LaTeX where helpful. (3) correctAnswer must be a short string (a number, fraction, expression, or short word) — never multi-paragraph. (4) explanation is a concise worked solution. Respond as strict JSON: {"prompt": string, "correctAnswer": string, "explanation": string, "hint": string}.`,
          `EXCLUDE (do not duplicate or paraphrase any of these): ${JSON.stringify(
            exclude,
          )}\n\nGenerate the assessment item for "${domain.title}" now.`,
        );
        if (candidate?.prompt && !excludeNorm.has(normalizePrompt(candidate.prompt))) {
          gen = candidate;
        }
      } catch (err) {
        // Transient model/API failure: keep retrying. Only after all attempts
        // are exhausted do we fall back to the domain-valid deterministic item.
        logger.warn(
          { err, domain: domain.key, attempt },
          "assessment item generation attempt failed; retrying",
        );
      }
    }

    if (!gen) {
      gen = fallbackItem(domain, excludeNorm);
    }

    excludeNorm.add(normalizePrompt(gen.prompt));
    batchGenerated.push(gen.prompt);
    items.push({
      domain: domain.key,
      domainTitle: domain.title,
      position: i + 1,
      prompt: gen.prompt,
      correctAnswer: gen.correctAnswer,
      explanation: gen.explanation,
      hint: gen.hint ?? null,
    });
  }

  return items;
}
