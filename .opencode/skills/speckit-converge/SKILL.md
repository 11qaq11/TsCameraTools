---
name: speckit-converge
description: Assess codebase against spec/plan/tasks and append remaining work as new tasks.
---

# Spec Kit: Converge

Assess the current codebase against the specification and identify gaps.

## When to Use

After implementation, to verify all requirements are met and identify remaining work.

## Workflow

1. Load spec, plan, tasks, and current codebase
2. For each requirement in spec:
   - Check if implementation exists
   - Verify it meets acceptance criteria
3. For each task in tasks.md:
   - Verify completion status
   - Check quality of implementation
4. Identify gaps and remaining work
5. Append new tasks for remaining work

## Output

- Gap analysis report
- New tasks appended to tasks.md
- Recommendations for next steps

## Rules

- Be thorough - check every requirement
- Focus on functional completeness, not code style
- Report specific file paths and line numbers for gaps
