export type AuthProvider = 'google' | 'supabase' | 'app';

export interface AuthContext {
  userId: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  provider: AuthProvider;
}
