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
  cpuUsage: number;
  memoryUsage: number;
  heapPercent: number;
  status: 'green' | 'yellow' | 'red';
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

  private async fetchWithAuth<T>(endpoint: string): Promise<ElasticApiResponse<T>> {
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
      
      const data = await response.json();
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
      const result = await this.fetchWithAuth<any>('/_nodes/stats');
      
      if (!result.success) return result;
      
      const nodesData = result.data?.nodes;
      
      // Проверяем, что nodesData существует и является объектом
      if (!nodesData || typeof nodesData !== 'object') {
        return { 
          success: false, 
          error: 'Ошибка формата данных: информация о нодах отсутствует или имеет неверный формат' 
        };
      }
      
      const nodes: Node[] = Object.keys(nodesData).map(nodeId => {
        const node = nodesData[nodeId];
        const totalDiskBytes = node.fs?.total?.total_in_bytes || 0;
        const availableDiskBytes = node.fs?.total?.available_in_bytes || 0;
        
        // Расчет потребления ресурсов
        const cpuUsage = node.process?.cpu?.percent || 0;
        const heapPercent = node.jvm?.mem?.heap_used_percent || 0;
        const memoryUsage = heapPercent; // Упрощенно используем heap как индикатор памяти
        
        // Определение статуса ноды
        let status: 'green' | 'yellow' | 'red' = 'green';
        if (heapPercent > 85 || cpuUsage > 85) {
          status = 'red';
        } else if (heapPercent > 70 || cpuUsage > 70) {
          status = 'yellow';
        }
        
        return {
          id: nodeId,
          name: node.name,
          version: node.version,
          roles: node.roles || [],
          host: node.host || '',
          ip: node.ip || '',
          diskAvailable: this.formatBytes(availableDiskBytes),
          diskTotal: this.formatBytes(totalDiskBytes),
          cpuUsage,
          memoryUsage,
          heapPercent,
          status
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

  formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}

// Создаем синглтон для сервиса
const elasticService = new ElasticService();
export default elasticService;
