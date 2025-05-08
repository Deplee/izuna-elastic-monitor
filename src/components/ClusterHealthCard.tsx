import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ClusterHealth } from '@/services/elasticService';
import { AlertTriangle, Check, X, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

interface ClusterHealthCardProps {
  health: ClusterHealth | null;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
}

const ClusterHealthCard: React.FC<ClusterHealthCardProps> = ({ health, isLoading, error, onRefresh }) => {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Здоровье кластера</CardTitle>
          <CardDescription>Загрузка информации...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32">
          <RefreshCw className="h-8 w-8 animate-spin text-muted" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center">
            <X className="h-5 w-5 text-destructive mr-2" />
            Ошибка
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
        <CardFooter>
          <Button variant="outline" size="sm" onClick={onRefresh} className="w-full">
            Повторить
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (!health) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Здоровье кластера</CardTitle>
          <CardDescription>Нет данных</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32">
          <Button variant="outline" onClick={onRefresh}>
            Загрузить
          </Button>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'green':
        return <Check className="h-5 w-5 text-status-healthy" />;
      case 'yellow':
        return <AlertTriangle className="h-5 w-5 text-status-warning" />;
      case 'red':
        return <X className="h-5 w-5 text-status-danger" />;
      default:
        return null;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'green':
        return 'text-status-healthy';
      case 'yellow':
        return 'text-status-warning';
      case 'red':
        return 'text-status-danger';
      default:
        return '';
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Здоровье кластера</span>
          <span className={`status-badge ${health.status}`}>
            {getStatusIcon(health.status)}
            <span className="ml-1 capitalize">{health.status}</span>
          </span>
        </CardTitle>
        <CardDescription>{health.clusterName}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="text-center p-2 bg-secondary rounded-md">
            <div className="text-2xl font-bold">{health.numberOfNodes}</div>
            <div className="text-xs text-muted-foreground">Нод</div>
          </div>
          <div className="text-center p-2 bg-secondary rounded-md">
            <div className="text-2xl font-bold">{health.activeShards}</div>
            <div className="text-xs text-muted-foreground">Шардов</div>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Запущенные шарды:</span>
            <span>{health.activeShards}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Активные шарды:</span>
            <span>{health.activePrimaryShards}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Перемещаемые шарды:</span>
            <span className={health.relocatingShards > 0 ? 'text-status-warning' : ''}>
              {health.relocatingShards}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Инициализируемые шарды:</span>
            <span className={health.initializingShards > 0 ? 'text-status-warning' : ''}>
              {health.initializingShards}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Неназначенные шарды:</span>
            <span className={health.unassignedShards > 0 ? 'text-status-danger' : ''}>
              {health.unassignedShards}
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm" className="w-full" onClick={onRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Обновить
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ClusterHealthCard;
