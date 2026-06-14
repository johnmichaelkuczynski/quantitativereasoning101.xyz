import { chatJson } from "./ai";

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

/** Guaranteed-unique randomized fallback so repeated LLM failures never repeat. */
function fallbackItem(domain: BlueprintDomain, excludeNorm: Set<string>): Gen {
  let fallback: Gen;
  do {
    const a = 2 + Math.floor(Math.random() * 9);
    const x = 1 + Math.floor(Math.random() * 12);
    const b = 1 + Math.floor(Math.random() * 40);
    const c = a * x + b;
    fallback = {
      prompt: `${domain.title}: If $${a}x + ${b} = ${c}$, solve for $x$.`,
      correctAnswer: String(x),
      explanation: `Subtract ${b} from both sides to get $${a}x = ${
        c - b
      }$, then divide by ${a} to get $x = ${x}$.`,
      hint: "Isolate the variable term first, then divide by its coefficient.",
    };
  } while (excludeNorm.has(normalizePrompt(fallback.prompt)));
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
      } catch {
        break;
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
