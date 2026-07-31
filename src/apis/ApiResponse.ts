export interface ApiResponse<T = void> {
  code: number;
  message: string;
  data: T;
}
