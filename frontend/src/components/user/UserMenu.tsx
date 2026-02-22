import type { JSX } from 'react';
import { useState } from 'react';
import Button from 'react-bootstrap/Button';
import Dropdown from 'react-bootstrap/Dropdown';
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';
import Alert from 'react-bootstrap/Alert';
import { useAuth } from '../../hooks/useAuth';
import { useApiFetch } from '../../hooks/useApiFetch';
import { UpdateProfileForm } from './UpdateProfileForm';

export function UserMenu(): JSX.Element {
  const { user, logout } = useAuth();
  const apiFetch = useApiFetch();
  const [showProfile, setShowProfile] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleExport = async (): Promise<void> => {
    const res = await apiFetch('/api/me/export');
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (): Promise<void> => {
    setDeleting(true);
    setDeleteError(null);

    try {
      const res = await apiFetch('/api/me', {
        method: 'DELETE',
        body: JSON.stringify({ password: deletePassword }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? 'Failed to delete account');
      }

      logout();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete account');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Dropdown align="end">
        <Dropdown.Toggle variant="outline-secondary" size="sm">
          {user?.name}
        </Dropdown.Toggle>
        <Dropdown.Menu>
          <Dropdown.Item onClick={() => setShowProfile(true)}>Edit Profile</Dropdown.Item>
          <Dropdown.Item onClick={handleExport}>Export My Data (GDPR)</Dropdown.Item>
          <Dropdown.Divider />
          <Dropdown.Item onClick={logout}>Sign Out</Dropdown.Item>
          <Dropdown.Divider />
          <Dropdown.Item className="text-danger" onClick={() => setShowDelete(true)}>
            Delete Account
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>

      {/* Edit Profile Modal */}
      <Modal show={showProfile} onHide={() => setShowProfile(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Profile</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <UpdateProfileForm onClose={() => setShowProfile(false)} />
        </Modal.Body>
      </Modal>

      {/* Delete Account Modal */}
      <Modal show={showDelete} onHide={() => setShowDelete(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Delete Account</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-danger">
            This will permanently delete your account and all your todos. This cannot be undone.
          </p>
          {deleteError && <Alert variant="danger">{deleteError}</Alert>}
          <Form.Group>
            <Form.Label>Enter your password to confirm</Form.Label>
            <Form.Control
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Your password"
              disabled={deleting}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDelete(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={deleting || !deletePassword}>
            {deleting ? 'Deleting...' : 'Delete My Account'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
