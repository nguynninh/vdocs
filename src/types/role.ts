export interface Permission {
  name: string;
  description: string;
  group: string;
}

export interface Role {
  name: string;
  description: string;
  system: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  userCount: number;
  permissions: Permission[];
}
