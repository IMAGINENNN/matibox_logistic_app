import React from 'react';
import {
  Calendar,
  LogOut,
  Moon,
  Radio,
  RefreshCw,
  Search,
  Sun,
  X
} from 'lucide-react';
import { User } from '../../types';
import { MatiboxLogo } from '../MatiboxLogo';

interface AdminHeaderProps {
  user: User | null;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  connected: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedDate: string;
  setSelectedDate: (d: string) => void;
  onOpenRefreshConfirm: () => void;
  onLogout: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  user,
  theme,
  toggleTheme,
  connected,
  searchQuery,
  setSearchQuery,
  selectedDate,
  setSelectedDate,
  onOpenRefreshConfirm,
  onLogout
}) => {
  return (
    <header className="sticky top-0 z-40 px-2.5 sm:px-6 pt-2 sm:pt-3">
      <div className="max-w-[1440px] mx-auto glass-floating-strong rounded-2xl sm:rounded-3xl px-3 sm:px-5 py-2.5 sm:py-3 space-y-2.5 lg:space-y-0 lg:flex lg:items-center lg:justify-between lg:gap-4">
        {/* Top Row (Mobile & Desktop): Brand + Quick Actions */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="min-w-0">
            <div className="hidden sm:block">
              <MatiboxLogo
                size="md"
                subtitle="Central Dispatch · Maridalsveien 300"
                badge={user?.role || 'Admin'}
                darkText={theme === 'dark'}
              />
            </div>
            <div className="sm:hidden">
              <MatiboxLogo
                size="sm"
                subtitle={user?.role === 'Dispatcher' ? 'Dispatcher' : 'Admin Dispatch'}
                darkText={theme === 'dark'}
              />
            </div>
          </div>

          {/* Mobile-only compact status + theme + sign out */}
          <div className="flex items-center gap-1 sm:gap-1.5 lg:hidden shrink-0">
            <span
              className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-full text-[11px] font-semibold border ${
                connected
                  ? 'bg-[var(--status-success-soft)] border-[var(--status-success)]/30 text-[var(--status-success)]'
                  : 'bg-[var(--status-warning-soft)] border-[var(--status-warning)]/30 text-[var(--status-warning)]'
              }`}
              title={connected ? 'Live Sync Connected' : 'Reconnecting'}
            >
              <Radio className={`w-3.5 h-3.5 ${connected ? 'animate-pulse' : ''}`} />
              <span className="hidden xs:inline">{connected ? 'Live' : 'Sync'}</span>
            </span>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to Daylight mode' : 'Switch to Dark mode'}
              className="p-2 rounded-xl surface-elevated hover:bg-[var(--surface-hover)] transition cursor-pointer"
              style={{ color: 'var(--text-heading)' }}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-[#276EF1]" />
              )}
            </button>

            <button
              type="button"
              onClick={onLogout}
              aria-label="Sign out"
              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-[var(--status-danger-soft)] text-[var(--status-danger)] border border-[var(--status-danger)]/25 text-xs font-semibold cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Search + Date + Reset (Wraps cleanly on compact screens, inline on Desktop) */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 flex-1 lg:max-w-md min-w-0">
          <div className="relative flex-1 min-w-[180px]">
            <Search
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--text-muted)' }}
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stops, phone, car..."
              aria-label="Search deliveries, kindergartens, or cars"
              className={`input-field w-full pl-9 ${
                searchQuery ? 'pr-8' : 'pr-3'
              } py-2 rounded-xl text-xs font-medium min-h-[38px]`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-[var(--surface-hover)] cursor-pointer"
                style={{ color: 'var(--text-muted)' }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Mobile/Tablet compact Date + Reset buttons */}
          <div className="flex items-center gap-1.5 lg:hidden flex-1 xs:flex-initial shrink-0">
            <label className="relative flex-1 xs:flex-initial flex items-center input-field rounded-xl px-2.5 py-1.5 min-h-[38px] text-xs font-semibold">
              <Calendar className="w-3.5 h-3.5 mr-1.5 shrink-0 text-[var(--accent-primary-vivid)]" />
              <input
                type="date"
                aria-label="Delivery date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent focus:outline-none text-xs font-semibold w-full xs:w-[110px] tabular-nums"
                style={{ color: 'var(--text-heading)' }}
              />
            </label>

            <button
              type="button"
              onClick={onOpenRefreshConfirm}
              title="Reset today's assignments"
              aria-label="Reset today's assignments"
              className="p-2.5 rounded-xl surface-elevated border border-[var(--border-strong)] hover:bg-[var(--surface-hover)] transition cursor-pointer min-h-[38px]"
              style={{ color: 'var(--text-heading)' }}
            >
              <RefreshCw className="w-3.5 h-3.5 text-[var(--accent-primary-vivid)]" />
            </button>
          </div>
        </div>

        {/* Desktop Right Controls */}
        <div className="hidden lg:flex items-center gap-2 shrink-0">
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
              connected
                ? 'bg-[var(--status-success-soft)] border-[var(--status-success)]/30 text-[var(--status-success)]'
                : 'bg-[var(--status-warning-soft)] border-[var(--status-warning)]/30 text-[var(--status-warning)]'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${connected ? 'animate-pulse' : ''}`} />
            <span>{connected ? 'Live Sync' : 'Syncing'}</span>
          </div>

          <label className="flex items-center input-field rounded-xl px-3 py-1.5 min-h-[38px] text-xs font-semibold cursor-pointer">
            <Calendar className="w-3.5 h-3.5 mr-2 text-[var(--accent-primary-vivid)]" />
            <input
              type="date"
              aria-label="Delivery date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent focus:outline-none text-xs font-semibold tabular-nums"
              style={{ color: 'var(--text-heading)' }}
            />
          </label>

          <button
            type="button"
            onClick={onOpenRefreshConfirm}
            title="Restore all assignments for today to default (Unassigned)"
            className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] rounded-xl text-xs font-semibold cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[var(--accent-primary-vivid)]" />
            <span>Reset Day</span>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to Daylight mode' : 'Switch to Dark mode'}
            className="btn-secondary p-2 min-h-[38px] min-w-[38px] rounded-xl inline-flex items-center justify-center cursor-pointer"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-[#276EF1]" />
            )}
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[38px] rounded-xl bg-[var(--status-danger-soft)] hover:bg-[var(--status-danger)] text-[var(--status-danger)] hover:text-white border border-[var(--status-danger)]/25 text-xs font-semibold transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
