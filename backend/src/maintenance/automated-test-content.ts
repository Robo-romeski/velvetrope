/** Titles/slugs created by prod smoke scripts and automated QA — not real community content. */

export function isAutomatedTestEventTitle(title: string): boolean {
  const t = title.trim();
  if (/^Prod Smoke Gathering\b/i.test(t)) return true;
  if (/^Prod smoke \d+\b/i.test(t)) return true;
  if (t === 'tier2-prod-smoke.sh') return true;
  return false;
}

export function isAutomatedTestLearnTitle(title: string): boolean {
  return /^Prod Review Guide \d+/i.test(title.trim());
}

export function isAutomatedTestLearnSlug(slug: string): boolean {
  return /^prod-review-guide-\d+/i.test(slug.trim());
}
