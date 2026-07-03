---
name: speckit-clarify
description: Clarify underspecified areas in the specification before planning. Structured, coverage-based questioning.
---

# Spec Kit: Clarify

Run structured clarification workflow on the feature specification.

## When to Use

Run AFTER `/speckit.specify` and BEFORE `/speckit.plan` to reduce rework downstream.

## Workflow

1. Load spec from `specs/<feature>/spec.md`
2. Scan for [NEEDS CLARIFICATION] markers
3. Identify underspecified areas in:
   - Feature scope and boundaries
   - User types and permissions
   - Security/compliance requirements
   - Error handling and edge cases
4. Present structured questions with suggested answers
5. Update spec with user's choices
6. Re-validate until all clarifications resolved

## Question Format

```
## Question [N]: [Topic]

**Context**: [Quote relevant spec section]
**What we need to know**: [Specific question]

**Suggested Answers**:
| Option | Answer | Implications |
|--------|--------|--------------|
| A      | [answer] | [implication] |
| B      | [answer] | [implication] |
| Custom | Provide your own | [how to provide] |
```

## Rules

- Maximum 3 questions per round
- Prioritize: scope > security/privacy > UX > technical details
- Present all questions together before waiting for responses
- Wait for user to respond with choices for all questions
