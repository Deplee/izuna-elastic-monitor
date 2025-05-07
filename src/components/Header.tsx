
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Database } from 'lucide-react';

const Header: React.FC = () => {
  const { logout, connectionConfig } = useAuth();

  return (
    <header className="bg-card py-4 px-6 border-b border-border flex justify-between items-center">
      <div className="flex items-center space-x-2">
        <Database className="h-6 w-6 text-elastic" />
        <span className="font-bold text-xl">ElasticSearch Мониторинг</span>
      </div>
      
      <div className="flex items-center">
        {connectionConfig && (
          <span className="text-sm text-muted-foreground mr-4">
            {connectionConfig.url} ({connectionConfig.username})
          </span>
        )}
        
        <Button variant="outline" size="sm" onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          Выйти
        </Button>
      </div>
    </header>
  );
};

export default Header;
