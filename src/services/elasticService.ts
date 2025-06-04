// Сервис для работы с Elasticsearch API
export interface ElasticConnectionConfig {
  url: string;
  username: string;
  password: string;
}

export interface ClusterHealth {
  clusterName: string;
  status: 'green' | 'yellow' | 'red';
  numberOfNodes: number;
  activeShards: number;
  activePrimaryShards: number;
  relocatingShards: number;
  initializingShards: number;
  unassignedShards: number;
}

export interface Node {
  id: string;
  name: string;
  version: string;
  roles: string[];
  host: string;
  ip: string;
  diskAvailable: string;
  diskTotal: string;
  diskFree: string;
  diskAvailableRaw: number;
  diskTotalRaw: number;
  diskFreeRaw: number;
  cpuUsage: number;
  memoryUsage: number;
  heapPercent: number;
  ramPercent?: number;
  ramUsed?: number;
  ramTotal?: number;
  ramUsedStr?: string;
  ramTotalStr?: string;
  status: 'green' | 'yellow' | 'red';
  load1m?: number;
  load5m?: number;
  load15m?: number;
}

export interface IndexInfo {
  name: string;
  status: 'green' | 'yellow' | 'red';
  docsCount: number;
  storageSize: string;
  primaryShards: number;
  replicaShards: number;
}

interface ElasticApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface RelocatingShardInfo {
  index: string;
  shard: string;
  fromNode: string;
  toNode: string;
  state: string;
}

interface InitializingShardInfo {
  index: string;
  shard: string;
  node: string;
  state: string;
}

interface UnassignedShardInfo {
  index: string;
  shard: string;
  node: string;
  state: string;
}

interface ThreadPoolInfo {
  nodeId: string;
  nodeName: string;
  pools: Array<{
    name: string;
    active: number;
    queue: number;
    rejected: number;
    completed: number;
    threads: number;
    largest: number;
    // можно добавить другие поля при необходимости
  }>;
}

class ElasticService {
  private config: ElasticConnectionConfig | null = null;

  setConfig(config: ElasticConnectionConfig) {
    this.config = config;
    localStorage.setItem('elasticConfig', JSON.stringify(config));
  }

  getConfig(): ElasticConnectionConfig | null {
    if (this.config) return this.config;
    
    const storedConfig = localStorage.getItem('elasticConfig');
    if (storedConfig) {
      this.config = JSON.parse(storedConfig);
      return this.config;
    }
    
    return null;
  }

  clearConfig() {
    this.config = null;
    localStorage.removeItem('elasticConfig');
  }

  isConfigured(): boolean {
    return !!this.getConfig();
  }

  private async fetchWithAuth<T>(endpoint: string, asText = false): Promise<ElasticApiResponse<T>> {
    const config = this.getConfig();
    
    if (!config) {
      return { success: false, error: 'Нет данных для подключения к Elasticsearch' };
    }
    
    const headers = new Headers();
    headers.set('Authorization', 'Basic ' + btoa(`${config.username}:${config.password}`));
    headers.set('Content-Type', 'application/json');
    // Прямой запрос к Elasticsearch, без прокси и без X-Elasticsearch-URL

    try {
      // Формируем полный URL для запроса напрямую к Elasticsearch
      const url = config.url.replace(/\/$/, '') + endpoint;
      const response = await fetch(url, {
        method: 'GET',
        headers
      });
      
      if (!response.ok) {
        return { 
          success: false, 
          error: `Ошибка API: ${response.status} ${response.statusText}` 
        };
      }
      
      const data = asText ? await response.text() : await response.json();
      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: `Ошибка подключения: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const result = await this.fetchWithAuth<any>('/');
      return result.success;
    } catch (error) {
      console.error('Ошибка при проверке подключения:', error);
      return false;
    }
  }

  async getClusterHealth(): Promise<ElasticApiResponse<ClusterHealth>> {
    try {
      const result = await this.fetchWithAuth<any>('/_cluster/health');
      
      if (!result.success) return result;
      
      const data = result.data;
      
      const health: ClusterHealth = {
        clusterName: data.cluster_name,
        status: data.status,
        numberOfNodes: data.number_of_nodes,
        activeShards: data.active_shards,
        activePrimaryShards: data.active_primary_shards,
        relocatingShards: data.relocating_shards,
        initializingShards: data.initializing_shards,
        unassignedShards: data.unassigned_shards
      };
      
      return { success: true, data: health };
    } catch (error) {
      return { 
        success: false, 
        error: `Ошибка получения здоровья кластера: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }

  async getNodes(): Promise<ElasticApiResponse<Node[]>> {
    try {
      // Получаем статистику по нодам
      const statsResult = await this.fetchWithAuth<any>('/_nodes/stats');
      if (!statsResult.success) return statsResult;
      const nodesStats = statsResult.data?.nodes;
      if (!nodesStats || typeof nodesStats !== 'object') {
        return {
          success: false,
          error: 'Ошибка формата данных: информация о нодах отсутствует или имеет неверный формат'
        };
      }
      // Получаем версии по нодам
      const versionResult = await this.fetchWithAuth<any>('/_nodes/_all/version');
      if (!versionResult.success) return versionResult;
      const nodesVersion = versionResult.data?.nodes;
      // Собираем данные по нодам
      const nodes: Node[] = Object.keys(nodesStats).map(nodeId => {
        const node = nodesStats[nodeId];
        const totalDiskBytes = node.fs?.total?.total_in_bytes || 0;
        const availableDiskBytes = node.fs?.total?.available_in_bytes || 0;
        const freeDiskBytes = node.fs?.total?.free_in_bytes || 0;
        const cpuUsage = node.process?.cpu?.percent || 0;
        const heapPercent = node.jvm?.mem?.heap_used_percent || 0;
        const memoryUsage = heapPercent;
        let status: 'green' | 'yellow' | 'red' = 'green';
        if (heapPercent > 85 || cpuUsage > 85) {
          status = 'red';
        } else if (heapPercent > 70 || cpuUsage > 70) {
          status = 'yellow';
        }
        // Получаем версию для этой ноды
        let version = '';
        if (nodesVersion && nodesVersion[nodeId] && nodesVersion[nodeId].version) {
          version = nodesVersion[nodeId].version;
        }
        // RAM (оперативная память) и Load Average из os
        let ramPercent, ramUsed, ramTotal, ramUsedStr, ramTotalStr, load1m, load5m, load15m;
        if (node.os && node.os.mem) {
          ramPercent = node.os.mem.used_percent;
          ramUsed = node.os.mem.used_in_bytes;
          ramTotal = node.os.mem.total_in_bytes;
          ramUsedStr = this.formatBytes(ramUsed);
          ramTotalStr = this.formatBytes(ramTotal);
        }
        if (node.os && node.os.cpu && node.os.cpu.load_average) {
          load1m = node.os.cpu.load_average['1m'];
          load5m = node.os.cpu.load_average['5m'];
          load15m = node.os.cpu.load_average['15m'];
        }
        return {
          id: nodeId,
          name: node.name,
          version,
          roles: node.roles || [],
          host: node.host || '',
          ip: node.ip || '',
          diskAvailable: this.formatBytes(availableDiskBytes),
          diskTotal: this.formatBytes(totalDiskBytes),
          diskFree: this.formatBytes(freeDiskBytes),
          diskAvailableRaw: availableDiskBytes,
          diskTotalRaw: totalDiskBytes,
          diskFreeRaw: freeDiskBytes,
          cpuUsage,
          memoryUsage,
          heapPercent,
          ramPercent,
          ramUsed,
          ramTotal,
          ramUsedStr,
          ramTotalStr,
          status,
          load1m,
          load5m,
          load15m
        };
      });
      return { success: true, data: nodes };
    } catch (error) {
      console.error('Ошибка при получении информации о нодах:', error);
      return {
        success: false,
        error: `Ошибка получения информации о нодах: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  async getIndices(): Promise<ElasticApiResponse<IndexInfo[]>> {
    try {
      const result = await this.fetchWithAuth<any>('/_cat/indices?format=json');
      
      if (!result.success) return result;
      
      // Проверяем, что result.data существует и является массивом
      if (!Array.isArray(result.data)) {
        console.error('Данные индексов не являются массивом:', result.data);
        return { 
          success: false, 
          error: 'Ошибка формата данных: информация об индексах имеет неверный формат' 
        };
      }
      
      const indices: IndexInfo[] = result.data.map((index: any) => {
        return {
          name: index.index || '',
          status: index.health || 'red',
          docsCount: parseInt(index['docs.count'] || '0', 10),
          storageSize: index['store.size'] || '0b',
          primaryShards: parseInt(index.pri || '0', 10),
          replicaShards: parseInt(index.rep || '0', 10)
        };
      });
      
      return { success: true, data: indices };
    } catch (error) {
      console.error('Ошибка при получении информации об индексах:', error);
      return { 
        success: false, 
        error: `Ошибка получения информации об индексах: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }

  async getRelocatingShards(): Promise<ElasticApiResponse<RelocatingShardInfo[]>> {
    try {
      const result = await this.fetchWithAuth<any>(
        '/_cat/shards?format=json'
      );
      if (!result.success) return result;
      if (!Array.isArray(result.data)) {
        return {
          success: false,
          error: 'Ошибка формата данных: информация о шардах имеет неверный формат',
        };
      }
      // Фильтруем только RELOCATING
      const relocating = result.data.filter((shard: any) => shard.state === 'RELOCATING');
      const relocatingShards: RelocatingShardInfo[] = relocating.map((shard: any) => {
        const nodeField = shard['node'] || '';
        const [fromNode, rest] = nodeField.split('->').map(s => s.trim());
        // Имя ноды назначения — последнее слово после '->'
        let toNode = '';
        if (rest) {
          const parts = rest.split(' ');
          toNode = parts[parts.length - 1];
        }
        return {
          index: shard.index,
          shard: shard.shard,
          fromNode,
          toNode,
          state: shard.state,
        };
      });
      return { success: true, data: relocatingShards };
    } catch (error) {
      return {
        success: false,
        error: `Ошибка получения перемещаемых шардов: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async getInitializingShards(): Promise<ElasticApiResponse<InitializingShardInfo[]>> {
    try {
      const result = await this.fetchWithAuth<any>(
        '/_cat/shards?format=json'
      );
      if (!result.success) return result;
      if (!Array.isArray(result.data)) {
        return {
          success: false,
          error: 'Ошибка формата данных: информация о шардах имеет неверный формат',
        };
      }
      // Фильтруем только INITIALIZING
      const initializing = result.data.filter((shard: any) => shard.state === 'INITIALIZING');
      const initializingShards: InitializingShardInfo[] = initializing.map((shard: any) => ({
        index: shard.index,
        shard: shard.shard,
        node: shard['node'],
        state: shard.state,
      }));
      return { success: true, data: initializingShards };
    } catch (error) {
      return {
        success: false,
        error: `Ошибка получения инициализируемых шардов: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async getUnassignedShards(): Promise<ElasticApiResponse<UnassignedShardInfo[]>> {
    try {
      const result = await this.fetchWithAuth<any>('/_cat/shards?format=json');
      if (!result.success) return result;
      if (!Array.isArray(result.data)) {
        return {
          success: false,
          error: 'Ошибка формата данных: информация о шардах имеет неверный формат',
        };
      }
      // Фильтруем только UNASSIGNED
      const unassigned = result.data.filter((shard: any) => shard.state === 'UNASSIGNED');
      const unassignedShards: UnassignedShardInfo[] = unassigned.map((shard: any) => ({
        index: shard.index,
        shard: shard.shard,
        node: shard['node'] || '',
        state: shard.state,
      }));
      return { success: true, data: unassignedShards };
    } catch (error) {
      return {
        success: false,
        error: `Ошибка получения неназначенных шардов: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async getTotalDocsCount(): Promise<ElasticApiResponse<number>> {
    try {
      const result = await this.fetchWithAuth<any>('/_cat/count?v&format=json');
      if (!result.success) return result;
      if (!Array.isArray(result.data) || result.data.length === 0) {
        return {
          success: false,
          error: 'Ошибка формата данных: не удалось получить общее количество документов',
        };
      }
      const count = parseInt(result.data[0].count, 10);
      return { success: true, data: count };
    } catch (error) {
      return {
        success: false,
        error: `Ошибка получения общего количества документов: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async getThreadPools(): Promise<ElasticApiResponse<ThreadPoolInfo[]>> {
    try {
      const result = await this.fetchWithAuth<any>('/_nodes/stats/thread_pool');
      if (!result.success) return result;
      const nodesData = result.data?.nodes;
      if (!nodesData || typeof nodesData !== 'object') {
        return {
          success: false,
          error: 'Ошибка формата данных: информация о thread pool отсутствует или имеет неверный формат',
        };
      }
      const threadPools: ThreadPoolInfo[] = Object.keys(nodesData).map(nodeId => {
        const node = nodesData[nodeId];
        const pools: any[] = [];
        if (node.thread_pool) {
          for (const poolName in node.thread_pool) {
            const pool = node.thread_pool[poolName];
            pools.push({
              name: poolName,
              active: pool.active,
              queue: pool.queue,
              rejected: pool.rejected,
              completed: pool.completed,
              threads: pool.threads,
              largest: pool.largest,
            });
          }
        }
        return {
          nodeId,
          nodeName: node.name || nodeId,
          pools,
        };
      });
      return { success: true, data: threadPools };
    } catch (error) {
      return {
        success: false,
        error: `Ошибка получения thread pool: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async getHotThreads(): Promise<ElasticApiResponse<any>> {
    try {
      const result = await this.fetchWithAuth<any>('/_nodes/hot_threads', true);
      if (!result.success) return result;
      return { success: true, data: result.data };
    } catch (error) {
      return { success: false, error: `Ошибка получения hot threads: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  async getIndexIndexingStats(index: string): Promise<ElasticApiResponse<any>> {
    try {
      const result = await this.fetchWithAuth<any>(`/${index}/_stats?metric=indexing`);
      if (!result.success) return result;
      return { success: true, data: result.data };
    } catch (error) {
      return { success: false, error: `Ошибка получения статистики индексации для индекса ${index}: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  async getAllIndicesIndexingStats(): Promise<ElasticApiResponse<any>> {
    try {
      const result = await this.fetchWithAuth<any>(`/_stats?metric=indexing`);
      if (!result.success) return result;
      return { success: true, data: result.data };
    } catch (error) {
      return { success: false, error: `Ошибка получения статистики индексации по всем индексам: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  async getNodesIndexingStats(): Promise<ElasticApiResponse<any>> {
    try {
      const result = await this.fetchWithAuth<any>(
        '/_nodes/stats/indices?filter_path=**.indexing.index_time_in_millis'
      );
      if (!result.success) return result;
      return { success: true, data: result.data };
    } catch (error) {
      return {
        success: false,
        error: `Ошибка получения статистики индексации по узлам: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async getPendingTasks(): Promise<ElasticApiResponse<any>> {
    try {
      const result = await this.fetchWithAuth<any>('/_cluster/pending_tasks');
      if (!result.success) return result;
      return { success: true, data: result.data };
    } catch (error) {
      return { success: false, error: `Ошибка получения очереди задач: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  async getSlowlog(): Promise<ElasticApiResponse<any>> {
    try {
      const result = await this.fetchWithAuth<any>('/_slowlog');
      if (!result.success) return result;
      return { success: true, data: result.data };
    } catch (error) {
      return { success: false, error: `Ошибка получения медленных запросов: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  async getActiveTasks(): Promise<ElasticApiResponse<any>> {
    try {
      const result = await this.fetchWithAuth<any>('/_tasks?detailed');
      if (!result.success) return result;
      return { success: true, data: result.data };
    } catch (error) {
      return { success: false, error: `Ошибка получения активных задач: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  async getAllocationExplain(): Promise<ElasticApiResponse<any>> {
    try {
      const result = await this.fetchWithAuth<any>('/_cluster/allocation/explain');
      if (!result.success) return result;
      return { success: true, data: result.data };
    } catch (error) {
      return { success: false, error: `Ошибка получения allocation explain: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  async getSnapshots(): Promise<ElasticApiResponse<any>> {
    try {
      const result = await this.fetchWithAuth<any>('/_cat/snapshots?v', true);
      if (!result.success) return result;
      return { success: true, data: result.data };
    } catch (error) {
      return { success: false, error: `Ошибка получения списка снапшотов: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  async getSnapshotStatus(repo: string, snapshot: string): Promise<ElasticApiResponse<any>> {
    try {
      const result = await this.fetchWithAuth<any>(`/_snapshot/${repo}/${snapshot}`);
      if (!result.success) return result;
      return { success: true, data: result.data };
    } catch (error) {
      return { success: false, error: `Ошибка получения статуса снапшота: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  async getAllocationExplainWithBody(body: any): Promise<ElasticApiResponse<any>> {
    const config = this.getConfig();
    if (!config) {
      return { success: false, error: 'Нет данных для подключения к Elasticsearch' };
    }
    const headers = new Headers();
    headers.set('Authorization', 'Basic ' + btoa(`${config.username}:${config.password}`));
    headers.set('Content-Type', 'application/json');
    try {
      const url = config.url.replace(/\/$/, '') + '/_cluster/allocation/explain';
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        return {
          success: false,
          error: await response.text()
        };
      }
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: `Ошибка подключения: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  async getIndexSettings(index: string): Promise<ElasticApiResponse<any>> {
    try {
      const result = await this.fetchWithAuth<any>(`/${index}/_settings`);
      if (!result.success) return result;
      return { success: true, data: result.data };
    } catch (error) {
      return { 
        success: false, 
        error: `Ошибка получения настроек индекса: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }

  async updateIndexSettings(index: string, settings: any): Promise<ElasticApiResponse<any>> {
    try {
      const config = this.getConfig();
      if (!config) {
        return { success: false, error: 'Нет данных для подключения к Elasticsearch' };
      }

      const headers = new Headers();
      headers.set('Authorization', 'Basic ' + btoa(`${config.username}:${config.password}`));
      headers.set('Content-Type', 'application/json');

      // Используем правильный эндпоинт для обновления настроек индекса
      const url = config.url.replace(/\/$/, '') + `/${index}/_settings`;
      
      // Извлекаем только настройки из структуры
      const indexSettings = settings[index]?.settings?.index || settings;
      
      // Удаляем неизменяемые поля
      const { creation_date, uuid, version, provided_name, ...mutableSettings } = indexSettings;
      
      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ index: mutableSettings })
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { 
          success: false, 
          error: `Ошибка API: ${response.status} ${response.statusText}\n${errorText}` 
        };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: `Ошибка обновления настроек индекса: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }
}

// Создаем синглтон для сервиса
const elasticService = new ElasticService();
export default elasticService;
