# Shared activity content

`activity-content.ts` contains browser- and Node-compatible types, parsing, and reference validation. It has no Vite, React, NestJS, Prisma, or filesystem dependency. Frontend JSON loading stays in `activityRepository.ts`; backend revision validation uses the same parser.

Legacy JSON includes `id`, `status`, and optional `$schema`. CMS revision payloads contain only editable content; identity, workflow status, and optimistic version belong to the resource/API envelope. Dates remain `YYYY-MM-DD` strings and `endDate` is inclusive. `ActivityContentError.path` identifies the invalid field; its message remains compatible with existing content checks.

Both Docker builds must include this directory. The backend compiler emits `dist/backend/src` and `dist/shared`; start it with `npm start`.

`PublicActivityContent` and `parsePublicActivityContent` define the complete `{ activities, categories }` snapshot used by the database service and frontend Provider. Empty databases are valid; workflow/internal fields are rejected. JSON mode uses the Vite virtual module to bundle only parsed published content. API mode never falls back to that snapshot. Planned account/media DTOs are in `cms-contract.ts`; their endpoints remain disabled.
