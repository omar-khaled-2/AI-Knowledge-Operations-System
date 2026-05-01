# ESLint Strict Configuration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:verification-before-completion to verify lint passes before claiming success.

**Goal:** Configure strict ESLint rules for both backend (NestJS) and frontend (Next.js) projects, install dependencies, fix all lint issues, and verify zero errors.

**Architecture:** Use `.eslintrc.json` format for both projects. Backend uses `@typescript-eslint` with NestJS-specific rules. Frontend extends `next/core-web-vitals` with additional TypeScript and React rules. Fix issues via `--fix` auto-fix first, then manual fixes or `eslint-disable` comments for remaining issues.

**Tech Stack:** ESLint 8.x, @typescript-eslint, NestJS, Next.js 14, React 18, TypeScript 5.x

---

## File Structure

### Backend (`/home/omar/Developments/AI-Knowledge-Operations-System/backend/`)
- **Create:** `.eslintrc.json` - ESLint configuration
- **Modify:** `package.json` - Add lint scripts and devDependencies
- **Modify:** All `.ts` files in `src/` - Fix lint issues

### Frontend (`/home/omar/Developments/AI-Knowledge-Operations-System/frontend/`)
- **Create:** `.eslintrc.json` - ESLint configuration
- **Modify:** `package.json` - Add lint:fix script and devDependencies
- **Modify:** All `.ts`, `.tsx` files in `app/`, `lib/`, `components/` - Fix lint issues

---

## Task 1: Backend ESLint Configuration

**Files:**
- Create: `backend/.eslintrc.json`
- Modify: `backend/package.json`

- [ ] **Step 1.1: Create backend `.eslintrc.json`**

```json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "project": "tsconfig.json",
    "tsconfigRootDir": ".",
    "sourceType": "module"
  },
  "plugins": ["@typescript-eslint"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking"
  ],
  "env": {
    "node": true,
    "jest": true
  },
  "ignorePatterns": [".eslintrc.json", "dist/", "node_modules/"],
  "rules": {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-non-null-assertion": "warn",
    "@typescript-eslint/prefer-nullish-coalescing": "error",
    "@typescript-eslint/prefer-optional-chain": "error",
    "@typescript-eslint/strict-boolean-expressions": "warn",
    "no-console": "warn",
    "eqeqeq": "error",
    "no-return-await": "off"
  }
}
```

- [ ] **Step 1.2: Update backend `package.json`**

Add to `scripts`:
```json
"lint": "eslint \"{src,apps,libs,test}\"/**/*.ts",
"lint:fix": "eslint \"{src,apps,libs,test}\"/**/*.ts --fix"
```

Add to `devDependencies`:
```json
"@typescript-eslint/eslint-plugin": "^7.0.0",
"@typescript-eslint/parser": "^7.0.0",
"eslint": "^8.57.0"
```

- [ ] **Step 1.3: Install backend dependencies**

Run: `cd /home/omar/Developments/AI-Knowledge-Operations-System/backend && npm install --save-dev @typescript-eslint/eslint-plugin@^7.0.0 @typescript-eslint/parser@^7.0.0 eslint@^8.57.0`

---

## Task 2: Frontend ESLint Configuration

**Files:**
- Create: `frontend/.eslintrc.json`
- Modify: `frontend/package.json`

- [ ] **Step 2.1: Create frontend `.eslintrc.json`**

```json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "project": "./tsconfig.json"
  },
  "plugins": ["@typescript-eslint", "react-hooks"],
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended"
  ],
  "ignorePatterns": [".eslintrc.json", "node_modules/", ".next/", "out/"],
  "rules": {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-non-null-assertion": "warn",
    "@typescript-eslint/prefer-nullish-coalescing": "error",
    "@typescript-eslint/prefer-optional-chain": "error",
    "no-console": "warn",
    "eqeqeq": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

- [ ] **Step 2.2: Update frontend `package.json`**

Add to `scripts`:
```json
"lint:fix": "next lint --fix"
```

Add to `devDependencies`:
```json
"@typescript-eslint/eslint-plugin": "^7.0.0",
"@typescript-eslint/parser": "^7.0.0",
"eslint": "^8.57.0",
"eslint-plugin-react-hooks": "^4.6.0"
```

- [ ] **Step 2.3: Install frontend dependencies**

Run: `cd /home/omar/Developments/AI-Knowledge-Operations-System/frontend && npm install --save-dev @typescript-eslint/eslint-plugin@^7.0.0 @typescript-eslint/parser@^7.0.0 eslint@^8.57.0 eslint-plugin-react-hooks@^4.6.0`

---

## Task 3: Fix Backend Lint Issues

**Files:** All `.ts` files in `backend/src/`

- [ ] **Step 3.1: Run backend lint to identify issues**

Run: `cd /home/omar/Developments/AI-Knowledge-Operations-System/backend && npx eslint "{src,apps,libs,test}"/**/*.ts`

- [ ] **Step 3.2: Auto-fix backend issues**

Run: `cd /home/omar/Developments/AI-Knowledge-Operations-System/backend && npx eslint "{src,apps,libs,test}"/**/*.ts --fix`

- [ ] **Step 3.3: Manually fix or disable remaining backend issues**

For each remaining error/warning:
- If straightforward to fix (e.g., add return type, remove unused var), fix it
- If requires significant refactoring, add `// eslint-disable-next-line [rule] -- [justification]`
- Priority: Fix all errors, fix or justify warnings

- [ ] **Step 3.4: Verify backend lint passes**

Run: `cd /home/omar/Developments/AI-Knowledge-Operations-System/backend && npm run lint`
Expected: Zero errors

---

## Task 4: Fix Frontend Lint Issues

**Files:** All `.ts`, `.tsx` files in `frontend/app/`, `frontend/lib/`, `frontend/components/`

- [ ] **Step 4.1: Run frontend lint to identify issues**

Run: `cd /home/omar/Developments/AI-Knowledge-Operations-System/frontend && npm run lint`

- [ ] **Step 4.2: Auto-fix frontend issues**

Run: `cd /home/omar/Developments/AI-Knowledge-Operations-System/frontend && npm run lint:fix`

- [ ] **Step 4.3: Manually fix or disable remaining frontend issues**

For each remaining error/warning:
- If straightforward to fix, fix it
- If requires significant refactoring, add `// eslint-disable-next-line [rule] -- [justification]`

- [ ] **Step 4.4: Verify frontend lint passes**

Run: `cd /home/omar/Developments/AI-Knowledge-Operations-System/frontend && npm run lint`
Expected: Zero errors

---

## Task 5: Final Verification

- [ ] **Step 5.1: Run backend tests**

Run: `cd /home/omar/Developments/AI-Knowledge-Operations-System/backend && npm test`
Expected: All tests pass

- [ ] **Step 5.2: Run frontend tests**

Run: `cd /home/omar/Developments/AI-Knowledge-Operations-System/frontend && npm test`
Expected: All tests pass

- [ ] **Step 5.3: Verify builds**

Run: `cd /home/omar/Developments/AI-Knowledge-Operations-System/backend && npm run build`
Expected: Build succeeds

Run: `cd /home/omar/Developments/AI-Knowledge-Operations-System/frontend && npm run build`
Expected: Build succeeds (or Next.js lint phase passes)

---

## Summary Template

After completion, report:

### Rules Configured
**Backend:**
- [List of rules]

**Frontend:**
- [List of rules]

### Issues Fixed
- **Auto-fixed:** [count]
- **Manually fixed:** [count]
- **Disabled with justification:** [count and locations]

### Remaining Warnings
- [List with file paths and line numbers]

### Challenges
- [Any issues encountered]
