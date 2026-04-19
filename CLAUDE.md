@AGENTS.md

# Development Workflow

- When creating or modifying any feature, always create a new branch from main before starting work.
- The dev server must always be running. Start it with `source ~/.nvm/nvm.sh && npm run dev` if not already running.
- After making code changes, rebuild (`npm run build`) and restart the dev server to verify the changes work correctly.
- Before committing, run `source ~/.nvm/nvm.sh && npx playwright test` and ensure all UI tests pass.
- After code changes are verified, commit and push to the remote repository.
