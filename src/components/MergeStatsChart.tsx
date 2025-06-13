import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface MergeStats {
  current: number;
  current_docs: number;
  current_size_in_bytes: number;
  total: number;
  total_time_in_millis: number;
  total_docs: number;
  total_size_in_bytes: number;
  total_stopped_time_in_millis: number;
  total_throttled_time_in_millis: number;
  total_auto_throttle_in_bytes: number;
}

interface IndexStats {
  uuid: string;
  health: string;
  status: string;
  primaries: {
    merges: MergeStats;
  };
  total: {
    merges: MergeStats;
  };
}

interface MergeStatsChartProps {
  data: {
    indices: Record<string, IndexStats>;
  };
  isLoading: boolean;
  error: string | null;
}

const metrics = [
  { value: 'total', label: 'Всего merge', color: '#8884d8' },
  { value: 'total_docs', label: 'Всего документов', color: '#82ca9d' },
  { value: 'total_size_in_bytes', label: 'Общий размер (МБ)', color: '#ffc658' },
  { value: 'total_time_in_millis', label: 'Общее время (мс)', color: '#ff7300' },
  { value: 'total_stopped_time_in_millis', label: 'Время остановки (мс)', color: '#0088fe' },
  { value: 'total_throttled_time_in_millis', label: 'Время троттлинга (мс)', color: '#00C49F' },
  { value: 'total_auto_throttle_in_bytes', label: 'Авто троттлинг (МБ)', color: '#d0ed57' },
];

const MergeStatsChart: React.FC<MergeStatsChartProps> = ({ data, isLoading, error }) => {
  const chartData = useMemo(() => {
    if (!data?.indices) return [];
    return Object.entries(data.indices).map(([index, stats]) => {
      const mergeStats = stats.total?.merges || {};
      return {
        index,
        total: mergeStats.total || 0,
        total_docs: mergeStats.total_docs || 0,
        total_size_in_bytes: (mergeStats.total_size_in_bytes || 0) / (1024 * 1024), // МБ
        total_time_in_millis: mergeStats.total_time_in_millis || 0,
        total_stopped_time_in_millis: mergeStats.total_stopped_time_in_millis || 0,
        total_throttled_time_in_millis: mergeStats.total_throttled_time_in_millis || 0,
        total_auto_throttle_in_bytes: (mergeStats.total_auto_throttle_in_bytes || 0) / (1024 * 1024), // МБ
      };
    });
  }, [data]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Статистика Merge операций</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Статистика Merge операций</CardTitle>
        </CardHeader>
        <CardContent className="text-red-500">{error}</CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Статистика Merge операций</CardTitle>
        </CardHeader>
        <CardContent>Нет данных для отображения</CardContent>
      </Card>
    );
  }

  if (!chartData.length || chartData.every(item =>
    metrics.every(metric => !item[metric.value])
  )) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Статистика Merge операций</CardTitle>
        </CardHeader>
        <CardContent>Нет данных для отображения</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Статистика Merge операций</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[500px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="index" />
              <YAxis />
              <Tooltip />
              <Legend />
              {metrics.map((metric) => (
                <Bar
                  key={metric.value}
                  dataKey={metric.value}
                  name={metric.label}
                  fill={metric.color}
                  maxBarSize={40}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default MergeStatsChart; 
