---
name: speckit-checklist
description: Generate quality checklists that validate requirements completeness, clarity, and consistency.
---

# Spec Kit: Checklist

Generate custom quality checklists for the feature.

## When to Use

After specification, to validate requirements before planning.

## Workflow

1. Load spec from `specs/<feature>/spec.md`
2. Analyze spec content for:
   - Completeness (all mandatory sections filled)
   - Clarity (no ambiguous language)
   - Testability (requirements can be verified)
   - Consistency (no contradictions)
3. Generate checklist items
4. Write to `specs/<feature>/checklists/`

## Checklist Categories

- Content Quality (no implementation details, user-focused)
- Requirement Completeness (testable, unambiguous, measurable)
- Feature Readiness (acceptance criteria, edge cases, scope)
- Cross-cutting (security, performance, accessibility)

## Output

- `specs/<feature>/checklists/requirements.md`
- `specs/<feature>/checklists/ux.md` (if UI involved)
- `specs/<feature>/checklists/security.md` (if security-relevant)
