import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfilesPage from './Profiles';

const mockUseProfile = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('@/contexts/ProfileContext', () => ({
  useProfile: () => mockUseProfile(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/components/UpgradeModal', () => ({
  UpgradeModal: () => null,
}));

describe('ProfilesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      logout: vi.fn(),
      isAdmin: false,
    });
  });

  it('permite excluir o primeiro perfil quando ha mais de um perfil', () => {
    const deleteProfile = vi.fn();

    mockUseProfile.mockReturnValue({
      profiles: [
        { id: '1', name: 'Joao', avatarId: 0 },
        { id: '2', name: 'Teste', avatarId: 1 },
      ],
      selectProfile: vi.fn(),
      createProfile: vi.fn(),
      deleteProfile,
      accountData: { plan: 'Mensal', maxProfiles: 2 },
    });

    render(<ProfilesPage />);

    fireEvent.click(screen.getByRole('button', { name: /gerenciar perfis/i }));
    fireEvent.click(screen.getByRole('button', { name: /excluir perfil joao/i }));

    expect(deleteProfile).toHaveBeenCalledWith('1');
  });

  it('nao mostra exclusao quando so existe um perfil', () => {
    mockUseProfile.mockReturnValue({
      profiles: [{ id: '1', name: 'Joao', avatarId: 0 }],
      selectProfile: vi.fn(),
      createProfile: vi.fn(),
      deleteProfile: vi.fn(),
      accountData: { plan: 'Gratuito', maxProfiles: 1 },
    });

    render(<ProfilesPage />);

    fireEvent.click(screen.getByRole('button', { name: /gerenciar perfis/i }));

    expect(screen.queryByRole('button', { name: /excluir perfil/i })).not.toBeInTheDocument();
  });
});
