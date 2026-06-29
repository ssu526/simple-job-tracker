export const REQUEST_ID_HEADER = "x-request-id";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function requestIdFrom(value: string | null | undefined): string {
  return value && UUID_PATTERN.test(value) ? value : crypto.randomUUID();
}
