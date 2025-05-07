
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoginPage from './LoginPage';
import DashboardPage from './DashboardPage';

const Index: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-lg text-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <DashboardPage /> : <LoginPage />;
};

export default Index;
