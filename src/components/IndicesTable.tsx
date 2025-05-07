import React, { useState } from 'react';
import { IndexInfo } from '@/services/elasticService';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Check, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface IndicesTableProps {
  indices: IndexInfo[] | null;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
}

const IndicesTable: React.FC<IndicesTableProps> = ({ indices, isLoading, error, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'status' | 'docsCount' | 'storageSize' | 'primaryShards' | 'replicaShards' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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

  const parseSize = (sizeStr: string) => {
    if (!sizeStr) return 0;
    const units = { b: 1, kb: 1e3, mb: 1e6, gb: 1e9, tb: 1e12 };
    const match = sizeStr.toLowerCase().match(/([\d.]+)\s*(b|kb|mb|gb|tb)/);
    if (!match) return 0;
    const value = parseFloat(match[1]);
    const unit = match[2];
    return value * (units[unit] || 1);
  };

  let filteredIndices = indices?.filter(index => 
    index.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (sortField) {
    filteredIndices = [...filteredIndices].sort((a, b) => {
      let aValue: number | string, bValue: number | string;
      if (sortField === 'storageSize') {
        aValue = parseSize(a.storageSize);
        bValue = parseSize(b.storageSize);
      } else if (sortField === 'status') {
        const order = { green: 3, yellow: 2, red: 1 };
        aValue = order[a.status] || 0;
        bValue = order[b.status] || 0;
      } else {
        aValue = a[sortField] as number;
        bValue = b[sortField] as number;
      }
      if (sortOrder === 'asc') return aValue > bValue ? 1 : -1;
      return aValue < bValue ? 1 : -1;
    });
  }

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Индексы</CardTitle>
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
          <CardTitle>Индексы</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive mb-4">Ошибка получения информации об индексах: {error}</p>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            Повторить
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Индексы</CardTitle>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Обновить
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Input 
            placeholder="Поиск индексов..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {!indices || indices.length === 0 ? (
          <p className="text-sm text-muted-foreground">Нет доступных индексов</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    onClick={() => handleSort('status')}
                    style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <span>Статус</span>
                    {sortField === 'status' && (
                      <span style={{ color: '#90a4ae' }}>{sortOrder === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </TableHead>
                  <TableHead>Индекс</TableHead>
                  <TableHead onClick={() => handleSort('docsCount')} style={{cursor: 'pointer'}}>
                    Документов {sortField === 'docsCount' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </TableHead>
                  <TableHead onClick={() => handleSort('storageSize')} style={{cursor: 'pointer'}}>
                    Размер {sortField === 'storageSize' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </TableHead>
                  <TableHead onClick={() => handleSort('primaryShards')} style={{cursor: 'pointer'}}>
                    Первичных шардов {sortField === 'primaryShards' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </TableHead>
                  <TableHead onClick={() => handleSort('replicaShards')} style={{cursor: 'pointer'}}>
                    Реплик {sortField === 'replicaShards' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIndices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      Индексы не найдены
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredIndices.map((index) => (
                    <TableRow key={index.name}>
                      <TableCell>
                        <div className="flex items-center">
                          {getStatusIcon(index.status)}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {index.name}
                      </TableCell>
                      <TableCell>{index.docsCount.toLocaleString()}</TableCell>
                      <TableCell>{index.storageSize}</TableCell>
                      <TableCell>{index.primaryShards}</TableCell>
                      <TableCell>{index.replicaShards}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default IndicesTable;
