import React from 'react';
import './FileStatusBadge.css';

export type FileStatus = 'draft' | 'login' | 'under_process' | 'sanctioned' | 'disbursed' | 'completed' | 'cancelled';

interface FileStatusBadgeProps {
  status: FileStatus;
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
}

const statusConfig: Record<FileStatus, { label: string; bg: string; color: string; icon: string }> = {
  draft: {
    label: 'Draft',
    bg: '#f3f4f6',
    color: '#6b7280',
    icon: '📝',
  },
  login: {
    label: 'Login',
    bg: '#dbeafe',
    color: '#1e40af',
    icon: '📋',
  },
  under_process: {
    label: 'Under Process',
    bg: '#fef3c7',
    color: '#92400e',
    icon: '⏳',
  },
  sanctioned: {
    label: 'Sanctioned',
    bg: '#d1fae5',
    color: '#065f46',
    icon: '✅',
  },
  disbursed: {
    label: 'Disbursed',
    bg: '#ddd6fe',
    color: '#4c1d95',
    icon: '💸',
  },
  completed: {
    label: 'Completed',
    bg: '#dcfce7',
    color: '#15803d',
    icon: '🎉',
  },
  cancelled: {
    label: 'Cancelled',
    bg: '#fee2e2',
    color: '#b91c1c',
    icon: '❌',
  },
};

const FileStatusBadge: React.FC<FileStatusBadgeProps> = ({
  status,
  size = 'medium',
  showIcon = true,
}) => {
  const config = statusConfig[status];

  return (
    <span
      className={`file-status-badge file-status-${size}`}
      style={{
        backgroundColor: config.bg,
        color: config.color,
      }}
    >
      {showIcon && <span className="status-icon">{config.icon}</span>}
      <span className="status-label">{config.label}</span>
    </span>
  );
};

export default FileStatusBadge;
