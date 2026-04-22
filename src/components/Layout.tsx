import React from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Map as MapIcon, 
  Bell, 
  ShieldAlert, 
  LogOut, 
  User,
  MessageSquare,
  Menu,
  X,
  FolderLock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { logout } from '../firebase';
import { cn } from '../lib/utils';
import AnimatedBackground from './AnimatedBackground';

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick: () => void;
}

const SidebarItem = ({ icon: Icon, label, active, onClick }: SidebarItemProps) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
      active 
        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
        : "text-slate-400 hover:bg-slate-800 hover:text-white"
    )}
  >
    <Icon className={cn("w-5 h-5", active ? "text-white" : "group-hover:text-blue-400")} />
    <span className="font-medium">{label}</span>
  </button>
);

export default function Layout({ 
  children, 
  activeTab, 
  setActiveTab,
  userRole 
}: { 
  children: React.ReactNode; 
  activeTab: string; 
  setActiveTab: (tab: string) => void;
  userRole: string;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'report', label: 'Report Crime', icon: FileText },
    { id: 'evidence', label: 'Evidence Vault', icon: FolderLock },
    { id: 'map', label: 'Crime Map', icon: MapIcon },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'chatbot', label: 'AI Assistant', icon: MessageSquare },
  ];

  if (userRole === 'officer' || userRole === 'admin') {
    menuItems.push({ id: 'admin', label: 'Admin Panel', icon: ShieldAlert });
  }

  return (
    <div className="min-h-screen text-slate-200 flex overflow-hidden">
      <AnimatedBackground />
      {/* Mobile Sidebar Toggle */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-400"
      >
        {isSidebarOpen ? <X /> : <Menu />}
      </button>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-72 bg-slate-900 border-r border-slate-800 p-6 flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
            <ShieldAlert className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">GuardianEye</span>
        </div>

        <nav className="flex-1 space-y-2">
          {menuItems.map((item) => (
            <SidebarItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeTab === item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsSidebarOpen(false);
              }}
            />
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-800">
          <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-4">
            <div className="flex gap-3">
              <ShieldAlert className="w-5 h-5 text-blue-500 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-white mb-1">Secure Access</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  You are accessing GuardianEye via a secure, anonymous session.
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        <div className="max-w-7xl mx-auto p-4 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
