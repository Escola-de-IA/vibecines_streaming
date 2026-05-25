import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileProvider, useProfile } from './ProfileContext';

const onSnapshotMock = vi.fn();
const collectionMock = vi.fn();
const docMock = vi.fn();
const mockAuthValue = {
  user: {
    uid: 'user-1',
    email: 'joao@example.com',
  },
};

vi.mock('./AuthContext', () => ({
  useAuth: () => mockAuthValue,
}));

vi.mock('@/lib/firebase', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  addDoc: vi.fn(),
  collection: (...args: unknown[]) => collectionMock(...args),
  deleteDoc: vi.fn(),
  doc: (...args: unknown[]) => docMock(...args),
  onSnapshot: (...args: unknown[]) => onSnapshotMock(...args),
  setDoc: vi.fn(),
}));

type SnapshotDoc = {
  id: string;
  data: () => Record<string, unknown>;
};

function createCollectionSnapshot(docs: SnapshotDoc[]) {
  return {
    forEach: (callback: (doc: SnapshotDoc) => void) => {
      docs.forEach(callback);
    },
  };
}

function createDocSnapshot(data?: Record<string, unknown>) {
  return {
    exists: () => !!data,
    data: () => data,
  };
}

function Consumer() {
  const { profiles, selectProfile, activeProfile } = useProfile();

  return (
    <div>
      <div data-testid="profiles-count">{profiles.length}</div>
      <div data-testid="active-profile">{activeProfile?.id ?? 'none'}</div>
      <button type="button" onClick={() => selectProfile('profile-1')}>
        Selecionar primeiro
      </button>
    </div>
  );
}

describe('ProfileProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    collectionMock.mockImplementation((_db, path: string) => ({
      kind: 'collection',
      path,
    }));

    docMock.mockImplementation((_db, ...segments: string[]) => ({
      kind: 'doc',
      path: segments.join('/'),
    }));

    onSnapshotMock.mockImplementation((ref: { kind: string; path: string }, callback: (snapshot: unknown) => void) => {
      if (ref.path === 'users/user-1') {
        callback(createDocSnapshot({ email: 'joao@example.com', plan: 'Mensal', maxProfiles: 3 }));
      }

      if (ref.path === 'users/user-1/profiles') {
        callback(
          createCollectionSnapshot([
            { id: 'profile-1', data: () => ({ name: 'Joao', avatarId: 0, createdAt: 1 }) },
            { id: 'profile-2', data: () => ({ name: 'Teste', avatarId: 1, createdAt: 2 }) },
          ])
        );
      }

      if (ref.path === 'users/user-1/profiles/profile-1/data/main') {
        callback(createDocSnapshot({ favorites: [], progress: {}, watched: [] }));
      }

      return vi.fn();
    });
  });

  it('nao recria o listener da colecao de perfis ao trocar o perfil ativo', async () => {
    render(
      <ProfileProvider>
        <Consumer />
      </ProfileProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('profiles-count')).toHaveTextContent('2');
    });

    expect(
      onSnapshotMock.mock.calls.filter(([ref]) => (ref as { path: string }).path === 'users/user-1/profiles')
    ).toHaveLength(1);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /selecionar primeiro/i }));
    });

    await waitFor(() => {
      expect(screen.getByTestId('active-profile')).toHaveTextContent('profile-1');
    });

    expect(
      onSnapshotMock.mock.calls.filter(([ref]) => (ref as { path: string }).path === 'users/user-1/profiles')
    ).toHaveLength(1);

    expect(
      onSnapshotMock.mock.calls.filter(
        ([ref]) => (ref as { path: string }).path === 'users/user-1/profiles/profile-1/data/main'
      )
    ).toHaveLength(1);
  });
});
