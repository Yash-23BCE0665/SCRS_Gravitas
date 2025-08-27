import type { Team, User, EventKey, AdminUser } from './types';

interface Database {
  teams: Team[];
  admins: AdminUser[];
  eventRegistrations: Record<EventKey, Set<string>>;
  MAX_TEAM_MEMBERS: number;
}

// In-memory "database"
// In a real app, this would be a proper database.
// NOTE: This will reset on every server restart in development.
export const db: Database = {
  teams: [],
  admins: [
    { id: 'admin1', username: 'shadowmaster' },
  ],
  eventRegistrations: {
    'de-crypt': new Set(['21BCE0001', '22BCE0002', '21BIT0054', '21BCI0123']),
    'code-a-thon': new Set(['23BCH0003', '21BCE0001', '22BCE0101', '21BCE0456']),
  },
  MAX_TEAM_MEMBERS: 4,
};
