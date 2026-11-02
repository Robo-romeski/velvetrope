const SUBJECT_MAX = 200;
const TEXT_MAX = 20_000;
const HTML_MAX = 50_000;

export function clampEmailContent(input: {
  subject: string;
  text: string;
  html?: string;
}): { subject: string; text: string; html?: string } {
  return {
    subject: input.subject.trim().slice(0, SUBJECT_MAX),
    text: input.text.trim().slice(0, TEXT_MAX),
    html: input.html?.trim().slice(0, HTML_MAX) || undefined,
  };
}
