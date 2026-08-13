# Security & Dependencies

## Audit policy

CI runs two audits on every push to `main` and every pull request (see the
`audit` job in `.github/workflows/ci.yaml`):

| Check | Command | Gate |
| --- | --- | --- |
| Production dependencies | `npm audit --omit=dev --audit-level=low` | Any finding fails the build |
| All dependencies | `npm audit --audit-level=high` | High/critical findings fail the build |

The production tree ships to browsers, so it is held to zero findings.
Development dependencies (Vite, Vitest, ESLint and their transitives) only run
on trusted developer machines and CI runners, so moderate and low findings are
reported but do not block.

Run the same checks locally:

```
npm audit --omit=dev --audit-level=low
npm audit --audit-level=high
```

## Accepted advisories

None. As of the last dependency refresh, `npm audit` reports **0
vulnerabilities** across the full tree.

If an advisory ever cannot be fixed immediately, add a row here recording the
advisory ID, the affected package, why it is not exploitable in this project,
and the condition under which it will be revisited. CI's `--audit-level=high`
gate means a high/critical finding must either be fixed or explicitly waived
here alongside an `npm audit` exclusion.

## Dependency updates

Dependabot (`.github/dependabot.yml`) opens weekly pull requests for npm
packages, GitHub Actions, and the Docker base images. Minor and patch updates
are grouped into a single production PR and a single development PR; major
updates arrive individually.

## Docker build context

`.dockerignore` keeps `node_modules`, `dist`, `.git`, `.context`, local env
files, and editor artifacts out of the build context. In addition,
`docker/Dockerfile` installs dependencies in a separate `deps` stage and copies
`node_modules` into the build stage *after* `COPY . .`, so a host
`node_modules` — even one built for a different platform — cannot replace the
Linux install. The `docker` CI job seeds a deliberately broken `node_modules`
before building to keep that guarantee tested.
