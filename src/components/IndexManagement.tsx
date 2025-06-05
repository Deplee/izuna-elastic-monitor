import React, { useState, useEffect, useRef } from 'react';
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
  const [searchTerm, setSearchTerm] = useState(() => localStorage.getItem('indexManagement_searchTerm') || '');
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsCache = useRef<{ [key: string]: string[] }>({});

  // Сохраняем indexName и settings в localStorage при изменении
  useEffect(() => {
    localStorage.setItem('indexManagement_indexName', indexName);
  }, [indexName]);
  useEffect(() => {
    localStorage.setItem('indexManagement_settings', settings);
  }, [settings]);
  useEffect(() => {
    localStorage.setItem('indexManagement_searchTerm', searchTerm);
  }, [searchTerm]);

  // Кнопка сброса
  const handleReset = () => {
    setIndexName('');
    setSettings('');
    setOriginalSettings(null);
    setSearchTerm('');
    localStorage.removeItem('indexManagement_indexName');
    localStorage.removeItem('indexManagement_settings');
    localStorage.removeItem('indexManagement_searchTerm');
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

  // Функция для поиска в JSON
  const highlightSearchTerm = (text: string) => {
    if (!searchTerm) return text;
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.split(regex).map((part, i) => 
      regex.test(part) ? `<mark class="bg-yellow-200">${part}</mark>` : part
    ).join('');
  };

  // Получение списка индексов для автодополнения с кешированием
  const fetchSuggestions = async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }
    if (suggestionsCache.current[query]) {
      setSuggestions(suggestionsCache.current[query]);
      return;
    }
    try {
      const result = await elasticService.getIndicesList(query);
      suggestionsCache.current[query] = result || [];
      setSuggestions(result || []);
    } catch {
      setSuggestions([]);
    }
  };

  // Обработка изменения поля ввода
  const handleIndexNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setIndexName(value);
    localStorage.setItem('indexManagement_indexName', value);
    if (value.length >= 3) {
      fetchSuggestions(value);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Обработка выбора подсказки
  const handleSuggestionClick = (suggestion: string) => {
    setIndexName(suggestion);
    localStorage.setItem('indexManagement_indexName', suggestion);
    setShowSuggestions(false);
    setSuggestions([]);
    inputRef.current?.blur();
  };

  // Скрытие подсказок при клике вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Управление индексами</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-4 relative">
            <div style={{ position: 'relative', width: 400 }}>
              <Input
                ref={inputRef}
                placeholder="Имя индекса"
                value={indexName}
                onChange={handleIndexNameChange}
                onFocus={() => { if (indexName) fetchSuggestions(indexName); setShowSuggestions(true); }}
                autoComplete="off"
                disabled={loading}
              />
              {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute z-10 bg-background border border-muted rounded shadow-lg mt-1"
                    style={{ width: 400, maxHeight: 350, overflow: 'auto' }}>
                  {suggestions.map((s, i) => (
                    <li
                      key={s}
                      className="px-3 py-2 cursor-pointer hover:bg-muted"
                      onMouseDown={() => handleSuggestionClick(s)}
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>
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

          <div className="space-y-2">
            <Input
              placeholder="Поиск по настройкам..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={loading}
            />
            <Textarea
              placeholder="Настройки индекса (JSON)"
              value={settings}
              onChange={(e) => setSettings(e.target.value)}
              className="font-mono h-[400px]"
              disabled={loading}
            />
            {searchTerm && settings && (
              <div 
                className="font-mono text-sm p-2 bg-muted rounded overflow-auto max-h-[200px]"
                dangerouslySetInnerHTML={{ __html: highlightSearchTerm(settings) }}
              />
            )}
          </div>

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
