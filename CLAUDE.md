# Claude History Viewer - Project Instructions

## Goal
Avoid repeated compile/type errors before reporting work complete.

## Required checks before finishing code changes
- If you changed any frontend TypeScript/TSX, run `npm run build` before saying the task is done.
- If you changed any backend TypeScript under `server/`, also run `npx tsc --noEmit --project tsconfig.server.json`.
- Do not stop at the first failed check. Fix the type errors you introduced, then rerun the relevant checks.

## High-frequency TypeScript pitfalls in this repo

### 1) `MessageContent`-style unions
- Prefer discriminated unions over one big interface with many optional fields.
- When accessing properties like `text`, `tool_name`, `toolUseResult`, `input`, or `thinking`, narrow by `type` first.
- For reusable narrowing, add small type guards instead of relying on inline callback inference.

### 2) Callback narrowing is fragile
- Do not assume `Array.filter(...)`, `Array.some(...)`, or `Array.map(...)` will preserve narrowing across later callbacks.
- If a later callback needs a narrowed subtype, use an explicit type guard function such as `isToolResultBlock(...)` or `isTextContent(...)`.

### 3) Client/server type alignment
- If you change message payloads or tool result shapes in `server/types.ts`, mirror the same contract in `src/lib/api.ts`.
- Keep answer/result types aligned across parser, API types, and React rendering code.

### 4) AskUserQuestion-specific changes
- Treat AskUserQuestion answers as possibly structured or fallback text.
- Support both single-select and multi-select answer values.
- Keep rendering resilient when `tool_name` is missing but structured `toolUseResult` exists.

## Working style for this repo
- Prefer the smallest fix that satisfies type safety.
- When a compile error comes from narrowing, fix the type model or add a type guard instead of casting loosely.
- Do not report success while known TypeScript errors remain.
