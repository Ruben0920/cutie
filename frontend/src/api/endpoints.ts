import { apiClient } from '@/api/client';
import type {
  AuthTokenResponse,
  CoupleDashboard,
  CoupleJoinRequest,
  CustomCategory,
  CustomCategoryCreateRequest,
  CycleStatusResponse,
  DailyObservationRequest,
  DateCategoryEnum,
  DateIdea,
  DateIdeaCreateRequest,
  DateIdeaUpdateRequest,
  DiceRollResponse,
  EnergyLevelEnum,
  EveningScenarioResponse,
  EveningWishRequest,
  GiftIdea,
  GiftIdeaCreateRequest,
  GiftReserveRequest,
  InviteInfoResponse,
  LoginRequest,
  PeriodStartRequest,
  QuickStatusEnum,
  QuickStatusUpdateResponse,
  RegisterRequest,
  RelationshipProfileRequest,
  SurpriseRequestResponse,
  UpdatePreferencesRequest,
  UserProfile,
} from '@/types/api';

export const authApi = {
  register: async (payload: RegisterRequest): Promise<AuthTokenResponse> => {
    const { data } = await apiClient.post<AuthTokenResponse>(
      '/auth/register',
      payload,
    );
    return data;
  },

  login: async (payload: LoginRequest): Promise<AuthTokenResponse> => {
    const { data } = await apiClient.post<AuthTokenResponse>(
      '/auth/login',
      payload,
    );
    return data;
  },

  updatePreferences: async (
    payload: UpdatePreferencesRequest,
  ): Promise<UserProfile> => {
    const { data } = await apiClient.patch<UserProfile>(
      '/users/me/preferences',
      payload,
    );
    return data;
  },
};

export const coupleApi = {
  getInviteInfo: async (): Promise<InviteInfoResponse> => {
    const { data } = await apiClient.get<InviteInfoResponse>(
      '/couple/invite-info',
    );
    return data;
  },

  joinCouple: async (payload: CoupleJoinRequest): Promise<CoupleDashboard> => {
    const { data } = await apiClient.post<CoupleDashboard>(
      '/couple/join',
      payload,
    );
    return data;
  },

  updateRelationshipProfile: async (
    payload: RelationshipProfileRequest,
  ): Promise<CoupleDashboard> => {
    const { data } = await apiClient.put<CoupleDashboard>(
      '/couple/relationship-profile',
      payload,
    );
    return data;
  },

  getDashboard: async (): Promise<CoupleDashboard> => {
    const { data } = await apiClient.get<CoupleDashboard>('/couple/dashboard');
    return data;
  },
};

export const giftsApi = {
  list: async (
    filterBy: 'mine' | 'partner' | 'all' = 'all',
  ): Promise<GiftIdea[]> => {
    const { data } = await apiClient.get<GiftIdea[]>('/ideas/gifts', {
      params: { filter_by: filterBy },
    });
    return data;
  },

  create: async (payload: GiftIdeaCreateRequest): Promise<GiftIdea> => {
    const { data } = await apiClient.post<GiftIdea>('/ideas/gifts', payload);
    return data;
  },

  reserve: async (
    giftId: string,
    payload?: GiftReserveRequest,
  ): Promise<GiftIdea> => {
    const { data } = await apiClient.patch<GiftIdea>(
      `/ideas/gifts/${giftId}/reserve`,
      payload ?? {},
    );
    return data;
  },

  remove: async (giftId: string): Promise<void> => {
    await apiClient.delete(`/ideas/gifts/${giftId}`);
  },
};

export interface DateIdeasListFilters {
  category?: DateCategoryEnum;
  custom_category_id?: string;
  required_energy?: EnergyLevelEnum;
  include_surprises?: boolean;
  only_surprises?: boolean;
}

export const datesApi = {
  listCategories: async (): Promise<CustomCategory[]> => {
    const { data } = await apiClient.get<CustomCategory[]>(
      '/ideas/dates/categories',
    );
    return data;
  },

  createCategory: async (
    payload: CustomCategoryCreateRequest,
  ): Promise<CustomCategory> => {
    const { data } = await apiClient.post<CustomCategory>(
      '/ideas/dates/categories',
      payload,
    );
    return data;
  },

  deleteCategory: async (categoryId: string): Promise<void> => {
    await apiClient.delete(`/ideas/dates/categories/${categoryId}`);
  },

  list: async (filters?: DateIdeasListFilters): Promise<DateIdea[]> => {
    const { data } = await apiClient.get<DateIdea[]>('/ideas/dates', {
      params: filters,
    });
    return data;
  },

  create: async (payload: DateIdeaCreateRequest): Promise<DateIdea> => {
    const { data } = await apiClient.post<DateIdea>('/ideas/dates', payload);
    return data;
  },

  update: async (
    dateId: string,
    payload: DateIdeaUpdateRequest,
  ): Promise<DateIdea> => {
    const { data } = await apiClient.put<DateIdea>(
      `/ideas/dates/${dateId}`,
      payload,
    );
    return data;
  },

  remove: async (dateId: string): Promise<void> => {
    await apiClient.delete(`/ideas/dates/${dateId}`);
  },

  selectForTonight: async (dateId: string): Promise<EveningScenarioResponse> => {
    const { data } = await apiClient.post<EveningScenarioResponse>(
      `/ideas/dates/${dateId}/select-for-tonight`,
    );
    return data;
  },

  clearActiveScenario: async (): Promise<EveningScenarioResponse> => {
    const { data } = await apiClient.delete<EveningScenarioResponse>(
      '/ideas/dates/active-scenario',
    );
    return data;
  },

  sendEveningWish: async (
    payload: EveningWishRequest,
  ): Promise<EveningScenarioResponse> => {
    const { data } = await apiClient.post<EveningScenarioResponse>(
      '/ideas/dates/evening-wish',
      payload,
    );
    return data;
  },
};

export const cycleApi = {
  getStatus: async (queryDate?: string): Promise<CycleStatusResponse> => {
    const { data } = await apiClient.get<CycleStatusResponse>('/cycle/status', {
      params: queryDate ? { query_date: queryDate } : undefined,
    });
    return data;
  },

  logPeriodStart: async (
    payload: PeriodStartRequest,
  ): Promise<CycleStatusResponse> => {
    const { data } = await apiClient.post<CycleStatusResponse>(
      '/cycle/period-start',
      payload,
    );
    return data;
  },

  upsertDailyObservation: async (
    payload: DailyObservationRequest,
  ): Promise<CycleStatusResponse> => {
    const { data } = await apiClient.put<CycleStatusResponse>(
      '/cycle/daily-observation',
      payload,
    );
    return data;
  },
};

export const interactionsApi = {
  updateStatus: async (
    status: QuickStatusEnum,
  ): Promise<QuickStatusUpdateResponse> => {
    const { data } = await apiClient.post<QuickStatusUpdateResponse>(
      '/interactions/status',
      { status },
    );
    return data;
  },

  requestSurprise: async (hint?: string): Promise<SurpriseRequestResponse> => {
    const { data } = await apiClient.post<SurpriseRequestResponse>(
      '/interactions/request-surprise',
      hint ? { hint } : {},
    );
    return data;
  },

  rollDice: async (includeSurprises = true): Promise<DiceRollResponse> => {
    const { data } = await apiClient.post<DiceRollResponse>(
      '/interactions/roll-dice',
      { include_surprises: includeSurprises },
    );
    return data;
  },
};
