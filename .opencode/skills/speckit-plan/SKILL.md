---
name: speckit-plan
description: Create technical implementation plan with chosen tech stack and architecture decisions.
---

# Spec Kit: Plan

Generate technical implementation plan from the feature specification.

## Workflow

1. Load spec from `specs/<feature>/spec.md`
2. Load constitution from `.specify/memory/constitution.md`
3. Fill Technical Context (mark unknowns as NEEDS CLARIFICATION)
4. Evaluate constitution gates (ERROR if violations unjustified)
5. Phase 0: Generate research.md (resolve all NEEDS CLARIFICATION)
6. Phase 1: Generate data-model.md, contracts/, quickstart.md
7. Re-evaluate constitution check post-design

## Output Artifacts

- `specs/<feature>/plan.md` - Technical implementation plan
- `specs/<feature>/research.md` - Research decisions and rationale
- `specs/<feature>/data-model.md` - Entity definitions and relationships
- `specs/<feature>/contracts/` - Interface contracts (API specs, etc.)
- `specs/<feature>/quickstart.md` - Validation scenarios

## Rules

- Use absolute paths for filesystem operations
- ERROR on gate failures or unresolved clarifications
- Each research item must have: Decision, Rationale, Alternatives considered
- Data model must map entities to user stories
- Quickstart must include runnable validation scenarios
