import type { JSX, FormEvent } from 'react';
import { useState } from 'react';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import type { TodoItem } from '@models/todo';
import { useApiFetch } from '../hooks/useApiFetch';

interface AddItemFormProps {
    onNewItem: (item: TodoItem) => void;
}

export function AddItemForm({ onNewItem }: AddItemFormProps): JSX.Element {
    const apiFetch = useApiFetch();
    const [newItem, setNewItem] = useState<string>('');
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const submitNewItem = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            const response = await apiFetch('/api/items', {
                method: 'POST',
                body: JSON.stringify({ name: newItem.trim() }),
            });

            if (!response.ok) {
                throw new Error(`Failed to add item: ${response.statusText}`);
            }

            const item: TodoItem = await response.json() as TodoItem;
            onNewItem(item);
            setNewItem('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Form onSubmit={submitNewItem}>
            <InputGroup className="mb-3">
                <Form.Control
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    type="text"
                    placeholder="New Item"
                    aria-label="New item"
                    disabled={submitting}
                />
                <Button
                    type="submit"
                    variant="success"
                    disabled={!newItem.trim().length || submitting}
                >
                    {submitting ? 'Adding...' : 'Add Item'}
                </Button>
            </InputGroup>
            {error && (
                <p className="text-danger small mt-1" role="alert">
                    {error}
                </p>
            )}
        </Form>
    );
}
