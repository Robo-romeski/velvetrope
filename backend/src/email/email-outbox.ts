export type CapturedEmail = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

const outbox: CapturedEmail[] = [];

export function captureEmail(message: CapturedEmail): void {
  outbox.push({ ...message });
}

export function getCapturedEmails(): CapturedEmail[] {
  return [...outbox];
}

export function clearCapturedEmails(): void {
  outbox.length = 0;
}
