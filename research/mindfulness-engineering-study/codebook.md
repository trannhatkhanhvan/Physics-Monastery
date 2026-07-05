# Codebook: Mindfulness and Engineering Problem Solving Study

This codebook defines the variables used in the quantitative phase of the study.

## Variable categories

- private identifiers
- demographics
- academic context
- engineering performance outcomes
- FFMQ survey items
- derived mindfulness facet scores
- cleaning flags
- public aggregate outputs

## Core variables

| Clean variable | Category | Type | Privacy | Analysis role | Notes |
|---|---|---|---|---|---|
| student_key | ID | string | restricted | join key | anonymized key only |
| a_number_raw | ID | string | private | duplicate resolution | never publish |
| age | demographic | numeric | aggregate only | control | check missing values |
| gender | demographic | categorical | aggregate only | control/descriptive | avoid small cells |
| race_ethnicity | demographic | categorical | aggregate only | control/descriptive | avoid small cells |
| academic_level | academic context | categorical | aggregate only | control | normalize labels |
| major | academic context | categorical | aggregate only | control | normalize labels |
| gpa_category | academic context | ordinal/categorical | aggregate only | control | confirm scale |
| statics_grade | outcome | numeric | restricted | outcome | confirm grade scale |
| dynamics_grade | outcome | numeric | restricted | outcome | confirm grade scale |
| mechanics_grade | outcome | numeric | restricted | outcome | confirm grade scale |
| overall_grade | outcome | numeric | restricted | primary outcome | confirm grade scale |
| ffmq_item_01 ... ffmq_item_39 | survey item | Likert 1-5 | restricted | scoring | raw item responses |
| ffmq_observe | derived score | numeric | aggregate only | predictor | recompute from items |
| ffmq_describe | derived score | numeric | aggregate only | predictor | recompute from items |
| ffmq_act_aware | derived score | numeric | aggregate only | predictor | recompute from items |
| ffmq_nonjudge | derived score | numeric | aggregate only | predictor | recompute from items |
| ffmq_nonreact | derived score | numeric | aggregate only | predictor | recompute from items |
| ffmq_total | derived score | numeric | aggregate only | predictor | recompute from items |

## FFMQ scoring

Reverse scoring:

\[
x_R = 6 - x
\]

Facets:

\[
\text{Observe} = \{1,6,11,15,20,26,31,36\}
\]

\[
\text{Describe} = \{2,7_R,12,16_R,22_R,27,32,37\}
\]

\[
\text{Act with Awareness} = \{5_R,8_R,13_R,18_R,23_R,28_R,34_R,38_R\}
\]

\[
\text{Nonjudge} = \{3_R,10_R,14_R,17_R,25_R,30_R,35_R,39_R\}
\]

\[
\text{Nonreact} = \{4,9,19,21,24,29,33\}
\]

## Known spreadsheet issue

The nonjudging score should not double-count item 30 / column AK.

Correct structure:

\[
\text{Nonjudging}
=
\frac{
3_R+10_R+14_R+17_R+25_R+30_R+35_R+39_R
}{8}
\]
