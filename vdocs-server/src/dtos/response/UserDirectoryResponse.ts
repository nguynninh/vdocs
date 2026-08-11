export interface UserDirectoryResponse {
  id: string;
  name: string;
  email: string | null;
  avatar: string | null;
}

export interface UserDirectoryListResponse {
  items: UserDirectoryResponse[];
  total: number;
  page: number;
  pageSize: number;
}
