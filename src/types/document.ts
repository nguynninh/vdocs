export interface DocumentResponse {
  id: string;
  title: string | null;
  currentState: string;
  revision: number;
  updatedAt: string;
}
