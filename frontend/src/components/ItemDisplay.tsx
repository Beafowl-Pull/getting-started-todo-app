import type { JSX } from 'react';
import { useState } from 'react';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { faCheckSquare, faSquare } from '@fortawesome/free-regular-svg-icons';
import type { TodoItem } from '@models/todo';
import '@styles/ItemDisplay.scss';

interface ItemDisplayProps {
  item: TodoItem;
  onItemUpdate: (item: TodoItem) => void;
  onItemRemoval: (item: TodoItem) => void;
}

export function ItemDisplay({ item, onItemUpdate, onItemRemoval }: ItemDisplayProps): JSX.Element {
  const [error, setError] = useState<string | null>(null);

  const toggleCompletion = async (): Promise<void> => {
    setError(null);
    try {
      const response = await fetch(`/api/items/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: item.name, completed: !item.completed }),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error(`Failed to update item: ${response.statusText}`);

      const updated = (await response.json()) as TodoItem;
      onItemUpdate(updated);
    } catch (err) {
      console.error('Failed to toggle item completion:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    }
  };

  const removeItem = async (): Promise<void> => {
    setError(null);
    try {
      const response = await fetch(`/api/items/${item.id}`, { method: 'DELETE' });

      if (!response.ok) throw new Error(`Failed to delete item: ${response.statusText}`);

      onItemRemoval(item);
    } catch (err) {
      console.error('Failed to remove item:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    }
  };

  return (
    <Container fluid className={`item ${item.completed ? 'completed' : ''}`}>
      <Row>
        <Col xs={2} className="text-center">
          <Button
            className="toggles"
            size="sm"
            variant="link"
            onClick={toggleCompletion}
            aria-label={item.completed ? 'Mark item as incomplete' : 'Mark item as complete'}
          >
            <FontAwesomeIcon icon={item.completed ? faCheckSquare : faSquare} />
          </Button>
        </Col>
        <Col xs={8} className="name">
          {item.name}
        </Col>
        <Col xs={2} className="text-center remove">
          <Button
            size="sm"
            variant="link"
            onClick={removeItem}
            aria-label={`Remove "${item.name}"`}
          >
            <FontAwesomeIcon icon={faTrash} className="text-danger" />
          </Button>
        </Col>
      </Row>
      {error && (
        <p className="text-danger small mt-1 mb-0" role="alert">
          {error}
        </p>
      )}
    </Container>
  );
}