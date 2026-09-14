# Baby profile creation TDD evidence

## Source and journey

This journey was derived from the reported “创建宝宝档案失败” screenshot:

> As a parent with an existing active baby, I can add another baby profile so that the new profile becomes active without losing the existing profile or saving partial data.

## Task report

- RED: `node --test scripts/baby-profile-creation.test.mjs` failed with `ERR_MODULE_NOT_FOUND` before the transactional creation function existed.
- GREEN: the same command passed after creation was moved into one transaction that deactivates the old active baby before inserting the new baby and its warmth preference.
- Database integration: a rollback-only PostgreSQL check created two babies for one temporary user and observed `{"total":2,"active":1}`. The transaction was rolled back.
- Repository regression: `npm test` passed all 103 tests.
- Runnable verification: after clearing both `.next` caches, `npm run verify` passed Web/Admin lint, Core/Web/Admin type checks, and both production builds.

## Test specification

| # | What is guaranteed | Test or command | Type | Result |
|---|---|---|---|---|
| 1 | An existing active baby is deactivated before a new active baby is inserted | `scripts/baby-profile-creation.test.mjs` | Unit | PASS |
| 2 | Warmth preference is written only after PostgreSQL returns the created baby | `scripts/baby-profile-creation.test.mjs` | Unit | PASS |
| 3 | Two creations leave two records and exactly one active record | Rollback-only PostgreSQL check | Integration | PASS |
| 4 | The optional size parameter keeps an explicit PostgreSQL type | `scripts/self-hosted-api-routes.test.mjs` | Contract | PASS |

## Coverage and known gaps

`node --experimental-test-coverage --test scripts/baby-profile-creation.test.mjs` reported 100% line, branch, and function coverage for `web/src/lib/babies/create-baby.ts`.

The configured local database is the legacy Supabase source schema rather than the self-hosted production database. The integration check therefore used its `auth.users` identity trigger, but exercised the same `babies` constraints, transaction code, and warmth-preference insert. No integration fixtures were retained.

## Merge evidence

- RED checkpoint: `1d678ce test: reproduce active baby profile creation failure`
- GREEN checkpoint: `9c9e7d0 fix: create additional baby profiles transactionally`
