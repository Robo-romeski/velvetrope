export function dateTimeColumnType(): 'timestamptz' | 'datetime' {
  return process.env.DATABASE_URL?.trim() ? 'timestamptz' : 'datetime';
}
