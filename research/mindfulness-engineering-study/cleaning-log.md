# Cleaning Log

## Initial setup

Created research workspace.

Initial rules:

1. Preserve the raw workbook unchanged.
2. Do not commit raw student data.
3. Treat A-numbers as private.
4. Treat grade-upload metadata as private.
5. Recompute mindfulness scores from item responses.
6. Correct the nonjudging formula.
7. Resolve duplicate A-numbers before final modeling.
8. Investigate whether `63` is a missing-value placeholder.

## Open decisions

### Missing value code

Potential missing values:

- blank
- 63

Decision pending: confirm whether `63` always means missing/no response.

### Duplicate A-numbers

Decision pending: determine whether duplicated IDs represent duplicate submissions, separate course records, accidental duplicates, or legitimate repeated measures.

### Grade scale

Decision pending: confirm whether grade/performance values are percentages, points, letter-grade conversions, normalized performance values, or student-uploaded evidence.

### Public reporting thresholds

Decision pending: choose minimum cell size for public demographic reporting.
