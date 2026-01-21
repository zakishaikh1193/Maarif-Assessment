import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { authAPI } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      console.log('AuthContext init - savedToken exists:', !!savedToken);
      console.log('AuthContext init - savedUser exists:', !!savedUser);

      if (savedToken && savedUser) {
        try {
          // Verify token is still valid
          await authAPI.verifyToken();
          const parsedUser = JSON.parse(savedUser);
          console.log('AuthContext init - loading user from localStorage:', parsedUser);
          console.log('AuthContext init - user role:', parsedUser.role);
          
          setToken(savedToken);
          setUser(parsedUser);
        } catch (error) {
          console.log('AuthContext init - token invalid, clearing localStorage');
          // Token is invalid, clear storage
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await authAPI.login(username, password);
      const { token: newToken, user: userData } = response;

      console.log('Login - storing user data:', userData);
      console.log('Login - user role:', userData.role);
      
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userData));
      
      setToken(newToken);
      setUser(userData);
      
      console.log('Login - localStorage updated');
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    console.log('Logout called - clearing localStorage');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    console.log('Logout completed - localStorage cleared');
    
    // Force a page reload to ensure clean state
    window.location.href = '/login';
  };

  const value = {
    user,
    token,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};