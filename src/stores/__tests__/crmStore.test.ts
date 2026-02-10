
import { act } from '@testing-library/react';
import {
  useCRMStore,
  selectSelectedSiteId,
  selectSites,
  selectSelectedMemberId,
  selectMemberSearchQuery,
  selectMemberFilters,
  selectDashboardMetrics,
  selectSelectedSite,
  selectSiteOptions,
  selectMembershipLevelOptions,
} from '../crmStore';
import { mockSite, mockMembershipLevel } from '@/test/mocks/fixtures';

describe('crmStore', () => {
  beforeEach(() => {
    useCRMStore.setState({
      selectedSiteId: null,
      sites: [],
      sitesLoading: false,
      selectedMemberId: null,
      memberSearchQuery: '',
      memberFilters: {},
      membershipLevels: [],
      dashboardMetrics: null,
      dashboardLoading: false,
    });
  });

  describe('site actions', () => {
    it('should set selected site id', () => {
      act(() => useCRMStore.getState().setSelectedSiteId('site-1'));
      expect(useCRMStore.getState().selectedSiteId).toBe('site-1');
    });

    it('should clear selected site id', () => {
      useCRMStore.setState({ selectedSiteId: 'site-1' });
      act(() => useCRMStore.getState().setSelectedSiteId(null));
      expect(useCRMStore.getState().selectedSiteId).toBeNull();
    });

    it('should set sites', () => {
      act(() => useCRMStore.getState().setSites([mockSite]));
      expect(useCRMStore.getState().sites).toHaveLength(1);
    });

    it('should set sites loading', () => {
      act(() => useCRMStore.getState().setSitesLoading(true));
      expect(useCRMStore.getState().sitesLoading).toBe(true);
    });
  });

  describe('member actions', () => {
    it('should set selected member id', () => {
      act(() => useCRMStore.getState().setSelectedMemberId('member-1'));
      expect(useCRMStore.getState().selectedMemberId).toBe('member-1');
    });

    it('should set member search query', () => {
      act(() => useCRMStore.getState().setMemberSearchQuery('john'));
      expect(useCRMStore.getState().memberSearchQuery).toBe('john');
    });

    it('should set member filters', () => {
      act(() => useCRMStore.getState().setMemberFilters({ status: 'active' }));
      expect(useCRMStore.getState().memberFilters).toEqual({ status: 'active' });
    });

    it('should merge member filters', () => {
      useCRMStore.setState({ memberFilters: { status: 'active' } });
      act(() => useCRMStore.getState().setMemberFilters({ tags: ['vip'] }));
      expect(useCRMStore.getState().memberFilters).toEqual({
        status: 'active',
        tags: ['vip'],
      });
    });

    it('should clear member filters', () => {
      useCRMStore.setState({ memberFilters: { status: 'active' }, memberSearchQuery: 'test' });
      act(() => useCRMStore.getState().clearMemberFilters());
      expect(useCRMStore.getState().memberFilters).toEqual({});
      expect(useCRMStore.getState().memberSearchQuery).toBe('');
    });
  });

  describe('membership levels', () => {
    it('should set membership levels', () => {
      act(() => useCRMStore.getState().setMembershipLevels([mockMembershipLevel]));
      expect(useCRMStore.getState().membershipLevels).toHaveLength(1);
    });
  });

  describe('dashboard', () => {
    it('should set dashboard metrics', () => {
      const metrics = { totalMembers: 100, activeMembers: 80, totalRevenue: 50000, avgLtv: 500, totalVisits: 1000, lastUpdated: '2025-06-01' };
      act(() => useCRMStore.getState().setDashboardMetrics(metrics));
      expect(useCRMStore.getState().dashboardMetrics).toEqual(metrics);
    });

    it('should set dashboard loading', () => {
      act(() => useCRMStore.getState().setDashboardLoading(true));
      expect(useCRMStore.getState().dashboardLoading).toBe(true);
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      useCRMStore.setState({
        selectedSiteId: 'site-1',
        sites: [mockSite],
        selectedMemberId: 'member-1',
        memberSearchQuery: 'test',
      });
      act(() => useCRMStore.getState().reset());
      const state = useCRMStore.getState();
      expect(state.selectedSiteId).toBeNull();
      expect(state.sites).toEqual([]);
      expect(state.selectedMemberId).toBeNull();
      expect(state.memberSearchQuery).toBe('');
    });
  });

  describe('selectors', () => {
    it('selectSelectedSiteId returns selectedSiteId', () => {
      expect(selectSelectedSiteId({ selectedSiteId: 'site-1' } as never)).toBe('site-1');
    });

    it('selectSites returns sites', () => {
      expect(selectSites({ sites: [mockSite] } as never)).toEqual([mockSite]);
    });

    it('selectSelectedMemberId returns selectedMemberId', () => {
      expect(selectSelectedMemberId({ selectedMemberId: 'member-1' } as never)).toBe('member-1');
    });

    it('selectMemberSearchQuery returns query', () => {
      expect(selectMemberSearchQuery({ memberSearchQuery: 'test' } as never)).toBe('test');
    });

    it('selectMemberFilters returns filters', () => {
      const filters = { status: 'active' };
      expect(selectMemberFilters({ memberFilters: filters } as never)).toEqual(filters);
    });

    it('selectDashboardMetrics returns metrics', () => {
      expect(selectDashboardMetrics({ dashboardMetrics: null } as never)).toBeNull();
    });

    it('selectSelectedSite returns matching site', () => {
      const state = { selectedSiteId: mockSite.id, sites: [mockSite] } as never;
      expect(selectSelectedSite(state)).toEqual(mockSite);
    });

    it('selectSelectedSite returns null when no match', () => {
      const state = { selectedSiteId: 'nonexistent', sites: [mockSite] } as never;
      expect(selectSelectedSite(state)).toBeNull();
    });

    it('selectSiteOptions returns formatted options', () => {
      const state = { sites: [mockSite] } as never;
      expect(selectSiteOptions(state)).toEqual([{ value: mockSite.id, label: 'Test Gym' }]);
    });

    it('selectMembershipLevelOptions returns formatted options', () => {
      const state = { membershipLevels: [mockMembershipLevel] } as never;
      expect(selectMembershipLevelOptions(state)).toEqual([{ value: mockMembershipLevel.id, label: 'Gold' }]);
    });
  });
});
