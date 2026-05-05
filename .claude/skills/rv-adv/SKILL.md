```markdown
# rv-adv Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches you the core development patterns and conventions used in the `rv-adv` TypeScript codebase. You'll learn about file naming, import/export styles, commit message conventions, and how to write and run tests. This guide will help you contribute code that matches the project's standards and maintain consistency across the repository.

## Coding Conventions

### File Naming
- Use **camelCase** for file names.
  - Example: `userProfile.ts`, `dataFetcher.ts`

### Import Style
- Both default and named imports are used, but **mixed imports** are common.
  - Example:
    ```typescript
    import React, { useState } from 'react';
    import { fetchData } from './apiUtils';
    ```

### Export Style
- **Named exports** are preferred.
  - Example:
    ```typescript
    // Good
    export function calculateSum(a: number, b: number): number {
      return a + b;
    }

    // Avoid default exports
    // export default function calculateSum(...) { ... }
    ```

### Commit Message Conventions
- Use **Conventional Commits** with these prefixes: `chore`, `fix`, `feat`.
- Keep commit messages concise (average 42 characters).
  - Example:
    ```
    feat: add user authentication middleware
    fix: resolve crash on data fetch error
    chore: update dependencies
    ```

## Workflows

### Commit Code
**Trigger:** When you are ready to commit changes.
**Command:** `/commit`

1. Stage your changes: `git add .`
2. Write a commit message using the conventional format:
   - `feat: ...` for new features
   - `fix: ...` for bug fixes
   - `chore: ...` for maintenance tasks
3. Commit: `git commit -m "feat: add new API endpoint"`

### Run Tests
**Trigger:** Before pushing changes or to verify code correctness.
**Command:** `/test`

1. Locate test files matching the `*.test.*` pattern.
2. Run the test runner (framework is unknown; commonly `npm test` or `yarn test`).
3. Review test output and address any failures.

## Testing Patterns

- Test files use the `*.test.*` naming convention.
  - Example: `userProfile.test.ts`
- The specific test framework is not detected, but tests are likely written in a standard TypeScript-compatible testing library.
- Place tests alongside the code they test or in a dedicated `tests` directory.

**Example test file:**
```typescript
// userProfile.test.ts
import { getUserProfile } from './userProfile';

describe('getUserProfile', () => {
  it('returns correct user data', () => {
    const result = getUserProfile(1);
    expect(result.name).toBe('Alice');
  });
});
```

## Commands
| Command   | Purpose                                   |
|-----------|-------------------------------------------|
| /commit   | Commit code using conventional messages   |
| /test     | Run all tests in the repository           |
```
