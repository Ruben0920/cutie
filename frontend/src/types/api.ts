export type LanguageEnum = 'ru' | 'en' | 'es';

export type GenderRoleEnum = 'female' | 'male' | 'partner';

export type RelationshipFormatEnum =
  | 'living_together'
  | 'dating_separate'
  | 'long_distance';

export type DateCategoryEnum =
  | 'romantic'
  | 'active'
  | 'relax'
  | 'food'
  | 'extreme'
  | 'home';

export type EnergyLevelEnum = 'low' | 'medium' | 'high';

export type CyclePhaseEnum =
  | 'menstrual'
  | 'follicular'
  | 'ovulation'
  | 'luteal';

export type LoveLanguageEnum =
  | 'words_of_affirmation'
  | 'quality_time'
  | 'receiving_gifts'
  | 'acts_of_service'
  | 'physical_touch';

export type QuickStatusEnum =
  | 'going_home'
  | 'high_energy'
  | 'tired'
  | 'hungry'
  | 'need_hugs'
  | 'busy';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  gender_role: GenderRoleEnum;
  preferred_language: LanguageEnum;
  couple_id: string | null;
  current_status: QuickStatusEnum | null;
  current_status_updated_at: string | null;
  current_energy_modifier: EnergyLevelEnum;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  user: UserProfile;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  gender_role: GenderRoleEnum;
  preferred_language: LanguageEnum;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UpdatePreferencesRequest {
  preferred_language?: LanguageEnum;
  name?: string;
  fcm_token?: string;
  gender_role?: GenderRoleEnum;
}

export interface InviteInfoResponse {
  invite_code: string;
  qr_payload: string;
}

export interface CoupleJoinRequest {
  invite_code: string;
}

export interface CountdownData {
  target_datetime: string;
  total_seconds_remaining: number;
  days: number;
  hours: number;
  minutes: number;
  is_past: boolean;
}

export interface GiftIdea {
  id: string;
  couple_id: string;
  author_id: string;
  title: string;
  direct_url: string;
  price_estimate: number | null;
  priority: number;
  is_reserved_by_partner?: boolean | null;
  is_purchased: boolean;
}

export interface GiftIdeaCreateRequest {
  title: string;
  direct_url: string;
  price_estimate?: number | null;
  priority: number;
}

export interface GiftReserveRequest {
  is_reserved_by_partner?: boolean;
  is_purchased?: boolean;
}

export interface CustomCategory {
  id: string;
  couple_id: string;
  creator_id: string;
  name: string;
  base_category: DateCategoryEnum;
  color_hex: string;
}

export interface CustomCategoryCreateRequest {
  name: string;
  base_category: DateCategoryEnum;
  color_hex?: string;
}

export interface DateIdea {
  id: string;
  couple_id: string;
  creator_id: string;
  title: string;
  description: string | null;
  category: DateCategoryEnum;
  custom_category_id?: string | null;
  required_energy: EnergyLevelEnum;
  is_surprise: boolean;
  suitable_for_long_distance: boolean;
  is_archived: boolean;
}

export interface DateIdeaCreateRequest {
  title: string;
  description?: string | null;
  category: DateCategoryEnum;
  custom_category_id?: string | null;
  required_energy: EnergyLevelEnum;
  is_surprise: boolean;
  suitable_for_long_distance: boolean;
}

export interface DateIdeaUpdateRequest {
  title?: string;
  description?: string | null;
  category?: DateCategoryEnum;
  custom_category_id?: string | null;
  required_energy?: EnergyLevelEnum;
  is_surprise?: boolean;
  suitable_for_long_distance?: boolean;
}

export interface EveningScenarioResponse {
  active_evening_scenario: DateIdea | null;
  notification_preview?: string | null;
}

export type OnboardingQuizData = Record<string, string | number | boolean>;

export interface RelationshipProfileRequest {
  relationship_format: RelationshipFormatEnum;
  onboarding_quiz_data: OnboardingQuizData;
  next_meeting_datetime: string | null;
}

export interface CoupleDashboard {
  id: string;
  invite_code: string;
  relationship_format: RelationshipFormatEnum;
  next_meeting_datetime: string | null;
  onboarding_quiz_data?: OnboardingQuizData;
  countdown: CountdownData | null;
  active_evening_scenario: DateIdea | null;
  partners: UserProfile[];
}

export interface DiceRollResponse {
  winning_idea: DateIdea;
  fallback_applied: boolean;
  fallback_reason?: string | null;
  calibration_explanation: {
    cycle_phase: CyclePhaseEnum | null;
    active_partner_statuses: QuickStatusEnum[];
    applied_energy_cap: EnergyLevelEnum;
    boosted_categories: DateCategoryEnum[];
    excluded_categories?: DateCategoryEnum[];
    reason_summary: string;
  };
}

export interface CycleLogEntry {
  id: string;
  start_date: string;
  end_date: string | null;
  cycle_length_days: number | null;
}

export interface CycleStatusResponse {
  current_phase: CyclePhaseEnum;
  day_of_cycle: number;
  expected_cycle_length_wma: number;
  next_period_floating_window: {
    start: string;
    end: string;
    center: string;
  };
  wellbeing_summary: string;
  food_preferences: string[];
  love_language: LoveLanguageEnum;
  symptom_tags: string[];
  dice_filter_rules: {
    allowed_energy: EnergyLevelEnum[];
    preferred_categories: DateCategoryEnum[];
    excluded_categories: DateCategoryEnum[];
  };
  has_logged_data?: boolean;
  recent_logs?: CycleLogEntry[];
}

export interface PeriodStartRequest {
  start_date: string;
  period_duration_days?: number;
}

export interface DailyObservationRequest {
  log_date?: string;
  wellbeing_description: string;
  food_preferences: string[];
  desired_love_language: LoveLanguageEnum;
  symptom_tags: string[];
}

export interface QuickStatusUpdateResponse {
  user: UserProfile;
  status_message_preview: string;
  partner_notified: boolean;
}

export interface SurpriseRequestResponse {
  sent: boolean;
  partner_online: boolean;
  message: string;
}

export interface SuggestedSurpriseIdea {
  suggestion_type: 'gift' | 'date';
  id: string;
  title: string;
  direct_url?: string;
  category?: DateCategoryEnum;
}

export interface RealtimeWsEvent {
  event_type:
    | 'PARTNER_STATUS_UPDATED'
    | 'EVENING_SCENARIO_LOCKED'
    | 'SURPRISE_REQUESTED'
    | 'CYCLE_UPDATED'
    | 'PONG';
  sender_id?: string;
  title?: string;
  body?: string;
  payload?: {
    status?: QuickStatusEnum;
    energy_modifier?: EnergyLevelEnum;
    sender_name?: string;
    hint?: string | null;
    suggested_idea?: SuggestedSurpriseIdea | null;
    date_idea_id?: string;
    title?: string;
    is_surprise?: boolean;
    current_phase?: CyclePhaseEnum;
  };
}
