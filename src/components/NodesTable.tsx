
import React from 'react';
import { Node } from '@/services/elasticService';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Check, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface NodesTableProps {
  nodes: Node[] | null;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
}

const NodesTable: React.FC<NodesTableProps> = ({ nodes, isLoading, error, onRefresh }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'green':
        return <Check className="h-4 w-4 text-status-healthy" />;
      case 'yellow':
        return <AlertTriangle className="h-4 w-4 text-status-warning" />;
      case 'red':
        return <X className="h-4 w-4 text-status-danger" />;
      default:
        return null;
    }
  };

  const getProgressColor = (value: number) => {
    if (value > 80) return 'bg-status-danger';
    if (value > 60) return 'bg-status-warning';
    return 'bg-status-healthy';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ноды кластера</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32">
          <RefreshCw className="h-8 w-8 animate-spin text-muted" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle>Ноды кластера</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive mb-4">Ошибка получения информации о нодах: {error}</p>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            Повторить
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!nodes || nodes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ноды кластера</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">Нет доступных нод</p>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            Обновить
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Ноды кластера</CardTitle>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Обновить
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Статус</TableHead>
                <TableHead>Имя</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Версия</TableHead>
                <TableHead>CPU</TableHead>
                <TableHead>Память</TableHead>
                <TableHead>Диск</TableHead>
                <TableHead>Роли</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nodes.map((node) => (
                <TableRow key={node.id}>
                  <TableCell>
                    <div className="flex items-center">
                      {getStatusIcon(node.status)}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{node.name}</TableCell>
                  <TableCell>{node.ip}</TableCell>
                  <TableCell>{node.version}</TableCell>
                  <TableCell>
                    <div className="w-24">
                      <Progress
                        value={node.cpuUsage}
                        className="h-2"
                        indicatorClassName={getProgressColor(node.cpuUsage)}
                      />
                      <div className="text-xs mt-1 text-right">{node.cpuUsage}%</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="w-24">
                      <Progress
                        value={node.heapPercent}
                        className="h-2"
                        indicatorClassName={getProgressColor(node.heapPercent)}
                      />
                      <div className="text-xs mt-1 text-right">{node.heapPercent}%</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs">
                      {node.diskAvailable} / {node.diskTotal}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {node.roles.map((role, index) => (
                        <span
                          key={index}
                          className="bg-secondary text-xs px-1 py-0.5 rounded"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default NodesTable;
