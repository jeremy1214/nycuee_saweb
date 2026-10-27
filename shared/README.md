# Shared activity content

`activity-content.ts` contains browser- and Node-compatible types, parsing, and reference validation. It has no Vite, React, NestJS, Prisma, or filesystem dependency. Frontend JSON loading stays in `activityRepository.ts`; backend revision validation uses the same parser.

Legacy JSON includes `id`, `status`, and optional `$schema`. CMS revision payloads contain only editable content; identity, workflow status, and optimistic version belong to the resource/API envelope. Dates remain `YYYY-MM-DD` strings and `endDate` is inclusive. `ActivityContentError.path` identifies the invalid field; its message remains compatible with existing content checks.

Both Docker builds must include this directory. The backend compiler emits `dist/backend/src` and `dist/shared`; start it with `npm start`.
