---
name: speckit-tasks
description: Generate actionable, dependency-ordered task breakdown from implementation plan.
---

# Spec Kit: Tasks

Generate task breakdown from implementation plan and design artifacts.

## Workflow

1. Load plan.md, spec.md, and optional design docs
2. Extract user stories with priorities (P1, P2, P3...)
3. Generate tasks organized by user story
4. Create dependency graph showing story completion order
5. Mark parallelizable tasks with [P]
6. Validate task completeness

## Task Format (REQUIRED)

```
- [ ] [TaskID] [P?] [Story?] Description with file path
```

- Checkbox: ALWAYS start with `- [ ]`
- Task ID: Sequential (T001, T002, T003...)
- [P] marker: ONLY if parallelizable
- [Story] label: [US1], [US2], etc. for user story tasks
- Description: Clear action with exact file path

## Phase Structure

- Phase 1: Setup (project initialization)
- Phase 2: Foundational (blocking prerequisites)
- Phase 3+: User Stories in priority order
- Final Phase: Polish & cross-cutting concerns

## Output

- `specs/<feature>/tasks.md` with all phases, task IDs, file paths
- Summary: total count, per-story count, parallel opportunities, MVP scope
