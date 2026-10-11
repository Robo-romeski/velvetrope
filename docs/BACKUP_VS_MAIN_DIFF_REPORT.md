# Read-only diff: backup branch vs `origin/main`

**Generated:** 2026-10-10  
**Purpose:** Reconcile orphan local history with the canonical GitHub line. **Do not merge blindly.**

| Ref | Commit | Role |
|-----|--------|------|
| `origin/main` | `36aec69` | Canonical (includes PR #7) |
| `backup/local-main-pre-pr4-squash-20261003` | `10b0f9b` (tip) | Sept 2026 experimental line |
| Merge-base | (shared ancestor before divergence) | — |

## Commit divergence

| Direction | Count | Notes |
|-----------|-------|--------|
| Commits on **backup only** | **5** | Pre-#4 squash-era feature commits |
| Commits on **main only** | **8** | Includes squashed PR #4–#7 work |

### Backup-only commits (not on main)

1. `fc47d67` — FIFO waitlists and host analytics  
2. `ca848ab` — audited admin moderation console  
3. `9d441e5` — offline attendee tickets and Next.js upgrade  
4. `900cc2a` — private photo-confirmed check-in  
5. `10b0f9b` — event chat and post-event feedback  

These themes largely re-entered **`main` via PR #4** (`a326d6f`) and later platform commits—not via these commit hashes.

### Main-only commits (not on backup tip)

Includes `a326d6f` (#4 identity/safety/stripe/admin/chat/feedback/PWA), `479a4a7` (community/learn/commerce), `5135e22` (kudos), `36aec69` (#7 social/DMs/branding), and intervening fixes/docs.

## Tree diff summary

`git diff origin/main backup/local-main-pre-pr4-squash-20261003`:

| Change type | Files | Meaning |
|-------------|-------|---------|
| **D** (present on main, absent on backup) | **108** | What you **lose** if you reset to backup |
| **M** (modified both ways) | **103** | Divergent implementations |
| **A** (present on backup, absent on main) | **1** | `frontend/public/icon.svg` only |

**Stat (merge-base…backup):** 121 files, +9911 / −3132 vs merge-base (backup side).

## Critical: what main has that backup lacks

If you checked out backup, you would **lose** entire modules shipped after the fork:

- **Social home:** `social-feed.controller`, `social-activity-read`, migrations 15–17, `frontend/app/feed`, `notifications`, `lib/social.ts`, `social-home.e2e-spec.ts`
- **Direct messaging:** `backend/src/messages/*`, `frontend/app/messages/*`, `messages.e2e-spec.ts`
- **Kudos:** full `backend/src/kudos/*`, settings UI, e2e
- **Commerce / entitlements:** `backend/src/commerce/*`, paid course migrations
- **Groups/social core** (as on main): entities, controllers, services under `backend/src/social/*`
- **Persona / platform migrations** 8–14 and related docs on main
- **Branding:** epicsexual logo, editorial homepage, manifest updates

## What backup has that main lacks

- **`frontend/public/icon.svg`** — old PWA icon; main uses logo-based manifest instead.

## Interpretation

| Question | Answer |
|----------|--------|
| Is backup a fast-forward of main? | **No** |
| Is backup ⊂ main? | **No** — backup is an **older alternate timeline** |
| Did main absorb backup’s intent? | **Mostly yes** for the five backup commits, via **PR #4+** |
| Safe to merge backup → main? | **No** without a full 121-file reconciliation; high conflict risk |
| Safe to delete backup branch? | **Yes** for day-to-day work if this report is archived; keep branch locally until you confirm nothing unique in the 103 modified files |

## Recommended use of backup branch

1. **Reference only** — compare a specific file if you remember behavior from Sept 2026.  
2. **Cherry-pick** — only after `git show <commit> -- <path>` proves main lacks a behavior.  
3. **Never** merge wholesale into `main`.

## Related branches

- `feat/identity-and-stripe-payments` — historical; overlaps backup era.  
- `feat/social-feed-dms-discovery` — same tree as PR #7; can delete after `main` pull.

## Commands to reproduce

```bash
git fetch origin
git log origin/main..backup/local-main-pre-pr4-squash-20261003 --oneline
git log backup/local-main-pre-pr4-squash-20261003..origin/main --oneline
git diff origin/main backup/local-main-pre-pr4-squash-20261003 --stat
```
