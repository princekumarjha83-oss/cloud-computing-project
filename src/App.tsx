import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { handleFirestoreError, OperationType } from './lib/firestore-errors';
import { UserProfile } from './types';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ReportCrime from './components/ReportCrime';
import Chatbot from './components/Chatbot';
import AdminPanel from './components/AdminPanel';
import CrimeMap from './components/CrimeMap';
import Notifications from './components/Notifications';
import EvidenceVault from './components/EvidenceVault';
import AnimatedBackground from './components/AnimatedBackground';
import { ShieldAlert, AlertCircle, RefreshCcw } from 'lucide-react';

// Error Boundary Component
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 text-center">
          <AnimatedBackground />
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
            <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-rose-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Something went wrong</h2>
            <p className="text-slate-400 mb-8 text-sm leading-relaxed">
              An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              <RefreshCcw className="w-5 h-5" />
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    console.log("App: Starting auth initialization...");
    
    // Add a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.log("App: Auth timeout reached, forcing loading to false");
      setLoading(false);
      setAuthError("Authentication timed out. Please refresh the page.");
    }, 10000); // 10 second timeout

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("App: Auth state changed, user:", firebaseUser);
      clearTimeout(timeoutId); // Clear timeout if auth completes
      
      if (firebaseUser) {
        const path = `users/${firebaseUser.uid}`;
        console.log("App: User authenticated, fetching user data from:", path);
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            console.log("App: User data found:", userDoc.data());
            setUser(userDoc.data() as UserProfile);
          } else {
            console.log("App: Creating new user profile...");
            const newUser: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || 'guest@guardianeye.com',
              displayName: firebaseUser.displayName || 'Guest User',
              photoURL: firebaseUser.photoURL || '',
              role: 'user',
              createdAt: new Date().toISOString()
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
            console.log("App: New user created:", newUser);
            setUser(newUser);
          }
        } catch (error) {
          console.error("App: Error in user data fetch/create:", error);
          setAuthError("Failed to load user data. Please refresh the page.");
          handleFirestoreError(error, OperationType.GET, path);
        }
      } else {
        console.log("App: No user authenticated, attempting anonymous sign-in...");
        // Automatically sign in anonymously if no user
        try {
          await signInAnonymously(auth);
          console.log("App: Anonymous sign-in initiated");
        } catch (error) {
          console.error("App: Anonymous auth failed:", error);
          setAuthError("Authentication failed. Please refresh the page.");
          setLoading(false); // Set loading to false even if auth fails
        }
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <AnimatedBackground />
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <div className="flex items-center gap-2 text-blue-500 font-bold tracking-widest uppercase text-xs">
            <ShieldAlert className="w-4 h-4" />
            GuardianEye
          </div>
          {authError && (
            <div className="max-w-md text-center p-4 bg-red-900/20 border border-red-800 rounded-lg">
              <p className="text-red-400 text-sm">{authError}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
              >
                Refresh
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <AnimatedBackground />
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 font-medium">Initializing secure access...</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard user={user} onReportClick={() => setActiveTab('report')} />;
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
        return <AdminPanel user={user} />;
      default:
        return <Dashboard user={user} onReportClick={() => setActiveTab('dashboard')} />;
    }
  };

  return (
    <ErrorBoundary>
      <Layout 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        userRole={user.role}
      >
        {renderContent()}
      </Layout>
    </ErrorBoundary>
  );
}
