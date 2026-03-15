import { createContext, useContext, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

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
  const [token, setToken] = useState<string | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
  const navigate = useNavigate();

  function login(newToken: string, newOperator: Operator) {
    setToken(newToken);
    setOperator(newOperator);
  }

  function logout() {
    setToken(null);
    setOperator(null);
    navigate('/login');
  }

  return (
    <AuthContext.Provider value={{ token, operator, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
