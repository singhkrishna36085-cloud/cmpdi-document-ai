export type UserRole = "NORMAL_USER" | "HOD";

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LoginResponse {
  status: string;
  message: string;
  access_token: string;
  token_type: string;
  user: UserProfile;
}

export interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (usernameOrEmail: string, password: string, selectedRole: UserRole) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  refreshUser: () => Promise<UserProfile | null>;
}
