import { db } from "@workspace/db";
import {
  topicsTable,
  lecturesTable,
  assignmentsTable,
  problemsTable,
  attemptsTable,
  answersTable,
  practiceSessionsTable,
  practiceProblemsTable,
  practiceAttemptsTable,
} from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

type SeedTopic = {
  slug: string;
  title: string;
  weekNumber: number;
  blurb: string;
  lectureTitle: string;
  body: string;
};

const TOPICS: SeedTopic[] = [
  // Unit 1 — Foundations of Value
  {
    slug: "what-is-ethics",
    title: "What is ethics?",
    weekNumber: 1,
    blurb: "Normative vs. descriptive statements; what ethics studies.",
    lectureTitle: "1.1 What is ethics? Normative vs. descriptive",
    body: `# What is ethics?

There are two kinds of statements: **descriptive** and **normative**.

A *descriptive* statement says that such and such is the case. It carries no value-judgment. "Smith is over six feet tall" and "grass is green" are descriptive — they simply report facts.

A *normative* statement expresses a **value-judgment**. It says that something falls short of, satisfies, or exceeds some standard or norm. "It was evil of Hitler to commit genocide," "it is wrong to steal," "it is commendable to give to charity," and "Smith acted valiantly in saving the drowning toddler" are all normative.

## What ethics is

Ethics is the discipline that tries to **clarify the structure of normative concepts** — to state as clearly as possible the conditions a thing must satisfy in order to fall under them. What exactly must an act satisfy to be praiseworthy? What must an institution satisfy to be just?

So ethics is not, at bottom, a list of rules. It is an attempt to make explicit what we *mean* when we judge an act good or bad, right or wrong, just or unjust.

## Why the distinction matters

Much confusion in moral argument comes from sliding between description and evaluation — treating "people do X" as if it settled "people ought to do X." Keeping the two kinds of statements apart is the first discipline of clear ethical thinking.`,
  },
  {
    slug: "normative-categories",
    title: "Normative categories",
    weekNumber: 1,
    blurb: "Concepts that occur only in value-judgments.",
    lectureTitle: "1.2 Normative categories",
    body: `# Normative categories

A **normative category** is a concept that occurs *only* in normative judgments — never in purely factual ones.

Examples include: *good, bad, just, unjust, valiant, noble, wicked, depraved, commendable,* and *condemnable*. You cannot use any of these to merely describe the world; to apply them is already to evaluate.

## Contrast with descriptive categories

"Tall," "green," "heavy," and "six feet" are descriptive categories — applying them takes a measurement, not a value-judgment. "Noble" and "depraved" are different in kind: they place an act or person on a scale of worth.

## Ethics as the study of these concepts

Ethics tries to map the **internal structure** of normative categories. When we call an act *condemnable*, what conditions are we claiming it meets? When we call a person *noble*, what are we attributing to them?

A key lesson of this course is that these concepts are subtler than they first appear. "Good" turns out to mean several different things; "right" is not the same as "good"; and "condemnable" is not simply the absence of "commendable." Sorting these categories out carefully is most of the work of ethics.`,
  },
  {
    slug: "instrumental-intrinsic",
    title: "Instrumental vs. intrinsic goodness",
    weekNumber: 1,
    blurb: "Useful-as-a-means vs. good-in-itself; what ethics cares about.",
    lectureTitle: "1.3 Instrumental vs. intrinsic goodness",
    body: `# Two kinds of goodness

The words "good" and "bad" are **ambiguous** — each has more than one meaning, and each has both normative and non-normative uses. Start with "good."

## Instrumental goodness

To say an act is **instrumentally good** is to say it has consequences desired by, or to the advantage of, the agent (the person who acts). If my sole aim is money, then stealing a million dollars from an orphanage — assuming I get away with it — is instrumentally good *for me*. It is *useful*: it serves my practical interest.

But stealing from a charity is obviously not **ethically** good. It is good only in a practical, strategic sense.

## Intrinsic goodness

If something is good in a **non-instrumental** sense — good even when its consequences are set aside — it is **intrinsically good**. Ethics is concerned with intrinsic goodness. It asks: *which things are good in themselves?*

Ethics has no interest in helping thieves steal more efficiently or politicians grab more power. It seeks the courses of action and states of affairs that are good *even if their consequences are disregarded*.

## A tentative list

No two ethicists fully agree, but many count among the intrinsic goods: happiness, intelligence, benevolence, honesty, loyalty, pleasure, life, friendship, compassion, and freedom (freedom from physical coercion, emotional freedom, and intellectual freedom). Helping someone in need at no advantage to oneself is intrinsically good; so is being honest when lying would be easier.

## Not mutually exclusive

The two kinds overlap. A sharp intellect is *instrumentally* good (it improves your position) **and** *intrinsically* good (its value exceeds any advantage it brings). The same holds for happiness, friendship, and honesty.`,
  },
  {
    slug: "goodness-commendableness",
    title: "Goodness and commendableness",
    weekNumber: 1,
    blurb: "Why some intrinsic goods deserve no praise.",
    lectureTitle: "1.4 Goodness vs. commendableness",
    body: `# Goodness vs. commendableness

"Intrinsic good" is *itself* ambiguous. Some intrinsically good things are **commendable** — they deserve praise. Some are not. (Ambiguities within ambiguities are common in philosophy.)

## Good but not praiseworthy

Happiness is intrinsically good. But does a happy person *deserve praise* for being happy? Not necessarily. If Smith is just naturally cheerful — if his good spirits cost him no effort and require no estimable act — then his happiness is genuinely good, yet he merits no praise for it.

The starkest case: a **rabbit's** happiness is a good thing. But given a rabbit's cognitive limits, it cannot act in a praiseworthy way. Its happiness is good without being commendable. ("Commendable" just means "praiseworthy.")

Likewise a naturally gifted pianist who never had to work for his talent: the talent and the joy it brings are intrinsically good, but he deserves no praise for a gift he did nothing to earn.

## Good *and* praiseworthy

Other intrinsic goods *are* commendable. Jones works long hours for a charity knowing he gains nothing practical by it. His behavior is both intrinsically good **and** commendable.

## The bottom line

There are **two kinds of intrinsic goods**: those that are commendable and those that are not. Praiseworthiness is not the same property as goodness — a lesson that becomes central when we turn to judging agents.`,
  },
  {
    slug: "two-kinds-badness",
    title: "Two kinds of intrinsic badness",
    weekNumber: 1,
    blurb: "Why some intrinsic evils deserve no censure.",
    lectureTitle: "1.5 Two kinds of intrinsic badness",
    body: `# Two kinds of intrinsic badness

Goodness split into the commendable and the merely good. **Badness** splits the same way.

## Bad but not blameworthy

It is obviously bad to be unhappy, and the badness is **intrinsic** — being unhappy is bad in itself, even apart from any further misfortune it causes (a weakened immune system, alienated friends).

But one does not always *deserve censure* for being unhappy. Someone grieving the death of a loved one does not merit a reprimand for the grief. If anything, the person who felt *nothing* at such a loss would deserve censure — "only a monster would feel nothing."

So unhappiness is intrinsically bad without being **condemnable**.

## Bad *and* blameworthy

Other intrinsic evils clearly do warrant censure. Causing someone else to suffer for no good reason is intrinsically bad **and** condemnable.

## The bottom line

Some, but not all, intrinsically bad things are condemnable. "Intrinsically bad" is **not** identical with "worthy of condemnation" — just as "intrinsically good" is not identical with "worthy of praise." This symmetry between goodness/commendableness and badness/condemnableness is the backbone of how we will judge acts and agents.`,
  },
  {
    slug: "morally-complex",
    title: "Morally complex situations",
    weekNumber: 1,
    blurb: "How one act can be good in one respect and bad in another.",
    lectureTitle: "1.6 The morally complex structure of situations",
    body: `# Morally complex situations

A single act or state of affairs can be **intrinsically good in one respect and intrinsically bad in another**.

## The piano example

Suppose I am playing the piano beautifully and taking real pleasure in it. That is an intrinsic good. But suppose my playing is waking my very sick roommate, who needs sleep, and I know it. Then my playing — though still an intrinsic good — is also **condemnable**. It is wrong, *and* it is intrinsically good at the same time.

This looks like a paradox but is not, because (as the next section shows) "wrong" is **not** the opposite of "good." Wrongness is not the absence of goodness, and "right" is not identical with "good."

## Commendable *and* condemnable

A single act can also be both praiseworthy and blameworthy. Jones, a tough and vindictive man, insults Smith; Green, Smith's friend, savagely beats Jones to avenge Smith's honor (out of pure loyalty, no self-interest). Green's act is **commendable** — it is loyal and courageous. It is also **condemnable** — it is excessive, unnecessary violence.

## The lesson

Most real situations are mixed. The temptation to label an act simply "good" or simply "bad" usually distorts it. Mature moral judgment means tracking several normative properties of the *same* act at once.`,
  },
  {
    slug: "non-privative",
    title: "The non-privative character of moral attributes",
    weekNumber: 1,
    blurb: "Why good and bad can coexist: badness is a presence, not an absence.",
    lectureTitle: "1.7 The non-privative character of moral attributes",
    body: `# Why good and bad can coexist

There is nothing paradoxical about one act being both commendable and condemnable. The reason is logical: **neither property is the absence of the other**.

## Privative vs. positive properties

A **privative** property is one a thing has by *lacking* something. To be *cold* is to lack heat; to be *dumb* is to lack intelligence; to be *poor* is to lack money. To be sugar-free is to lack sugar.

A **positive** property is one a thing has by *having* something extra. To be *hot, smart, rich,* or *sugary* is not to lack anything — it is to possess something. (Here "positive" is a strictly logical term, with no moral connotation: being *poisonous* is a positive property in this sense.)

## Moral attributes are positive

Being **condemnable** is positive, not privative — it is the presence of something, not the absence of commendableness. Being **commendable** is also positive. So neither is identical with the absence of the other, which is exactly why both can be present in one act.

## Badness is a presence

People resist calling an act both good and bad partly because they wrongly think badness is the *absence* of goodness. It is not. A rock *lacks* goodness, yet a rock is not bad — it is neither good nor bad. To be bad you must have something **extra**: Hitler was bad not because he lacked something but because he *had* something rocks don't — ill will and a willingness to act on it.

The other reason people resist is psychological: it is easier to sort the world into saints and monsters than to see everyone, including oneself, as part-saint and part-monster. But that craving for simplicity does not match the real moral structure of most acts.`,
  },

  // Unit 2 — Obligation, Right, and Wrong
  {
    slug: "weight-of-obligations",
    title: "The weight of moral obligations",
    weekNumber: 2,
    blurb: "Obligations come in degrees; so does wrongness.",
    lectureTitle: "2.1 Moral obligations have weight",
    body: `# Moral obligations have weight

Moral attributes are not binary, and neither are obligations. **Obligations come in degrees** — some are stronger than others.

## A scale of obligation

If I promise to meet you for lunch, I have an obligation to show up. But that obligation is weaker than my obligation to teach the classes a university pays me to teach. And *that* is weaker than a head of state's obligation to serve the interests of hundreds of millions of constituents.

## Degrees of wrongness

It follows that **wrongness comes in degrees** too. It is wrong to skip a lunch I promised to attend; *more* wrong to skip a class I am paid to teach; and *more* wrong still for a head of state to betray the trust of those they govern.

## Why this matters

A binary picture — "obligatory or not," "wrong or not" — cannot capture moral life. Real decisions are about *comparing weights*: which obligation is stronger, which wrong is graver. The next sections build directly on this idea, since conflicts between obligations of different weight are what force the hardest choices.`,
  },
  {
    slug: "outweigh-vs-cancel",
    title: "Outweighing vs. canceling obligations",
    weekNumber: 2,
    blurb: "An outweighed obligation still exists.",
    lectureTitle: "2.2 Outweighing is not canceling",
    body: `# Outweighing is not canceling

We often face **conflicting obligations**. A central point: when one obligation outweighs another, it does **not** cancel it.

## The case

My best friend, who has always been kind to me, keeps a million dollars in a safe I can access. I have a clear obligation not to steal it — doing so would harm a decent person and betray his trust.

But I have five young children who will die without expensive medical treatment I cannot otherwise afford in time. The only way to save them is to take my friend's money. There is no third option.

## The stronger obligation

My obligation to save my children is **stronger** than my obligation not to steal. So the right thing — the *least bad* thing — is to take the money: the moral value of saving five lives exceeds the value of not stealing.

## But the weaker obligation remains

Crucially, that does **not** mean my obligation not to steal *ceases to exist*. In taking the money I still do something to my friend that he has a right not to undergo, and that I therefore had an obligation not to do. An obligation that is outweighed by a stronger one is **overridden, not erased**.

This is why doing "the right thing" in a dilemma can still leave a genuine moral residue — regret, a debt, something owed. The defeated obligation was real.`,
  },
  {
    slug: "right-least-bad",
    title: '"Right" = least bad',
    weekNumber: 2,
    blurb: "Why the right act need not be a good one.",
    lectureTitle: '2.3 "Right" ≠ "good"; "right" = "least bad"',
    body: `# "Right" means "least bad"

It is easy to assume the **right** act is a *good* act. It is not.

## Back to the safe

Recall the dilemma: steal my friend's money or let my children die. The **right** thing is to steal the money — but stealing it is plainly the **lesser of two evils**. It is a bad thing, even a terrible thing; the alternative is simply worse.

So what makes the act *right* is **not** that it is a positive good. It is that it is the **least bad option the circumstances allow**.

## The general definition

In general, "the right course of action" means **the least bad course of action available** under the circumstances. Rightness is comparative: it is defined relative to the alternatives actually open to you, not against some abstract ideal of pure goodness.

## Why this matters

This dissolves the apparent paradox from Unit 1 — that an act can be wrong yet intrinsically good, or right yet bad. "Right" and "good" are simply different concepts. Recognizing that the right choice is often a bad one, chosen only because the others are worse, is essential to thinking honestly about dilemmas.`,
  },
  {
    slug: "wrong-least-good",
    title: '"Wrong" = least good',
    weekNumber: 2,
    blurb: "Why a wrong act can still be a good one.",
    lectureTitle: '2.4 "Wrong" ≠ "bad"; "wrong" = "least good"',
    body: `# "Wrong" means "least good"

Just as "right" is not "good," **"wrong" is not "bad."** A wrong act need not be a bad act. To be **wrong** is to be the **least good** of the available options.

## The rescue case

Suppose I can take exactly one of three actions:

- **(i)** save individuals M1–M10 (save 10, let 7 die),
- **(ii)** save M11–M15 (save 5, let 12 die),
- **(iii)** save M16–M17 (save 1... rather, save 2, let many more die).

Assume everyone is equally worthy of life.

If I choose to save the *smallest* group, I am still doing a **good** thing — saving lives is good. Yet I am doing the **wrong** thing, because it would clearly have been *better* to save the larger group. The more lives saved, the better.

## The lesson

So an act can be **good and wrong at once**: good because it has real positive value, wrong because some available alternative was better. "Wrong" marks not the presence of badness but the *failure to be the best available* — the least good of the live options.

Together with the previous section, this completes the decoupling of right/wrong from good/bad: all four are distinct, comparative notions.`,
  },
  {
    slug: "ought-implies-can",
    title: '"Ought" implies "can"',
    weekNumber: 2,
    blurb: "Obligation requires ability — with a caveat.",
    lectureTitle: '2.5 "Ought" implies "can"',
    body: `# "Ought" implies "can"

A widely accepted principle: you have an obligation to do something **only if you can do it**. "Ought" implies "can."

## The basic idea

Because it is not in my power to heal every sick person on earth, I have no obligation to do so. I have an obligation to treat my students fairly only because doing so *is* within my power. Obligations track ability.

## The caveat

But the principle needs a grain of salt. We saw that one can have **multiple conflicting obligations** — an obligation to do X *and* Y *and* Z — even when it is impossible to do all three. In the safe case I ought to save my children *and* not steal, though I cannot do both. So, strictly, there are things one "ought" to do that one *cannot* do.

## The principle survives, refined

Still, the principle is not simply false. In such a conflict, there is **no single course of action** that I ought to carry out but cannot. It *is* within my power not to steal my friend's money (even if I cannot both refrain *and* save my children). And it seems that, if even that weren't within my power, I would have *no* obligation to refrain. So "ought" implies "can" holds for each obligation taken **singly**, even if the full set of obligations cannot be jointly satisfied.`,
  },
  {
    slug: "legality-morality",
    title: "Legality vs. morality",
    weekNumber: 2,
    blurb: "Legal and moral can come apart — and often overlap.",
    lectureTitle: "2.6 Legality is not morality",
    body: `# Legality is not morality

Legality and morality are **distinct**. They are not the same standard, and they can come apart.

## They can conflict

There are acts that are legal — even legally *required* — yet deeply immoral. In the United States before the Civil War, it was legal to own slaves and **illegal** to free another person's slaves. But owning slaves is exceedingly immoral, and freeing them exceedingly moral. Law and morality pointed in opposite directions.

## They often overlap

At the same time, the two frequently coincide. It is illegal to kill people (except in self-defense), and it is also immoral to do so (same qualification). Much of the law tracks morality reasonably well.

## A delicate relationship

*How* legality and morality are related is a subtle question, not settled by either of the points above. What this course insists on is only the **distinction**: that an act is legal does not make it moral, and that an act is illegal does not make it immoral. Confusing "it's the law" with "it's right" — in either direction — is one of the most common and most dangerous mistakes in practical ethics.`,
  },

  // Unit 3 — Acts, Agents, and Judgment
  {
    slug: "judging-vs-status",
    title: "Judging X vs. the status of X",
    weekNumber: 3,
    blurb: "The morality of passing judgment differs from the morality of the act.",
    lectureTitle: "3.1 Judging X vs. the moral status of X",
    body: `# Judging an act vs. the act itself

The moral status of **passing judgment** on X is *not* the same as the moral status of **X itself**.

## An everyday parallel

Given only that an object weighs 200 pounds, I do not automatically have the *right* to say it does — I might lack the information. Given only that a statement is true, I do not automatically have the right to assert it; I have that right only if I have good reason to believe it.

## The ethical consequence

Suppose Jones is on trial for a murder he in fact committed, but the jury lacks the evidence to know he is guilty. Jones's act is **condemnable** — murder is wrong. Yet the jury does **not** have the right to convict him, because the jury does not *know* he is guilty. It would be **condemnable of the jury** to convict a person it does not know to be guilty, even if that person happens to be guilty.

## The general principle

Even when an act *is* condemnable, one does not automatically have the right to condemn it. One has that right only with sufficient information. To condemn without it is itself to act condemnably — making an accusation one does not know to be correct, even if by coincidence it is. The striking upshot: **it can be condemnable to condemn the condemnable.**`,
  },
  {
    slug: "act-vs-agent",
    title: "Goodness of the act vs. goodness of the agent",
    weekNumber: 3,
    blurb: "Praise and blame track intention, not outcome.",
    lectureTitle: "3.2 The act vs. the agent: intention is what counts",
    body: `# The act vs. the agent

Whether an agent deserves praise or blame depends **not on what they actually bring about, but on what they intend** to bring about.

## Kathy and Mary

**Kathy**, a devoted mother of five, researches carefully, concludes supplement X will help her children, works extra hours to buy it, and feeds it to them. They thrive. Kathy deserves commendation: she did the right thing, and she *intended* to.

**Mary** is psychologically identical to Kathy — same care, same research, same intentions. The evidence available to her points to supplement Y. She works extra to buy it and feeds it to her kids. But Y, despite all testing, turns out to be slowly lethal, and her children die.

Mary did not do "the right thing." But is she **morally worse** than Kathy? No. Her intentions were exactly Kathy's. The only difference is that the world met Kathy halfway and did not meet Mary halfway. **They are equally worthy of praise**, even though one brought about a tragedy.

## Betty

**Betty**, bored with motherhood, intends to kill her children and feeds them substance Z, believed lethal and undetectable. But Z happens to be beneficial to children of their rare blood type, and they flourish. Betty produced a **good** outcome — yet she deserves **condemnation of the severest kind**, because it was her intention to do evil.

## The principle

Praise and blame attach to the **agent's intention**, not to the result. Good outcomes from evil intentions earn no praise; tragic outcomes from good intentions earn no blame.`,
  },
  {
    slug: "intention-attempts",
    title: "Intention and the punishment of attempts",
    weekNumber: 3,
    blurb: "Why law punishes attempts less, and why that's consistent.",
    lectureTitle: "3.3 Why attempts are punished less severely",
    body: `# Why attempts are punished less severely

Attempted murder is punished less harshly than murder. Why — if praise and blame track intention, not outcome?

## Failure is evidence of a weaker intention

Failure to carry out a plan often (not always) suggests the person's **heart wasn't fully in it**. If a smart man flunks out of law school ten times, his heart may not be in it. If a would-be murderer's gun jams, it may be because he never checked it — and a truly resolute killer might have made sure it worked. His failure may reflect reservations, possibly even *moral* reservations.

## The same holds for good deeds

Suppose you keep agreeing to visit a tiresome ailing aunt, and every time some genuine obstacle arises — lost keys, sudden inspiration, an urge to clean. The obstacles are real and not consciously contrived. But that they *always* arise, given how you dread the visits, suggests your intention to go is **feeble**. This is why those who actually carry out good deeds receive more commendation than those who merely attempt them.

## Why this is consistent

It remains true that two people with *exactly* the same intentions deserve exactly the same praise or blame, success or not. But as a **general rule**, success or failure is *evidence* about how resolute the intention was. Those who succeed at crimes are, on average, less conflicted about wanting to. So punishing attempts less severely is consistent with the view that intention — not outcome — is what we are really judging.`,
  },
  {
    slug: "hitler-problem",
    title: "Good intentions and condemnation (the Hitler problem)",
    weekNumber: 3,
    blurb: "Can someone be condemned even if they 'meant well'?",
    lectureTitle: "3.4 The Hitler problem",
    body: `# The Hitler problem

If blame tracks intention, an objection arises: it is agreed that Hitler's acts were wrong and that he deserves condemnation. But "**wasn't it his intention to do good**? His efforts were misguided, but mustn't we say his intentions were good — and isn't that inconsistent with the claim that condemnation tracks intention, not deeds?"

## The response

The premise is false: it pretty clearly was **not** Hitler's intention to do good. (And even if some such intention existed, it was grossly **outweighed** by other intentions.)

Of course he never announced, "It's my intention to do evil." But public speeches tell us nothing about real intentions. Given how obvious it is to anyone of even minimal intelligence that gratuitous torture and murder are wrong, it is **not feasible** to suppose that, as a rule, Hitler's intentions were good ones.

## The general lesson

The "good intentions" defense cannot be granted on a person's say-so, nor inferred from the fact that they cloak their aims in noble language. We judge intentions by the **whole pattern of conduct** and by what any minimally reasonable person in their position would have known. Properly understood, the Hitler case does not refute the intention-based view of blame — it illustrates how to read intentions honestly rather than naively.`,
  },
  {
    slug: "immorality-toward-self",
    title: "Immorality toward oneself",
    weekNumber: 3,
    blurb: "Can one act immorally toward oneself?",
    lectureTitle: "3.5 Can one act immorally toward oneself?",
    body: `# Can one act immorally toward oneself?

This is controversial, but the answer defended here is **yes**. One can sell oneself short, act self-destructively, and do to oneself things one has a right not to undergo.

## Ways of wronging oneself

There are many: being **too easy** on oneself (permitting every excess — drugs, binge-eating) and being **too hard** on oneself (pushing too hard, setting impossibly high standards). The list is far from complete.

## Not the same category as harming others

This does not put self-harmers in the same moral category as those who harm others. People who hurt themselves are often (not always) **hyper-principled**, whereas those who hurt others are often (not always) lacking in principle.

## Principle-driven can still be wrong

"But you said self-harmers behave immorally, and you also call them hyper-principled — isn't that inconsistent?" No. That an act is **principle-driven does not make it right**. There are many ethical principles, and not all are good. Some people felt it their *duty* to support Hitler — that was a principle, just a bad one. By acting on similarly misguided principles, people can wrong **themselves**.

It is even argued elsewhere that, in a sense, *all* acts of immorality are ultimately acts of immorality toward oneself — a thought the next section pursues through the question of punishment.`,
  },
  {
    slug: "self-harm-autonomy",
    title: "Self-harm, punishment, and autonomy",
    weekNumber: 3,
    blurb: "Why we don't punish self-harm — and what that does and doesn't show.",
    lectureTitle: "3.6 Self-harm, punishment, and autonomy",
    body: `# Self-harm, punishment, and autonomy

A common argument: people who harm *others* deserve punishment, while people who harm *themselves* do not; therefore self-destructive behavior is **not immoral**, even if bad in some other way.

## The argument is not probative

This reasoning is weak, because **desert of punishment is not solely a function of having done wrong**. If the good done by punishing someone is grossly outweighed by the harm it does, punishing may be wrong even when wrong was done.

Take little Timmy, who steals a cookie. It was not good of him. But suppose Timmy is emotionally fragile and would completely break down if punished. Then it is probably better to give him a pass — *not* because he did no wrong, but because punishing would do more harm than good.

## Why we don't punish self-harm

Two further reasons. **First**, self-destructive behavior is *its own punishment*; an externally imposed punishment would be redundant — adding insult to injury. **Second**, punishing such a person would violate their **autonomy** — their right to determine their own fate — which might be ethically *worse* than what they did to themselves.

## The conclusion

So the fact that we (rightly) refrain from punishing self-harm does **not** show that self-harm is morally permissible. It shows only that **wrongdoing and desert-of-punishment are separate questions**. An act can be genuinely wrong even when punishing it would be the worse course.`,
  },

  // Unit 4 — Metaethics and Moral Truth
  {
    slug: "ought-from-is",
    title: 'Metaethics: deriving "ought" from "is"',
    weekNumber: 4,
    blurb: "Can value-judgments follow from purely factual ones?",
    lectureTitle: '4.1 Can you derive an "ought" from an "is"?',
    body: `# Metaethics and the is–ought question

**Metaethics** asks what, if anything, ethical statements *mean*. A **valuative** statement is one that expresses a value-judgment — it says something should or should not be done, or that something is or is not good. ("Valuative" means roughly the same as "ethical" or "having ethical content.")

## The classic principle

One famous principle says: **you cannot derive an "ought" from an "is."** If you had a complete list of all true *non-valuative* statements, the claim goes, you still could not justifiably infer any valuative statement — you could never reach "it is obligatory that you do X."

## Why it may be false

Though widely accepted, the principle may well be **false**. Consider two popular moral doctrines:

- "X is a good act" means *X makes people happier than the available alternatives.*
- "X is a good act" means *X promotes the actualization of human potential more than the alternatives.*

If either doctrine — or anything like it — is correct, then an "ought" **can** be inferred from an "is." For "X is what ought to be done" would follow from the factual claim "X is more likely than the alternatives to maximize happiness (or human flourishing)."

## The upshot

So the is–ought barrier is not obviously a barrier at all. Whether it stands depends on substantive questions about what goodness *consists in* — questions metaethics must actually argue, not assume. This sets up Moore's more famous version of the objection.`,
  },
  {
    slug: "open-question",
    title: "Moore's open-question argument",
    weekNumber: 4,
    blurb: "Are moral facts reducible to natural facts?",
    lectureTitle: "4.2 Moore's open-question argument",
    body: `# Moore's open-question argument

G. E. Moore argued that **no amount of purely descriptive, non-moral information is enough to settle a moral judgment**.

## The argument

- **Premise:** No matter how many *factual* truths you know about X, it remains an "open question" whether X is good.
- **Conclusion:** Ethical truths are therefore **not identical with, or reducible to, factual statements.**

The idea is that for any natural property you propose to identify with goodness, you can always still sensibly ask, "but is a thing with that property *good*?" — so goodness must be something over and above any natural fact.

## Why the argument fails

The premise is **false**. As we just saw, if goodness has anything to do with maximizing happiness or human flourishing, then enough factual information *does* settle the moral question.

More directly, the premise is **deeply implausible**. If I know that X is a person who kills others for fun, delights in their pain, and never does anything for anyone, then it is **not** an open question whether X is good. The "openness" simply evaporates once the facts are bad enough. So Moore's argument is no good.

## Why the next section matters

Why did Moore find the question "open" even when the facts are damning? The next section diagnoses the deeper error: a faulty conception of **entailment**.`,
  },
  {
    slug: "entailment-ampliative",
    title: "Entailment as ampliative",
    weekNumber: 4,
    blurb: "Deduction can add to what you know.",
    lectureTitle: "4.3 Entailment is ampliative",
    body: `# Entailment is ampliative

The hidden assumption behind Moore's argument (and Hume's) is a **faulty theory of entailment**.

## The standard view

It is often said that P entails Q only if "there is nothing in Q that isn't already in P" — that entailment is **non-ampliative**, that deduction never *adds* to what you know. On this view, if Jones tortures babies for fun and frames others for it, the badness of Jones still doesn't "follow," because deduction can't deliver anything genuinely new.

## Why it is false

Entailment is in fact **ampliative**. Sure, some cases are trivial ("if P and Q, then Q"), but these are the exception, not the rule. That 1 + 1 = 2 *entails*, by long chains of deduction, that there are continuous functions differentiable nowhere, and that space is metrically amorphous — results no one "sees" in "1 + 1 = 2."

If deduction really added nothing, then those who reason would know no more than those who merely live in the moment — our Pleistocene ancestors would be as knowledgeable as we are. That is absurd. Without deduction we could never organize raw experience into theories at all.

## The payoff for ethics

Once we accept that deduction **extends** knowledge, Moore's "open question" loses its grip. From a rich enough set of facts about Jones, the conclusion that Jones is bad genuinely *follows* — even though the word "bad" never appeared among the premises. The newness of the conclusion is no objection; that is just what good inference does.`,
  },
  {
    slug: "genetic-vs-normative",
    title: "Genetic vs. normative questions",
    weekNumber: 4,
    blurb: "Where a belief came from is not whether it's true.",
    lectureTitle: "4.4 The genetic fallacy in ethics",
    body: `# Genetic vs. normative questions

We must sharply separate **where a belief came from** (the *genetic* question) from **whether it is true** (the *normative* question).

## The Newton example

Legend says Newton hit on the inverse-square law after an apple struck his head. The random, ignominious origin of the idea is **irrelevant** to whether it is correct. What makes an idea correct is whether it *fits the facts* — not who thought of it or how. Ideas reached by impeccable reasoning can be false; ideas reached illogically can be perfectly true. To judge a belief by its origin rather than its fit with the facts is to commit the **genetic fallacy**.

## Applied to morality

Suppose anthropologists discovered that our belief that torturing infants is wrong descended from an ancient cult of a "Volcano god" who supposedly abhorred it. Would that show the belief is **false**? No. It would show our *original grounds* were bad — but a belief with bad original grounds can be true, and we may since have replaced those grounds with good ones (just as a child who believes the Earth is round "because he likes round things" can later acquire real evidence).

## The religion twist

Views actually reached for ordinary reasons are often *redescribed* as divinely revealed, because "God told me X" wins more believers than "my own intellect told me X." But notice: people only believe "God said X" when they *already* find X plausible. Tell people God told you to destroy hospitals and no one believes you; tell them God told you to be kind and a few might. So the appearance of a genetic origin is frequently an illusion — the real grounds were the merits all along.`,
  },
  {
    slug: "truth-vs-use",
    title: "Moral truth vs. its uses and implementation",
    weekNumber: 4,
    blurb: "Abuse and late discovery don't refute moral truth.",
    lectureTitle: "4.5 Moral truth vs. its uses and implementation",
    body: `# Moral truth vs. its uses and its implementation

Two further confusions must be cleared away: confusing a moral truth with the **use** it is put to, and confusing a moral principle with its **social implementation**.

## Use does not impugn truth

Many moral statements *are* pure propaganda — cynical manipulations meant to advance some nefarious agenda. Even **correct** moral statements can be put to evil use: Stalin, climbing to power, often preached the importance of "mercy for one's political rivals." Mercy is genuinely good — but it does not follow that Stalin did good in invoking it, for his use of the principle was deceptive. And conversely: that self-interested actors *call* something a moral truth does not make it one. But — crucially — from the fact that an *alleged* moral truth is false, **it does not follow that there is no moral truth** (just as fake "physical laws" don't show there are no physical laws).

## Discovery is not invention

It is often argued that morality has no objective basis because it is a "human creation" that "came into existence a few thousand years ago." This commits two errors. **First**, there was a time when people first *became aware* the Earth is round — but the Earth was round long before. Likewise, that people became aware of moral truths at some point does not mean those truths were *invented* then. **Second**, it confuses moral principles with the **institutions that enforce them**. Enforcement requires society; the principle does not. Even with no society at all, it is wrong to gouge out someone's eyes for fun. Calculators implementing the laws of arithmetic were built in the 1800s, but those laws existed long before the machines. The same holds for moral law.`,
  },
  {
    slug: "reject-realism",
    title: "Bad reasons to reject ethical realism",
    weekNumber: 4,
    blurb: "Disagreement does not show morality is mere opinion.",
    lectureTitle: "4.6 Bad reasons to reject ethical realism",
    body: `# Bad reasons to reject ethical realism

A popular argument: there is *more disagreement* in ethics than in other fields; therefore ethical statements merely express **opinion**, with no objective basis — so they are either meaningless or categorically false.

## Four problems with this argument

**(i)** There is a great deal of disagreement about **strictly factual** matters too — yet we do not conclude that facts are mere opinion.

**(ii)** Even if there is *more* disagreement in ethics, that does not show ethical claims lack an objective basis. Certain kinds of disagreement actually **presuppose** objective fact, and there is evidence that ethical disagreement is often of this kind.

**(iii)** There is in fact a great deal of **agreement** in ethics; the contrary impression rests largely on misleading appearances. (We notice the controversies, not the vast shared background.)

**(iv)** Much "ethical" disagreement is really disagreement about **matters of fact**, not matters of value — about *what will happen* or *what is the case*, not about what is good.

## The upshot

None of this *proves* ethical realism. But it dismantles the single most common argument *against* it. The mere existence of moral disagreement — even widespread disagreement — is not evidence that there is no moral truth. The next section makes (i) and (iv) concrete.`,
  },
  {
    slug: "disagreement-fact-value",
    title: "Disagreement, fact, and value",
    weekNumber: 4,
    blurb: "Rational debate is the mark of objective truth.",
    lectureTitle: "4.7 Disagreement, fact, and value",
    body: `# Disagreement, fact, and value

To see why disagreement does not doom moral realism, compare two statements.

## A contested factual claim

**(KV)** "If Kennedy hadn't been assassinated, the U.S. would have pulled out of Vietnam before 1970."

KV is **not** a value-judgment — it asserts a causal relation. It is extremely hard to know whether KV is true, and there is no unanimity about it. Yet it is surely **not "just a matter of opinion."** The decisive mark: it makes sense to **cite reasons for and against it** — a speech JFK had drafted, newly uncovered documents about LBJ's views, and so on. KV can be weighed against documents, footage, and testimony. Difficulty of resolution is **not** the same as mere subjectivity.

## A genuine matter of taste

**(CB)** "Chocolate ice cream is better than vanilla" (not nutritionally).

Here there is little I can do to defend my position beyond "I like chocolate more." Reasons get no grip. CB really *is* a matter of opinion.

## The lesson

The test for whether a statement is **truth-apt** is whether reasons can rationally bear on it. Many moral disputes are like **KV**, not **CB**: people marshal evidence, draw distinctions, and change their minds under argument — which is exactly what we would expect if there were a fact of the matter. And much apparent *moral* disagreement turns out, on inspection, to be **factual** disagreement (about consequences, circumstances, who did what) riding underneath a shared value.`,
  },
  {
    slug: "capstone-ethical-truths",
    title: "Capstone: what are ethical truths?",
    weekNumber: 4,
    blurb: "Synthesizing the course into a view of moral truth.",
    lectureTitle: "4.8 Capstone synthesis: what are ethical truths?",
    body: `# Capstone: what are ethical truths?

This final section ties the course together. Each earlier idea is a thread; the question "what *are* ethical truths?" is where they meet.

## What we have established

- **Value is layered.** "Good" splits into instrumental and intrinsic; intrinsic good splits into commendable and merely good; badness splits the same way. Moral attributes are **positive, not privative** — which is why one act can be good *and* bad, commendable *and* condemnable.
- **Right and wrong are comparative.** "Right" = least bad available; "wrong" = least good available. Neither equals "good" or "bad." Obligations have **weight**, and an outweighed obligation is overridden, not erased.
- **We judge agents by intention.** Outcomes can mislead (Kathy, Mary, Betty); attempts are punished less because failure is evidence of a weaker intention; and the moral status of *judging* differs from the status of the act judged.
- **Metaethics defends moral truth.** "Ought" may follow from "is"; Moore's open-question argument fails once we see entailment is **ampliative**; and the genetic fallacy, the abuse of moral language, the late *discovery* of morality, and the mere fact of *disagreement* are all **bad reasons** to deny that there are moral truths.

## A capstone problem

> A government can save more lives overall only by enacting a policy that knowingly, deliberately harms a small, blameless group. Is enacting it *right*? Is it *good*? Does the residual obligation to the harmed group survive? Would a leader who enacts it with the *intention* of protecting the powerful deserve the same praise as one who enacts it reluctantly to save lives?

Answering this well requires the *whole course*: the intrinsic/instrumental distinction, weight and outweighing, "right" as least-bad, intention-based judgment of agents, and a clear-eyed view of whether there is a fact of the matter at all. **That** is ethical reasoning.`,
  },
];

type SeedAssignment = {
  kind: "homework" | "test" | "midterm" | "final";
  title: string;
  weekNumber: number;
  isTimed: boolean;
  timeLimitMinutes: number | null;
  instructions: string;
  problems: Array<{
    topicSlug: string;
    prompt: string;
    correctAnswer: string;
    explanation: string;
    hint?: string;
  }>;
};

const ASSIGNMENTS: SeedAssignment[] = [
  // Unit 1
  {
    kind: "homework",
    title: "Homework 1.1 — Statements, categories, kinds of goodness",
    weekNumber: 1,
    isTimed: false,
    timeLimitMinutes: null,
    instructions: "Untimed practice. Answer in your own words in the answer box.",
    problems: [
      { topicSlug: "what-is-ethics", prompt: `Explain the difference between a descriptive statement and a normative statement. Then explain why "It is wrong to steal" belongs to one category and "Grass is green" to the other, using the idea of a value-judgment in your answer.`, correctAnswer: `A descriptive statement reports how things are — a matter of fact that could in principle be checked by observation, expressing no approval or disapproval. A normative statement evaluates something against a standard of worth, expressing a value-judgment. "Grass is green" merely records an observable fact, so it is descriptive. "It is wrong to steal" judges stealing against a moral standard and condemns it, so it is normative.`, explanation: `Descriptive = reports fact; normative = expresses a value-judgment against a standard.` },
      { topicSlug: "normative-categories", prompt: `Some predicates ("tall", "six feet", "green") are descriptive while others ("noble", "depraved") are normative. Explain what makes a category normative rather than descriptive, and why "noble" cannot be settled by measurement the way "six feet" can.`, correctAnswer: `A category is normative when applying it places something on a scale of worth — it expresses a value-judgment rather than recording a measurable fact. "Tall" or "six feet" can be settled by measuring, because they describe quantities with no evaluation built in. "Noble" cannot be measured: calling an act noble ranks it as admirable on a scale of value, which is an evaluation, not a measurement.`, explanation: `Normative categories rank things by worth; they cannot be settled by measurement because they express evaluation.` },
      { topicSlug: "instrumental-intrinsic", prompt: `Distinguish instrumental goodness from intrinsic goodness. Then explain in what sense stealing from an orphanage to enrich yourself could be called "good", and why ethics is not concerned with goodness in that sense.`, correctAnswer: `Something is instrumentally good if it is useful as a means to a further end, and intrinsically good if it is good in itself apart from its consequences. Stealing from an orphanage to enrich yourself is at most instrumentally good — it serves the thief's practical interest — but it is not good in itself. Ethics studies intrinsic goodness, what is worth pursuing for its own sake, so this merely useful "goodness" falls outside its concern.`, explanation: `Instrumental = useful as a means; intrinsic = good in itself. Ethics studies intrinsic goodness, not mere usefulness.` },
      { topicSlug: "goodness-commendableness", prompt: `A rabbit's happiness is intrinsically good, yet we do not praise the rabbit for being happy. Explain how this shows that intrinsic goodness and commendableness can come apart, and what extra condition commendableness requires.`, correctAnswer: `The rabbit's happiness is good in itself, so it has intrinsic goodness, but the rabbit did nothing praiseworthy to bring it about. Commendableness requires more than the presence of something good: it needs an agent who, through choice or intention, is responsible for it in a way that merits praise. Since the rabbit lacks that kind of agency, its happiness is intrinsically good but not commendable, showing the two notions are distinct.`, explanation: `Commendableness requires a responsible, intending agent; intrinsic goodness does not, so the two come apart.` },
    ],
  },
  {
    kind: "homework",
    title: "Homework 1.2 — Commendableness, badness, and mixed acts",
    weekNumber: 1,
    isTimed: false,
    timeLimitMinutes: null,
    instructions: "Untimed practice.",
    problems: [
      { topicSlug: "two-kinds-badness", prompt: `A person grieving the death of a loved one is unhappy, and that unhappiness is intrinsically bad. Explain why we nonetheless do not condemn the grieving person, and what this reveals about the relationship between intrinsic badness and blameworthiness.`, correctAnswer: `The grief is intrinsically bad because suffering is bad in itself, but the badness of a state is not the same as fault in a person. Condemnation requires that someone be blameworthy for bringing about something bad through their will, and the grieving person has done nothing blameworthy — their suffering is a natural response to loss. So some intrinsic evils warrant no censure at all, showing intrinsic badness and blameworthiness are separate.`, explanation: `Intrinsic badness of a state does not entail a blameworthy agent, so the grief is bad but not condemnable.` },
      { topicSlug: "morally-complex", prompt: `In the piano example a person plays beautifully while knowingly depriving a sick roommate of sleep. Explain how a single act can be intrinsically good in one respect and condemnable in another, rather than simply one or the other.`, correctAnswer: `Playing the piano well realizes something intrinsically good — skilled, beautiful performance — so in that respect the act has genuine value. But the same act is condemnable because the player knowingly harms a sick roommate who needs rest, acting with disregard for that person's wellbeing. The act is morally complex: it carries a positive value and a separate ground for blame at once, so it cannot be classified as simply good or simply bad.`, explanation: `One act can carry distinct good-making and blame-making features at once; it is morally complex, not simply good or bad.` },
      { topicSlug: "non-privative", prompt: `Is badness merely the absence of goodness, the way darkness is the absence of light? Defend an answer, and explain why your answer lets a single act be both commendable and condemnable.`, correctAnswer: `No. Badness is not a mere absence; it is a positive (non-privative) feature, such as ill will or cruelty that is actually present, not just goodness that is missing. Because badness is something extra rather than the lack of goodness, an act can contain both a positive good and a positive bad simultaneously. That is why one and the same act can be commendable in one respect and condemnable in another.`, explanation: `Badness is positive (non-privative), not the absence of goodness, so good and bad features can coexist in one act.` },
      { topicSlug: "goodness-commendableness", prompt: `Explain the difference between something being intrinsically good and someone being commendable, giving one case where they come apart in each direction: good but not commendable, and commendable while producing little good.`, correctAnswer: `Intrinsic goodness is a value a state or outcome has in itself, while commendableness is praise an agent earns for what they intend or do. A rabbit's happiness is intrinsically good but the rabbit is not commendable, because it has no praiseworthy agency. Conversely, someone who tries hard and intends well but accomplishes little can still be commendable, because praise tracks the agent's intention and effort, not the amount of good actually produced.`, explanation: `Intrinsic goodness attaches to states; commendableness attaches to intending agents — they can diverge in both directions.` },
    ],
  },
  {
    kind: "test",
    title: "Unit 1 Test — Foundations of Value",
    weekNumber: 1,
    isTimed: true,
    timeLimitMinutes: 30,
    instructions: "Timed. 30 minutes. Pasting is disabled; keystrokes are screened for AI use.",
    problems: [
      { topicSlug: "what-is-ethics", prompt: `Explain what ethics, as a discipline, is actually trying to do with normative concepts, and why this makes it different from simply listing which acts people happen to approve of.`, correctAnswer: `Ethics tries to clarify the structure of normative concepts — to spell out the conditions something must meet to count as good, right, or obligatory. It is an analysis of what these evaluations mean and require, not a survey of opinion. That is why it differs from cataloguing what people happen to approve of: popular approval is a descriptive fact, whereas ethics asks what genuinely satisfies the normative standard.`, explanation: `Ethics analyzes the conditions for normative concepts; approval-counting is merely descriptive.` },
      { topicSlug: "instrumental-intrinsic", prompt: `Define intrinsic goodness and explain, with an example, why a thing can be both instrumentally and intrinsically good without the two senses collapsing into one.`, correctAnswer: `Something is intrinsically good if it is good in itself, independent of what it leads to. A thing can also be instrumentally good — useful as a means — at the same time: intelligence, for instance, is good in itself and also useful for achieving other ends. The senses do not collapse because "good in itself" is a distinct question from "useful for something else"; a thing can answer yes to both, or to only one.`, explanation: `Intrinsic = good in itself; a thing (e.g. intelligence) can also be useful, but the two questions stay distinct.` },
      { topicSlug: "two-kinds-badness", prompt: `Give an example of something intrinsically bad but not condemnable, and explain what is missing in that case that would otherwise justify condemnation.`, correctAnswer: `The unhappiness of someone grieving a loved one is intrinsically bad yet not condemnable. What is missing is a blameworthy agent: condemnation is warranted only when someone is responsible, through their will or intention, for bringing about the bad thing. The grief arises naturally from loss rather than from anyone's culpable choice, so although the state is bad in itself there is no one to blame.`, explanation: `Condemnation needs a culpable agent; grief is intrinsically bad but no one is blameworthy for it.` },
      { topicSlug: "non-privative", prompt: `Explain why a single act can be both commendable and condemnable at the same time, appealing to the idea that these are positive rather than privative properties.`, correctAnswer: `Commendable and condemnable are both positive features — each is the presence of something (praiseworthy or blameworthy aspects), not the mere absence of the other. Because neither is defined as the lack of the other, both can be present in one act. So an act that realizes a genuine good while also expressing ill will or disregard can carry praiseworthy and blameworthy features simultaneously.`, explanation: `Both properties are positive, not the absence of the other, so they can coexist in one act.` },
      { topicSlug: "morally-complex", prompt: `Using any example, explain why classifying acts as simply "good" or simply "bad" is often inadequate, and what a more accurate description of a morally complex act looks like.`, correctAnswer: `Many acts contain both valuable and objectionable features, so a single label distorts them. A more accurate description separates the respects in which the act is good from the respects in which it is bad — for example, a skilled piano performance that is admirable as performance yet condemnable for knowingly harming a sick roommate. Recognizing morally complex acts means assigning praise and blame to the different aspects rather than forcing the whole act into one box.`, explanation: `Real acts mix good- and bad-making features; describe each respect rather than forcing one label.` },
    ],
  },

  // Unit 2
  {
    kind: "homework",
    title: "Homework 2.1 — Weight, outweighing, and 'right'",
    weekNumber: 2,
    isTimed: false,
    timeLimitMinutes: null,
    instructions: "Untimed practice.",
    problems: [
      { topicSlug: "weight-of-obligations", prompt: `Explain what it means to say obligations have different "weights", and why treating all obligations as equally strong would make moral dilemmas impossible to resolve.`, correctAnswer: `To say obligations have different weights is to say some bind us more strongly than others, depending on the stakes, trust, and harm involved. If every obligation were equally strong, then whenever two conflicted there would be no principled way to choose between them — each would have an equal claim. Differing weight is exactly what lets a stronger obligation take precedence and so makes conflicts resolvable.`, explanation: `Obligations vary in strength by stakes/trust/harm; equal weight would make every conflict unresolvable.` },
      { topicSlug: "outweigh-vs-cancel", prompt: `When a stronger obligation outweighs a weaker one, the weaker one does not simply disappear. Explain the difference between an obligation being outweighed and being canceled, and what "moral residue" means here.`, correctAnswer: `An obligation is canceled when it ceases to apply, so nothing is owed. It is merely outweighed when a stronger duty takes priority but the weaker duty still holds in the background. The leftover is the moral residue: even after rightly doing the weightier thing, you still owe something — regret, apology, or amends — to the party whose claim you overrode, which would make no sense if the obligation had been canceled.`, explanation: `Outweighed = overridden but still in force (leaves residue); canceled = no longer applies at all.` },
      { topicSlug: "right-least-bad", prompt: `Explain the course's definition of the "right" course of action as the "least bad available", and why this means the right choice is sometimes still a bad thing to have to do.`, correctAnswer: `On this view the right action is the best of the options actually available — the one that is least bad given the circumstances. Rightness is therefore comparative: it ranks the available options rather than certifying the chosen one as good in itself. When every option involves some harm, the least bad option is still a bad thing to do, yet it remains the right choice because the alternatives are worse.`, explanation: `Right = least bad available option; comparative, so it can still be a bad act.` },
      { topicSlug: "right-least-bad", prompt: `Is the right act always a good act? Defend an answer using a case where doing the right thing still involves doing something bad.`, correctAnswer: `No. The right act is the least bad available option, which can itself be bad. Consider being forced to break a promise in order to save someone's life: keeping the promise would be worse, so breaking it is right, yet breaking a promise is still a bad thing. This shows rightness is about choosing the best available option, not about the act being good without qualification.`, explanation: `Right need not be good; the least bad option (e.g. breaking a promise to save a life) is still bad.` },
    ],
  },
  {
    kind: "homework",
    title: "Homework 2.2 — 'Wrong', 'ought', and law",
    weekNumber: 2,
    isTimed: false,
    timeLimitMinutes: null,
    instructions: "Untimed practice.",
    problems: [
      { topicSlug: "wrong-least-good", prompt: `Explain the definition of a "wrong" course of action as the "least good available", and how this allows an act that is genuinely good to nonetheless be wrong.`, correctAnswer: `A wrong action is the least good of the options available — the one that realizes the least value among the choices. Because it is defined comparatively, an act can be good in itself yet still be wrong if a better option was available. Saving two people when you could have saved ten is good, but it is the least good available option, and so it is wrong.`, explanation: `Wrong = least good available; comparative, so a genuinely good act can still be wrong.` },
      { topicSlug: "wrong-least-good", prompt: `In a rescue case you save 2 people when you could have saved 10. Explain why this act is both good and wrong, and what that reveals about how "wrong" is defined.`, correctAnswer: `Saving two lives is genuinely good — real value is produced. But ten could have been saved, so relative to the available options this is the least good choice, which makes it wrong. The case reveals that "wrong" is comparative: it does not mean the act produced no good, but that a better alternative was forgone, so even a good act can count as wrong.`, explanation: `Saving 2 of 10 is good yet the least good option, so it is wrong — showing "wrong" is comparative.` },
      { topicSlug: "ought-implies-can", prompt: `State and explain the principle "ought implies can", and explain why it means we cannot be obligated to do something genuinely impossible for us.`, correctAnswer: `The principle "ought implies can" says that if you are obligated to do something, then it must be within your power to do it. Obligation presupposes ability, because it would be senseless to require of someone what they could not possibly perform. So a genuine impossibility cannot be something you ought to do — there is no obligation to achieve what you cannot achieve.`, explanation: `"Ought implies can": obligation presupposes ability, so the impossible cannot be obligatory.` },
      { topicSlug: "legality-morality", prompt: `Before the Civil War it was illegal to free another person's slaves. Use this case to explain why legality and morality are distinct, and why something can be illegal yet moral (or legal yet immoral).`, correctAnswer: `Legality is a matter of what the law in force permits or forbids; morality is a matter of what is actually right or wrong. The two can diverge because laws are human institutions that can themselves be unjust. Freeing enslaved people was illegal yet clearly moral, while owning them was legal yet deeply immoral — showing that the legal status of an act does not settle its moral status.`, explanation: `Legality (what the law says) and morality (what is right) can diverge because laws can be unjust.` },
    ],
  },
  {
    kind: "midterm",
    title: "Midterm — Units 1 & 2",
    weekNumber: 2,
    isTimed: true,
    timeLimitMinutes: 60,
    instructions: "Cumulative midterm covering Units 1–2. 60 minutes. Pasting disabled; keystrokes screened.",
    problems: [
      { topicSlug: "what-is-ethics", prompt: `Explain what ethics attempts to do as a discipline, and contrast analyzing a normative concept with merely reporting how people use a word.`, correctAnswer: `Ethics attempts to clarify the structure of normative concepts — the conditions that must be met for something to count as good, right, or obligatory. This is a conceptual analysis of what the evaluation requires, aimed at getting the standard right. Merely reporting how people use a word records a linguistic or sociological fact, which can be confused or mistaken; ethics asks what the concept genuinely demands, not how it happens to be used.`, explanation: `Ethics analyzes what a normative concept requires; word-usage reports are merely descriptive and can be mistaken.` },
      { topicSlug: "instrumental-intrinsic", prompt: `Can one and the same thing be both instrumentally and intrinsically good? Defend your answer with an example and explain why the two kinds of goodness don't reduce to each other.`, correctAnswer: `Yes. Intelligence is good in itself and also useful for achieving many ends, so it is both intrinsically and instrumentally good. The kinds do not reduce to each other because being good in itself is a different property from being useful for something else: something can be useful but worthless in itself (a tool for harm) or good in itself but useless. Their independence is why a single thing can possess both.`, explanation: `Yes — e.g. intelligence; "good in itself" and "useful as a means" are independent properties.` },
      { topicSlug: "non-privative", prompt: `Explain why a mere rock is not "bad", even though it lacks goodness, and what this shows about whether badness is privative.`, correctAnswer: `A rock simply lacks goodness; it has no ill will, cruelty, or any positive defect of value. To be bad, something must possess an additional negative feature, not merely fail to possess goodness. Since the rock has the absence without the positive defect and still isn't bad, badness cannot be the mere absence of goodness — it is positive (non-privative).`, explanation: `A rock lacks goodness yet isn't bad, so badness is a positive feature, not the mere absence of goodness.` },
      { topicSlug: "weight-of-obligations", prompt: `Explain why obligations differ in weight, and rank these by typical strength with reasons: a promise to meet a friend for lunch, a paid teacher's duty to teach, a head of state's duty to constituents.`, correctAnswer: `Obligations differ in weight according to the stakes, the trust placed in the agent, and the harm that failure would cause. A casual promise to meet for lunch is weakest, since breaking it harms one person mildly. A paid teacher's duty to teach is stronger, involving a professional commitment affecting many students. A head of state's duty to constituents is strongest, because the welfare of a whole population and a deep public trust are at stake.`, explanation: `Weight rises with stakes/trust/harm: lunch promise < teacher's duty < head of state's duty.` },
      { topicSlug: "outweigh-vs-cancel", prompt: `After stealing from a friend to save your children's lives, do you still owe your friend anything? Explain using the distinction between an obligation being outweighed and being canceled.`, correctAnswer: `Yes, you still owe the friend something. The duty not to take their property was outweighed by the far stronger duty to save your children, so taking it was right. But being outweighed is not the same as being canceled: the original obligation persists as a moral residue, leaving you owing repayment, explanation, or apology. If the duty had been canceled outright, no such debt would remain.`, explanation: `Yes — the outweighed duty persists as moral residue (repay/apologize); outweighing is not cancellation.` },
      { topicSlug: "right-least-bad", prompt: `Explain why "right" is not the same as "good", using the idea of the least bad available option.`, correctAnswer: `"Good" is a positive value a thing has in itself, while "right" is comparative — the least bad of the options actually available. Because the best available option can still be bad, the right act need not be a good one. So calling an act right says it beats the alternatives in the circumstances, not that it is good without qualification.`, explanation: `Good = positive value in itself; right = least bad available, which can still be a bad act.` },
      { topicSlug: "ought-implies-can", prompt: `Does "ought implies can" hold for each single obligation even when you face conflicting obligations you cannot all meet? Explain.`, correctAnswer: `Yes, it holds for each obligation taken singly: each one requires only something you are individually able to do. What becomes impossible in a conflict is satisfying all of them at once, not any one of them by itself. So the principle is preserved — no single obligation demands the impossible — even though the full set cannot be jointly fulfilled, which is exactly what creates the dilemma.`, explanation: `Each single obligation is individually doable; only their conjunction is impossible, so the principle holds.` },
      { topicSlug: "legality-morality", prompt: `Give an example showing legality and morality can come apart, and explain why the legal status of an act cannot settle its moral status.`, correctAnswer: `Pre-Civil-War slavery is a clear example: owning enslaved people was legal yet grossly immoral, while freeing them was illegal yet moral. Legal status reflects what human lawmakers have enacted, which can itself be unjust, whereas moral status reflects what is actually right. Because laws can be wrong, citing what the law says cannot by itself establish what is morally permissible or required.`, explanation: `Slavery was legal yet immoral; laws can be unjust, so legal status cannot settle moral status.` },
    ],
  },

  // Unit 3
  {
    kind: "homework",
    title: "Homework 3.1 — Judgment, act, and agent",
    weekNumber: 3,
    isTimed: false,
    timeLimitMinutes: null,
    instructions: "Untimed practice.",
    problems: [
      { topicSlug: "judging-vs-status", prompt: `A jury lacks sufficient evidence, but the defendant is in fact guilty. Explain why it could be condemnable for the jury to convict even though the defendant really did it, distinguishing the act's status from the act of judging it.`, correctAnswer: `The defendant's guilt is the status of the act, but the jury's decision is a separate act that must itself be evaluated. To be entitled to convict, the jury needs sufficient evidence to know the person is guilty; without it, convicting is reckless even if the verdict happens to be correct. So it can be condemnable to convict — to condemn the condemnable — when one lacks the information that would justify the judgment.`, explanation: `Judging is its own act needing adequate evidence; convicting without it is condemnable even if the verdict is right.` },
      { topicSlug: "judging-vs-status", prompt: `Explain the slogan "it can be condemnable to condemn the condemnable", and give a situation where judging someone is wrong even though what they did was genuinely wrong.`, correctAnswer: `The slogan means that condemning someone is itself an act that can be blameworthy, even when the target really did something wrong. Being right about the verdict is not enough; one must also have adequate grounds to make the judgment. For example, publicly denouncing a colleague as a thief based only on a rumor is condemnable even if it later turns out they did steal, because the accuser had no sufficient basis when they judged.`, explanation: `Condemning is blameworthy without adequate grounds, even if the target really was guilty.` },
      { topicSlug: "act-vs-agent", prompt: `Kathy and Mary act with identical good intentions, but Mary's children die because of faulty information she had no way to know was wrong. Explain why Mary is not more blameworthy than Kathy, and what this shows about act versus agent.`, correctAnswer: `Praise and blame attach to the agent on the basis of intention, not on how things happen to turn out. Kathy and Mary intended the same good and chose responsibly given what they knew, so they are equally blameless as agents; the difference in outcome was due to bad luck and information Mary could not have known was faulty. This shows the moral assessment of the agent can come apart from the actual result of the act.`, explanation: `Blame tracks the agent's intention, not the outcome; identical good intentions are equally blameless despite different results.` },
      { topicSlug: "act-vs-agent", prompt: `Betty intends to kill her children, but by sheer luck they thrive. Explain why Betty deserves no praise despite the good outcome, and how this case complements the Mary case.`, correctAnswer: `Betty's intention was murderous, and desert tracks intention rather than outcome, so the lucky good result earns her no praise — she remains blameworthy as an agent. This complements the Mary case: there a good intention with a bad outcome left the agent blameless, here a bad intention with a good outcome leaves the agent culpable. Together they show outcomes are morally accidental to the agent's praise or blame, which follows the intention.`, explanation: `Evil intention with a lucky good outcome still earns blame; outcomes are accidental to the agent's desert.` },
    ],
  },
  {
    kind: "homework",
    title: "Homework 3.2 — Attempts, intentions, and the self",
    weekNumber: 3,
    isTimed: false,
    timeLimitMinutes: null,
    instructions: "Untimed practice.",
    problems: [
      { topicSlug: "intention-attempts", prompt: `Explain why the law often punishes attempted crimes less severely than completed ones, in terms of what success or failure reveals about the agent's intention.`, correctAnswer: `Punishment tracks the strength and clarity of the criminal intention, and whether an attempt succeeds can be evidence about that intention. Failure sometimes indicates a weaker, more hesitant or conflicted resolve, which can mean a less culpable state of mind. So lighter punishment for attempts reflects the thought that not completing the crime may signal a less wholehearted intention, even though the attempt is still wrong.`, explanation: `Success/failure is evidence of how resolute the intention was; failure can indicate weaker, less culpable resolve.` },
      { topicSlug: "hitler-problem", prompt: `Suppose someone claims in a speech that they "meant well". Explain why such a claim does not establish that they actually had good intentions, and how we should instead judge intentions.`, correctAnswer: `A public claim of good intentions is just an assertion, and people can lie about or misrepresent their aims. Intentions are inferred from the agent's overall pattern of conduct and from what any reasonable person in their position would have known and foreseen. So we judge intentions by deeds and circumstances, not by self-serving declarations, which is why simply saying "I meant well" settles nothing.`, explanation: `Stated intentions are mere assertions; real intentions are read from conduct and what the agent must have known.` },
      { topicSlug: "immorality-toward-self", prompt: `Does acting on firm principles guarantee that an act is morally good? Explain why being principled is not enough, with reference to the possibility of bad principles.`, correctAnswer: `No. Being principled means acting consistently on rules one accepts, but the rules themselves can be morally bad. A person can be unwaveringly committed to cruel or unjust principles, and acting on them faithfully only makes the wrongdoing more systematic. So moral goodness depends on the content of the principles, not merely on the fact that one acts from principle.`, explanation: `Principles can themselves be bad; consistency to a bad principle doesn't make an act good.` },
      { topicSlug: "self-harm-autonomy", prompt: `Give a reason we generally do not punish people for purely self-destructive behavior, and explain why declining to punish it does not amount to calling it morally fine.`, correctAnswer: `We generally refrain from punishing self-destructive behavior because it tends to be its own punishment and because coercively interfering would violate the person's autonomy over their own life. But declining to punish is not the same as approval: whether an act is wrong and whether it deserves punishment are separate questions. Something can be a genuine failing while still being inappropriate for others to punish.`, explanation: `We don't punish self-harm (it's its own punishment; autonomy), but non-punishment isn't approval — wrongness and desert of punishment differ.` },
    ],
  },
  {
    kind: "test",
    title: "Unit 3 Test — Acts, Agents, and Judgment",
    weekNumber: 3,
    isTimed: true,
    timeLimitMinutes: 40,
    instructions: "Timed. 40 minutes. Pasting disabled; keystrokes screened.",
    problems: [
      { topicSlug: "judging-vs-status", prompt: `Explain why the moral status of judging an act can differ from the moral status of the act being judged, using the idea that the right to judge depends on evidence.`, correctAnswer: `An act has its own moral status, but judging it is a further act with its own standards. To be entitled to assert that someone did wrong, you need sufficient evidence to know it; you can lack that evidence even when the act really was wrong. Because the right to judge depends on having adequate grounds, a judgment can be unjustified — even condemnable — although it happens to be correct.`, explanation: `Judging is a separate act whose justification depends on evidence, so it can be wrong even when correct.` },
      { topicSlug: "act-vs-agent", prompt: `Does an agent's praise or blame depend on the outcome of the act or on the intention behind it? Defend your answer with a contrast case.`, correctAnswer: `It depends on the intention, not the outcome. Compare Betty, who intends to kill her children but they thrive by luck, with Mary, who intends good but loses hers to bad luck: Betty deserves blame and Mary does not, despite the reversed outcomes. Since the outcomes can be accidental, the agent's desert must track the intention, which is what the agent actually controls.`, explanation: `Desert tracks intention, not outcome (Betty vs Mary), because outcomes can be accidental.` },
      { topicSlug: "intention-attempts", prompt: `Explain why an agent's praiseworthiness depends on intention rather than on whether the act happened to succeed, and what role success plays as evidence.`, correctAnswer: `Praiseworthiness tracks what the agent willed, because that reflects their moral character and choice, whereas success often depends on luck beyond their control. Success is not irrelevant, though: it can serve as evidence about what the intention really was, since following through can indicate a firmer resolve. But its role is evidential — it helps reveal the intention rather than determining desert on its own.`, explanation: `Desert follows the intention; success is only evidence about what that intention was.` },
      { topicSlug: "hitler-problem", prompt: `How should we respond to the claim that a notorious wrongdoer "meant well"? Explain how intentions are properly read from conduct.`, correctAnswer: `We should reject the claim by reading intentions from the whole pattern of conduct rather than from professed aims. In the case of a notorious wrongdoer, the actions overwhelmingly display destructive intent, and any sliver of claimed good intention is grossly outweighed by the evil pursued. Since intentions are inferred from deeds and what the agent plainly knew, the "meant well" defense collapses.`, explanation: `Read intentions from the whole pattern of conduct; for a notorious wrongdoer the evil intent overwhelms any professed good.` },
      { topicSlug: "self-harm-autonomy", prompt: `Does our refusal to punish self-harm show that self-harm is morally permissible? Explain, keeping wrongdoing and desert of punishment distinct.`, correctAnswer: `No. Whether an act is wrong and whether it deserves punishment are two different questions. We may decline to punish self-harm because it is its own punishment and because punishing it would violate autonomy, yet the act can still be a genuine moral failing. So the refusal to punish reflects facts about punishment and autonomy, not a verdict that the behavior is permissible.`, explanation: `Non-punishment isn't permission; wrongdoing and desert of punishment are separate questions.` },
    ],
  },

  // Unit 4
  {
    kind: "homework",
    title: "Homework 4.1 — Is/ought, Moore, and entailment",
    weekNumber: 4,
    isTimed: false,
    timeLimitMinutes: null,
    instructions: "Untimed practice.",
    problems: [
      { topicSlug: "ought-from-is", prompt: `Suppose "good act" simply means "act that maximizes happiness". Explain why, on that assumption, an "ought" could be derived from an "is", and what this shows about the supposed unbridgeable gap.`, correctAnswer: `If "good act" just means "act that maximizes happiness", then the factual claim that a certain act maximizes happiness entails that it is a good act, and hence that it ought to be done. The "ought" follows from facts about happiness via the definition. This shows the is–ought gap is not unbridgeable in principle: given a definition linking the normative term to factual conditions, normative conclusions can follow from factual premises.`, explanation: `A definition linking "good" to factual conditions lets an ought follow from an is, so the gap isn't unbridgeable in principle.` },
      { topicSlug: "open-question", prompt: `State Moore's conclusion in the open-question argument and explain the reasoning he uses to reach it.`, correctAnswer: `Moore concludes that ethical properties like goodness are not identical with or reducible to any natural, factual property. His reasoning is that for any proposed definition — say, "good means pleasant" — it always seems to remain an open, sensible question whether what is pleasant is really good. If the definition were correct the question would be closed and trivial, so the persistent openness is taken to show no such factual definition captures goodness.`, explanation: `Conclusion: goodness isn't reducible to any natural property; reasoning: the "is it really good?" question always stays open.` },
      { topicSlug: "open-question", prompt: `The course argues Moore's open-question argument has a false premise. Explain what that premise is and why the course rejects it.`, correctAnswer: `The premise is that the question "but is it really good?" always stays open no matter how much factual information is supplied. The course rejects this by arguing that enough damning facts can in fact close the question — once you know all the relevant facts about a clearly monstrous act, it is no longer genuinely open whether it is bad. So the claimed permanent openness is mistaken, and the argument's key premise fails.`, explanation: `The premise that the question always stays open is false: enough facts can close it.` },
      { topicSlug: "entailment-ampliative", prompt: `Explain whether deductive entailment can be "ampliative" — that is, can yield genuinely new knowledge — and use this to explain why deriving an "ought" from definitions need not be empty.`, correctAnswer: `Deduction can be ampliative: complex theorems follow by entailment from simple axioms, yet they count as genuinely new knowledge that was not obvious in advance. So entailment is not merely restating what we already knew. Applied to ethics, this means deriving normative conclusions from definitions plus facts can produce substantive new results, rather than being an empty or trivial repetition of the premises.`, explanation: `Entailment is ampliative (theorems from axioms), so deriving an ought from definitions can be substantive, not empty.` },
    ],
  },
  {
    kind: "homework",
    title: "Homework 4.2 — Genetic fallacy, use, and realism",
    weekNumber: 4,
    isTimed: false,
    timeLimitMinutes: null,
    instructions: "Untimed practice.",
    problems: [
      { topicSlug: "genetic-vs-normative", prompt: `Explain the genetic fallacy and why judging a belief by its origin rather than its truth is a mistake, using a moral belief as your example.`, correctAnswer: `The genetic fallacy is rejecting or accepting a claim because of where it came from rather than whether it is true. Origin and truth are independent: a belief with a disreputable source can still be correct, and a belief with a noble source can be false. For instance, dismissing a moral principle merely because it was first taught by a hypocrite confuses the question of its origin with the separate question of whether it is actually right.`, explanation: `Genetic fallacy = judging a claim by its origin not its truth; origin and truth are independent.` },
      { topicSlug: "truth-vs-use", prompt: `Some claims advanced as moral truths turn out to be false. Explain why this does not show that there is no moral truth at all, using a parallel with another domain.`, correctAnswer: `That some alleged moral truths are false shows only that people can be mistaken, not that the subject lacks truths. The parallel with physics makes this clear: many proposed physical laws have turned out false, yet no one concludes there are no physical laws. In the same way, error about morality presupposes a standard one can get wrong, so the existence of false moral claims is compatible with there being real moral truths.`, explanation: `False physical laws don't refute physics; likewise false moral claims don't show there's no moral truth.` },
      { topicSlug: "truth-vs-use", prompt: `Morality was put into wide social practice only relatively late in history. Explain why this late implementation does not show that moral principles were invented at that time.`, correctAnswer: `When a principle is implemented is a fact about its use, not about when it became true. Discovering or finally acting on something is different from inventing it: arithmetic facts held before anyone built calculators, and were discovered, not created, by use. Likewise, moral principles can have been true all along and merely recognized or enforced late, so late implementation is no evidence of invention.`, explanation: `Implementation is about use, not truth; discovering/enforcing late is not inventing (cf. arithmetic).` },
      { topicSlug: "reject-realism", prompt: `Does the existence of widespread moral disagreement prove that there is no objective moral truth? Defend an answer that takes the parallel with factual disagreement seriously.`, correctAnswer: `No. Disagreement by itself does not show there is no truth, since people also disagree, sometimes for centuries, about factual matters that plainly have objective answers. Disagreement can come from bias, ignorance, or differing information rather than from the absence of any fact. So moral disagreement is equally compatible with there being objective moral truths that some parties simply get wrong.`, explanation: `People disagree about objective factual matters too; disagreement doesn't prove there's no moral truth.` },
    ],
  },
  {
    kind: "final",
    title: "Final Exam — All units",
    weekNumber: 4,
    isTimed: true,
    timeLimitMinutes: 90,
    instructions: "Cumulative final covering Units 1–4. 90 minutes. Pasting disabled; keystrokes screened.",
    problems: [
      { topicSlug: "instrumental-intrinsic", prompt: `Which kind of goodness is ethics concerned with, and why does that focus exclude things that are merely useful? Explain with an example.`, correctAnswer: `Ethics is concerned with intrinsic goodness — what is good in itself — rather than instrumental goodness, what is merely useful as a means. A tool such as a sharp knife is instrumentally good but has no value in itself and can serve evil ends, so its usefulness is not what ethics evaluates. Ethics focuses on what is worth pursuing for its own sake, which is why merely useful things fall outside its central concern.`, explanation: `Ethics studies intrinsic goodness; merely useful things (e.g. a knife) have value only as means.` },
      { topicSlug: "non-privative", prompt: `Is "condemnable" simply the absence of "commendable"? Defend an answer and explain how it bears on whether one act can be both.`, correctAnswer: `No. "Condemnable" is a positive feature — the presence of something blameworthy — not the mere lack of praiseworthiness, and likewise "commendable" is not just the absence of blame. Because each is positive and not the negation of the other, a single act can possess both at once. So an act can be commendable in one respect and condemnable in another, which would be impossible if one were simply the absence of the other.`, explanation: `Both are positive (non-privative) properties, not negations of each other, so one act can be both.` },
      { topicSlug: "right-least-bad", prompt: `Explain the course's analysis of what makes an action "right", and why this can require choosing something bad.`, correctAnswer: `An action is right when it is the least bad of the options actually available — rightness is a comparative ranking, not a certificate of goodness. When every available option involves some harm, the least bad one is still bad in itself, yet it remains the right choice because the alternatives are worse. So doing the right thing can mean deliberately choosing a bad option that is nonetheless the best available.`, explanation: `Right = least bad available; comparative, so it can require choosing a bad option.` },
      { topicSlug: "wrong-least-good", prompt: `Explain the course's analysis of what makes an action "wrong", and why a wrong action can still be good.`, correctAnswer: `An action is wrong when it is the least good of the available options — again a comparative notion. Because it is defined by comparison, an act can produce real value and still be wrong if a better option was forgone. Saving two people when ten could have been saved is good yet wrong, since it is the least good available choice.`, explanation: `Wrong = least good available; comparative, so a wrong act can still produce real good.` },
      { topicSlug: "outweigh-vs-cancel", prompt: `Is an outweighed obligation simply erased? Explain, using the notion of moral residue.`, correctAnswer: `No. An outweighed obligation is overridden by a stronger one but continues to apply, unlike a canceled obligation, which ceases altogether. The persistence shows up as moral residue: after rightly doing the weightier thing, you still owe something — apology, regret, or repair — to the party whose claim you had to override. That leftover debt would be inexplicable if the obligation had simply been erased.`, explanation: `Outweighed ≠ erased; it persists as moral residue (you still owe apology/repair).` },
      { topicSlug: "act-vs-agent", prompt: `Betty intends evil but does good by luck; Mary intends good but causes harm by bad luck. Explain who deserves condemnation and why, in terms of intention versus outcome.`, correctAnswer: `Betty deserves condemnation and Mary does not, because desert tracks intention rather than outcome. Betty willed something evil, so the merely lucky good result does not redeem her; Mary willed good and chose responsibly, so the unlucky bad result does not make her culpable. Since outcomes can be accidental, the agent's blame follows the intention, which is what the agent actually controls.`, explanation: `Betty is condemnable: blame tracks intention, not the lucky/unlucky outcome.` },
      { topicSlug: "judging-vs-status", prompt: `Can it be condemnable to condemn an act that really is condemnable? Explain the conditions under which judging itself becomes blameworthy.`, correctAnswer: `Yes. Even when the act judged is genuinely condemnable, the act of condemning it can be blameworthy if the judge lacks sufficient grounds to know it is wrong. The right to assert a condemnation depends on having adequate evidence, not merely on being correct. So condemning recklessly or on rumor is condemnable even if the verdict happens to be true.`, explanation: `Yes — judging without adequate grounds is blameworthy even when the verdict is correct.` },
      { topicSlug: "open-question", prompt: `Explain why the course concludes that Moore's open-question argument fails, addressing both its premise and its assumptions about entailment.`, correctAnswer: `The course holds the argument fails on two fronts. Its premise — that the question of whether something is really good always stays open regardless of the facts — is false, because sufficient factual information can close the question. And it wrongly assumes that a correct definition would make derivations trivial, ignoring that entailment is ampliative and can yield substantive new conclusions. With a false premise and a mistaken view of entailment, the argument does not go through.`, explanation: `Both the open-question premise (false: facts can close it) and the assumption that entailment is non-ampliative are mistaken.` },
      { topicSlug: "genetic-vs-normative", prompt: `Does discovering that a belief has a disreputable origin show the belief is false? Explain using the distinction between genetic and normative questions.`, correctAnswer: `No. The origin of a belief is a genetic question, while its truth is a separate normative question, and the two are independent. A belief that arose from bias, self-interest, or a discreditable source can still be true, just as a belief from a noble source can be false. So exposing a bad origin may explain why someone holds a view but does nothing to show the view is mistaken.`, explanation: `Origin (genetic) and truth (normative) are independent, so a bad origin doesn't make a belief false.` },
      { topicSlug: "disagreement-fact-value", prompt: `Explain the test the course offers for whether a statement is genuinely truth-apt rather than a mere matter of taste, and apply it to one moral dispute.`, correctAnswer: `The test is whether reasons and evidence can rationally bear on the statement — whether disagreement can be advanced or settled by argument. Mere matters of taste, like preferring chocolate to vanilla, are not rationally debatable in this way, whereas truth-apt claims are. A moral dispute such as whether a given law is unjust is truth-apt by this test, because parties can marshal reasons, evidence, and principles that rationally support one side over the other.`, explanation: `Test: can reasons/evidence rationally bear on it? Moral disputes pass (e.g. whether a law is unjust); pure taste doesn't.` },
    ],
  },
];

export async function seedIfEmpty(): Promise<void> {
  const existing = await db.execute(sql`select count(*)::int as n from topics`);
  const row = (existing.rows[0] ?? {}) as { n?: number };
  if ((row.n ?? 0) > 0) {
    logger.info("Seed: already populated, skipping");
    return;
  }
  await seedCourse();
}

/**
 * Wipe all course content AND all student progress, then re-seed from the
 * definitions above. This is destructive and intended for development reseeds
 * when the seed content (e.g. assignment questions) has changed. There are no
 * real users, so dropping progress is acceptable.
 */
export async function reseedCourse(): Promise<void> {
  logger.info("Reseed: wiping existing content and progress");
  // Delete in dependency order: progress first, then course content.
  await db.delete(practiceAttemptsTable);
  await db.delete(practiceProblemsTable);
  await db.delete(practiceSessionsTable);
  await db.delete(answersTable);
  await db.delete(attemptsTable);
  await db.delete(problemsTable);
  await db.delete(assignmentsTable);
  await db.delete(lecturesTable);
  await db.delete(topicsTable);
  await seedCourse();
}

async function seedCourse(): Promise<void> {
  logger.info("Seed: populating course content");

  // Topics + lectures
  const slugToTopicId = new Map<string, number>();
  for (let i = 0; i < TOPICS.length; i++) {
    const t = TOPICS[i]!;
    const [inserted] = await db
      .insert(topicsTable)
      .values({
        slug: t.slug,
        title: t.title,
        weekNumber: t.weekNumber,
        blurb: t.blurb,
        position: i,
      })
      .returning();
    if (!inserted) throw new Error(`Failed to insert topic ${t.slug}`);
    slugToTopicId.set(t.slug, inserted.id);
    await db.insert(lecturesTable).values({
      topicId: inserted.id,
      weekNumber: t.weekNumber,
      title: t.lectureTitle,
      body: t.body,
    });
  }

  // Assignments + problems
  for (let i = 0; i < ASSIGNMENTS.length; i++) {
    const a = ASSIGNMENTS[i]!;
    const [inserted] = await db
      .insert(assignmentsTable)
      .values({
        kind: a.kind,
        title: a.title,
        weekNumber: a.weekNumber,
        position: i,
        isTimed: a.isTimed,
        timeLimitMinutes: a.timeLimitMinutes,
        instructions: a.instructions,
      })
      .returning();
    if (!inserted) throw new Error(`Failed to insert assignment ${a.title}`);
    for (let p = 0; p < a.problems.length; p++) {
      const prob = a.problems[p]!;
      const topicId = slugToTopicId.get(prob.topicSlug);
      if (!topicId) throw new Error(`Unknown topic slug ${prob.topicSlug}`);
      await db.insert(problemsTable).values({
        assignmentId: inserted.id,
        topicId,
        position: p,
        prompt: prob.prompt,
        correctAnswer: prob.correctAnswer,
        explanation: prob.explanation,
        hint: prob.hint ?? null,
      });
    }
  }

  logger.info({ topics: TOPICS.length, assignments: ASSIGNMENTS.length }, "Seed complete");
}
