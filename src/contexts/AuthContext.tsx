
import React, { createContext, useContext, useEffect, useState } from 'react';
import elasticService, { ElasticConnectionConfig } from '../services/elasticService';
import { useToast } from '@/components/ui/use-toast';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (config: ElasticConnectionConfig) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  connectionConfig: ElasticConnectionConfig | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [connectionConfig, setConnectionConfig] = useState<ElasticConnectionConfig | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const config = elasticService.getConfig();
      if (config) {
        try {
          const isConnected = await elasticService.testConnection();
          if (isConnected) {
            setIsAuthenticated(true);
            setConnectionConfig(config);
          } else {
            // Если не удалось подключиться, очистим сохраненные данные
            elasticService.clearConfig();
            setIsAuthenticated(false);
            setConnectionConfig(null);
          }
        } catch (error) {
          console.error('Ошибка при проверке авторизации:', error);
          elasticService.clearConfig();
          setIsAuthenticated(false);
          setConnectionConfig(null);
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (config: ElasticConnectionConfig): Promise<boolean> => {
    setIsLoading(true);
    try {
      elasticService.setConfig(config);
      const isConnected = await elasticService.testConnection();
      
      if (isConnected) {
        setIsAuthenticated(true);
        setConnectionConfig(config);
        toast({
          title: 'Успешное подключение',
          description: `Подключено к ${config.url}`,
        });
        return true;
      } else {
        elasticService.clearConfig();
        setIsAuthenticated(false);
        setConnectionConfig(null);
        toast({
          title: 'Ошибка подключения',
          description: 'Проверьте URL, логин и пароль',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      console.error('Ошибка авторизации:', error);
      toast({
        title: 'Ошибка подключения',
        description: `${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    elasticService.clearConfig();
    setIsAuthenticated(false);
    setConnectionConfig(null);
    toast({
      title: 'Выход выполнен',
      description: 'Вы вышли из системы',
    });
  };

  const value = {
    isAuthenticated,
    login,
    logout,
    isLoading,
    connectionConfig
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
