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

  const getDiskProgressColor = (percent: number) => {
    if (percent > 80) return 'bg-status-danger';
    if (percent > 60) return 'bg-status-warning';
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
                <TableHead>Память (JVM Heap)</TableHead>
                <TableHead>RAM</TableHead>
                <TableHead>Load Avg (1m)</TableHead>
                <TableHead>Load Avg (5m)</TableHead>
                <TableHead>Load Avg (15m)</TableHead>
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
                    {typeof node.ramPercent === 'number' ? (
                      <div className="w-24">
                        <Progress
                          value={node.ramPercent}
                          className="h-2"
                          indicatorClassName={getProgressColor(node.ramPercent)}
                        />
                        <div className="text-xs mt-1 text-right">{node.ramPercent}% использовано</div>
                        <div className="text-xs mt-1 text-right text-muted-foreground">
                          {node.ramUsedStr} / {node.ramTotalStr}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">-</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span title="Load Average 1m">{typeof node.load1m === 'number' ? node.load1m.toFixed(2) : '-'}</span>
                  </TableCell>
                  <TableCell>
                    <span title="Load Average 5m">{typeof node.load5m === 'number' ? node.load5m.toFixed(2) : '-'}</span>
                  </TableCell>
                  <TableCell>
                    <span title="Load Average 15m">{typeof node.load15m === 'number' ? node.load15m.toFixed(2) : '-'}</span>
                  </TableCell>
                  <TableCell>
                    <div className="w-24">
                      {(() => {
                        const used = node.diskTotalRaw - node.diskAvailableRaw;
                        const percent = node.diskTotalRaw > 0 ? Math.round((used / node.diskTotalRaw) * 100) : 0;
                        return <>
                          <Progress
                            value={percent}
                            className="h-2"
                            indicatorClassName={getDiskProgressColor(percent)}
                          />
                          <div className="text-xs mt-1 text-right">{percent}% использовано</div>
                        </>;
                      })()}
                    </div>
                    <div className="text-xs space-y-1 mt-2">
                      <div className="flex items-center gap-1">
                        <span role="img" aria-label="total">💾</span>
                        <span className="text-muted-foreground">Общий размер ФС:</span>
                        <span className="font-bold ml-1">{node.diskTotal}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span role="img" aria-label="free">🟩</span>
                        <span className="text-muted-foreground">Свободно на ФС:</span>
                        <span className="font-bold ml-1 text-green-400">{node.diskFree}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span role="img" aria-label="available">🟦</span>
                        <span className="text-muted-foreground">Доступно для записи:</span>
                        <span className="font-bold ml-1 text-blue-400">{node.diskAvailable}</span>
                      </div>
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
