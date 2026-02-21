import type { JSX } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { AddItemForm } from './AddNewItemForm';
import { ItemDisplay } from './ItemDisplay';
import type { TodoItem } from '@models/todo';

type LoadingState = 'loading' | 'error' | 'success';

export function TodoListCard(): JSX.Element {
  const [items, setItems] = useState<TodoItem[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>('loading');

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/items', { signal: controller.signal })
      .then(async (res): Promise<void> => {
        if (!res.ok) throw new Error(`Failed to fetch items: ${res.statusText}`);
        const data = (await res.json()) as TodoItem[];
        setItems(data);
        setLoadingState('success');
      })
      .catch((err: unknown): void => {
        if (err instanceof Error && err.name === 'AbortError') return;
        console.error('Failed to fetch items:', err);
        setLoadingState('error');
      });

    return (): void => controller.abort();
  }, []);

  const onNewItem = useCallback((newItem: TodoItem): void => {
    setItems((prev) => [...prev, newItem]);
  }, []);

  const onItemUpdate = useCallback((updatedItem: TodoItem): void => {
    setItems((prev) =>
      prev.map((item) => (item.id === updatedItem.id ? updatedItem : item)),
    );
  }, []);

  const onItemRemoval = useCallback((removedItem: TodoItem): void => {
    setItems((prev) => prev.filter((item) => item.id !== removedItem.id));
  }, []);

  if (loadingState === 'loading') {
    return <p className="text-center">Loading...</p>;
  }

  if (loadingState === 'error') {
    return (
      <p className="text-center text-danger" role="alert">
        Failed to load items. Please try again later.
      </p>
    );
  }

  return (
    <>
      <AddItemForm onNewItem={onNewItem} />
      {items.length === 0 && (
        <p className="text-center">No items yet! Add one above!</p>
      )}
      {items.map((item) => (
        <ItemDisplay
          key={item.id}
          item={item}
          onItemUpdate={onItemUpdate}
          onItemRemoval={onItemRemoval}
        />
      ))}
    </>
  );
}