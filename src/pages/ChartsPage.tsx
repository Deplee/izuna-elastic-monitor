import React, { useEffect, useState } from 'react';
import elasticService from '@/services/elasticService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';

interface DeletedAtData {
  index: string;
  count: number;
}

interface DocsDeletedData {
  index: string;
  docsDeleted: number;
}

// Кастомный Tooltip для deleted_at
const CustomTooltipDeletedAt = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border rounded p-3 shadow-lg text-sm">
        <div className="mb-1 text-muted-foreground">Индекс:</div>
        <div className="font-semibold text-primary break-all mb-2">{label}</div>
        <div><span className="text-green-400">Count of deleted_at:</span> <span className="font-bold">{payload[0].value.toLocaleString()}</span></div>
      </div>
    );
  }
  return null;
};

// Кастомный Tooltip для docs.deleted
const CustomTooltipDocsDeleted = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border rounded p-3 shadow-lg text-sm">
        <div className="mb-1 text-muted-foreground">Индекс:</div>
        <div className="font-semibold text-primary break-all mb-2">{label}</div>
        <div><span className="text-blue-400">docs.deleted:</span> <span className="font-bold">{payload[0].value.toLocaleString()}</span></div>
      </div>
    );
  }
  return null;
};

const ChartsPage: React.FC = () => {
  const [deletedAtData, setDeletedAtData] = useState<DeletedAtData[]>([]);
  const [docsDeletedData, setDocsDeletedData] = useState<DocsDeletedData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // deleted_at (Count of deleted at) — одним запросом
      const deletedAtResp = await elasticService.getDeletedAtAggs(1000);
      if (!deletedAtResp.success || !deletedAtResp.data) {
        setError(deletedAtResp.error || 'Ошибка агрегации по deleted_at');
        setLoading(false);
        return;
      }
      const topDeletedAt = [...deletedAtResp.data].sort((a, b) => b.count - a.count).slice(0, 5);
      setDeletedAtData(topDeletedAt);

      // docs.deleted (Trash in ALL indeces) — одним запросом
      const docsDeletedResp = await elasticService.getDocsDeletedStats();
      if (!docsDeletedResp.success || !docsDeletedResp.data) {
        setError(docsDeletedResp.error || 'Ошибка получения docs.deleted');
        setLoading(false);
        return;
      }
      const docsDeletedArr: DocsDeletedData[] = docsDeletedResp.data.map(item => ({
        index: item.index,
        docsDeleted: item.docsDeleted
      }));
      docsDeletedArr.sort((a, b) => b.docsDeleted - a.docsDeleted);
      setDocsDeletedData(docsDeletedArr.slice(0, 5));
    } catch (e) {
      setError('Ошибка загрузки данных: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-center mb-6 gap-4">
        <h2 className="text-3xl font-extrabold tracking-tight text-primary">Графики индексов</h2>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition font-semibold shadow"
          onClick={fetchData}
          disabled={loading}
        >
          Обновить
        </button>
      </div>
      {loading ? (
        <div className="text-lg text-muted-foreground">Загрузка...</div>
      ) : error ? (
        <div className="text-red-500 font-semibold">{error}</div>
      ) : (
        <div className="flex flex-col gap-12">
          <div>
            <h3 className="text-xl font-bold mb-4 text-green-400">Count of deleted at</h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={deletedAtData} margin={{ top: 20, right: 30, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="index" angle={-25} textAnchor="end" interval={0} height={90} tick={{fontSize: 13, fill: '#a3a3a3'}} />
                <YAxis tick={{fontSize: 14, fill: '#a3a3a3'}} />
                <Tooltip content={<CustomTooltipDeletedAt />} />
                <Legend wrapperStyle={{ fontSize: 16, color: '#34d399', marginTop: 10 }} />
                <Bar dataKey="count" fill="#34d399" name="Count of deleted_at" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-4 text-blue-400">Trash in ALL indeces</h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={docsDeletedData} margin={{ top: 20, right: 30, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="index" angle={-25} textAnchor="end" interval={0} height={90} tick={{fontSize: 13, fill: '#a3a3a3'}} />
                <YAxis tick={{fontSize: 14, fill: '#a3a3a3'}} />
                <Tooltip content={<CustomTooltipDocsDeleted />} />
                <Legend wrapperStyle={{ fontSize: 16, color: '#60a5fa', marginTop: 10 }} />
                <Bar dataKey="docsDeleted" fill="#60a5fa" name="docs.deleted" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChartsPage;
