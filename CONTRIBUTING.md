# Contributing

Thanks for helping improve n2n-memory.

## Development Setup

```bash
npm install
npm run check
```

`npm run check` runs linting, tests, TypeScript build, production dependency audit, and an npm package dry run.

## Pull Request Guidelines

- Keep changes focused and easy to review.
- Add or update tests for behavior changes.
- Update `docs/API_REFERENCE.md` and `docs/API_REFERENCE_zh.md` when tool schemas or behavior change.
- Update `docs/DESIGN.md` and `docs/DESIGN_zh.md` before changing storage layout or compatibility guarantees.
- Avoid committing local `.mcp/context.json` files or project-specific memory unless the change is explicitly documentation-related.

## Commit Hygiene

- Do not include generated `node_modules/`.
- Run `npm run check` before opening a PR.
- Explain user-visible behavior changes in the PR description.

## Release Notes

User-visible changes should be recorded in `CHANGELOG.md` and, when relevant, `docs/CHANGELOG_zh.md`.
