---
name: speckit-specify
description: Create or update feature specification from natural language description. Focus on WHAT and WHY, not HOW.
---

# Spec Kit: Specify

Create feature specification from a natural language description.

## Workflow

1. Generate concise short name (2-4 words) for the feature
2. Create spec directory: `specs/<prefix>-<short-name>/`
3. Copy spec template to `specs/<prefix>-<short-name>/spec.md`
4. Load constitution from `.specify/memory/constitution.md` if exists
5. Parse user description, extract: actors, actions, data, constraints
6. Fill spec template with concrete details
7. Validate against quality checklist
8. Handle [NEEDS CLARIFICATION] markers (max 3)

## Rules

- Focus on WHAT users need and WHY
- Avoid HOW to implement (no tech stack, APIs, code structure)
- Written for business stakeholders, not developers
- Maximum 3 [NEEDS CLARIFICATION] markers
- Make informed guesses for unspecified details, document assumptions

## Success Criteria

Must be:
- Measurable (specific metrics)
- Technology-agnostic (no frameworks/languages)
- User-focused (outcomes from user perspective)
- Verifiable (can test without implementation details)

## Output

- `specs/<prefix>-<short-name>/spec.md`
- `specs/<prefix>-<short-name>/checklists/requirements.md`
- `.specify/feature.json` with feature directory path
