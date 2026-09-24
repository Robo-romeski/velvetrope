export const CODE_OF_CONDUCT_VERSION = '2026-01';

export const CODE_OF_CONDUCT_TEXT = `VelvetKey community standards

- Respect consent, boundaries, and privacy at all times.
- Do not harass, threaten, or discriminate against anyone.
- Do not share another person's contact details, photos, or check-in information without permission.
- Follow host rules and venue policies; staff may remove anyone who puts others at risk.
- Report safety concerns promptly so we can review and respond.

Violations may result in application rejection, removal from an event, or account restrictions.`;

export function codeOfConductSummary(): {
  version: string;
  text: string;
} {
  return { version: CODE_OF_CONDUCT_VERSION, text: CODE_OF_CONDUCT_TEXT };
}
