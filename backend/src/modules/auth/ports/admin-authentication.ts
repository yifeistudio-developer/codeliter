export interface AdminSession {
  token: string;
  expiresAt: Date;
}

export interface AdminAuthentication {
  login(email: string, password: string): Promise<AdminSession | null>;
  isAuthenticated(token: string): Promise<boolean>;
  logout(token: string): Promise<void>;
}
