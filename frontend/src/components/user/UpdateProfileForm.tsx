import type { JSX, FormEvent } from 'react';
import { useState } from 'react';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Alert from 'react-bootstrap/Alert';
import { useAuth } from '../../hooks/useAuth';
import { useApiFetch } from '../../hooks/useApiFetch';
import type { PublicUser } from '../../types/user';

interface UpdateProfileFormProps {
  onClose: () => void;
}

export function UpdateProfileForm({ onClose }: UpdateProfileFormProps): JSX.Element {
  const { user, setUser } = useAuth();
  const apiFetch = useApiFetch();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    const body: Record<string, string> = {};
    if (name !== user?.name) body['name'] = name;
    if (email !== user?.email) body['email'] = email;
    if (newPassword) body['newPassword'] = newPassword;
    if (email !== user?.email || newPassword) body['currentPassword'] = currentPassword;

    try {
      const res = await apiFetch('/api/me', {
        method: 'PATCH',
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? 'Update failed');
      }

      const updated = (await res.json()) as PublicUser;
      setUser(updated);
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <h5 className="mb-3">Update Profile</h5>
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">Profile updated!</Alert>}
      <Form.Group className="mb-3">
        <Form.Label>Name</Form.Label>
        <Form.Control
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={submitting}
        />
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Email</Form.Label>
        <Form.Control
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitting}
        />
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>New Password (optional)</Form.Label>
        <Form.Control
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Leave blank to keep current"
          minLength={8}
          disabled={submitting}
        />
      </Form.Group>
      {(email !== user?.email || newPassword) && (
        <Form.Group className="mb-3">
          <Form.Label>Current Password (required to change email/password)</Form.Label>
          <Form.Control
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Your current password"
            disabled={submitting}
            required
          />
        </Form.Group>
      )}
      <div className="d-flex gap-2">
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? 'Saving...' : 'Save'}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </Form>
  );
}
