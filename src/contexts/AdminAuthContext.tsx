
import React, { createContext, useContext, useState, useEffect } from 'react';

interface AdminUser {
  email: string;
}

interface AdminAuthContextType {
  isAdminAuthenticated: boolean;
  adminUser: AdminUser | null;
  adminLogin: (email: string, password: string) => Promise<boolean>;
  adminLogout: () => void;
  loading: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const storedAuth = localStorage.getItem('isAdminAuthenticated');
    const storedUser = localStorage.getItem('adminUser');
    if (storedAuth === 'true' && storedUser) {
      setIsAdminAuthenticated(true);
      setAdminUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const adminLogin = async (email: string, password: string): Promise<boolean> => {
    // Mock authentication logic
    if (email === 'admin@example.com' && password === 'admin123') {
      setIsAdminAuthenticated(true);
      const user = { email };
      setAdminUser(user);
      localStorage.setItem('isAdminAuthenticated', 'true');
      localStorage.setItem('adminUser', JSON.stringify(user));
      return true;
    }
    return false;
  };

  const adminLogout = () => {
    setIsAdminAuthenticated(false);
    setAdminUser(null);
    localStorage.removeItem('isAdminAuthenticated');
    localStorage.removeItem('adminUser');
  };

  return (
    <AdminAuthContext.Provider value={{ isAdminAuthenticated, adminUser, adminLogin, adminLogout, loading }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
