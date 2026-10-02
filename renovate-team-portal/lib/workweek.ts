/** Friday through Thursday, using a local calendar date (not an instant). */
export function workweekFor(today: string) {
 const date = new Date(`${today}T00:00:00Z`);
 const daysSinceFriday = (date.getUTCDay() + 2) % 7;
 date.setUTCDate(date.getUTCDate() - daysSinceFriday);
 const start = date.toISOString().slice(0, 10);
 date.setUTCDate(date.getUTCDate() + 6);
 return { start, end: date.toISOString().slice(0, 10) };
}
export function workweekLabel(date: string) {
 return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${date}T00:00:00Z`));
}
