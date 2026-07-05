# Data Cleaning Checklist

## Before cleaning

- [ ] Save original workbook in `data/raw/`.
- [ ] Confirm raw workbook is not committed.
- [ ] Confirm A-numbers are treated as private.
- [ ] Confirm grade-upload metadata is private.
- [ ] Confirm missing-value codes.

## Survey items

- [ ] Identify 39 FFMQ item columns.
- [ ] Coerce item responses to numeric.
- [ ] Check allowed range 1-5.
- [ ] Reverse-score correct items.
- [ ] Recompute facet scores.
- [ ] Recompute total score.

## Grade outcomes

- [ ] Coerce grades to numeric.
- [ ] Confirm grade scale.
- [ ] Flag impossible grade values.
- [ ] Report outcome availability.

## Duplicates

- [ ] Identify duplicated A-numbers.
- [ ] Export private duplicate report.
- [ ] Decide duplicate handling rule.
- [ ] Apply rule.
- [ ] Document decision.

## De-identification

- [ ] Create anonymized `student_key`.
- [ ] Remove A-number from clean public-safe dataset.
- [ ] Remove screenshot metadata.
- [ ] Avoid small-cell public demographic outputs.
