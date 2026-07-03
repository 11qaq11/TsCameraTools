---
name: speckit-constitution
description: Create or update project constitution with governing principles and development guidelines.
---

# Spec Kit: Constitution

Create or update the project constitution at `.specify/memory/constitution.md`.

## Workflow

1. Load existing constitution or create from template
2. Collect/derive values for placeholders from user input or repo context
3. Fill template with concrete values (no bracketed tokens left)
4. Validate: no unexplained brackets, ISO dates, declarative principles
5. Write completed constitution back to `.specify/memory/constitution.md`
6. Output summary with version bump rationale

## Principles Format

Each principle section must have:
- Succinct name
- Paragraph or bullet list capturing non-negotiable rules
- Explicit rationale if not obvious

## Version Rules

- MAJOR: Backward incompatible governance/principle removals
- MINOR: New principle/section added or materially expanded
- PATCH: Clarifications, wording, typo fixes

## Output

- Updated `.specify/memory/constitution.md`
- Sync impact report as HTML comment at top of file
- Suggested commit message
