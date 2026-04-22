import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ReportCrime from './components/ReportCrime';
import Chatbot from './components/Chatbot';
import AdminPanel from './components/AdminPanel';
import CrimeMap from './components/CrimeMap';
import Notifications from './components/Notifications';
import EvidenceVault from './components/EvidenceVault';
import AnimatedBackground from './components/AnimatedBackground';
import { ShieldAlert } from 'lucide-react';
import { UserProfile } from './types';

// Mock user for testing
const mockUser: UserProfile = {
  uid: 'test-user-123',
  email: 'test@guardianeye.com',
  displayName: 'Test User',
  photoURL: '',
  role: 'user',
  createdAt: new Date().toISOString()
};

export default function AppFallback() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard user={mockUser} onReportClick={() => setActiveTab('report')} />;
      case 'report':
        return <ReportCrime onComplete={() => setActiveTab('dashboard')} />;
      case 'map':
        return <CrimeMap />;
      case 'notifications':
        return <Notifications />;
      case 'evidence':
        return <EvidenceVault />;
      case 'chatbot':
        return <Chatbot />;
      case 'admin':
        return <AdminPanel user={mockUser} />;
      default:
        return <Dashboard user={mockUser} onReportClick={() => setActiveTab('dashboard')} />;
    }
  };

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab}
      userRole={mockUser.role}
    >
      {renderContent()}
    </Layout>
  );
}
