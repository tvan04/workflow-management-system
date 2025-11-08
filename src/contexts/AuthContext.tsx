import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User, AuthContextType } from '../types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock user data - in production this would come from AWS Cognito
const mockUsers = [
  {
    id: '1',
    email: 'admin@vanderbilt.edu',
    password: 'admin',
    name: 'Admin',
    role: 'admin' as const
  },
  {
    id: '2', 
    email: 'jacqueline.c.frist@vanderbilt.edu',
    password: 'user123',
    name: 'Test User',
    role: 'applicant' as const
  }
];

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on app start
  useEffect(() => {
    const initializeAuth = () => {
      try {
        // Use sessionStorage for browser session persistence
        const savedUser = sessionStorage.getItem('currentUser');
        if (savedUser) {
          const userData = JSON.parse(savedUser);
          // Validate the stored data structure
          if (userData && userData.id && userData.email && userData.role) {
            setUser(userData);
          } else {
            // Invalid data structure, clear it
            sessionStorage.removeItem('currentUser');
          }
        }
      } catch (error) {
        console.error('Error parsing saved user data:', error);
        sessionStorage.removeItem('currentUser');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const foundUser = mockUsers.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    
    if (foundUser) {
      const userData: User = {
        id: foundUser.id,
        email: foundUser.email,
        name: foundUser.name,
        role: foundUser.role
      };
      
      setUser(userData);
      sessionStorage.setItem('currentUser', JSON.stringify(userData));
      return true;
    }
    
    return false;
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('currentUser');
  };

  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin';

  const value: AuthContextType = {
    user,
    login,
    logout,
    isAuthenticated,
    isAdmin,
    isLoading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};