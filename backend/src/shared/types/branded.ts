declare const brand: unique symbol;

export type Brand<T, B extends string> = T & { readonly [brand]: B };

export type BatchId = Brand<string, 'BatchId'>;
export type FileId = Brand<string, 'FileId'>;
export type UserId = Brand<string, 'UserId'>;

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}
