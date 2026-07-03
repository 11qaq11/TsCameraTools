---
name: speckit-analyze
description: Cross-artifact consistency and coverage analysis across spec, plan, and tasks.
---

# Spec Kit: Analyze

Run cross-artifact consistency and coverage analysis.

## When to Use

After `/speckit.tasks` and before `/speckit.implement` to verify alignment.

## Workflow

1. Load all artifacts: spec.md, plan.md, tasks.md, data-model.md, contracts/
2. Check consistency:
   - Every requirement in spec has corresponding plan items
   - Every plan item has corresponding tasks
   - Every entity in data-model has tasks for creation
   - Every contract has implementation tasks
3. Check coverage:
   - No orphan requirements (spec without plan/tasks)
   - No orphan tasks (tasks without spec requirement)
   - No orphan entities (data-model without usage)
4. Report findings

## Output

- Consistency report with specific issues
- Coverage matrix: requirement → plan → tasks
- Recommendations for missing items
