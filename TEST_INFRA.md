# E2E Test Infra: Notion Mail Mock Feature

## Test Philosophy
- Opaque-box, requirement-driven. No dependency on implementation design.
- Methodology: Category-Partition + BVA + Pairwise + Workload Testing.

## Feature Inventory
| # | Feature | Source (requirement) | Tier 1 | Tier 2 | Tier 3 |
|---|---------|---------------------|:------:|:------:|:------:|
| 1 | Gmail UI & Navigation | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 2 | Keyboard Shortcuts (j/k/c) | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 3 | Notion Editor & Markdown | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 4 | Slash Command Popup (/) | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 5 | Notion Task Conversion | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 6 | AI Email Draft Flow | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |

## Test Architecture
- Test runner: Vitest component tests (`npm run test:unit`) and Playwright E2E (`npm run test`)
- Pass criteria: Exit code 0, 100% tests pass cleanly.

## Coverage Thresholds
- Tier 1: ≥5 per feature (Total ≥ 30)
- Tier 2: ≥5 per feature (Total ≥ 30)
- Tier 3: Pairwise combinations (Total ≥ 6)
- Tier 4: Real-world user flows (Total ≥ 5)
