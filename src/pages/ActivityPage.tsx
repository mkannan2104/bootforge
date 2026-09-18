import React, { useState, useEffect } from 'react';
import { Activity, Search, Copy, Check, Trash2, RefreshCw, Filter, ChevronDown, ChevronRight } from 'lucide-react';
import { useActivityStore } from '../stores/activityStore';
import { LogLevel } from '../types/settings';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { formatTimestamp } from '../utils/formatters';

export const ActivityPage: React.FC = () => {
  const { logs, isLoading, fetchLogs, clearLogs } = useActivityStore();
  const [selectedLevel, setSelectedLevel] = useState<LogLevel | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = logs.filter((log) => {
    const matchesLevel = selectedLevel === 'ALL' || log.level === selectedLevel;
    const matchesSearch =
      searchQuery.trim() === '' ||
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.details && log.details.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesLevel && matchesSearch;
  });

  const handleCopyLogs = async () => {
    const text = logs
      .map(
        (l) =>
          `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.category}] ${l.message}${
            l.details ? ` - Details: ${l.details}` : ''
          }`
      )
      .join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const getLevelBadge = (level: LogLevel) => {
    switch (level) {
      case 'Success':
        return <Badge variant="success">Success</Badge>;
      case 'Warning':
        return <Badge variant="warning">Notice</Badge>;
      case 'Error':
        return <Badge variant="danger">Error</Badge>;
      default:
        return <Badge variant="neutral">Info</Badge>;
    }
  };

  return (
    <div className="space-y-4 select-none font-normal text-xs text-slate-700">
      {/* Page Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm text-slate-900">Activity History</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              History of connected USB drives, file writing, and formatting actions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchLogs}
            disabled={isLoading}
            icon={<RefreshCw className="w-3.5 h-3.5 text-slate-500" />}
          >
            Refresh
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopyLogs}
            icon={copied ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
          >
            {copied ? 'Copied' : 'Copy History'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearLogs}
            icon={<Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-rose-700" />}
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center gap-3 p-2.5 bg-white border border-slate-200">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search history..."
            className="w-full pl-8 pr-2.5 py-1 bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
          />
        </div>

        {/* Level Filters */}
        <div className="flex items-center gap-1 bg-slate-50 p-1 border border-slate-200">
          {(['ALL', 'Info', 'Success', 'Warning', 'Error'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setSelectedLevel(lvl)}
              className={`px-2 py-0.5 text-[11px] transition-colors cursor-pointer ${
                selectedLevel === lvl
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              {lvl === 'ALL' ? 'All' : lvl === 'Warning' ? 'Notices' : lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Log Feed */}
      {filteredLogs.length === 0 ? (
        <Card className="p-8 text-center text-slate-500 border border-dashed border-slate-300 bg-white">
          <Filter className="w-6 h-6 mx-auto mb-1.5 text-slate-400" />
          <p className="text-xs text-slate-700">No history found</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            No entries match your search or filter.
          </p>
        </Card>
      ) : (
        <div className="bg-white border border-slate-200 divide-y divide-slate-100 text-xs">
          {filteredLogs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            return (
              <div
                key={log.id}
                className="hover:bg-slate-50 transition-colors p-2.5 cursor-pointer"
                onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-slate-400 shrink-0">
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </span>
                    <span className="text-slate-400 shrink-0 text-[11px] font-mono">
                      {formatTimestamp(log.timestamp)}
                    </span>
                    <div className="shrink-0">{getLevelBadge(log.level)}</div>
                    <span className="text-slate-500 shrink-0 px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-[11px]">
                      {log.category}
                    </span>
                    <span className="text-slate-800 truncate text-xs">{log.message}</span>
                  </div>
                </div>

                {isExpanded && log.details && (
                  <div className="mt-2 ml-6 p-2 bg-slate-50 border border-slate-200 text-slate-600 text-[11px] font-mono whitespace-pre-wrap break-all">
                    {log.details}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
