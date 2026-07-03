---
name: speckit-taskstoissues
description: Convert generated task lists into GitHub issues for tracking and execution.
---

# Spec Kit: Tasks to Issues

Convert tasks.md into GitHub issues.

## Workflow

1. Load tasks.md from `specs/<feature>/tasks.md`
2. Parse all tasks with their IDs, stories, and descriptions
3. For each task, create a GitHub issue with:
   - Title: Task ID + description
   - Body: Full context, file paths, dependencies
   - Labels: feature name, user story, priority
   - Milestone: feature name
4. Link issues to parent spec/plan

## Issue Format

```markdown
## Task: [TaskID] [Description]

**Feature**: [Feature name]
**User Story**: [Story label]
**Priority**: [P1/P2/P3]
**File Path**: [path]

### Context
[Relevant spec/plan excerpts]

### Dependencies
- [List of dependent task IDs]

### Acceptance Criteria
- [ ] [Criterion 1]
- [ ] [Criterion 2]
```

## Rules

- One issue per task
- Include all context needed for independent execution
- Link dependent issues
- Use GitHub CLI (`gh`) for creation
