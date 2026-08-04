export interface User {
  id: string;
  username: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  middleName: string;
  lastName: string;
  displayName: string;
  roles?: string[];
  locked: boolean;
}
