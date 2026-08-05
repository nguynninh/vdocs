export interface User {
  id: number;
  username: string;
  avatar?: string;
  name: string;
  email: string;
  mobile: string;
  departmentIds: string[];
}