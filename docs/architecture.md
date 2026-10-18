# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

- Presentation tier decision: Keep the React app thin and contract-driven: components should render server-backed data via the shared API client, and any form validation should mirror the backend’s 4xx behavior rather than inventing extra client-side rules.
- Logic tier decision: Build the Express API around Mongoose models, explicit validation, and small route/service functions so the `/api/*` surface matches the contract exactly and returns deliberate 400/404 responses instead of uncaught cast or not-implemented errors.
- Data tier decision: Enforce required schema fields in the Mongoose models and keep seed data representative so validation, population, and leaderboard logic all work from the same canonical dataset.
- Activity tracking approach: Accept `userId`, `teamId`, `type`, and `minutes`; validate that the IDs exist; store the resolved `user` and `team` references and computed `points` plus `occurredAt` so the leaderboard can aggregate reliably.
- Team management approach: Treat teams as named collections with a `members` array; reject missing names with `400`, while preserving member IDs and allowing list/create endpoints to return the expected shape.
- Leaderboard approach: Aggregate activity points by team, order by total descending, and assign a 1-based ranking after the totals are computed so the API returns the expected `teamName`, `totalPoints`, and `rank` values.
- Workout suggestions approach: Match the request email to a seeded user, inspect that user’s goal or recent activity pattern, and return workouts whose `focus` and `reason` align with the same behavior; return a 4xx when no matching user exists.

## Test plan

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend`
  - This verifies the Mongoose schemas and seed contract. The observed failing checks show required validation is missing (`name`, `email`, `fitnessGoal`, `team name/mascot/members`, `activity type/user/team`, and `workout focus/minutes/difficulty`).
- API command: `npm run test:api --prefix octofit-tracker/backend`
  - This verifies the Express contract for creating and listing activities, teams, leaderboard ordering, and workout suggestions. The observed failures show the backend is still returning `501` for invalid input and empty leaderboard/suggestion payloads before the model and route logic are complete.
- Frontend command: `npm test --prefix octofit-tracker/frontend`
  - This validates that the React UI consumes the API contract correctly. The earlier `--runInBand` invocation failed because Vitest does not accept that flag here; the correct command is the plain script.
- Backend build command: `npm run build --prefix octofit-tracker/backend`
  - This checks type correctness and route/model compile health after the data and API contracts are implemented.
- Frontend build command: `npm run build --prefix octofit-tracker/frontend`
  - This confirms the presentation tier still compiles once the API contract is stable and the UI is wired to it.

Recommended execution order: data contract first, then API contract, then frontend validation, then both build checks. This keeps the implementation smallest and safest because the backend data model and route behavior are the foundational contract that all other tiers depend on.
