import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import ClusterHealthCard from '@/components/ClusterHealthCard';
import NodesTable from '@/components/NodesTable';
import IndicesTable from '@/components/IndicesTable';
import elasticService, { ClusterHealth, Node, IndexInfo } from '@/services/elasticService';
import { useToast } from '@/components/ui/use-toast';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import IndexManagement from '@/components/IndexManagement';
import ChartsPage from './ChartsPage';
import MergeStatsChart from '@/components/MergeStatsChart';

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

  const [unassignedShards, setUnassignedShards] = useState<any[]>([]);
  const [unassignedLoading, setUnassignedLoading] = useState(true);
  const [unassignedError, setUnassignedError] = useState<string | null>(null);

  const [totalDocs, setTotalDocs] = useState<number | null>(null);
  const [totalDocsLoading, setTotalDocsLoading] = useState(true);
  const [totalDocsError, setTotalDocsError] = useState<string | null>(null);

  const [threadPools, setThreadPools] = useState<any[]>([]);
  const [threadPoolsLoading, setThreadPoolsLoading] = useState(true);
  const [threadPoolsError, setThreadPoolsError] = useState<string | null>(null);
  const [threadSort, setThreadSort] = useState(() => {
    const saved = localStorage.getItem('threadSort');
    return saved ? JSON.parse(saved) : {};
  });

  const [hotThreads, setHotThreads] = useState<any>(null);
  const [hotThreadsLoading, setHotThreadsLoading] = useState(false);
  const [hotThreadsError, setHotThreadsError] = useState<string | null>(null);

  const [indicesIndexingStats, setIndicesIndexingStats] = useState<any>(null);
  const [indicesIndexingStatsLoading, setIndicesIndexingStatsLoading] = useState(false);
  const [indicesIndexingStatsError, setIndicesIndexingStatsError] = useState<string | null>(null);

  const [nodesIndexingStats, setNodesIndexingStats] = useState<any>(null);
  const [nodesIndexingStatsLoading, setNodesIndexingStatsLoading] = useState(false);
  const [nodesIndexingStatsError, setNodesIndexingStatsError] = useState<string | null>(null);

  // Добавить useState для сортировки времени индексации по узлам
  const [indexingNodesSort, setIndexingNodesSort] = useState<{field: string, order: 'asc'|'desc'}>(() => {
    const saved = localStorage.getItem('indexingNodesSort');
    return saved ? JSON.parse(saved) : {field: 'nodeId', order: 'asc'};
  });

  const [selectedIndex, setSelectedIndex] = useState(() => localStorage.getItem('selectedIndex') || '');
  const [singleIndexStats, setSingleIndexStats] = useState<any>(null);
  const [singleIndexStatsLoading, setSingleIndexStatsLoading] = useState(false);
  const [singleIndexStatsError, setSingleIndexStatsError] = useState<string | null>(null);

  const [pendingTasks, setPendingTasks] = useState<any[]>([]);
  const [pendingTasksLoading, setPendingTasksLoading] = useState(false);
  const [pendingTasksError, setPendingTasksError] = useState<string | null>(null);
  const [pendingTasksSort, setPendingTasksSort] = useState(() => {
    const saved = localStorage.getItem('pendingTasksSort');
    return saved ? JSON.parse(saved) : {field: 'insert_order', order: 'asc'};
  });

  // --- Active Tasks ---
  const [activeTasks, setActiveTasks] = useState<any>(null);
  const [activeTasksLoading, setActiveTasksLoading] = useState(false);
  const [activeTasksError, setActiveTasksError] = useState<string | null>(null);
  const [activeTasksSort, setActiveTasksSort] = useState(() => {
    const saved = localStorage.getItem('activeTasksSort');
    return saved ? JSON.parse(saved) : {field: 'node', order: 'asc'};
  });

  // --- Allocation Explain ---
  const [allocation, setAllocation] = useState<any>(null);
  const [allocationLoading, setAllocationLoading] = useState(false);
  const [allocationError, setAllocationError] = useState<string | null>(null);
  const [allocIndex, setAllocIndex] = useState('');
  const [allocShard, setAllocShard] = useState('');
  const [allocPrimary, setAllocPrimary] = useState(false);

  // --- Snapshots ---
  const [snapshots, setSnapshots] = useState<any>(null);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);
  const [snapshotsError, setSnapshotsError] = useState<string | null>(null);
  const [snapshotSearch, setSnapshotSearch] = useState(() => localStorage.getItem('snapshotSearch') || '');

  // --- Snapshot Status ---
  const [snapshotRepo, setSnapshotRepo] = useState(() => localStorage.getItem('snapshotRepo') || '');
  const [snapshotName, setSnapshotName] = useState(() => localStorage.getItem('snapshotName') || '');
  const [snapshotStatus, setSnapshotStatus] = useState<any>(null);
  const [snapshotStatusLoading, setSnapshotStatusLoading] = useState(false);
  const [snapshotStatusError, setSnapshotStatusError] = useState<string | null>(null);

  const [openAccordionIndices, setOpenAccordionIndices] = useState(() => {
    const saved = localStorage.getItem('openAccordionIndices');
    return saved ? JSON.parse(saved) : [];
  });
  const [openAccordionReloc, setOpenAccordionReloc] = useState(() => {
    const saved = localStorage.getItem('openAccordionReloc');
    return saved ? JSON.parse(saved) : [];
  });
  const [openAccordionInit, setOpenAccordionInit] = useState(() => {
    const saved = localStorage.getItem('openAccordionInit');
    return saved ? JSON.parse(saved) : [];
  });
  const [openAccordionUnassigned, setOpenAccordionUnassigned] = useState(() => {
    const saved = localStorage.getItem('openAccordionUnassigned');
    return saved ? JSON.parse(saved) : [];
  });
  const [openAccordionSnapshots, setOpenAccordionSnapshots] = useState(() => {
    const saved = localStorage.getItem('openAccordionSnapshots');
    return saved ? JSON.parse(saved) : [];
  });
  const [openAccordionThreadPool, setOpenAccordionThreadPool] = useState(() => {
    const saved = localStorage.getItem('openAccordionThreadPool');
    return saved ? JSON.parse(saved) : {};
  });
  const [openAccordionHotThreads, setOpenAccordionHotThreads] = useState(() => {
    const saved = localStorage.getItem('openAccordionHotThreads');
    return saved ? JSON.parse(saved) : [];
  });
  const [openAccordionPendingTasks, setOpenAccordionPendingTasks] = useState(() => {
    const saved = localStorage.getItem('openAccordionPendingTasks');
    return saved ? JSON.parse(saved) : [];
  });
  const [openAccordionIndexingStatsIndices, setOpenAccordionIndexingStatsIndices] = useState(() => {
    const saved = localStorage.getItem('openAccordionIndexingStatsIndices');
    return saved ? JSON.parse(saved) : [];
  });
  const [openAccordionIndexingStatsNodes, setOpenAccordionIndexingStatsNodes] = useState(() => {
    const saved = localStorage.getItem('openAccordionIndexingStatsNodes');
    return saved ? JSON.parse(saved) : [];
  });
  const [openAccordionAllocationExplain, setOpenAccordionAllocationExplain] = useState(() => {
    const saved = localStorage.getItem('openAccordionAllocationExplain');
    return saved ? JSON.parse(saved) : [];
  });
  const [openAccordionSnapshotStatus, setOpenAccordionSnapshotStatus] = useState(() => {
    const saved = localStorage.getItem('openAccordionSnapshotStatus');
    return saved ? JSON.parse(saved) : [];
  });
  const [openAccordionActiveTasks, setOpenAccordionActiveTasks] = useState(() => {
    const saved = localStorage.getItem('openAccordionActiveTasks');
    return saved ? JSON.parse(saved) : [];
  });

  const [tab, setTab] = useState(() => localStorage.getItem('dashboardTab') || 'dashboard');
  const handleTabChange = (value: string) => {
    setTab(value);
    localStorage.setItem('dashboardTab', value);
  };

  const { toast } = useToast();

  const [mergeStats, setMergeStats] = useState<any>(null);
  const [mergeStatsLoading, setMergeStatsLoading] = useState(false);
  const [mergeStatsError, setMergeStatsError] = useState<string | null>(null);

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

  const fetchUnassignedShards = async () => {
    setUnassignedLoading(true);
    setUnassignedError(null);
    try {
      const response = await elasticService.getUnassignedShards();
      if (response.success && response.data) {
        setUnassignedShards(response.data);
      } else {
        setUnassignedError(response.error || 'Не удалось получить неназначенные шарды');
      }
    } catch (error) {
      setUnassignedError(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setUnassignedLoading(false);
    }
  };

  const fetchTotalDocs = async () => {
    setTotalDocsLoading(true);
    setTotalDocsError(null);
    try {
      const response = await elasticService.getTotalDocsCount();
      if (response.success && typeof response.data === 'number') {
        setTotalDocs(response.data);
      } else {
        setTotalDocsError(response.error || 'Не удалось получить общее количество документов');
      }
    } catch (error) {
      setTotalDocsError(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setTotalDocsLoading(false);
    }
  };

  const fetchThreadPools = async () => {
    setThreadPoolsLoading(true);
    setThreadPoolsError(null);
    try {
      const response = await elasticService.getThreadPools();
      if (response.success && response.data) {
        setThreadPools(response.data);
      } else {
        setThreadPoolsError(response.error || 'Не удалось получить thread pool');
      }
    } catch (error) {
      setThreadPoolsError(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setThreadPoolsLoading(false);
    }
  };

  const fetchHotThreads = async () => {
    setHotThreadsLoading(true);
    setHotThreadsError(null);
    try {
      const response = await elasticService.getHotThreads();
      if (response.success && response.data) {
        setHotThreads(response.data);
      } else {
        setHotThreadsError(response.error || 'Не удалось получить hot threads');
      }
    } catch (error) {
      setHotThreadsError(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setHotThreadsLoading(false);
    }
  };

  const fetchIndicesIndexingStats = async () => {
    setIndicesIndexingStatsLoading(true);
    setIndicesIndexingStatsError(null);
    try {
      const response = await elasticService.getAllIndicesIndexingStats();
      if (response.success && response.data) {
        setIndicesIndexingStats(response.data);
      } else {
        setIndicesIndexingStatsError(response.error || 'Не удалось получить статистику индексации по индексам');
      }
    } catch (error) {
      setIndicesIndexingStatsError(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setIndicesIndexingStatsLoading(false);
    }
  };

  const fetchNodesIndexingStats = async () => {
    setNodesIndexingStatsLoading(true);
    setNodesIndexingStatsError(null);
    try {
      const response = await elasticService.getNodesIndexingStats();
      if (response.success && response.data) {
        setNodesIndexingStats(response.data);
      } else {
        setNodesIndexingStatsError(response.error || 'Не удалось получить статистику индексации по узлам');
      }
    } catch (error) {
      setNodesIndexingStatsError(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setNodesIndexingStatsLoading(false);
    }
  };

  const fetchSingleIndexStats = async () => {
    if (!selectedIndex) return;
    setSingleIndexStatsLoading(true);
    setSingleIndexStatsError(null);
    setSingleIndexStats(null);
    try {
      const response = await elasticService.getIndexIndexingStats(selectedIndex);
      if (response.success && response.data) {
        setSingleIndexStats(response.data);
      } else {
        setSingleIndexStatsError(response.error || 'Не удалось получить статистику индексации по индексу');
      }
    } catch (error) {
      setSingleIndexStatsError(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setSingleIndexStatsLoading(false);
    }
  };

  const fetchPendingTasks = async () => {
    setPendingTasksLoading(true);
    setPendingTasksError(null);
    try {
      const response = await elasticService.getPendingTasks();
      if (response.success && response.data && Array.isArray(response.data.tasks)) {
        setPendingTasks(response.data.tasks);
      } else if (response.success && response.data && Array.isArray(response.data)) {
        setPendingTasks(response.data);
      } else if (response.success && response.data && response.data.tasks) {
        setPendingTasks(response.data.tasks);
      } else {
        setPendingTasks([]);
      }
    } catch (error) {
      setPendingTasksError(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setPendingTasksLoading(false);
    }
  };

  const fetchActiveTasks = async () => {
    setActiveTasksLoading(true);
    setActiveTasksError(null);
    try {
      const response = await elasticService.getActiveTasks();
      if (response.success && response.data) {
        setActiveTasks(response.data);
      } else {
        setActiveTasksError(response.error || 'Не удалось получить активные задачи');
      }
    } catch (error) {
      setActiveTasksError(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setActiveTasksLoading(false);
    }
  };

  const fetchAllocation = async (body?: any) => {
    setAllocationLoading(true);
    setAllocationError(null);
    try {
      let response;
      if (body) {
        response = await elasticService.getAllocationExplainWithBody(body);
      } else {
        response = await elasticService.getAllocationExplain();
      }
      if (response.success && response.data) {
        setAllocation(response.data);
      } else {
        setAllocationError(response.error || 'Не удалось получить allocation explain');
      }
    } catch (error) {
      setAllocationError(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setAllocationLoading(false);
    }
  };

  const fetchSnapshots = async () => {
    setSnapshotsLoading(true);
    setSnapshotsError(null);
    try {
      const response = await elasticService.getSnapshots();
      if (response.success && response.data) {
        setSnapshots(response.data);
      } else {
        setSnapshotsError(response.error || 'Не удалось получить список снапшотов');
      }
    } catch (error) {
      setSnapshotsError(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setSnapshotsLoading(false);
    }
  };

  const fetchSnapshotStatus = async () => {
    if (!snapshotRepo || !snapshotName) return;
    setSnapshotStatusLoading(true);
    setSnapshotStatusError(null);
    try {
      const response = await elasticService.getSnapshotStatus(snapshotRepo, snapshotName);
      if (response.success && response.data) {
        setSnapshotStatus(response.data);
      } else {
        setSnapshotStatusError(response.error || 'Не удалось получить статус снапшота');
      }
    } catch (error) {
      setSnapshotStatusError(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setSnapshotStatusLoading(false);
    }
  };

  const fetchMergeStats = async () => {
    setMergeStatsLoading(true);
    setMergeStatsError(null);
    try {
      const response = await elasticService.getMergeStats();
      if (response.success && response.data) {
        setMergeStats(response.data);
      } else {
        setMergeStatsError(response.error || 'Не удалось получить статистику merge операций');
      }
    } catch (error) {
      setMergeStatsError(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setMergeStatsLoading(false);
    }
  };

  const fetchAllData = () => {
    fetchClusterHealth();
    fetchNodes();
    fetchIndices();
    fetchRelocatingShards();
    fetchInitializingShards();
    fetchUnassignedShards();
    fetchTotalDocs();
    fetchThreadPools();
    fetchHotThreads();
    fetchIndicesIndexingStats();
    fetchNodesIndexingStats();
    fetchPendingTasks();
    fetchActiveTasks();
    fetchAllocation();
    fetchSnapshots();
    fetchSnapshotStatus();
    fetchMergeStats();
  };

  useEffect(() => {
    fetchAllData();
    
    // Интервал обновления данных
    const interval = setInterval(() => {
      fetchAllData();
    }, 30000); // Обновление каждые 30 секунд
    
    return () => clearInterval(interval);
  }, []);

  // Add handlers for state changes
  const handleSelectedIndexChange = (value: string) => {
    setSelectedIndex(value);
    localStorage.setItem('selectedIndex', value);
  };

  const handleSnapshotRepoChange = (value: string) => {
    setSnapshotRepo(value);
    localStorage.setItem('snapshotRepo', value);
  };

  const handleSnapshotNameChange = (value: string) => {
    setSnapshotName(value);
    localStorage.setItem('snapshotName', value);
  };

  const handleSnapshotSearchChange = (value: string) => {
    setSnapshotSearch(value);
    localStorage.setItem('snapshotSearch', value);
  };

  const handlePendingTasksSort = (field: string) => {
    const newSort = {
      field,
      order: pendingTasksSort.field === field ? (pendingTasksSort.order === 'asc' ? 'desc' : 'asc') : 'desc',
    };
    setPendingTasksSort(newSort);
    localStorage.setItem('pendingTasksSort', JSON.stringify(newSort));
  };

  // --- Снапшоты ---
  const [snapshotsSort, setSnapshotsSort] = useState<{field: string, order: 'asc'|'desc'}>({field: 'id', order: 'asc'});

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <Tabs value={tab} onValueChange={handleTabChange} className="mt-2">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="debug">Debug</TabsTrigger>
          <TabsTrigger value="index-management">Управление индексами</TabsTrigger>
          <TabsTrigger value="charts">Графики</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard">
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
                      {totalDocsLoading ? (
                        <span className="animate-pulse">...</span>
                      ) : totalDocsError ? (
                        <span className="text-red-500">{totalDocsError}</span>
                      ) : totalDocs !== null ? (
                        totalDocs.toLocaleString()
                      ) : 0}
                    </p>
                  </div>
                  <div className="metric-card">
                    <h3 className="font-medium mb-2">Общий размер индексов</h3>
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
            <Accordion type="multiple" className="bg-transparent mt-4">
              <AccordionItem value="indices">
                <AccordionTrigger>Индексы</AccordionTrigger>
                <AccordionContent>
                  <IndicesTable 
                    indices={indices || []}
                    isLoading={indicesLoading}
                    error={indicesError}
                    onRefresh={fetchIndices}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Новый Accordion для Активных задач */}
            <Accordion type="multiple" value={openAccordionActiveTasks} onValueChange={v => { setOpenAccordionActiveTasks(v); localStorage.setItem('openAccordionActiveTasks', JSON.stringify(v)); }}>
              <AccordionItem value="active-tasks">
                <AccordionTrigger>Активные задачи</AccordionTrigger>
                <AccordionContent>
                  <div className="flex justify-end mb-2">
                    <Button variant="outline" onClick={fetchActiveTasks} disabled={activeTasksLoading}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Обновить
                    </Button>
                  </div>
                  {activeTasksLoading ? (
                    <div>Загрузка активных задач...</div>
                  ) : activeTasksError ? (
                    <div className="text-red-500">{activeTasksError}</div>
                  ) : activeTasks && activeTasks.nodes ? (
                    (() => {
                      // Собираем все задачи в массив
                      let tasks: any[] = [];
                      Object.entries(activeTasks.nodes).forEach(([nodeId, node]: any) => {
                        Object.entries(node.tasks || {}).forEach(([taskId, task]: any) => {
                          tasks.push({
                            node: node.name || nodeId,
                            taskId,
                            action: task.action,
                            description: task.description || '-',
                            runningTime: task.running_time_in_nanos ? (task.running_time_in_nanos / 1e9) : 0,
                            status: task.status ? JSON.stringify(task.status) : '-',
                          });
                        });
                      });
                      // Сортировка
                      const {field, order} = activeTasksSort;
                      tasks = tasks.sort((a, b) => {
                        let aValue = a[field], bValue = b[field];
                        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
                        if (typeof bValue === 'string') bValue = bValue.toLowerCase();
                        if (aValue === bValue) return 0;
                        if (order === 'asc') return aValue > bValue ? 1 : -1;
                        return aValue < bValue ? 1 : -1;
                      });
                      const handleSort = (field: string) => {
                        const newSort = {
                          field,
                          order: activeTasksSort.field === field ? (activeTasksSort.order === 'asc' ? 'desc' : 'asc') : 'desc',
                        };
                        setActiveTasksSort(newSort);
                        localStorage.setItem('activeTasksSort', JSON.stringify(newSort));
                      };
                      return (
                        <div className="bg-muted p-2 rounded overflow-x-auto">
                          <table className="min-w-full text-xs">
                            <thead>
                              <tr>
                                <th className="px-2 py-1 text-left cursor-pointer" onClick={() => handleSort('node')}>Узел {activeTasksSort.field === 'node' ? (activeTasksSort.order === 'asc' ? '▲' : '▼') : ''}</th>
                                <th className="px-2 py-1 text-left cursor-pointer" onClick={() => handleSort('taskId')}>ID задачи {activeTasksSort.field === 'taskId' ? (activeTasksSort.order === 'asc' ? '▲' : '▼') : ''}</th>
                                <th className="px-2 py-1 text-left cursor-pointer" onClick={() => handleSort('action')}>Тип {activeTasksSort.field === 'action' ? (activeTasksSort.order === 'asc' ? '▲' : '▼') : ''}</th>
                                <th className="px-2 py-1 text-left cursor-pointer" onClick={() => handleSort('description')}>Описание {activeTasksSort.field === 'description' ? (activeTasksSort.order === 'asc' ? '▲' : '▼') : ''}</th>
                                <th className="px-2 py-1 text-left cursor-pointer" onClick={() => handleSort('runningTime')}>Время выполнения {activeTasksSort.field === 'runningTime' ? (activeTasksSort.order === 'asc' ? '▲' : '▼') : ''}</th>
                                <th className="px-2 py-1 text-left cursor-pointer" onClick={() => handleSort('status')}>Статус {activeTasksSort.field === 'status' ? (activeTasksSort.order === 'asc' ? '▲' : '▼') : ''}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {tasks.map((task, idx) => (
                                <tr key={idx}>
                                  <td className="px-2 py-1">{task.node}</td>
                                  <td className="px-2 py-1">{task.taskId}</td>
                                  <td className="px-2 py-1">{task.action}</td>
                                  <td className="px-2 py-1">{task.description}</td>
                                  <td className="px-2 py-1">{task.runningTime.toFixed(2)} сек</td>
                                  <td className="px-2 py-1" style={{maxWidth: 300, whiteSpace: 'pre-wrap', wordBreak: 'break-all'}}>
                                    {task.status && task.status !== '-' ? (
                                      <pre className="whitespace-pre-wrap max-w-xs overflow-x-auto">{task.status}</pre>
                                    ) : '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="text-muted-foreground">Нет активных задач</div>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            {/* Relocating, Initializing, Unassigned Shards */}
            <Accordion type="multiple" value={openAccordionReloc} onValueChange={v => { setOpenAccordionReloc(v); localStorage.setItem('openAccordionReloc', JSON.stringify(v)); }}>
              <AccordionItem value="relocating">
                <AccordionTrigger>Перемещаемые шарды</AccordionTrigger>
                <AccordionContent>
                  <div className="flex justify-end mb-2">
                    <Button variant="outline" onClick={fetchRelocatingShards} disabled={relocatingLoading}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Обновить
                    </Button>
                  </div>
                  {relocatingLoading ? (
                    <div className="metric-card">Загрузка перемещаемых шардов...</div>
                  ) : relocatingError ? (
                    <div className="metric-card text-red-500">{relocatingError}</div>
                  ) : (
                    <div className="metric-card">
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
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="initializing">
                <AccordionTrigger>Инициализируемые шарды</AccordionTrigger>
                <AccordionContent>
                  <div className="flex justify-end mb-2">
                    <Button variant="outline" onClick={fetchInitializingShards} disabled={initializingLoading}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Обновить
                    </Button>
                  </div>
                  {initializingLoading ? (
                    <div className="metric-card">Загрузка инициализируемых шардов...</div>
                  ) : initializingError ? (
                    <div className="metric-card text-red-500">{initializingError}</div>
                  ) : (
                    <div className="metric-card">
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
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="unassigned">
                <AccordionTrigger>Неназначенные шарды</AccordionTrigger>
                <AccordionContent>
                  <div className="flex justify-end mb-2">
                    <Button variant="outline" onClick={fetchUnassignedShards} disabled={unassignedLoading}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Обновить
                    </Button>
                  </div>
                  {unassignedLoading ? (
                    <div className="metric-card">Загрузка неназначенных шардов...</div>
                  ) : unassignedError ? (
                    <div className="metric-card text-red-500">Ошибка загрузки неназначенных шардов</div>
                  ) : (
                    <div className="metric-card">
                      {unassignedShards.length > 0 ? (
                        <div className="space-y-2">
                          {unassignedShards.map((shard, index) => (
                            <div key={index} className="text-sm">
                              <span className="font-medium">{shard.index}</span>
                              <span className="text-muted-foreground"> (шард {shard.shard})</span>
                              {shard.reason && (
                                <span className="text-muted-foreground"> - {shard.reason}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-muted-foreground">Нет неназначенных шардов</div>
                      )}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </TabsContent>
        <TabsContent value="debug">
          <div className="flex-grow p-6 space-y-6">
            {/* Thread Pool */}
            <div className="metric-card mt-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">Thread Pool</h3>
                <Button variant="outline" onClick={fetchThreadPools} disabled={threadPoolsLoading}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Обновить
                </Button>
              </div>
              {threadPoolsLoading ? (
                <div>Загрузка thread pool...</div>
              ) : threadPoolsError ? (
                <div className="text-red-500">{threadPoolsError}</div>
              ) : (
                <Accordion type="multiple" value={openAccordionThreadPool} onValueChange={v => { setOpenAccordionThreadPool(v); localStorage.setItem('openAccordionThreadPool', JSON.stringify(v)); }}>
                  {threadPools.map((node: any) => {
                    const sort = threadSort[node.nodeId] || {field: 'name', order: 'asc'};
                    const sortedPools = [...node.pools].sort((a, b) => {
                      let aValue = a[sort.field], bValue = b[sort.field];
                      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
                      if (typeof bValue === 'string') bValue = bValue.toLowerCase();
                      if (aValue === bValue) return 0;
                      if (sort.order === 'asc') return aValue > bValue ? 1 : -1;
                      return aValue < bValue ? 1 : -1;
                    });
                    const handleSort = (field: string) => {
                      const newSort = {
                        ...threadSort,
                        [node.nodeId]: {
                          field,
                          order: sort.field === field ? (sort.order === 'asc' ? 'desc' : 'asc') : 'desc',
                        }
                      };
                      setThreadSort(newSort);
                      localStorage.setItem('threadSort', JSON.stringify(newSort));
                    };
                    const open = openAccordionThreadPool[node.nodeId] || false;
                    const toggle = () => {
                      const newState = {
                        ...openAccordionThreadPool,
                        [node.nodeId]: !openAccordionThreadPool[node.nodeId]
                      };
                      setOpenAccordionThreadPool(newState);
                      localStorage.setItem('openAccordionThreadPool', JSON.stringify(newState));
                    };
                    return (
                      <div key={node.nodeId} className="mb-2">
                        <button
                          className="text-left font-semibold mb-1 focus:outline-none hover:underline"
                          onClick={toggle}
                        >
                          {open ? '▼' : '►'} {node.nodeName}
                        </button>
                        {open && (
                          <div className="bg-muted p-2 rounded overflow-x-auto">
                            <table className="min-w-full text-xs">
                              <thead>
                                <tr>
                                  <th className="px-2 py-1 text-left cursor-pointer" onClick={() => handleSort('name')}>Pool {sort.field === 'name' ? (sort.order === 'asc' ? '▲' : '▼') : ''}</th>
                                  <th className="px-2 py-1 text-left cursor-pointer" onClick={() => handleSort('active')}>Active {sort.field === 'active' ? (sort.order === 'asc' ? '▲' : '▼') : ''}</th>
                                  <th className="px-2 py-1 text-left cursor-pointer" onClick={() => handleSort('queue')}>Queue {sort.field === 'queue' ? (sort.order === 'asc' ? '▲' : '▼') : ''}</th>
                                  <th className="px-2 py-1 text-left cursor-pointer" onClick={() => handleSort('rejected')}>Rejected {sort.field === 'rejected' ? (sort.order === 'asc' ? '▲' : '▼') : ''}</th>
                                  <th className="px-2 py-1 text-left cursor-pointer" onClick={() => handleSort('completed')}>Completed {sort.field === 'completed' ? (sort.order === 'asc' ? '▲' : '▼') : ''}</th>
                                  <th className="px-2 py-1 text-left cursor-pointer" onClick={() => handleSort('threads')}>Threads {sort.field === 'threads' ? (sort.order === 'asc' ? '▲' : '▼') : ''}</th>
                                  <th className="px-2 py-1 text-left cursor-pointer" onClick={() => handleSort('largest')}>Largest {sort.field === 'largest' ? (sort.order === 'asc' ? '▲' : '▼') : ''}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sortedPools.map((pool, idx) => (
                                  <tr key={pool.name + idx}>
                                    <td className="px-2 py-1 font-medium">{pool.name}</td>
                                    <td className="px-2 py-1">{pool.active}</td>
                                    <td className="px-2 py-1">{pool.queue}</td>
                                    <td className="px-2 py-1">{pool.rejected}</td>
                                    <td className="px-2 py-1">{pool.completed}</td>
                                    <td className="px-2 py-1">{pool.threads}</td>
                                    <td className="px-2 py-1">{pool.largest}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </Accordion>
              )}
            </div>
            {/* Hot Threads */}
            <Accordion type="multiple" value={openAccordionHotThreads} onValueChange={v => { setOpenAccordionHotThreads(v); localStorage.setItem('openAccordionHotThreads', JSON.stringify(v)); }}>
              <AccordionItem value="hot-threads">
                <AccordionTrigger>Hot Threads</AccordionTrigger>
                <AccordionContent>
                  <div className="flex justify-end mb-2">
                    <Button variant="outline" onClick={fetchHotThreads} disabled={hotThreadsLoading}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Обновить
                    </Button>
                  </div>
                  {hotThreadsLoading ? (
                    <div>Загрузка hot threads...</div>
                  ) : hotThreadsError ? (
                    <div className="text-red-500">{hotThreadsError}</div>
                  ) : hotThreads ? (
                    <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-96 whitespace-pre-wrap">{hotThreads}</pre>
                  ) : (
                    <div className="text-muted-foreground">Нет данных о hot threads</div>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            {/* Очередь задач */}
            <Accordion type="multiple" value={openAccordionPendingTasks} onValueChange={v => { setOpenAccordionPendingTasks(v); localStorage.setItem('openAccordionPendingTasks', JSON.stringify(v)); }}>
              <AccordionItem value="pending-tasks">
                <AccordionTrigger>Очередь задач</AccordionTrigger>
                <AccordionContent>
                  <div className="flex justify-end mb-2">
                    <Button variant="outline" onClick={fetchPendingTasks} disabled={pendingTasksLoading}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Обновить
                    </Button>
                  </div>
                  {pendingTasksLoading ? (
                    <div>Загрузка очереди задач...</div>
                  ) : pendingTasksError ? (
                    <div className="text-red-500">{pendingTasksError}</div>
                  ) : pendingTasks && pendingTasks.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead>
                          <tr>
                            <th className="px-2 py-1 text-left">#</th>
                            <th className="px-2 py-1 text-left">Время в очереди</th>
                            <th className="px-2 py-1 text-left">Приоритет</th>
                            <th className="px-2 py-1 text-left">Источник</th>
                            <th className="px-2 py-1 text-left">Описание</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingTasks.map((task, idx) => (
                            <tr key={idx}>
                              <td className="px-2 py-1">{task.insert_order ?? idx + 1}</td>
                              <td className="px-2 py-1">{task.time_in_queue || (task.time_in_queue_millis ? (task.time_in_queue_millis / 1000).toFixed(2) + ' сек' : '-')}</td>
                              <td className="px-2 py-1">{task.priority}</td>
                              <td className="px-2 py-1">{task.source}</td>
                              <td className="px-2 py-1">{task.task || task.description || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">Нет задач в очереди</div>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            {/* Время индексации по индексам */}
            <Accordion type="multiple" value={openAccordionIndexingStatsIndices} onValueChange={v => { setOpenAccordionIndexingStatsIndices(v); localStorage.setItem('openAccordionIndexingStatsIndices', JSON.stringify(v)); }}>
              <AccordionItem value="indexing-stats-indices">
                <AccordionTrigger>Время индексации по индексам</AccordionTrigger>
                <AccordionContent>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      className="border rounded px-2 py-1 text-xs bg-background text-foreground"
                      placeholder="Введите имя индекса"
                      value={selectedIndex}
                      onChange={e => handleSelectedIndexChange(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') fetchSingleIndexStats(); }}
                      style={{ minWidth: 200 }}
                    />
                    <Button variant="outline" onClick={fetchSingleIndexStats} disabled={!selectedIndex || singleIndexStatsLoading}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Обновить
                    </Button>
                  </div>
                  {singleIndexStatsLoading ? (
                    <div>Загрузка...</div>
                  ) : singleIndexStatsError ? (
                    <div className="text-red-500">{singleIndexStatsError}</div>
                  ) : singleIndexStats && singleIndexStats.indices && singleIndexStats.indices[selectedIndex] ? (
                    (() => {
                      const stats = singleIndexStats.indices[selectedIndex];
                      const total = stats.total?.indexing || {};
                      return (
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-xs">
                            <thead>
                              <tr>
                                <th className="px-2 py-1 text-left">Индекс</th>
                                <th className="px-2 py-1 text-left">index_total</th>
                                <th className="px-2 py-1 text-left">index_time_in_millis</th>
                                <th className="px-2 py-1 text-left">index_failed</th>
                                <th className="px-2 py-1 text-left">delete_total</th>
                                <th className="px-2 py-1 text-left">delete_time_in_millis</th>
                                <th className="px-2 py-1 text-left">noop_update_total</th>
                                <th className="px-2 py-1 text-left">is_throttled</th>
                                <th className="px-2 py-1 text-left">throttle_time_in_millis</th>
                                <th className="px-2 py-1 text-left">write_load</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="px-2 py-1 font-medium">{selectedIndex}</td>
                                <td className="px-2 py-1">{total.index_total ?? '-'}</td>
                                <td className="px-2 py-1">{total.index_time_in_millis !== undefined ? (total.index_time_in_millis / 1000).toLocaleString(undefined, {maximumFractionDigits: 2}) + ' сек' : '-'}</td>
                                <td className="px-2 py-1">{total.index_failed ?? '-'}</td>
                                <td className="px-2 py-1">{total.delete_total ?? '-'}</td>
                                <td className="px-2 py-1">{total.delete_time_in_millis !== undefined ? (total.delete_time_in_millis / 1000).toLocaleString(undefined, {maximumFractionDigits: 2}) + ' сек' : '-'}</td>
                                <td className="px-2 py-1">{total.noop_update_total ?? '-'}</td>
                                <td className="px-2 py-1">{total.is_throttled !== undefined ? (total.is_throttled ? 'Да' : 'Нет') : '-'}</td>
                                <td className="px-2 py-1">{total.throttle_time_in_millis !== undefined ? (total.throttle_time_in_millis / 1000).toLocaleString(undefined, {maximumFractionDigits: 2}) + ' сек' : '-'}</td>
                                <td className="px-2 py-1">{total.write_load ?? '-'}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="text-muted-foreground">Нет данных</div>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            {/* Время индексации по узлам */}
            <Accordion type="multiple" value={openAccordionIndexingStatsNodes} onValueChange={v => { setOpenAccordionIndexingStatsNodes(v); localStorage.setItem('openAccordionIndexingStatsNodes', JSON.stringify(v)); }}>
              <AccordionItem value="indexing-stats-nodes">
                <AccordionTrigger>Время индексации по узлам</AccordionTrigger>
                <AccordionContent>
                  <div className="flex justify-end mb-2">
                    <Button variant="outline" onClick={fetchNodesIndexingStats} disabled={nodesIndexingStatsLoading}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Обновить
                    </Button>
                  </div>
                  {nodesIndexingStatsLoading ? (
                    <div>Загрузка...</div>
                  ) : nodesIndexingStatsError ? (
                    <div className="text-red-500">{nodesIndexingStatsError}</div>
                  ) : nodesIndexingStats && nodesIndexingStats.nodes ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead>
                          <tr>
                            <th className="px-2 py-1 text-left cursor-pointer" onClick={() => {
                              const newSort = {
                                field: 'nodeId',
                                order: indexingNodesSort.field === 'nodeId' ? (indexingNodesSort.order === 'asc' ? 'desc' : 'asc') : 'asc'
                              };
                              setIndexingNodesSort(newSort);
                              localStorage.setItem('indexingNodesSort', JSON.stringify(newSort));
                            }}>
                              Узел {indexingNodesSort.field === 'nodeId' ? (indexingNodesSort.order === 'asc' ? '▲' : '▼') : ''}
                            </th>
                            <th className="px-2 py-1 text-left cursor-pointer" onClick={() => {
                              const newSort = {
                                field: 'time',
                                order: indexingNodesSort.field === 'time' ? (indexingNodesSort.order === 'asc' ? 'desc' : 'asc') : 'desc'
                              };
                              setIndexingNodesSort(newSort);
                              localStorage.setItem('indexingNodesSort', JSON.stringify(newSort));
                            }}>
                              Время индексации {indexingNodesSort.field === 'time' ? (indexingNodesSort.order === 'asc' ? '▲' : '▼') : ''}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(nodesIndexingStats.nodes)
                            .map(([nodeId, node]: [string, any]) => ({
                              nodeId,
                              nodeName: node.name || nodeId,
                              time: node.indices?.indexing?.index_time_in_millis || 0
                            }))
                            .sort((a, b) => {
                              if (indexingNodesSort.field === 'nodeId') {
                                return indexingNodesSort.order === 'asc' 
                                  ? a.nodeId.localeCompare(b.nodeId)
                                  : b.nodeId.localeCompare(a.nodeId);
                              } else {
                                return indexingNodesSort.order === 'asc'
                                  ? a.time - b.time
                                  : b.time - a.time;
                              }
                            })
                            .map(({ nodeId, nodeName, time }) => (
                              <tr key={nodeId}>
                                <td className="px-2 py-1">{nodeName}</td>
                                <td className="px-2 py-1">{(time / 1000).toLocaleString(undefined, {maximumFractionDigits: 2})} сек</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">Нет данных</div>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            {/* Снапшоты */}
            <Accordion type="multiple" value={openAccordionSnapshots} onValueChange={v => { setOpenAccordionSnapshots(v); localStorage.setItem('openAccordionSnapshots', JSON.stringify(v)); }}>
              <AccordionItem value="snapshots">
                <AccordionTrigger>Снапшоты</AccordionTrigger>
                <AccordionContent>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      className="border rounded px-2 py-1 text-xs bg-background text-foreground"
                      placeholder="Поиск по имени снапшота"
                      value={snapshotSearch}
                      onChange={e => handleSnapshotSearchChange(e.target.value)}
                      style={{ minWidth: 200 }}
                    />
                    <Button variant="outline" onClick={fetchSnapshots} disabled={snapshotsLoading}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Обновить
                    </Button>
                  </div>
                  {snapshotsLoading ? (
                    <div>Загрузка снапшотов...</div>
                  ) : snapshotsError ? (
                    <div className="text-red-500">{snapshotsError}</div>
                  ) : snapshots && typeof snapshots === 'string' ? (
                    (() => {
                      const lines = snapshots.trim().split('\n');
                      if (lines.length < 2) return <div className="text-muted-foreground">Нет данных о снапшотах</div>;
                      const headers = lines[0].split(/\s+/);
                      const rows = lines.slice(1).map(line => line.split(/\s+/));
                      const filteredRows = rows.filter(row => !snapshotSearch || row[0]?.includes(snapshotSearch));
                      // сортировка
                      const {field, order} = snapshotsSort;
                      const headerIdx = (name: string) => headers.findIndex(h => h === name);
                      const sortedRows = [...filteredRows].sort((a, b) => {
                        const idx = headerIdx(field);
                        let aValue = a[idx], bValue = b[idx];
                        // Попробуем привести к числу, если возможно
                        if (!isNaN(Number(aValue)) && !isNaN(Number(bValue))) {
                          aValue = Number(aValue);
                          bValue = Number(bValue);
                        }
                        if (aValue === bValue) return 0;
                        if (order === 'asc') return aValue > bValue ? 1 : -1;
                        return aValue < bValue ? 1 : -1;
                      });
                      return (
                        <div className="bg-muted p-2 rounded overflow-x-auto">
                          <table className="min-w-full text-xs">
                            <thead>
                              <tr>
                                {headers.map((h, i) => (
                                  <th key={i} className="px-2 py-1 text-left cursor-pointer" onClick={() => {
                                    setSnapshotsSort(s => ({field: h, order: s.field === h && s.order === 'asc' ? 'desc' : 'asc'}));
                                  }}>
                                    {h} {snapshotsSort.field === h ? (snapshotsSort.order === 'asc' ? '▲' : '▼') : ''}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {sortedRows.map((row, idx) => (
                                <tr key={idx}>
                                  {row.map((cell, i) => <td key={i} className="px-2 py-1">{cell}</td>)}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="text-muted-foreground">Нет данных о снапшотах</div>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            {/* Allocation Explain */}
            <Accordion type="multiple" value={openAccordionAllocationExplain} onValueChange={v => { setOpenAccordionAllocationExplain(v); localStorage.setItem('openAccordionAllocationExplain', JSON.stringify(v)); }}>
              <AccordionItem value="allocation-explain">
                <AccordionTrigger>Allocation Explain</AccordionTrigger>
                <AccordionContent>
                  <div className="flex flex-col gap-2 mb-2 md:flex-row md:items-end md:gap-4">
                    <Button variant="outline" onClick={() => fetchAllocation()} disabled={allocationLoading}>
                      Случайный шард
                    </Button>
                    <input
                      type="text"
                      className="border rounded px-2 py-1 text-xs bg-background text-foreground"
                      placeholder="Индекс"
                      value={allocIndex}
                      onChange={e => setAllocIndex(e.target.value)}
                      style={{ minWidth: 120 }}
                    />
                    <input
                      type="number"
                      className="border rounded px-2 py-1 text-xs bg-background text-foreground"
                      placeholder="Шард"
                      value={allocShard}
                      onChange={e => setAllocShard(e.target.value)}
                      style={{ minWidth: 80 }}
                    />
                    <label className="flex items-center gap-1 text-xs" title="Primary — основной шард, если не отмечено — реплика">
                      <input
                        type="checkbox"
                        checked={allocPrimary}
                        onChange={e => setAllocPrimary(e.target.checked)}
                      />
                      primary
                    </label>
                    <Button
                      variant="outline"
                      onClick={() => fetchAllocation({ index: allocIndex, shard: Number(allocShard), primary: allocPrimary })}
                      disabled={allocationLoading || !allocIndex || allocShard === ''}
                    >
                      Анализировать конкретный шард
                    </Button>
                  </div>
                  {allocationLoading ? (
                    <div>Загрузка allocation explain...</div>
                  ) : allocationError ? (
                    /400/.test(allocationError)
                      ? <div className="text-muted-foreground">Нет UNASSIGNED шардов</div>
                      : <div className="text-red-500">{allocationError}</div>
                  ) : allocation ? (
                    (() => {
                      const str = typeof allocation === 'string' ? allocation : JSON.stringify(allocation, null, 2);
                      return <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-96 whitespace-pre-wrap">{str}</pre>;
                    })()
                  ) : (
                    <div className="text-muted-foreground">Нет данных allocation explain</div>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            {/* Статус восстановления снапшота */}
            <Accordion type="multiple" value={openAccordionSnapshotStatus} onValueChange={v => { setOpenAccordionSnapshotStatus(v); localStorage.setItem('openAccordionSnapshotStatus', JSON.stringify(v)); }}>
              <AccordionItem value="snapshot-status">
                <AccordionTrigger>Статус восстановления снапшота</AccordionTrigger>
                <AccordionContent>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      className="border rounded px-2 py-1 text-xs bg-background text-foreground"
                      placeholder="Имя репозитория"
                      value={snapshotRepo}
                      onChange={e => handleSnapshotRepoChange(e.target.value)}
                      style={{ minWidth: 200 }}
                    />
                    <input
                      type="text"
                      className="border rounded px-2 py-1 text-xs bg-background text-foreground"
                      placeholder="Имя снапшота"
                      value={snapshotName}
                      onChange={e => handleSnapshotNameChange(e.target.value)}
                      style={{ minWidth: 200 }}
                    />
                    <Button variant="outline" onClick={fetchSnapshotStatus} disabled={!snapshotRepo || !snapshotName || snapshotStatusLoading}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Обновить
                    </Button>
                  </div>
                  {snapshotStatusLoading ? (
                    <div>Загрузка статуса снапшота...</div>
                  ) : snapshotStatusError ? (
                    <div className="text-red-500">{snapshotStatusError}</div>
                  ) : snapshotStatus ? (
                    <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-96 whitespace-pre-wrap">{typeof snapshotStatus === 'string' ? snapshotStatus : JSON.stringify(snapshotStatus, null, 2)}</pre>
                  ) : (
                    <div className="text-muted-foreground">Нет данных о статусе снапшота</div>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </TabsContent>
        <TabsContent value="index-management">
          <div className="flex-grow p-6 space-y-6">
            <IndexManagement />
          </div>
        </TabsContent>
        <TabsContent value="charts">
          <ChartsPage />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DashboardPage;
