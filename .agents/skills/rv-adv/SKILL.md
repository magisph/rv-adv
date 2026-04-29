```markdown
# rv-adv Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches you the core development patterns and conventions used in the `rv-adv` TypeScript codebase. You'll learn how to structure files, write imports/exports, follow commit conventions, and implement and test features in a consistent, maintainable way. No framework is required—just TypeScript and the project's own standards.

## Coding Conventions

### File Naming
- Use **camelCase** for file names.
  - Example: `userProfile.ts`, `dataFetcher.ts`

### Imports
- Use **relative imports** for internal modules.
  - Example:
    ```typescript
    import { fetchData } from './dataFetcher';
    ```

### Exports
- Use **named exports** rather than default.
  - Example:
    ```typescript
    // dataFetcher.ts
    export function fetchData() { /* ... */ }
    ```

### Commit Messages
- Use **conventional commit** format.
- Prefix with `fix` for bug fixes.
- Keep commit messages concise (average ~66 characters).
  - Example:
    ```
    fix: correct data mapping in userProfile
    ```

## Workflows

### Bug Fix Workflow
**Trigger:** When you need to fix a bug in the codebase  
**Command:** `/bug-fix`

1. Identify the bug and create a new branch.
2. Make code changes following coding conventions.
3. Write or update corresponding test files (`*.test.*`).
4. Commit using the `fix:` prefix and a concise message.
5. Push your branch and open a pull request.

### Add Feature Workflow
**Trigger:** When implementing a new feature  
**Command:** `/add-feature`

1. Create a new branch for your feature.
2. Add new files using camelCase naming.
3. Use relative imports and named exports.
4. Write or update tests for your feature.
5. Commit changes with a clear, conventional message.
6. Push and open a pull request.

## Testing Patterns

- Test files use the pattern `*.test.*` (e.g., `userProfile.test.ts`).
- The specific testing framework is not specified; follow the existing test file structure.
- Place tests alongside or near the code they test.

**Example:**
```typescript
// userProfile.test.ts
import { getUserProfile } from './userProfile';

describe('getUserProfile', () => {
  it('returns correct user data', () => {
    // test implementation
  });
});
```

## Commands
| Command      | Purpose                                   |
|--------------|-------------------------------------------|
| /bug-fix     | Start the bug fix workflow                |
| /add-feature | Start the feature addition workflow        |
```
