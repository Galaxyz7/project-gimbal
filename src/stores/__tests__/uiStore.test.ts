
import { act } from '@testing-library/react';
import {
  useUIStore,
  selectSidebarCollapsed,
  selectSidebarMobileOpen,
  selectActiveNavItem,
  selectOpenModals,
  selectTheme,
  selectIsModalOpen,
  selectModalProps,
} from '../uiStore';

describe('uiStore', () => {
  beforeEach(() => {
    useUIStore.setState({
      sidebarCollapsed: false,
      sidebarMobileOpen: false,
      activeNavItem: null,
      openModals: [],
      theme: 'light',
    });
  });

  describe('sidebar', () => {
    it('should toggle sidebar', () => {
      act(() => useUIStore.getState().toggleSidebar());
      expect(useUIStore.getState().sidebarCollapsed).toBe(true);
      act(() => useUIStore.getState().toggleSidebar());
      expect(useUIStore.getState().sidebarCollapsed).toBe(false);
    });

    it('should set sidebar collapsed directly', () => {
      act(() => useUIStore.getState().setSidebarCollapsed(true));
      expect(useUIStore.getState().sidebarCollapsed).toBe(true);
    });

    it('should toggle mobile sidebar', () => {
      act(() => useUIStore.getState().toggleMobileSidebar());
      expect(useUIStore.getState().sidebarMobileOpen).toBe(true);
    });

    it('should set mobile sidebar open directly', () => {
      act(() => useUIStore.getState().setMobileSidebarOpen(true));
      expect(useUIStore.getState().sidebarMobileOpen).toBe(true);
    });
  });

  describe('navigation', () => {
    it('should set active nav item', () => {
      act(() => useUIStore.getState().setActiveNavItem('dashboard'));
      expect(useUIStore.getState().activeNavItem).toBe('dashboard');
    });

    it('should clear active nav item', () => {
      useUIStore.setState({ activeNavItem: 'dashboard' });
      act(() => useUIStore.getState().setActiveNavItem(null));
      expect(useUIStore.getState().activeNavItem).toBeNull();
    });
  });

  describe('modals', () => {
    it('should open a modal', () => {
      act(() => useUIStore.getState().openModal('confirm-delete'));
      expect(useUIStore.getState().openModals).toHaveLength(1);
      expect(useUIStore.getState().openModals[0].id).toBe('confirm-delete');
    });

    it('should open a modal with props', () => {
      act(() => useUIStore.getState().openModal('edit-member', { memberId: '123' }));
      expect(useUIStore.getState().openModals[0].props).toEqual({ memberId: '123' });
    });

    it('should not open duplicate modal', () => {
      act(() => useUIStore.getState().openModal('confirm-delete'));
      act(() => useUIStore.getState().openModal('confirm-delete'));
      expect(useUIStore.getState().openModals).toHaveLength(1);
    });

    it('should close a modal', () => {
      useUIStore.setState({ openModals: [{ id: 'modal-1' }, { id: 'modal-2' }] });
      act(() => useUIStore.getState().closeModal('modal-1'));
      expect(useUIStore.getState().openModals).toHaveLength(1);
      expect(useUIStore.getState().openModals[0].id).toBe('modal-2');
    });

    it('should close all modals', () => {
      useUIStore.setState({ openModals: [{ id: 'modal-1' }, { id: 'modal-2' }] });
      act(() => useUIStore.getState().closeAllModals());
      expect(useUIStore.getState().openModals).toHaveLength(0);
    });
  });

  describe('theme', () => {
    it('should set theme', () => {
      act(() => useUIStore.getState().setTheme('dark'));
      expect(useUIStore.getState().theme).toBe('dark');
    });

    it('should support system theme', () => {
      act(() => useUIStore.getState().setTheme('system'));
      expect(useUIStore.getState().theme).toBe('system');
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      useUIStore.setState({
        sidebarCollapsed: true,
        activeNavItem: 'settings',
        openModals: [{ id: 'modal-1' }],
        theme: 'dark',
      });
      act(() => useUIStore.getState().reset());
      const state = useUIStore.getState();
      expect(state.sidebarCollapsed).toBe(false);
      expect(state.activeNavItem).toBeNull();
      expect(state.openModals).toHaveLength(0);
      expect(state.theme).toBe('light');
    });
  });

  describe('selectors', () => {
    it('selectSidebarCollapsed', () => {
      expect(selectSidebarCollapsed({ sidebarCollapsed: true } as never)).toBe(true);
    });

    it('selectSidebarMobileOpen', () => {
      expect(selectSidebarMobileOpen({ sidebarMobileOpen: true } as never)).toBe(true);
    });

    it('selectActiveNavItem', () => {
      expect(selectActiveNavItem({ activeNavItem: 'dashboard' } as never)).toBe('dashboard');
    });

    it('selectOpenModals', () => {
      const modals = [{ id: 'test' }];
      expect(selectOpenModals({ openModals: modals } as never)).toEqual(modals);
    });

    it('selectTheme', () => {
      expect(selectTheme({ theme: 'dark' } as never)).toBe('dark');
    });

    it('selectIsModalOpen returns true when modal is open', () => {
      const state = { openModals: [{ id: 'test' }] } as never;
      expect(selectIsModalOpen('test')(state)).toBe(true);
    });

    it('selectIsModalOpen returns false when modal is not open', () => {
      const state = { openModals: [] } as never;
      expect(selectIsModalOpen('test')(state)).toBe(false);
    });

    it('selectModalProps returns props for open modal', () => {
      const state = { openModals: [{ id: 'test', props: { foo: 'bar' } }] } as never;
      expect(selectModalProps('test')(state)).toEqual({ foo: 'bar' });
    });

    it('selectModalProps returns undefined for closed modal', () => {
      const state = { openModals: [] } as never;
      expect(selectModalProps('test')(state)).toBeUndefined();
    });
  });
});
