import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import elasticService from '@/services/elasticService';
import { Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

const FORBIDDEN_FIELDS = [
  'uuid',
  'creation_date',
  'provided_name',
  'version',
  'creation_date_string',
  'upgrade',
  'routing_partition_size',
  'verified_before_close',
  'format',
  'settings_version',
  'frozen',
  'hidden',
  'shrink',
  'rollover',
  'lifecycle',
  'aliases',
  'mappings',
];

// Функция для вычисления diff между двумя объектами
function getDiff(obj: any, base: any): any {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (typeof base !== 'object' || base === null) return obj;
  const diff: any = Array.isArray(obj) ? [] : {};
  for (const key of Object.keys(obj)) {
    if (FORBIDDEN_FIELDS.includes(key)) continue;
    if (!(key in base)) {
      diff[key] = obj[key];
    } else if (
      typeof obj[key] === 'object' &&
      obj[key] !== null &&
      typeof base[key] === 'object' &&
      base[key] !== null
    ) {
      const nestedDiff = getDiff(obj[key], base[key]);
      if (typeof nestedDiff === 'object' && Object.keys(nestedDiff).length > 0) {
        diff[key] = nestedDiff;
      }
    } else if (obj[key] !== base[key]) {
      diff[key] = obj[key];
    }
  }
  return diff;
}

// Функция для удаления запрещённых полей из diff
function removeForbiddenFields(obj: any): [any, string[]] {
  if (typeof obj !== 'object' || obj === null) return [obj, []];
  let removed: string[] = [];
  const filtered: any = Array.isArray(obj) ? [] : {};
  for (const key of Object.keys(obj)) {
    if (FORBIDDEN_FIELDS.includes(key)) {
      removed.push(key);
      continue;
    }
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      const [nested, nestedRemoved] = removeForbiddenFields(obj[key]);
      if (typeof nested === 'object' && Object.keys(nested).length > 0) {
        filtered[key] = nested;
      } else if (!Array.isArray(obj[key])) {
        // не добавляем пустые объекты
      } else {
        filtered[key] = nested;
      }
      removed = removed.concat(nestedRemoved);
    } else {
      filtered[key] = obj[key];
    }
  }
  return [filtered, removed];
}

const IndexManagement: React.FC = () => {
  const [indexName, setIndexName] = useState(() => localStorage.getItem('indexManagement_indexName') || '');
  const [settings, setSettings] = useState<string>(() => localStorage.getItem('indexManagement_settings') || '');
  const [originalSettings, setOriginalSettings] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Сохраняем indexName и settings в localStorage при изменении
  useEffect(() => {
    localStorage.setItem('indexManagement_indexName', indexName);
  }, [indexName]);
  useEffect(() => {
    localStorage.setItem('indexManagement_settings', settings);
  }, [settings]);

  // Кнопка сброса
  const handleReset = () => {
    setIndexName('');
    setSettings('');
    setOriginalSettings(null);
    localStorage.removeItem('indexManagement_indexName');
    localStorage.removeItem('indexManagement_settings');
  };

  const handleSearch = async () => {
    if (!indexName) {
      toast({
        title: 'Ошибка',
        description: 'Введите имя индекса',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await elasticService.getIndexSettings(indexName);
      if (response.success && response.data) {
        setSettings(JSON.stringify(response.data, null, 2));
        setOriginalSettings(response.data);
      } else {
        setError(response.error || 'Не удалось получить настройки индекса');
        toast({
          title: 'Ошибка',
          description: response.error || 'Не удалось получить настройки индекса',
          variant: 'destructive',
        });
      }
    } catch (error) {
      setError(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      toast({
        title: 'Ошибка',
        description: `Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const hasForbiddenFields = (obj: any): string[] => {
    const forbidden: string[] = [];
    const check = (o: any) => {
      if (typeof o !== 'object' || o === null) return;
      for (const key of Object.keys(o)) {
        if (FORBIDDEN_FIELDS.includes(key)) forbidden.push(key);
        if (typeof o[key] === 'object') check(o[key]);
      }
    };
    check(obj);
    return forbidden;
  };

  const handleApply = async () => {
    if (!indexName || !settings) {
      toast({
        title: 'Ошибка',
        description: 'Введите имя индекса и настройки',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let settingsObj;
      try {
        settingsObj = JSON.parse(settings);
      } catch (e) {
        throw new Error('Неверный формат JSON');
      }

      // Вычисляем diff между оригинальными и изменёнными настройками
      let diffObj = settingsObj;
      if (originalSettings) {
        const orig = originalSettings[indexName]?.settings?.index || originalSettings[indexName]?.settings || originalSettings[indexName] || originalSettings;
        const curr = settingsObj[indexName]?.settings?.index || settingsObj[indexName]?.settings || settingsObj[indexName] || settingsObj;
        diffObj = getDiff(curr, orig);
      }

      // Удаляем запрещённые поля из diff
      const [filteredDiff, removedFields] = removeForbiddenFields(diffObj);

      if (Object.keys(filteredDiff).length === 0) {
        let msg = 'Нет изменённых параметров для применения.';
        if (removedFields.length > 0) {
          msg += `\nИзменения в запрещённых полях (${removedFields.join(', ')}) не будут применены.`;
        }
        toast({
          title: removedFields.length > 0 ? 'Внимание' : 'Нет изменений',
          description: msg,
        });
        setLoading(false);
        return;
      }

      if (removedFields.length > 0) {
        toast({
          title: 'Внимание',
          description: `Изменения в запрещённых полях (${removedFields.join(', ')}) не будут применены.`,
        });
      }

      const response = await elasticService.updateIndexSettings(indexName, filteredDiff);
      if (response.success) {
        toast({
          title: 'Успех',
          description: 'Настройки индекса успешно обновлены',
        });
      } else {
        setError(response.error || 'Не удалось обновить настройки индекса');
        toast({
          title: 'Ошибка',
          description: response.error || 'Не удалось обновить настройки индекса',
          variant: 'destructive',
        });
      }
    } catch (error) {
      setError(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      toast({
        title: 'Ошибка',
        description: `Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Управление индексами</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="Имя индекса"
              value={indexName}
              onChange={(e) => setIndexName(e.target.value)}
              disabled={loading}
            />
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Найти
            </Button>
            <Button onClick={handleReset} variant="outline" disabled={loading}>
              Сбросить
            </Button>
          </div>

          {/* Подсказка для пользователя */}
          <div className="text-xs text-muted-foreground">
            Вводите только изменяемые параметры индекса (например, <b>number_of_replicas</b>, <b>analysis</b> и т.д.).<br />
            Не указывайте <b>uuid</b>, <b>creation_date</b>, <b>version</b>, <b>provided_name</b> и другие системные поля.
          </div>

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          <Textarea
            placeholder="Настройки индекса (JSON)"
            value={settings}
            onChange={(e) => setSettings(e.target.value)}
            className="font-mono h-[400px]"
            disabled={loading}
          />

          <Button onClick={handleApply} disabled={loading || !settings}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Применить
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default IndexManagement; 
