export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface Meta {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  timestamp: string;
  version: string;
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  meta?: Meta;
}
