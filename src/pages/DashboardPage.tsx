import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import ClusterHealthCard from '@/components/ClusterHealthCard';
import NodesTable from '@/components/NodesTable';
import IndicesTable from '@/components/IndicesTable';
import elasticService, { ClusterHealth, Node, IndexInfo } from '@/services/elasticService';
import { useToast } from '@/components/ui/use-toast';

// Функция для преобразования строки размера в байты
function parseSizeToBytes(sizeStr: string): number {
  if (!sizeStr) return 0;
  const units: { [key: string]: number } = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
    tb: 1024 * 1024 * 1024 * 1024,
    pb: 1024 * 1024 * 1024 * 1024 * 1024,
  };
  const match = sizeStr.toLowerCase().match(/([\d.]+)\s*(b|kb|mb|gb|tb|pb)/);
  if (!match) return 0;
  const value = parseFloat(match[1]);
  const unit = match[2];
  return value * (units[unit] || 1);
}

// Функция для красивого отображения размера
function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

const DashboardPage: React.FC = () => {
  const [clusterHealth, setClusterHealth] = useState<ClusterHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState<string | null>(null);

  const [nodes, setNodes] = useState<Node[] | null>(null);
  const [nodesLoading, setNodesLoading] = useState(true);
  const [nodesError, setNodesError] = useState<string | null>(null);

  const [indices, setIndices] = useState<IndexInfo[] | null>(null);
  const [indicesLoading, setIndicesLoading] = useState(true);
  const [indicesError, setIndicesError] = useState<string | null>(null);

  const [relocatingShards, setRelocatingShards] = useState<any[]>([]);
  const [relocatingLoading, setRelocatingLoading] = useState(true);
  const [relocatingError, setRelocatingError] = useState<string | null>(null);

  const [initializingShards, setInitializingShards] = useState<any[]>([]);
  const [initializingLoading, setInitializingLoading] = useState(true);
  const [initializingError, setInitializingError] = useState<string | null>(null);

  const { toast } = useToast();

  const fetchClusterHealth = async () => {
    setHealthLoading(true);
    setHealthError(null);
    
    try {
      const response = await elasticService.getClusterHealth();
      if (response.success && response.data) {
        setClusterHealth(response.data);
      } else {
        setHealthError(response.error || 'Не удалось получить данные о здоровье кластера');
      }
    } catch (error) {
      setHealthError(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setHealthLoading(false);
    }
  };

  const fetchNodes = async () => {
    setNodesLoading(true);
    setNodesError(null);
    
    try {
      const response = await elasticService.getNodes();
      if (response.success && response.data) {
        setNodes(response.data);
      } else {
        setNodesError(response.error || 'Не удалось получить данные о нодах');
      }
    } catch (error) {
      setNodesError(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setNodesLoading(false);
    }
  };

  const fetchIndices = async () => {
    setIndicesLoading(true);
    setIndicesError(null);
    
    try {
      const response = await elasticService.getIndices();
      if (response.success && response.data) {
        setIndices(response.data);
      } else {
        setIndicesError(response.error || 'Не удалось получить данные об индексах');
      }
    } catch (error) {
      setIndicesError(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setIndicesLoading(false);
    }
  };

  const fetchRelocatingShards = async () => {
    setRelocatingLoading(true);
    setRelocatingError(null);
    try {
      const response = await elasticService.getRelocatingShards();
      if (response.success && response.data) {
        setRelocatingShards(response.data);
      } else {
        setRelocatingError(response.error || 'Не удалось получить перемещаемые шарды');
      }
    } catch (error) {
      setRelocatingError(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setRelocatingLoading(false);
    }
  };

  const fetchInitializingShards = async () => {
    setInitializingLoading(true);
    setInitializingError(null);
    try {
      const response = await elasticService.getInitializingShards();
      if (response.success && response.data) {
        setInitializingShards(response.data);
      } else {
        setInitializingError(response.error || 'Не удалось получить инициализируемые шарды');
      }
    } catch (error) {
      setInitializingError(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setInitializingLoading(false);
    }
  };

  const fetchAllData = () => {
    fetchClusterHealth();
    fetchNodes();
    fetchIndices();
    fetchRelocatingShards();
    fetchInitializingShards();
  };

  useEffect(() => {
    fetchAllData();
    
    // Интервал обновления данных
    const interval = setInterval(() => {
      fetchAllData();
    }, 30000); // Обновление каждые 30 секунд
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <div className="flex-grow p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ClusterHealthCard 
            health={clusterHealth} 
            isLoading={healthLoading} 
            error={healthError}
            onRefresh={fetchClusterHealth} 
          />
          
          <div className="col-span-1 md:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="metric-card">
                <h3 className="font-medium mb-2">Количество нод</h3>
                <p className="text-3xl font-bold">
                  {nodesLoading ? (
                    <span className="animate-pulse">...</span>
                  ) : nodes ? nodes.length : 0}
                </p>
              </div>
              
              <div className="metric-card">
                <h3 className="font-medium mb-2">Количество индексов</h3>
                <p className="text-3xl font-bold">
                  {indicesLoading ? (
                    <span className="animate-pulse">...</span>
                  ) : indices ? indices.length : 0}
                </p>
              </div>
              
              <div className="metric-card">
                <h3 className="font-medium mb-2">Всего документов</h3>
                <p className="text-3xl font-bold">
                  {indicesLoading ? (
                    <span className="animate-pulse">...</span>
                  ) : indices ? (
                    indices.reduce((sum, index) => sum + index.docsCount, 0).toLocaleString()
                  ) : 0}
                </p>
              </div>
              
              <div className="metric-card">
                <h3 className="font-medium mb-2">Общий размер Индексов</h3>
                <p className="text-3xl font-bold">
                  {indicesLoading ? (
                    <span className="animate-pulse">...</span>
                  ) : indices && indices.length > 0 ? (
                    formatBytes(indices.reduce((total, index) => total + parseSizeToBytes(index.storageSize), 0))
                  ) : "0 B"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <NodesTable 
          nodes={nodes} 
          isLoading={nodesLoading} 
          error={nodesError}
          onRefresh={fetchNodes} 
        />

        {relocatingLoading ? (
          <div className="metric-card mt-4">Загрузка перемещаемых шардов...</div>
        ) : relocatingError ? (
          <div className="metric-card mt-4 text-red-500">{relocatingError}</div>
        ) : (
          <div className="metric-card mt-4">
            <h3 className="font-medium mb-2">Перемещаемые шарды</h3>
            <div className="overflow-x-auto">
              {relocatingShards.length > 0 ? (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr>
                      <th className="px-2 py-1 text-left">Индекс</th>
                      <th className="px-2 py-1 text-left">Шард</th>
                      <th className="px-2 py-1 text-left">Откуда</th>
                      <th className="px-2 py-1 text-left">Куда</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relocatingShards.map((shard, idx) => (
                      <tr key={idx}>
                        <td className="px-2 py-1">{shard.index}</td>
                        <td className="px-2 py-1">{shard.shard}</td>
                        <td className="px-2 py-1">{shard.fromNode}</td>
                        <td className="px-2 py-1">{shard.toNode}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-muted-foreground px-2 py-1">Нет перемещаемых шардов</div>
              )}
            </div>
          </div>
        )}

        {initializingLoading ? (
          <div className="metric-card mt-4">Загрузка инициализируемых шардов...</div>
        ) : initializingError ? (
          <div className="metric-card mt-4 text-red-500">{initializingError}</div>
        ) : (
          <div className="metric-card mt-4">
            <h3 className="font-medium mb-2">Инициализируемые шарды</h3>
            <div className="overflow-x-auto">
              {initializingShards.length > 0 ? (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr>
                      <th className="px-2 py-1 text-left">Индекс</th>
                      <th className="px-2 py-1 text-left">Шард</th>
                      <th className="px-2 py-1 text-left">Нода</th>
                    </tr>
                  </thead>
                  <tbody>
                    {initializingShards.map((shard, idx) => (
                      <tr key={idx}>
                        <td className="px-2 py-1">{shard.index}</td>
                        <td className="px-2 py-1">{shard.shard}</td>
                        <td className="px-2 py-1">{shard.node}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-muted-foreground px-2 py-1">Нет инициализируемых шардов</div>
              )}
            </div>
          </div>
        )}

        <IndicesTable 
          indices={indices} 
          isLoading={indicesLoading} 
          error={indicesError}
          onRefresh={fetchIndices} 
        />
      </div>
    </div>
  );
};

export default DashboardPage;
