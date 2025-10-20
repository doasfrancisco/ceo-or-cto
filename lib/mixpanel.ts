import mixpanel from 'mixpanel-browser';

const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;

if (MIXPANEL_TOKEN) {
  mixpanel.init(MIXPANEL_TOKEN, {
    debug: true,
    track_pageview: true,
    persistence: 'localStorage',
    record_sessions_percent: 100,
    record_heatmap_data: true,
    ignore_dnt: true,
    api_host: process.env.NEXT_PUBLIC_PROXY_MIXPANEL_API
  });
} else {
  console.warn('Mixpanel token not found. Analytics will not be tracked.');
}

export const analytics = {
  // Track when a user selects a person
  trackSelection: (data: {
    selectedPersonId: string;
    selectedPersonName: string;
    selectedPersonRole: string;
    otherPersonId: string;
    otherPersonName: string;
    otherPersonRole: string;
    category: string;
  }) => {
    if (!MIXPANEL_TOKEN) return;

    try {
      mixpanel.track('Person Selected', {
        selected_person_id: data.selectedPersonId,
        selected_person_name: data.selectedPersonName,
        selected_person_role: data.selectedPersonRole,
        other_person_id: data.otherPersonId,
        other_person_name: data.otherPersonName,
        other_person_role: data.otherPersonRole,
        category: data.category,
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Analytics tracking failed (this is normal in localhost)');
      }
    }
  },

  // Track when a comparison pair is shown to the user
  trackComparisonView: (data: {
    person1Id: string;
    person1Name: string;
    person1Role: string;
    person2Id: string;
    person2Name: string;
    person2Role: string;
    category: string;
    isFirstVisit: boolean;
  }) => {
    if (!MIXPANEL_TOKEN) return;

    try {
      mixpanel.track('Comparison Viewed', {
        person1_id: data.person1Id,
        person1_name: data.person1Name,
        person1_role: data.person1Role,
        person2_id: data.person2Id,
        person2_name: data.person2Name,
        person2_role: data.person2Role,
        category: data.category,
        is_first_visit: data.isFirstVisit,
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Analytics tracking failed (this is normal in localhost)');
      }
    }
  },

  // Track category changes
  trackCategoryChange: (category: string) => {
    if (!MIXPANEL_TOKEN) return;

    try {
      mixpanel.track('Category Changed', {
        category,
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Analytics tracking failed (this is normal in localhost)');
      }
    }
  },

  // Track first visit
  trackFirstVisit: () => {
    if (!MIXPANEL_TOKEN) return;

    try {
      mixpanel.track('First Visit');
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Analytics tracking failed (this is normal in localhost)');
      }
    }
  },
};

export default analytics;
