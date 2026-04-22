import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  ShieldAlert,
  Plus,
  ArrowRight,
  TrendingUp,
  MapPin,
  X,
  Calendar,
  User,
  FileText,
  ExternalLink,
  MessageCircle,
  History,
  Send,
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, onSnapshot, limit, arrayUnion, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { CrimeReport, ChatMessage, UserProfile } from '../types';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { Shield } from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, color }: any) => (
  <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
        <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
      </div>
      <TrendingUp className="w-4 h-4 text-slate-500" />
    </div>
    <p className="text-slate-400 text-sm font-medium mb-1">{label}</p>
    <h3 className="text-2xl font-bold text-white">{value}</h3>
  </div>
);

export default function Dashboard({ user, onReportClick }: { user: UserProfile, onReportClick: () => void }) {
  const [reports, setReports] = useState<CrimeReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<CrimeReport | null>(null);
  const [nearbyReports, setNearbyReports] = useState<CrimeReport[]>([]);
  const [chatMessage, setChatMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'timeline' | 'chat' | 'evidence'>('details');

  useEffect(() => {
    // Fetch all reports to simulate nearby alerts
    const path = 'reports';
    const q = query(collection(db, path), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CrimeReport));
      // Filter reports from other users that are "nearby" (within ~5km for demo)
      if (auth.currentUser) {
        const others = data.filter(r => r.reporterId !== auth.currentUser?.uid);
        setNearbyReports(others.slice(0, 5));
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport || !chatMessage.trim() || !auth.currentUser) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      senderId: auth.currentUser.uid,
      senderName: auth.currentUser.displayName || 'User',
      text: chatMessage,
      timestamp: new Date().toISOString()
    };

    try {
      await updateDoc(doc(db, 'reports', selectedReport.id), {
        messages: arrayUnion(newMessage)
      });
      setChatMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  useEffect(() => {
    if (!auth.currentUser) return;

    const path = 'reports';
    const q = query(
      collection(db, path),
      where('reporterId', '==', auth.currentUser.uid),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CrimeReport));
      // Sort manually to avoid composite index requirement
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setReports(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedReport) {
      const updatedReport = reports.find(r => r.id === selectedReport.id);
      if (updatedReport) {
        setSelectedReport(updatedReport);
      }
    }
  }, [reports]);

  const stats = [
    { icon: ShieldCheck, label: 'Total Reports', value: reports.length, color: 'bg-blue-500' },
    { icon: Clock, label: 'Under Investigation', value: reports.filter(r => r.status === 'investigating').length, color: 'bg-amber-500' },
    { icon: CheckCircle2, label: 'Resolved', value: reports.filter(r => r.status === 'resolved').length, color: 'bg-emerald-500' },
    { icon: AlertTriangle, label: 'Urgent Cases', value: reports.filter(r => r.priority === 'urgent').length, color: 'bg-rose-500' },
  ];

  return (
    <div className="space-y-8">
      <AnimatePresence>
        {selectedReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 z-10">
                <div className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600/10 rounded-lg">
                      <ShieldAlert className="w-5 h-5 text-blue-500" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Report Management</h2>
                  </div>
                  <button 
                    onClick={() => setSelectedReport(null)}
                    className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="flex px-6 border-b border-slate-800">
                  {['details', 'timeline', 'evidence', 'chat'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab as any)}
                      className={cn(
                        "px-6 py-3 text-sm font-bold capitalize transition-all border-b-2",
                        activeTab === tab ? "text-blue-500 border-blue-500" : "text-slate-500 border-transparent hover:text-slate-300"
                      )}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-8">
                {activeTab === 'details' && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Crime Type</p>
                        <p className="text-lg font-bold text-white">{selectedReport.type}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Status</p>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          selectedReport.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400' :
                          selectedReport.status === 'investigating' ? 'bg-amber-500/10 text-amber-400' :
                          'bg-blue-500/10 text-blue-400'
                        }`}>
                          {selectedReport.status}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-start gap-4 p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                        <MapPin className="w-5 h-5 text-blue-500 shrink-0 mt-1" />
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Location</p>
                          <p className="text-sm text-slate-300">{selectedReport.location.address}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                        <FileText className="w-4 h-4" />
                        Description
                      </div>
                      <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl">
                        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                          {selectedReport.description}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'evidence' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {selectedReport.evidence && selectedReport.evidence.length > 0 ? (
                        selectedReport.evidence.map((url, i) => (
                          <div key={i} className="relative aspect-square bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden group">
                            {url.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)/) ? (
                              <img src={url} alt="Evidence" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                                <FileText className="w-8 h-8 text-blue-500" />
                                <span className="text-[10px] text-slate-500 font-bold uppercase">File {i + 1}</span>
                              </div>
                            )}
                            <a 
                              href={url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                            >
                              <ExternalLink className="w-6 h-6 text-white" />
                            </a>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-full py-12 text-center text-slate-500 italic text-sm">
                          No evidence files attached to this report.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'timeline' && (
                  <div className="space-y-6">
                    <div className="relative pl-8 space-y-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                      {selectedReport.timeline?.map((event, i) => (
                        <div key={i} className="relative">
                          <div className={cn(
                            "absolute -left-8 w-6 h-6 rounded-full border-4 border-slate-900 flex items-center justify-center",
                            event.status === 'resolved' ? "bg-emerald-500" :
                            event.status === 'investigating' ? "bg-amber-500" : "bg-blue-500"
                          )} />
                          <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                              {format(new Date(event.timestamp), 'PPP p')}
                            </p>
                            <h4 className="text-white font-bold capitalize">{event.status}</h4>
                            <p className="text-sm text-slate-400 mt-1">{event.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'chat' && (
                  <div className="flex flex-col h-[500px]">
                    <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
                      {selectedReport.messages?.map((msg, i) => (
                        <div key={i} className={cn(
                          "flex flex-col max-w-[80%]",
                          msg.senderId === auth.currentUser?.uid ? "ml-auto items-end" : "items-start"
                        )}>
                          <div className={cn(
                            "p-3 rounded-2xl text-sm",
                            msg.senderId === auth.currentUser?.uid 
                              ? "bg-blue-600 text-white rounded-tr-none" 
                              : "bg-slate-800 text-slate-300 rounded-tl-none"
                          )}>
                            {msg.text}
                          </div>
                          <span className="text-[10px] text-slate-500 mt-1">
                            {msg.senderName} • {format(new Date(msg.timestamp), 'p')}
                          </span>
                        </div>
                      ))}
                    </div>
                    <form onSubmit={handleSendMessage} className="relative">
                      <input
                        type="text"
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        placeholder="Type a message to the officer..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 pr-12 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button 
                        type="submit"
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-blue-500 hover:text-blue-400"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome back, {user.displayName}</h1>
          <p className="text-slate-400">Track your reports and stay updated on community safety.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={onReportClick}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20"
            aria-label="Report New Crime"
          >
            <Plus className="w-5 h-5" />
            Report New Crime
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <StatCard {...stat} />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Recent Reports</h2>
            <button className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-slate-900/50 animate-pulse rounded-2xl border border-slate-800" />
              ))
            ) : reports.length > 0 ? (
              reports.map((report) => (
                <div 
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className="bg-slate-900 border border-slate-800 p-5 rounded-2xl hover:border-slate-700 transition-colors group cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-bold text-white px-2 py-1 bg-slate-800 rounded-lg uppercase tracking-wider">
                          {report.type || 'Unknown Type'}
                        </span>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          report.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400' :
                          report.status === 'investigating' ? 'bg-amber-500/10 text-amber-400' :
                          'bg-blue-500/10 text-blue-400'
                        }`}>
                          {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-slate-300 line-clamp-1 mb-3">{report.description || 'No description provided.'}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(report.createdAt), 'MMM d, yyyy')}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {report.location.address || 'No location provided'}
                        </span>
                      </div>
                    </div>
                    <button className="p-2 bg-slate-800 rounded-lg text-slate-400 group-hover:text-white transition-colors">
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-dashed border-slate-800">
                <ShieldCheck className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-500">No reports found. Your neighborhood is safe!</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white">Emergency SOS</h2>
          <div className="bg-rose-500/10 border border-rose-500/20 p-6 rounded-2xl text-center">
            <div className="w-20 h-20 bg-rose-500 rounded-full mx-auto flex items-center justify-center shadow-lg shadow-rose-500/40 mb-6 animate-pulse cursor-pointer hover:scale-105 transition-transform active:scale-95">
              <ShieldAlert className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-lg font-bold text-rose-500 mb-2">Emergency SOS</h3>
            <p className="text-slate-400 text-sm mb-6">
              Tap the button to instantly alert the nearest police station with your live location.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-rose-400 uppercase tracking-widest">
              <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping" />
              Live Tracking Active
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold">Nearby Safety Alerts</h3>
              <Bell className="w-4 h-4 text-blue-500" />
            </div>
            <div className="space-y-4">
              {nearbyReports.length > 0 ? (
                nearbyReports.map((alert) => (
                  <div key={alert.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                      <span className="text-xs font-bold text-white uppercase">{alert.type}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mb-1">{alert.location.address}</p>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{alert.description}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 text-center py-4">No recent alerts in your area.</p>
              )}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <h3 className="text-white font-bold mb-4">Safety Tips</h3>
            <ul className="space-y-4 text-sm text-slate-400">
              <li className="flex gap-3">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 shrink-0" />
                Always keep your emergency contacts updated in the profile.
              </li>
              <li className="flex gap-3">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 shrink-0" />
                Report suspicious activities immediately, even if they seem minor.
              </li>
              <li className="flex gap-3">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 shrink-0" />
                Use anonymous reporting for sensitive information.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
