---
name: speckit-implement
description: Execute implementation plan by processing all tasks defined in tasks.md.
---

# Spec Kit: Implement

Execute the implementation plan by processing tasks in order.

## Workflow

1. Check checklists status (if checklists/ exists)
2. Load implementation context: tasks.md, plan.md, design docs
3. Project setup verification (git, ignore files, dependencies)
4. Execute tasks in order, respecting dependencies and [P] markers
5. Follow TDD approach if tests requested
6. Provide progress updates and handle errors

## Execution Rules

- Execute tasks in the exact order from tasks.md
- Respect dependency markers
- Mark tasks complete `- [x]` after finishing
- For [P] tasks, can execute in parallel
- Validate each user story phase independently
- Run tests after each phase if applicable

## Checklist Gate

Before implementation:
- Scan checklists/ directory
- Display status table
- If incomplete: STOP and ask user to proceed or not
- If complete: automatically proceed

## Output

- Implemented code following the plan
- Updated tasks.md with completed checkboxes
- Progress report per phase
