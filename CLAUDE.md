@AGENTS.md

# Development Workflow

- When creating or modifying any feature, always create a new branch from main before starting work.
- The dev server runs inside Docker. Start it with `docker compose up -d --build --force-recreate` if not already running. Do NOT use `npm run dev` directly on the host.
- After making code changes, restart the Docker container to verify: `docker compose up -d --build --force-recreate`.
- Before committing, run `source ~/.nvm/nvm.sh && npm run test:unit` and ensure all unit tests pass.
- Before committing, run the following to execute Playwright tests. The dev server must be stopped first because Playwright recreates the Docker container itself, and a running container will cause a conflict:
  ```
  docker compose down && source ~/.nvm/nvm.sh && npx playwright test && docker compose up -d --build --force-recreate
  ```
- After code changes are verified, commit and push to the remote repository.
