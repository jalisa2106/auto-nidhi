import React from 'react';
import { type HistoryEvent } from '../../lib/mockCustomerFiles';
import './StatusTimeline.css';

interface StatusTimelineProps {
  history: HistoryEvent[];
}

const eventTypeIcons: Record<string, string> = {
  file_created: '📄',
  status_changed: '🔄',
  document_uploaded: '📤',
  document_verified: '✅',
  document_rejected: '❌',
  admin_note: '💬',
};

const eventTypeColors: Record<string, string> = {
  file_created: '#6366f1',
  status_changed: '#f59e0b',
  document_uploaded: '#06b6d4',
  document_verified: '#10b981',
  document_rejected: '#ef4444',
  admin_note: '#8b5cf6',
};

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`;

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatFullDateTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const StatusTimeline: React.FC<StatusTimelineProps> = ({ history }) => {
  if (!history || history.length === 0) {
    return (
      <div className="timeline-empty">
        <p>No timeline events yet</p>
      </div>
    );
  }

  // Reverse to show latest first
  const sortedHistory = [...history].reverse();

  return (
    <div className="status-timeline">
      <div className="timeline-container">
        {sortedHistory.map((event, index) => (
          <div key={event.id} className="timeline-item">
            <div className="timeline-marker">
              <div
                className="marker-dot"
                style={{ backgroundColor: eventTypeColors[event.type] }}
                title={eventTypeIcons[event.type] || '•'}
              >
                <span className="marker-icon">{eventTypeIcons[event.type] || '•'}</span>
              </div>
              {index < sortedHistory.length - 1 && <div className="timeline-line" />}
            </div>

            <div className="timeline-content">
              <div className="timeline-header">
                <h4 className="timeline-title">{event.title}</h4>
                <span className="timeline-time" title={formatFullDateTime(event.timestamp)}>
                  {formatRelativeTime(event.timestamp)}
                </span>
              </div>

              {event.description && (
                <p className="timeline-description">{event.description}</p>
              )}

              {event.old_status && event.new_status && (
                <div className="timeline-status-change">
                  <span className="status-badge old">{event.old_status}</span>
                  <span className="status-arrow">→</span>
                  <span className="status-badge new">{event.new_status}</span>
                </div>
              )}

              {event.actor && (
                <p className="timeline-actor">
                  <span className="actor-label">By:</span> {event.actor}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StatusTimeline;
