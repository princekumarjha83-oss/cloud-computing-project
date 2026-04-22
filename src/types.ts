export type UserRole = 'user' | 'officer' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  phoneNumber?: string;
  twoFactorEnabled?: boolean;
  createdAt: string;
}

export type ReportStatus = 'submitted' | 'investigating' | 'resolved' | 'rejected';
export type ReportPriority = 'normal' | 'urgent' | 'critical';

export interface TimelineEvent {
  status: ReportStatus;
  message: string;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
}

export interface CrimeReport {
  id: string;
  reporterId: string;
  reporterName: string;
  isAnonymous: boolean;
  type: string;
  description: string;
  dateTime: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  status: ReportStatus;
  priority: ReportPriority;
  evidence: string[];
  assignedOfficerId?: string;
  notes: string[];
  timeline: TimelineEvent[];
  messages?: ChatMessage[];
  metadata?: {
    ipAddress: string;
    userAgent: string;
  };
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}
