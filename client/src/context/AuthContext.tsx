import { createContext, useContext, ReactNode } from 'react';

interface Operator {
  id: string;
  email: string;
  name: string;
}

interface AuthContextValue {
  token: string | null;
  operator: Operator | null;
  login: (token: string, operator: Operator) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue>({
  token: null,
  operator: null,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider value={{ token: null, operator: null, login: () => {}, logout: () => {} }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
