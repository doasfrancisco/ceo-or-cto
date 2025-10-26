import mixpanel from 'mixpanel-browser';

const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
const isBrowser = typeof window !== 'undefined';
const DISTINCT_ID_STORAGE_KEY = 'ceo-or-cto:distinct_id';

const ensureDistinctId = () => {
  if (!isBrowser) return;
  if (!MIXPANEL_TOKEN) return;

  const generateId = () => {
    if (typeof window.crypto !== 'undefined' && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return `anon_${Math.random().toString(36).slice(2, 11)}${Date.now()}`;
  };

  try {
    let distinctId = window.localStorage.getItem(DISTINCT_ID_STORAGE_KEY);
    if (!distinctId) {
      distinctId = generateId();
      window.localStorage.setItem(DISTINCT_ID_STORAGE_KEY, distinctId);
    }
    mixpanel.identify(distinctId);
  } catch (error) {
    console.warn('Failed to initialize analytics identity:', error);
  }
};

console.log('Mixpanel is debug mode:', process.env.NEXT_PUBLIC_SETUP === 'local');
if (MIXPANEL_TOKEN && isBrowser) {
  mixpanel.init(MIXPANEL_TOKEN, {
    debug: process.env.NEXT_PUBLIC_SETUP === 'local',
    track_pageview: true,
    persistence: 'localStorage',
    record_sessions_percent: 100,
    record_heatmap_data: true,
    ignore_dnt: true,
    api_host: process.env.NEXT_PUBLIC_PROXY_MIXPANEL_API,
  });

  ensureDistinctId();
} else if (!MIXPANEL_TOKEN) {
  console.warn('Mixpanel token not found. Analytics will not be tracked.');
}

export const analytics = {
  ensureIdentity: ensureDistinctId,

  trackSelection: (data: {
    selectedPersonId: string;
    selectedPersonName: string;
    selectedPersonRole: string;
    otherPersonId: string;
    otherPersonName: string;
    otherPersonRole: string;
    category: string;
    variant: string;
  }) => {
    if (!MIXPANEL_TOKEN) return;
    mixpanel.track('Person Selected', {
      selected_person_id: data.selectedPersonId,
      selected_person_name: data.selectedPersonName,
      selected_person_role: data.selectedPersonRole,
      other_person_id: data.otherPersonId,
      other_person_name: data.otherPersonName,
      other_person_role: data.otherPersonRole,
      category: data.category,
      variant: data.variant
    });
  },

  trackComparisonView: (data: {
    person1Id: string;
    person1Name: string;
    person1Role: string;
    person2Id: string;
    person2Name: string;
    person2Role: string;
    category: string;
    isFirstVisit: boolean;
    variant: string;
  }) => {
    if (!MIXPANEL_TOKEN) return;
    mixpanel.track('Comparison Viewed', {
      person1_id: data.person1Id,
      person1_name: data.person1Name,
      person1_role: data.person1Role,
      person2_id: data.person2Id,
      person2_name: data.person2Name,
      person2_role: data.person2Role,
      category: data.category,
      is_first_visit: data.isFirstVisit,
      variant: data.variant,
    });
  },

  trackCategoryChange: (category: string) => {
    if (!MIXPANEL_TOKEN) return;
    mixpanel.track('Category Changed', { category });
  },

  trackFirstVisit: () => {
    if (!MIXPANEL_TOKEN) return;
    mixpanel.track('First Visit');
  },
};

export default analytics;
