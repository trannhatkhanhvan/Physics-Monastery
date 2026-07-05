# Analysis Plan

## Research question

Are mindfulness traits associated with academic performance and problem-solving behavior in undergraduate engineering students?

## Primary predictors

\[
\text{Observe},\quad
\text{Describe},\quad
\text{Act with Awareness},\quad
\text{Nonjudge},\quad
\text{Nonreact}
\]

Overall mindfulness score:

\[
\text{FFMQ Total}
=
\operatorname{mean}(\text{all scored FFMQ items})
\]

## Primary outcomes

\[
\text{Statics},\quad
\text{Dynamics},\quad
\text{Mechanics of Materials},\quad
\text{Overall Grade}
\]

Primary outcome unless revised:

\[
\text{Overall Grade}
\]

## Stage 1: Data audit

1. Count total rows.
2. Count complete mindfulness rows.
3. Count complete outcome rows.
4. Count course-specific grade availability.
5. Identify duplicated A-numbers.
6. Identify invalid Likert values.
7. Identify impossible derived scores.
8. Check whether `63` behaves as missing.

## Stage 2: Score validation

For each facet:

1. compute item means,
2. compute facet means,
3. compute standard deviations,
4. compute Cronbach's alpha,
5. inspect item-total correlations,
6. inspect inter-facet correlations.

## Stage 3: Main associations

Simple model:

\[
\text{Grade}
=
\beta_0
+
\beta_1(\text{Mindfulness})
+
\varepsilon
\]

Facet model:

\[
\text{Grade}
=
\beta_0
+
\beta_1(\text{Observe})
+
\beta_2(\text{Describe})
+
\beta_3(\text{ActAware})
+
\beta_4(\text{Nonjudge})
+
\beta_5(\text{Nonreact})
+
\varepsilon
\]

## Stage 4: Exploratory structure

Investigate whether acting with awareness, nonjudgment, and nonreactivity relate more strongly to engineering performance than observing alone.

## Stage 5: Public website outputs

The public site should show aggregate, de-identified findings only.
