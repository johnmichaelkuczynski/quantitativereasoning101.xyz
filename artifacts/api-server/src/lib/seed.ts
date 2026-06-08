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
    instructions: "Untimed practice. Each problem gives you a situation — work it through in your own words. Don't recite definitions; show how the idea applies to the case.",
    problems: [
      { topicSlug: "what-is-ethics", prompt: `At a town meeting, a speaker argues: "A recent survey shows 80% of residents approve of cutting the homeless shelter's funding. So cutting it is the right thing to do." A listener objects that the speaker has confused two different kinds of claim. What mistake has the speaker made, and how would someone actually doing ethics approach the question differently?`, correctAnswer: `The speaker slides from a descriptive fact (most residents approve) to a normative conclusion (it is right), as if approval by itself settled what ought to be done. But how many people approve is just a fact about opinion; whether the cut is right is a separate value-judgment that approval cannot establish. Someone doing ethics would set aside the poll and ask what standard a just policy must meet — weighing the harm to the homeless against the benefits — rather than counting how many people happen to favor it.`, explanation: `The poll is descriptive; "it's right" is normative. Ethics asks what standard the act meets, not how many people approve.` },
      { topicSlug: "normative-categories", prompt: `A scout's report on a recruit reads: "He is 6 feet 2 inches tall, runs the 40 in 4.5 seconds, and is a noble, valiant teammate who plays generously." A coach wants to verify every claim. Which parts could she check with a tape measure, stopwatch, or video, and which couldn't be settled that way no matter how much footage she watched — and why is that?`, correctAnswer: `Height and sprint time are descriptive: a tape measure and stopwatch settle them, because they record measurable quantities with no evaluation built in. "Noble," "valiant," and "generous" are normative categories — applying them ranks the player on a scale of worth, which is a value-judgment, not a measurement. No amount of footage settles whether he is noble the way a stopwatch settles his speed, because watching tells you what he did, while calling it noble adds an appraisal of its worth.`, explanation: `Height/time are measurable (descriptive); "noble/valiant" rank worth (normative) and can't be settled by measurement.` },
      { topicSlug: "instrumental-intrinsic", prompt: `A con artist, caught after draining an elderly couple's retirement account, defends himself: "You have to admit it was a good scheme — clean, clever, and it doubled my money." In what sense, if any, was the scheme "good," and is that the kind of goodness ethics is concerned with? Use the scheme to make your case.`, correctAnswer: `The scheme was at most instrumentally good: it was effective as a means to the con artist's own end of getting rich, so it was "good" only in the sense of being useful to him. It was in no way intrinsically good — good in itself — since defrauding a vulnerable couple has no value of its own and produces real harm. Ethics studies intrinsic goodness, what is worth pursuing for its own sake, so the mere usefulness the con artist points to falls entirely outside ethical goodness.`, explanation: `The scam was instrumentally good (useful to him), never intrinsically good. Ethics evaluates intrinsic goodness, not usefulness.` },
      { topicSlug: "goodness-commendableness", prompt: `Two things happen on the same day. A woman wins a lottery she entered on a whim and is overjoyed; that evening, an off-duty paramedic spends three exhausting hours reviving a stranger. We are glad about the winner's joy but we don't praise her for it, while we do praise the paramedic. What explains the difference, and what does the lottery winner's case show about when something good earns praise?`, correctAnswer: `The lottery winner's joy is intrinsically good — happiness is good in itself — but she did nothing praiseworthy to bring it about; it came by luck. Commendableness requires more than the presence of something good: it needs an agent who, through choice and intention, is responsible for it in a way that merits praise, which is exactly what the paramedic supplies. So her case shows intrinsic goodness and commendableness come apart: a state can be good without anyone deserving praise for it.`, explanation: `Her joy is intrinsically good but unearned; praise needs a responsible, intending agent (the paramedic), so goodness and commendableness diverge.` },
    ],
  },
  {
    kind: "homework",
    title: "Homework 1.2 — Commendableness, badness, and mixed acts",
    weekNumber: 1,
    isTimed: false,
    timeLimitMinutes: null,
    instructions: "Untimed practice. Apply the concepts to each case rather than restating them.",
    problems: [
      { topicSlug: "two-kinds-badness", prompt: `At a funeral, a man weeps uncontrollably over his mother's death. A bystander whispers, "All that suffering is a bad thing — so in a way he's doing something bad by grieving like that." Diagnose what the bystander has gotten wrong, and what the case shows about the link between something being bad and someone being blameworthy.`, correctAnswer: `The grief is intrinsically bad in the sense that suffering is bad in itself, but the bystander wrongly slides from "this state is bad" to "he is doing something bad." Blameworthiness requires that a person culpably bring about something bad through their will, and the mourner has done nothing of the kind — his pain is a natural response to loss. The case shows that the intrinsic badness of a state and the blameworthiness of a person are separate: some genuine evils involve no one who deserves condemnation.`, explanation: `Grief is intrinsically bad but no one is blameworthy for it — badness of a state ≠ fault in an agent.` },
      { topicSlug: "morally-complex", prompt: `A surgeon performs a difficult operation flawlessly and saves the patient's life. While the patient is unconscious, however, she mocks his body and medical history to entertain the operating-room staff. A colleague insists, "Either she did a good thing or a bad thing today — pick one." Why is that demand misguided, and how should the act actually be described?`, correctAnswer: `The demand is misguided because a single episode can carry genuinely good and genuinely blameworthy features at once. Saving the patient's life through skilled surgery realizes something intrinsically good, while mocking a defenseless, unconscious person is a separate ground for condemnation. The accurate description is that the act is morally complex: it is commendable in one respect and condemnable in another, so forcing it into a single label distorts it.`, explanation: `One episode can be commendable (the save) and condemnable (the mockery) at once — describe each respect, don't pick one label.` },
      { topicSlug: "non-privative", prompt: `Consider two sealed rooms. Room A is simply empty and dark. Room B looks identical but has a hidden gas leak slowly poisoning the air. A friend says, "Bad is just the absence of good, the way darkness is just the absence of light — so an empty room and a poisoned room are equally 'bad.'" Use the two rooms to show why that view is wrong, and connect it to how one act can be both commendable and condemnable.`, correctAnswer: `Room A merely lacks anything good, yet it isn't bad — it's just empty; Room B is bad because it contains a positive harmful feature, the poison, not merely an absence. This shows badness is non-privative: it is the presence of something negative, not the mere lack of goodness, so "absence of good" cannot be what badness means. Because good and bad are both positive features, they can coexist in one act, which is why a single act can be commendable in one respect and condemnable in another.`, explanation: `The poisoned room is bad by a positive feature, not an absence — badness is non-privative, so good and bad can coexist in one act.` },
      { topicSlug: "goodness-commendableness", prompt: `Two cases land on your desk. (1) A sleeping newborn is perfectly content and calm. (2) A volunteer nurse works around the clock during a chaotic disaster but, because supplies never arrive and conditions are hopeless, manages to save almost no one. Which case is intrinsically good without being commendable, and which is commendable despite producing little good — and why does each fall where it does?`, correctAnswer: `The newborn's contentment is intrinsically good — a calm, happy state is good in itself — but it is not commendable, because the infant has no praiseworthy agency; nothing was chosen or intended. The nurse is commendable despite producing little good, because praise tracks the agent's intention and effort, and she chose to give everything under impossible conditions. Together the cases show goodness and commendableness diverge in both directions: good can occur with no one to praise, and praise can be earned even when little good results.`, explanation: `Newborn's calm: good but not commendable (no agency). Nurse: commendable despite little good (praise tracks intention/effort).` },
    ],
  },
  {
    kind: "test",
    title: "Unit 1 Test — Foundations of Value",
    weekNumber: 1,
    isTimed: true,
    timeLimitMinutes: 30,
    instructions: "Timed. 30 minutes. Pasting is disabled; keystrokes are screened for AI use. Each question is a situation — apply the concepts, don't define them.",
    problems: [
      { topicSlug: "what-is-ethics", prompt: `A pollster announces: "73% of the country now says lying is wrong, up from 60% a decade ago — so lying has become more wrong over the past ten years." Explain what the pollster has confused, and how an ethicist's project differs from what the pollster is doing.`, correctAnswer: `The pollster confuses a descriptive fact — how many people disapprove of lying — with a normative one, whether and how much lying is actually wrong. A change in opinion is a change in attitudes, not a change in the moral status of lying, which is why "more wrong than before" doesn't follow from "more disapproval than before." An ethicist isn't surveying attitudes at all; the project is to clarify what standard makes lying wrong in the first place, an analysis of the concept rather than a tally of who approves.`, explanation: `Shifting approval is descriptive; whether lying is wrong is normative. Ethics analyzes the standard, not the head-count.` },
      { topicSlug: "instrumental-intrinsic", prompt: `A student argues: "Health is only good because it lets you work and earn — so really, all 'goodness' is just usefulness for something else." Use a counterexample of your own (something good that leads nowhere further) to show the student is wrong, and explain whether one thing can be good in both senses at once.`, correctAnswer: `The student is wrong because some things are good in themselves even when they lead to nothing further: a relaxed afternoon laughing with friends is worth having for its own sake, not as a means to some later payoff. That is intrinsic goodness, which the "all goodness is usefulness" claim cannot account for. And the two senses can both apply to one thing — intelligence, for example, is good in itself and also useful for achieving other ends — but because "good in itself" and "useful as a means" are different questions, they don't collapse into one.`, explanation: `An afternoon with friends is good in itself (intrinsic), not just useful. One thing can be both, but the senses stay distinct.` },
      { topicSlug: "two-kinds-badness", prompt: `After a massive earthquake, thousands of survivors are in agony in the rubble. A commentator on TV says, "There is so much evil here today — somebody has to be held to blame for all this suffering." Identify what is intrinsically bad in this scene, and explain what is missing that would be required before condemnation made sense.`, correctAnswer: `The survivors' suffering is intrinsically bad — pain is bad in itself — so the scene genuinely contains evil in that sense. But condemnation requires a blameworthy agent who culpably brought the bad about through their will, and a natural earthquake supplies no such agent. What is missing is exactly that responsible wrongdoer, so the commentator's demand for someone to blame mistakes the badness of a state for the fault of a person.`, explanation: `The suffering is intrinsically bad, but with no culpable agent there is no one to condemn — a natural disaster isn't blameworthy.` },
      { topicSlug: "non-privative", prompt: `A celebrated photojournalist captures a genuinely iconic, important photograph of a famine — but to get the shot she steps over a collapsing child who needed her help and keeps shooting. A critic says the photo's importance and the cruelty "must cancel out to something neutral." Using the idea that commendable and condemnable are positive properties, explain why they don't cancel and how one act can be both at once.`, correctAnswer: `Commendable and condemnable are both positive features — each is the presence of something (real value in the photo, real callousness in ignoring the child), not the mere absence of the other. Because neither is defined as the lack of the other, they don't net out to neutral; both are genuinely present in the one act. So the photograph can be commendable as an important piece of work and condemnable as a cruel abandonment of a child at the same time, rather than averaging into nothing.`, explanation: `Both are positive properties, not negations of each other, so they coexist rather than cancel — the act is commendable and condemnable at once.` },
      { topicSlug: "morally-complex", prompt: `An employee leaks documents that expose serious corporate fraud, protecting thousands of customers — but to do it she also publishes a coworker's private medical records that were mixed into the files. A manager wants to file her under either "hero" or "wrongdoer." Explain why a single label is inadequate here and what a more accurate moral description of her act looks like.`, correctAnswer: `A single label is inadequate because the act contains distinct features that pull in opposite directions: exposing the fraud realizes a real good, while broadcasting an innocent coworker's medical records is a genuine wrong. Calling her simply a hero erases the violation, and calling her simply a wrongdoer erases the protection she provided. The accurate description treats the act as morally complex — commendable in the respect that it stopped the fraud and condemnable in the respect that it needlessly exposed private records — assigning praise and blame to the different aspects rather than to the whole.`, explanation: `Exposing fraud (good) and leaking private records (bad) are separate features; describe the act respect-by-respect, not with one label.` },
    ],
  },

  // Unit 2
  {
    kind: "homework",
    title: "Homework 2.1 — Weight, outweighing, and 'right'",
    weekNumber: 2,
    isTimed: false,
    timeLimitMinutes: null,
    instructions: "Untimed practice. Reason through each situation.",
    problems: [
      { topicSlug: "weight-of-obligations", prompt: `You promised your neighbor you'd water her plant at 5:00. At 4:55, on the way there, you come upon a car crash with a driver bleeding and trapped; helping him means you'll miss the plant entirely, and you can't do both. Explain how the idea that obligations have different weights tells you what to do here, and why you'd be stuck if all obligations counted equally.`, correctAnswer: `Obligations carry different weights depending on the stakes, trust, and harm involved, and the duty to help a bleeding, trapped driver is far weightier than a casual promise to water a plant. Because the weights differ, the stronger obligation takes precedence and tells you to help the driver and let the plant go. If every obligation counted equally, the two claims would tie and there would be no principled way to choose — you'd be paralyzed — so it is precisely the difference in weight that makes the conflict resolvable.`, explanation: `Saving the driver outweighs the plant promise; differing weights resolve the clash, equal weights would leave you stuck.` },
      { topicSlug: "outweigh-vs-cancel", prompt: `You skip the plant-watering to pull the injured driver from the wreck, and as a result your neighbor's prize plant dies. When she gets home, distraught, do you owe her anything at all — an apology, an explanation, to replace it? Use the difference between an obligation being outweighed and being canceled to defend your answer.`, correctAnswer: `Yes, you still owe her something. Your duty to water the plant was outweighed by the far stronger duty to save the driver, so missing it was the right call — but being outweighed is not the same as being canceled. A canceled obligation would leave nothing owed, whereas an outweighed one persists as moral residue: you still owe your neighbor an apology, an explanation, and plausibly a replacement. That lingering debt is exactly what shows the duty was overridden, not erased.`, explanation: `The duty was outweighed, not canceled, so it leaves residue — you still owe apology/explanation/replacement.` },
      { topicSlug: "right-least-bad", prompt: `A ship is taking on water in a storm. The captain can dump a family's entire livelihood of cargo overboard, or keep it and risk the whole crew drowning. Every option harms someone. Explain why dumping the cargo can be the "right" thing to do even though it is still a bad thing to do.`, correctAnswer: `Here "right" doesn't mean good without qualification; it means the least bad of the options actually available. Risking the crew's lives is worse than destroying property, so dumping the cargo is the least bad choice and therefore the right one. But because rightness is comparative, the right option can still be bad in itself — ruining a family's livelihood is a genuine harm — so the captain does the right thing while still doing something bad.`, explanation: `Right = least bad available; dumping cargo beats drowning the crew, yet it's still a bad thing to have to do.` },
      { topicSlug: "right-least-bad", prompt: `A doctor in an understaffed ER has one dose of a critical drug and two patients. To save the patient who will die within minutes, she must leave a second, stable-for-now patient untreated and suffering. Is the right action here also a good action? Defend your answer using the idea of the least bad available option.`, correctAnswer: `The right action is to give the dose to the patient who will otherwise die within minutes, since letting that person die is worse than leaving the stable patient temporarily untreated. But this right action is not simply good: it still involves a real harm — knowingly leaving someone to suffer. Because "right" means the least bad option available, not an option that is good in itself, doing the right thing here still requires choosing something that is in part bad.`, explanation: `Treating the dying patient is right (least bad), but it isn't good — it still leaves the other to suffer.` },
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
      { topicSlug: "wrong-least-good", prompt: `A bystander at a house fire runs in and carries out two children. He had the time, strength, and a clear path to grab a third child who was right there, but chose to stop at two and walked away. Was rescuing the two children a good thing? Was his action also wrong? Use the idea of the "least good available" option to explain how both can be true.`, correctAnswer: `Rescuing the two children was genuinely good — real lives were saved and real value produced. But because a better option was available — saving all three — stopping at two was the least good of the options he could have taken, and on this analysis that makes it wrong. So the act is good and wrong at once: "wrong" here does not mean he produced no good, but that he forwent a clearly better available option.`, explanation: `Saving two is good, but leaving a reachable third makes it the least good option — hence wrong. "Wrong" is comparative.` },
      { topicSlug: "wrong-least-good", prompt: `A billionaire donates 5 million dollars to erect a gold statue of herself in a park. The same money was available and could have funded a children's cancer ward instead. The donation does produce some public good — a nice park feature. Explain why the donation can still count as wrong, and what this reveals about how "wrong" is defined.`, correctAnswer: `The statue donation produces some real good, so it is not worthless; but a vastly better use of the very same money — a cancer ward — was available and forgone. Because the donation is the least good of the options actually open to her, it counts as wrong on this comparative analysis. This reveals that "wrong" does not mean "produced no good"; it means a clearly better available alternative was passed over, so even a beneficial act can be wrong.`, explanation: `The statue does some good but a far better use was available; choosing the least good option is wrong — "wrong" is comparative.` },
      { topicSlug: "ought-implies-can", prompt: `A flash flood with no warning destroys a town overnight. Afterward, residents furiously blame the local emergency manager for "failing to prevent it," though no human being could have predicted or stopped a flood of that kind. Using the principle "ought implies can," assess whether this blame makes sense.`, correctAnswer: `"Ought implies can" says you can only be obligated to do what is within your power, so an obligation to prevent the genuinely unpreventable cannot exist. If no human could have predicted or stopped this flood, then the emergency manager had no power to prevent it and so was never under a duty to do so. The residents' blame therefore misfires: there is no failed obligation here, because there was no ability, and without ability there was no "ought" to violate.`, explanation: `He couldn't have prevented it, so by "ought implies can" he was never obligated to — the blame misfires.` },
      { topicSlug: "legality-morality", prompt: `In a country with a law requiring citizens to report undocumented refugees to the authorities, a nurse instead hides a terrified refugee family in her home, breaking that law. Use this case to explain why legality and morality are distinct, and why an act can be illegal yet moral.`, correctAnswer: `Legality is a matter of what the enacted law permits or forbids, while morality is a matter of what is actually right or wrong, and the two can diverge because laws are human institutions that can themselves be unjust. The reporting law is in force, so hiding the family is illegal; but protecting innocent people from grave harm is morally right, so the act is illegal yet moral. This shows the legal status of an act cannot settle its moral status, since an unjust law can forbid what morality requires.`, explanation: `Hiding the family is illegal yet moral; laws can be unjust, so legal status doesn't fix moral status.` },
    ],
  },
  {
    kind: "midterm",
    title: "Midterm — Units 1 & 2",
    weekNumber: 2,
    isTimed: true,
    timeLimitMinutes: 60,
    instructions: "Cumulative midterm covering Units 1–2. 60 minutes. Pasting disabled; keystrokes screened. Every question is a scenario — apply the concepts.",
    problems: [
      { topicSlug: "what-is-ethics", prompt: `A student opens his ethics paper by quoting a dictionary — "'good' means 'approved by society'" — and treats that as having settled what is good. Explain why analyzing a normative concept is different from reporting how a word is used, and what goes wrong in the student's move.`, correctAnswer: `Reporting that a dictionary equates "good" with "socially approved" records a fact about usage, which can itself be confused or mistaken; it does not establish what genuinely makes something good. Ethics analyzes the normative concept — the conditions a thing must actually meet to count as good — rather than cataloguing how people happen to talk. The student's move goes wrong by treating a usage report as a moral conclusion, so that whatever society approves would automatically be good, which conflates description with evaluation.`, explanation: `A dictionary reports usage; ethics analyzes what "good" requires. Equating them makes social approval automatically good.` },
      { topicSlug: "instrumental-intrinsic", prompt: `A classmate insists, "A friendship is only worth having if it advances your career or gets you something." Offer a case that pushes back, and use it to explain the two kinds of goodness and why they don't reduce to one another.`, correctAnswer: `Consider a deep friendship with someone who can do nothing for your career: the companionship, trust, and shared life are worth having for their own sake, which is intrinsic goodness the classmate's view ignores. A friendship can also be instrumentally good — useful for connections — but that usefulness is a separate property from its value in itself. The two don't reduce to each other because something can be useful yet worthless in itself, or valuable in itself yet useless, so "good in itself" and "useful as a means" are genuinely different.`, explanation: `A career-useless but treasured friendship is intrinsically good; usefulness is separate, so the two kinds don't reduce.` },
      { topicSlug: "non-privative", prompt: `A gallery hangs two blank walls side by side: one simply never held a painting, the other held a masterpiece that a vandal slashed to ribbons (now removed). A visitor says, "Both walls just lack a painting, so they're equally bad." Use the two walls to argue that badness is positive rather than merely the absence of good.`, correctAnswer: `The wall that never held a painting merely lacks something good, yet nothing bad has happened there — it is simply empty. The other wall is associated with a genuine evil: the positive act of destruction, the slashing of a masterpiece, not a mere absence. Since only the second involves something bad, badness cannot be the mere lack of goodness; it requires a positive negative feature, which is what makes it non-privative.`, explanation: `An empty wall isn't bad; a vandalized one is, via a positive act of destruction — badness is non-privative.` },
      { topicSlug: "weight-of-obligations", prompt: `On the same Tuesday you owe three things: returning a library book due that day, covering a coworker's shift you agreed to, and appearing as a truthful witness in a criminal trial. You cannot satisfy all three. Rank them by weight, giving the reason each ranks where it does.`, correctAnswer: `The witness duty is weightiest: a criminal trial puts a person's liberty and the justice system's integrity at stake, and your truthful testimony may be irreplaceable. Covering the coworker's shift ranks next, since you made a specific promise and another person and perhaps customers are relied upon. Returning the library book is lightest, because the harm of a late return is small and easily repaired with a fine. Weight rises with the stakes, the trust placed in you, and the harm that failure would cause, which is what produces this ordering.`, explanation: `Witness (liberty/justice) > shift (a promise others rely on) > library book (trivial, repairable). Weight tracks stakes/trust/harm.` },
      { topicSlug: "outweigh-vs-cancel", prompt: `Lost in a blizzard with your freezing child, you break into a stranger's locked cabin, burn his firewood, and eat his food to survive the night. Once you're safe and the owner is found, do you owe him anything, or did the emergency wipe the slate clean? Use the distinction between an obligation being outweighed and being canceled.`, correctAnswer: `Your duty not to take the stranger's property was outweighed by the far stronger duty to keep your child alive, so breaking in was the right thing to do. But outweighing is not cancellation: the original obligation persists as moral residue, so once safe you still owe the owner repayment for the food and firewood, an explanation, and an apology. If the emergency had canceled the duty outright, no such debt would remain — and the fact that it plainly does shows the duty was overridden, not erased.`, explanation: `The property duty was outweighed, not canceled; you still owe repayment and apology — that residue proves it persisted.` },
      { topicSlug: "right-least-bad", prompt: `A wildfire is closing in and a mayor must order one of two evacuation routes. Route A strands a small mountain hamlet; Route B strands a cluster of farms. Either way some residents will be cut off. Explain why the route the mayor rightly chooses is still not thereby a "good" outcome.`, correctAnswer: `Whichever route the mayor picks, the right one is simply the least bad available — the option that strands fewer people or causes less severe harm given the circumstances. Because rightness here is comparative, choosing it does not make the outcome good: real residents are still cut off and endangered, which is a genuine evil. So the mayor can act rightly while the result remains bad, since "right" certifies only that this option beats the alternatives, not that it is good in itself.`, explanation: `The chosen route is right as the least bad option, but people are still stranded — right ≠ good.` },
      { topicSlug: "ought-implies-can", prompt: `A single father is told he "ought" to attend his daughter's 7 p.m. recital and also "ought" to work a mandatory 7 p.m. shift across town the same evening — two duties he cannot both fulfill. Does "ought implies can" still hold for each duty taken on its own? Explain what is and isn't impossible here.`, correctAnswer: `Taken singly, each duty is something he is able to do: he could attend the recital, and he could work the shift, so "ought implies can" holds for each obligation on its own. What is impossible is only the conjunction — doing both at the same time in different places — not either one individually. So the principle is preserved, since no single obligation demands the impossible; the conflict arises because the full set cannot be jointly satisfied, which is exactly what makes it a dilemma.`, explanation: `Each duty is individually doable, so "ought implies can" holds; only doing both at once is impossible.` },
      { topicSlug: "legality-morality", prompt: `A government passes a law making it a crime to publish true information about a chemical spill, and a journalist publishes the truth anyway. Use this case to show that legality and morality can come apart, and why pointing to "but it's illegal" cannot settle whether she did wrong.`, correctAnswer: `Publishing the truth is illegal because an enacted law forbids it, but warning the public about a dangerous spill is morally right, so the act is illegal yet moral. Legality reflects what lawmakers have decreed, and lawmakers can decree unjust things; morality reflects what is actually right, which an unjust law cannot override. Because the law itself can be wrong, saying "but it's illegal" reports only the law's content and cannot by itself establish that the journalist acted wrongly.`, explanation: `Her publishing is illegal but moral; an unjust law's "it's illegal" can't settle whether the act is wrong.` },
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
      { topicSlug: "judging-vs-status", prompt: `A man becomes convinced, purely on a hunch with no evidence, that his new neighbor is a thief, and he denounces him to the whole street. As it happens, the neighbor really had stolen from a shop in another city. Was the man's act of denouncing him proper just because the verdict turned out true? Distinguish the status of the neighbor's act from the status of the man's judging of it.`, correctAnswer: `The neighbor's theft has its own moral status — it really was wrong — but the man's denunciation is a separate act that must be evaluated on its own. To be entitled to brand someone a thief publicly, you need adequate evidence to know it, and the man had only a hunch; convicting on a hunch is reckless even when the verdict happens to be correct. So his act of judging was improper despite landing on the truth, because the right to condemn depends on having sufficient grounds, not on being lucky.`, explanation: `The theft was real, but denouncing on a hunch is improper — judging is a separate act needing adequate evidence.` },
      { topicSlug: "judging-vs-status", prompt: `A teacher accuses a student of cheating solely because the student "looked nervous" during the exam — no other evidence. It later emerges the student actually had cheated. Use this case to explain the slogan "it can be condemnable to condemn the condemnable."`, correctAnswer: `The slogan means that the act of condemning someone can itself be blameworthy even when the person condemned really did wrong. Here the student genuinely cheated, so the target of the accusation was condemnable; but the teacher condemned on nothing more than nervousness, with no adequate grounds. Because the right to make such a judgment depends on having sufficient evidence, the teacher's accusation was condemnable despite being correct — she condemned the condemnable, but blameworthily.`, explanation: `The student did cheat, yet accusing on mere nervousness is blameworthy — condemning the condemnable without grounds is itself condemnable.` },
      { topicSlug: "act-vs-agent", prompt: `Two pharmacists fill the same prescription with identical care and competence. One bottle, however, was mislabeled at the factory in a way neither pharmacist could possibly have detected, and that patient is harmed. Are the two pharmacists differently blameworthy? Use the case to distinguish judging the act from judging the agent.`, correctAnswer: `As agents, the two pharmacists are equally blameless: they intended the same good, exercised the same care, and chose responsibly given everything they could know. The difference lies only in the outcome, which turned on an undetectable factory error — a matter of luck outside their control. Since praise and blame attach to the agent on the basis of intention and diligence rather than how things happen to turn out, the harmful result does not make one pharmacist more culpable than the other, even though one act caused harm.`, explanation: `Same intention and care, blameless equally; only the outcome differs by luck — agent's desert tracks intention, not result.` },
      { topicSlug: "act-vs-agent", prompt: `A man secretly pours what he believes is a lethal poison into his rival's drink, fully intending to kill him. Unknown to him, a waiter swaps the glasses, and on top of that he had botched the mixture so badly it would only have cured a headache. The rival is completely fine. Does the happy outcome earn the man any praise? Explain, and say how this pairs with a case of good intentions and bad luck.`, correctAnswer: `The man deserves no praise whatsoever, because desert tracks the intention, and his intention was murder; the rival's survival was pure luck, not anything to his credit. This pairs with the mirror case of someone who intends good but causes harm through bad luck and remains blameless, since there too the outcome was accidental to the agent's will. Together the cases show outcomes are morally accidental to praise and blame: a lucky good result no more redeems an evil intention than an unlucky bad result condemns a good one.`, explanation: `Murderous intent earns no praise despite the lucky good outcome; outcomes are accidental to desert, which tracks intention.` },
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
      { topicSlug: "intention-attempts", prompt: `Two people each try to burn down a building on the same night. One fire catches and destroys the building; the other is put out by a sudden downpour before any real damage. The law punishes the second arsonist less. Explain how this lighter punishment can be justified in terms of what success or failure reveals about the agent's intention.`, correctAnswer: `Punishment tracks the strength and clarity of the criminal intention, and whether an attempt succeeds can serve as evidence about that intention. A failed attempt is sometimes a sign of a weaker, more hesitant, or less competent resolve, which can indicate a less culpable state of mind than a fully executed crime. So punishing the rained-out arsonist more lightly reflects the thought that the failure may signal a less wholehearted intention — even though the attempt itself remains genuinely wrong.`, explanation: `Success/failure is evidence of how resolute the intention was; failure can signal weaker resolve, hence lighter punishment.` },
      { topicSlug: "hitler-problem", prompt: `At a glittering charity gala, a CEO who quietly gutted his workers' pensions to fund stock buybacks declares, "Everything I have ever done, I did for my employees." How should we test that claim about his intentions, rather than taking his word for it?`, correctAnswer: `His declaration is just an assertion, and people can lie about or dress up their real aims, so the speech settles nothing on its own. Intentions are properly read from the overall pattern of conduct and from what the agent plainly knew and foresaw — here, deliberately stripping pensions to fund buybacks. Judged by deeds and circumstances rather than self-serving words, his actions display an intention to enrich shareholders at workers' expense, so the "I did it for my employees" claim collapses under the evidence of what he actually did.`, explanation: `Test stated intentions against conduct and what he knew; his pension-gutting deeds refute the gala claim.` },
      { topicSlug: "immorality-toward-self", prompt: `A zealot who tortures dissenters defends himself: "Say what you like, I am a man of firm and consistent principle — I never waver." Does acting steadily on principle make his conduct morally good? Explain, with attention to the possibility of bad principles.`, correctAnswer: `No. Being principled means only that he acts consistently on rules he accepts; it says nothing about whether those rules are any good. If the principles themselves are cruel and unjust, then faithful, unwavering adherence to them simply makes the wrongdoing more systematic and reliable, not better. Moral goodness depends on the content of the principles a person acts from, so a torturer's consistency is no defense — steadfast devotion to a bad principle is still bad.`, explanation: `Consistency to a principle doesn't make it good; bad principles faithfully followed just make wrongdoing systematic.` },
      { topicSlug: "self-harm-autonomy", prompt: `A man gambles away his entire life savings, harming no one but himself, and the state declines to fine or jail him for it. A relative concludes, "Since the law leaves him alone, what he did must be perfectly fine." Explain why declining to punish self-destructive behavior does not amount to calling it morally fine.`, correctAnswer: `We generally don't punish purely self-destructive behavior because it tends to be its own punishment and because coercively interfering would violate the person's autonomy over his own life. But whether an act is a genuine failing and whether others should punish it are two different questions: ruining yourself can be a real wrong to yourself while still being something the state ought to leave alone. So the relative's inference fails — non-punishment reflects facts about autonomy and the limits of coercion, not a verdict that the gambling was fine.`, explanation: `Not punishing self-harm reflects autonomy and that it's its own punishment, not approval — wrongness and punishability differ.` },
    ],
  },
  {
    kind: "test",
    title: "Unit 3 Test — Acts, Agents, and Judgment",
    weekNumber: 3,
    isTimed: true,
    timeLimitMinutes: 40,
    instructions: "Timed. 40 minutes. Pasting disabled; keystrokes screened. Apply the concepts to each case.",
    problems: [
      { topicSlug: "judging-vs-status", prompt: `A tabloid prints, with no evidence at the time, that a famous actor is having an affair. The story turns out to be true. Evaluate the moral status of the tabloid's act of publishing, as distinct from the truth of what it published, using the idea that the right to judge depends on evidence.`, correctAnswer: `The truth of the claim is one thing; the tabloid's act of asserting it is another act with its own moral standing. To be entitled to publish such an accusation, the tabloid needed sufficient evidence to know it, and by hypothesis it had none — it published on speculation. Because the right to make and broadcast a damning judgment depends on having adequate grounds, the act of publishing was unjustified, even condemnable, despite the lucky fact that the accusation later proved correct.`, explanation: `Being right by luck doesn't justify publishing without evidence — the act of judging needs adequate grounds.` },
      { topicSlug: "act-vs-agent", prompt: `On the same day, a careful surgeon and a reckless drunk driver each happen to cause one death and save one life. Does the surgeon's and the driver's praise or blame depend on these matching outcomes, or on something else? Defend your answer using the contrast between the two.`, correctAnswer: `Their desert depends on intention and the responsibility of their choices, not on the matching outcomes. The surgeon acted with good intent and due care, so the death he could not prevent does not make him culpable; the drunk driver chose recklessly with disregard for others' lives, so the life he happened to save earns him no credit. Since outcomes can be accidental — both ended with one death and one life — the moral difference between them must lie in the intentions and choices behind the acts, which is what praise and blame actually track.`, explanation: `Identical outcomes, opposite desert: the surgeon's care vs the driver's recklessness — blame tracks intention/choice, not result.` },
      { topicSlug: "intention-attempts", prompt: `A trained sniper takes a careful shot at a target but a freak gust pushes the bullet wide; meanwhile a careless amateur fires almost without aiming and happens to hit the same target. Whose action is more praiseworthy as marksmanship-with-intent, and what role does the actual success play here?`, correctAnswer: `Praiseworthiness for the intended feat tracks what the agent willed and skillfully attempted, so the sniper, who aimed carefully and was defeated only by an uncontrollable gust, has the stronger claim, while the amateur's hit was luck rather than achievement. Success is not irrelevant, but its role is evidential: hitting a target can be evidence of skill and resolve, yet when we know the hit was accidental and the miss was a fluke of wind, that evidence is overridden. So desert follows the intention and competence behind the act, with success serving only as a clue to what they were.`, explanation: `The careful sniper's intent outranks the lucky amateur's hit; success is only evidence of intention, not the basis of desert.` },
      { topicSlug: "hitler-problem", prompt: `A convicted war criminal publishes a memoir insisting that every atrocity he ordered was done "out of love for his country." A reader is unsure how to respond. Explain how his real intentions should be assessed, rather than accepting his stated motive.`, correctAnswer: `His stated motive is just an assertion in a self-justifying memoir, so it cannot be taken at face value; intentions are read from the whole pattern of conduct and from what the agent plainly knew. The documented atrocities overwhelmingly display destructive intent, and any professed patriotic motive is grossly outweighed by the evil deliberately pursued. Judging by deeds and circumstances rather than by the memoir's words, the "love of country" defense collapses, because the actions themselves reveal the intention.`, explanation: `Read his intentions from the atrocities, not the memoir; the deeds reveal destructive intent that swamps the professed motive.` },
      { topicSlug: "self-harm-autonomy", prompt: `A famous climber repeatedly free-solos deadly cliffs, risking only his own life, and society neither bans nor punishes it. A commentator concludes, "Therefore there's nothing even arguably wrong with what he does." Assess that conclusion while keeping wrongdoing and desert of punishment distinct.`, correctAnswer: `The conclusion doesn't follow, because whether an act is wrong and whether it should be punished are separate questions. Society may rightly leave the climber alone — because the risk is his own and forcing him to stop would violate his autonomy — without thereby endorsing the recklessness as beyond criticism. So one can hold that there may be something arguably wrong or unwise in courting needless death while still insisting it is not the sort of thing others should punish; non-interference reflects autonomy, not a verdict of permissibility.`, explanation: `Leaving him alone respects autonomy; it doesn't certify the act as fine — wrongdoing and punishability are distinct.` },
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
      { topicSlug: "ought-from-is", prompt: `A city council stipulates, for its own purposes, that "a good public-health policy" simply means "a policy that lowers infant mortality." A new study then shows, as a matter of fact, that Policy X lowers infant mortality. Walk through how a conclusion about what the city ought to do can follow from this factual study, and what the case shows about the supposed unbridgeable gap between "is" and "ought."`, correctAnswer: `Given the council's definition, the factual finding that Policy X lowers infant mortality entails that Policy X is a good public-health policy, and hence that it ought to be adopted. The "ought" follows from the "is" by way of the definition that links the normative term "good policy" to the factual condition "lowers infant mortality." This shows the is–ought gap is not unbridgeable in principle: once a definition ties a normative concept to factual conditions, factual premises can yield normative conclusions.`, explanation: `The definition links "good policy" to a fact, so the study's "is" entails an "ought" — the is/ought gap isn't unbridgeable in principle.` },
      { topicSlug: "open-question", prompt: `A student proposes that "'good' just means 'whatever produces the most pleasure.'" A classmate responds, "But is a torturer's pleasure in his victim really good?" — and that still feels like a genuine, open question rather than a silly one. Reconstruct Moore's reasoning from cases like this to his conclusion about goodness.`, correctAnswer: `Moore's reasoning runs: if "good" really meant "produces the most pleasure," then asking "but is a pleasure-maximizing thing really good?" would be as trivial and closed as asking "is a bachelor really unmarried?" Yet the torturer's-pleasure question stays open and substantive, which it could not do if the definition were correct. Generalizing across every proposed natural definition, Moore concludes that goodness is not identical with or reducible to any natural, factual property — the open question always reappears.`, explanation: `Because "is the pleasant really good?" stays open, no natural definition fits — Moore concludes goodness is irreducible to any natural property.` },
      { topicSlug: "open-question", prompt: `Take the same setup, but now suppose we lay out every relevant fact about a particular case: a sadist tortures a child purely for his own enjoyment, with full knowledge and intent. Does the question "but is it really bad?" still stay genuinely open once all those facts are in? Use this to identify and reject the false premise in Moore's argument.`, correctAnswer: `Once all the damning facts about the sadist's act are on the table, the question "but is it really bad?" no longer stays genuinely open — anyone who grasps the facts can see that it is bad. The false premise in Moore's argument is precisely the claim that the evaluative question always remains open no matter how much factual information is supplied. The sadist case shows that enough relevant facts can close the question, so the supposed permanent openness fails and with it the argument's key premise.`, explanation: `With all the facts in, "is it really bad?" closes — refuting Moore's premise that the question always stays open.` },
      { topicSlug: "entailment-ampliative", prompt: `A chess engine, starting only from the rules of chess, calculates a forced checkmate in seven moves that no grandmaster had seen — yet it follows by pure logical entailment from those rules. A skeptic says deriving an "ought" from definitions must be "empty word-shuffling that tells you nothing new." Use the chess case to show why that skepticism is mistaken.`, correctAnswer: `The chess case shows that entailment can be ampliative: the forced mate follows logically from the bare rules, yet it is genuinely new knowledge nobody had grasped in advance. So deriving a conclusion by entailment is not mere word-shuffling that adds nothing. By the same token, deriving an "ought" from definitions plus facts can yield substantive, surprising results rather than empty repetition, which is exactly why the skeptic's "tells you nothing new" objection fails.`, explanation: `The unforeseen forced mate follows by entailment yet is new knowledge — so deriving an ought from definitions can be substantive, not empty.` },
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
      { topicSlug: "genetic-vs-normative", prompt: `In a debate, one side dismisses the principle "don't steal" by saying, "That rule only exists because ancient priests invented it to keep the poor in line — so we can ignore it." Identify the fallacy in this move and explain, using this very example, why it fails.`, correctAnswer: `This commits the genetic fallacy: it rejects the principle "don't steal" on the basis of where the belief allegedly came from rather than whether it is true. The origin of a belief and its truth are independent — a rule first promoted for self-serving reasons can still be correct, and a rule from noble origins can be false. So even if priests did invent the prohibition to control the poor, that story about its origin does nothing to show that stealing is actually permissible; the normative question remains untouched by the genetic one.`, explanation: `Rejecting "don't steal" because of its alleged origin is the genetic fallacy — origin and truth are independent.` },
      { topicSlug: "truth-vs-use", prompt: `A skeptic argues, "Respected ethicists across history have defended slavery, the subjugation of women, and worse. Since so many 'moral truths' turned out false, there must be no moral truth at all." Use a parallel with another field of inquiry to show why this argument doesn't work.`, correctAnswer: `That past moral claims turned out false shows only that people can be badly mistaken, not that there is nothing to be right or wrong about. The parallel with physics makes this clear: scientists have endorsed many false theories — phlogiston, a geocentric cosmos — yet no one concludes there are no physical truths, only that earlier inquirers erred. In the same way, error about morality presupposes a standard one can get wrong, so a history of false moral claims is fully compatible with there being real moral truths that those thinkers failed to reach.`, explanation: `False past physics didn't abolish physical truth; likewise false past moral claims don't show there's no moral truth.` },
      { topicSlug: "truth-vs-use", prompt: `A historian observes that universal human rights were only formally codified and enforced in the twentieth century, and concludes, "So human rights were invented in the 1900s — they weren't discovered, they were made up then." Explain why this late implementation does not show the principles were invented at that time.`, correctAnswer: `When a principle is finally codified and enforced is a fact about its use and recognition, not about when it became true. Discovering or implementing something is different from inventing it: arithmetic facts held long before anyone wrote them down or built calculators, and were discovered rather than created by use. Likewise, human-rights principles could have been true and binding all along and merely acknowledged and enforced late, so their twentieth-century codification is evidence about social recognition, not about invention.`, explanation: `Codification is about use/recognition, not truth; late enforcement is discovery, not invention (cf. arithmetic).` },
      { topicSlug: "reject-realism", prompt: `A well-traveled student says, "I've seen societies that disagree about almost every moral question — so there's clearly no objective right or wrong, just custom." Assess this conclusion, taking seriously the parallel with disagreement about straightforwardly factual matters.`, correctAnswer: `Disagreement by itself doesn't establish that there's no fact of the matter, since people also disagree — sometimes for centuries — about plainly objective factual questions like the age of the universe or the cause of a disease. Such disagreement typically springs from bias, ignorance, differing information, or cultural blind spots, not from the absence of any truth. So widespread moral disagreement is equally compatible with there being objective moral truths that some societies simply get wrong, which means the student's leap from "people disagree" to "there's no right or wrong" is unwarranted.`, explanation: `People also disagree about objective factual matters; disagreement signals error/ignorance, not the absence of moral truth.` },
    ],
  },
  {
    kind: "final",
    title: "Final Exam — All units",
    weekNumber: 4,
    isTimed: true,
    timeLimitMinutes: 90,
    instructions: "Cumulative final covering Units 1–4. 90 minutes. Pasting disabled; keystrokes screened. Every question is a scenario — apply the concepts.",
    problems: [
      { topicSlug: "instrumental-intrinsic", prompt: `A founder pitches investors: "Our app is good — it's wildly profitable and scales fast." Which sense of "good" is she using, is it the sense ethics is concerned with, and what would have to be true for the app to be good in the ethical sense? Use the pitch to make your case.`, correctAnswer: `She is using "good" in the instrumental sense: the app is useful as a means to profit and growth, which says nothing about its value in itself. That is not the sense ethics centrally evaluates, since ethics is concerned with intrinsic goodness — what is worth pursuing for its own sake. For the app to be good in the ethical sense, it would have to contribute something genuinely worthwhile, such as improving users' lives, rather than merely being an effective money-making tool, which a harmful product could equally be.`, explanation: `"Profitable" is instrumental goodness; ethics evaluates intrinsic worth — profit alone doesn't make the app ethically good.` },
      { topicSlug: "non-privative", prompt: `A critic reviews a master forger's technically dazzling fake and says, "It's not condemnable — it's just not commendable, the way a blank canvas isn't commendable." Is "condemnable" merely the absence of "commendable"? Use the forgery to defend your answer and to say whether one act can be both.`, correctAnswer: `No — "condemnable" is a positive feature, the presence of something blameworthy, not the mere lack of praiseworthiness, so the critic's equation is wrong. The forgery isn't like a blank canvas that simply lacks merit; it actively involves deception and fraud, a positive wrong, even as it also displays real skill worth admiring. Because commendable and condemnable are both positive and neither is the negation of the other, the one forgery can be commendable as craftsmanship and condemnable as fraud at the same time.`, explanation: `Condemnable is a positive feature (the fraud), not the absence of commendable; the skilled forgery is both at once.` },
      { topicSlug: "right-least-bad", prompt: `In a mass-casualty disaster, a triage nurse must turn away one patient who is too far gone to save in order to spend her scarce resources saving three others who can be saved. Analyze why turning the patient away is the "right" action and yet still requires doing something bad.`, correctAnswer: `Turning the patient away is right because, among the options actually available, it is the least bad: using scarce resources to save three who can be saved produces a far better result than expending them on one who cannot. But rightness here is comparative, so the right action is not thereby good — abandoning a dying person to focus elsewhere is a genuine harm and a terrible thing to have to do. The case shows that doing the right thing can require deliberately choosing a bad option because every alternative is worse.`, explanation: `Triage is right as the least bad option, but turning the patient away is still bad — right ≠ good.` },
      { topicSlug: "wrong-least-good", prompt: `A foundation with a fixed grant spends all of it on a modest community mural when the same money could have funded a vaccination drive that would save lives. The mural does some real good. Explain why the foundation's choice can still be wrong, and what this shows about how "wrong" works.`, correctAnswer: `The mural produces some genuine good, so the choice is not worthless; but a vastly better available option — a life-saving vaccination drive — was passed over. Because the foundation chose the least good of the options actually open to it, the choice counts as wrong on this comparative analysis. This shows "wrong" does not mean "produced no good at all"; it means a clearly better alternative was forgone, so even a beneficial act can be wrong when something far better was available.`, explanation: `The mural does some good, but forgoing the life-saving option makes it the least good choice — wrong is comparative.` },
      { topicSlug: "outweigh-vs-cancel", prompt: `A firefighter smashes the window of a stranger's parked car to reach a fire hydrant blocked behind it while a house burns. Afterward, is his duty to the car's owner simply erased because the emergency justified the damage? Explain using the notion of moral residue.`, correctAnswer: `His duty not to damage the stranger's car was outweighed by the far stronger duty to fight the fire and save lives, so breaking the window was right. But being outweighed is not being erased: the original obligation persists as moral residue, so the owner is still owed an explanation, an apology, and compensation for the window. If the duty had simply vanished, no such debt would remain — and the fact that the owner is plainly still owed something shows the obligation was overridden, not canceled.`, explanation: `The duty was outweighed, not erased; the owner is still owed compensation/apology — that residue proves it persisted.` },
      { topicSlug: "act-vs-agent", prompt: `Two drivers run the very same red light at the same speed. One sails through and hits no one; the other, by sheer chance, strikes a pedestrian who darts out and is killed. Their intentions and choices were identical. Who, if either, deserves more condemnation as an agent, and why?`, correctAnswer: `As agents they deserve the same condemnation, because their intentions and choices were identical — both recklessly ran the light — and the only difference was the luck of whether someone happened to be in the way. Desert tracks what the agent willed and chose, not the accidental outcome, so the driver who killed someone is not a worse person than the one who got lucky. The tragic result rightly matters for legal liability and for the harm done, but it does not make the unlucky driver more blameworthy as an agent than the equally reckless one.`, explanation: `Identical reckless choices, identical agent-desert; the fatal outcome was luck — blame tracks intention/choice, not result.` },
      { topicSlug: "judging-vs-status", prompt: `A mob correctly identifies a man who really did commit a brutal crime, then drags him from his home and lynches him with no trial. Can it be condemnable to condemn someone who is genuinely condemnable? Explain the conditions under which the act of judging itself becomes blameworthy.`, correctAnswer: `Yes — even though the man was genuinely guilty, the mob's act of judging and punishing him is itself blameworthy. The right to condemn and punish depends on having proper authority and adequate, tested grounds, which a trial provides and a mob bypasses entirely. By condemning without due process, the mob acts recklessly and usurps a judgment it had no standing to make, so the act of condemning is condemnable even though its verdict about his guilt happened to be correct.`, explanation: `Yes — lynching a truly guilty man is still condemnable; judging requires authority and due grounds, not just a correct verdict.` },
      { topicSlug: "open-question", prompt: `A reformer claims "'good' just means 'maximizes overall wellbeing,'" and a critic shoots back with the open-question move: "but is maximizing wellbeing really good?" Explain why the course concludes that Moore's open-question argument nonetheless fails, addressing both its premise and its treatment of entailment.`, correctAnswer: `The course holds the argument fails on two fronts. Its premise — that the evaluative question always stays open no matter how many facts are supplied — is false, since piling on enough relevant facts about a clear case can close the question of whether something is good or bad. And it wrongly assumes that a correct definition would make every derivation trivial, ignoring that entailment is ampliative and can yield substantive, non-obvious conclusions. With a false premise and a mistaken view of entailment, the open-question move does not refute the reformer's proposal.`, explanation: `Both the "always open" premise (false: facts can close it) and the non-ampliative view of entailment are mistaken, so Moore's argument fails.` },
      { topicSlug: "genetic-vs-normative", prompt: `Someone argues, "She only believes in honesty because her strict father drilled it into her as a child — so her belief that honesty matters is just conditioning, not really true." Does exposing this origin show the belief is false? Explain using the distinction between genetic and normative questions.`, correctAnswer: `No. How she came to hold the belief is a genetic question, while whether honesty actually matters is a separate normative question, and the two are independent. A belief instilled by strict upbringing — or by bias, self-interest, or any discreditable source — can still be true, just as a belief from an impeccable source can be false. So exposing the childhood origin may explain why she holds the view but does nothing to show that honesty doesn't matter; the normative question stands untouched.`, explanation: `Origin (genetic) and truth (normative) are independent; her upbringing explains the belief but can't show it's false.` },
      { topicSlug: "disagreement-fact-value", prompt: `Two disputes are on the table. In the first, one person says "pineapple on pizza is disgusting" and another says it's delicious. In the second, one person says "executing the innocent is unjust" and another denies it. Apply the course's test for whether a statement is genuinely truth-apt, and use it to say how the two disputes differ.`, correctAnswer: `The course's test is whether reasons and evidence can rationally bear on the statement — whether the disagreement can be advanced or settled by argument rather than just registering a preference. The pizza dispute fails the test: liking pineapple is a matter of taste, and no reasons could show one side mistaken, so it is not truth-apt. The execution dispute passes: parties can marshal reasons, principles, and evidence about justice and innocence that rationally support one side, so "executing the innocent is unjust" is truth-apt in a way the pizza claim is not.`, explanation: `Test: can reasons rationally settle it? Pizza is mere taste (not truth-apt); the injustice claim is truth-apt.` },
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
