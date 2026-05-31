export type Optional<T> = T | null | undefined;

export type Nullable<T> = T | null;

export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${value}`);
}
