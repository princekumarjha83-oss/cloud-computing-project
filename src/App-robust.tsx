import React, { useState, Suspense, lazy } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
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

// Lazy load components to prevent initial load failures
const Layout = lazy(() => import('./components/Layout'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const ReportCrime = lazy(() => import('./components/ReportCrime'));
const Chatbot = lazy(() => import('./components/Chatbot'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const CrimeMap = lazy(() => import('./components/CrimeMap'));
const Notifications = lazy(() => import('./components/Notifications'));
const EvidenceVault = lazy(() => import('./components/EvidenceVault'));

// Loading component
const LoadingSpinner = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '200px',
    backgroundColor: '#1a1a1a',
    color: 'white'
  }}>
    <div style={{ textAlign: 'center' }}>
      <ShieldAlert className="animate-spin" style={{ width: '48px', height: '48px', margin: '0 auto 16px' }} />
      <p>Loading component...</p>
    </div>
  </div>
);

export default function AppRobust() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const renderContent = () => {
    const componentMap = {
      dashboard: (
        <ErrorBoundary>
          <Suspense fallback={<LoadingSpinner />}>
            <Dashboard user={mockUser} onReportClick={() => setActiveTab('report')} />
          </Suspense>
        </ErrorBoundary>
      ),
      report: (
        <ErrorBoundary>
          <Suspense fallback={<LoadingSpinner />}>
            <ReportCrime onComplete={() => setActiveTab('dashboard')} />
          </Suspense>
        </ErrorBoundary>
      ),
      map: (
        <ErrorBoundary>
          <Suspense fallback={<LoadingSpinner />}>
            <CrimeMap />
          </Suspense>
        </ErrorBoundary>
      ),
      notifications: (
        <ErrorBoundary>
          <Suspense fallback={<LoadingSpinner />}>
            <Notifications />
          </Suspense>
        </ErrorBoundary>
      ),
      evidence: (
        <ErrorBoundary>
          <Suspense fallback={<LoadingSpinner />}>
            <EvidenceVault />
          </Suspense>
        </ErrorBoundary>
      ),
      chatbot: (
        <ErrorBoundary>
          <Suspense fallback={<LoadingSpinner />}>
            <Chatbot />
          </Suspense>
        </ErrorBoundary>
      ),
      admin: (
        <ErrorBoundary>
          <Suspense fallback={<LoadingSpinner />}>
            <AdminPanel user={mockUser} />
          </Suspense>
        </ErrorBoundary>
      ),
    };

    return componentMap[activeTab as keyof typeof componentMap] || componentMap.dashboard;
  };

  return (
    <ErrorBoundary
      fallback={
        <div style={{
          padding: '20px',
          backgroundColor: '#1a1a1a',
          color: 'white',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <h2 style={{ color: '#ef4444', fontSize: '2rem' }}>Application Error</h2>
          <p style={{ fontSize: '1.2rem', margin: '20px 0' }}>
            The application encountered an error. Please try refreshing the page.
          </p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Reload Application
          </button>
        </div>
      }
    >
      <ErrorBoundary>
        <Suspense fallback={<LoadingSpinner />}>
          <Layout 
            activeTab={activeTab} 
            setActiveTab={setActiveTab}
            userRole={mockUser.role}
          >
            {renderContent()}
          </Layout>
        </Suspense>
      </ErrorBoundary>
    </ErrorBoundary>
  );
}
