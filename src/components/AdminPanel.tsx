import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Users, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Filter,
  Search,
  MoreVertical,
  UserPlus,
  ArrowUpRight,
  MapPin,
  AlertTriangle,
  Download,
  X,
  UserCheck,
  MessageSquare,
  Send,
  Calendar,
  User as UserIcon,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, onSnapshot, updateDoc, doc, addDoc, limit, getDocs, where, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { CrimeReport, UserProfile } from '../types';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface AdminPanelProps {
  user: UserProfile;
}

export default function AdminPanel({ user }: AdminPanelProps) {
  const [reports, setReports] = useState<CrimeReport[]>([]);
  const [officers, setOfficers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedOfficerId, setSelectedOfficerId] = useState('all');
  const [showAddOfficer, setShowAddOfficer] = useState(false);
  const [officerEmail, setOfficerEmail] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<CrimeReport | null>(null);
  const [newNote, setNewNote] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'timeline' | 'chat'>('details');
  const [chatMessage, setChatMessage] = useState('');

  useEffect(() => {
    const reportsPath = 'reports';
    const usersPath = 'users';
    const qReports = query(collection(db, reportsPath), limit(50));
    const qUsers = query(collection(db, usersPath));

    const unsubReports = onSnapshot(qReports, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CrimeReport));
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setReports(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, reportsPath);
    });

    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      setOfficers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any as UserProfile)).filter(u => u.role === 'officer'));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, usersPath);
    });

    return () => {
      unsubReports();
      unsubUsers();
    };
  }, []);

  useEffect(() => {
    if (selectedReport) {
      const updatedReport = reports.find(r => r.id === selectedReport.id);
      if (updatedReport) {
        setSelectedReport(updatedReport);
      }
    }
  }, [reports]);

  const handleStatusUpdate = async (reportId: string, status: string) => {
    try {
      await updateDoc(doc(db, 'reports', reportId), { status });
      
      // Notify user
      const report = reports.find(r => r.id === reportId);
      if (report) {
        await addDoc(collection(db, 'notifications'), {
          userId: report.reporterId,
          title: 'Case Status Updated',
          message: `Your report for ${report.type} is now ${status}.`,
          read: false,
          createdAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleAssignOfficer = async (reportId: string, officerId: string) => {
    try {
      await updateDoc(doc(db, 'reports', reportId), { assignedOfficerId: officerId });
      
      // Notify officer (optional, but good practice)
      const officer = officers.find(o => o.uid === officerId);
      if (officer) {
        await addDoc(collection(db, 'notifications'), {
          userId: officerId,
          title: 'New Case Assigned',
          message: `You have been assigned to case ID: ${reportId.slice(0, 8)}...`,
          read: false,
          createdAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddOfficer = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const q = query(collection(db, 'users'), where('email', '==', officerEmail));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        alert('User not found with this email. They must sign in at least once.');
      } else {
        const userDoc = querySnapshot.docs[0];
        await updateDoc(doc(db, 'users', userDoc.id), { role: 'officer' });
        alert('User promoted to Officer successfully!');
        setShowAddOfficer(false);
        setOfficerEmail('');
      }
    } catch (error) {
      console.error(error);
      alert('Failed to add officer.');
    } finally {
      setActionLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Type', 'Description', 'Status', 'Priority', 'Location', 'Reporter', 'Date'];
    const rows = filteredReports.map(r => [
      r.id,
      r.type,
      r.description.replace(/,/g, ';'),
      r.status,
      r.priority,
      r.location.address.replace(/,/g, ';'),
      r.reporterName,
      r.createdAt
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `crime_reports_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredReports = reports.filter(r => {
    const matchesFilter = filter === 'all' || r.status === filter;
    const matchesOfficer = selectedOfficerId === 'all' || r.assignedOfficerId === selectedOfficerId;
    const matchesSearch = r.type.toLowerCase().includes(search.toLowerCase()) || 
                         r.description.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch && matchesOfficer;
  });

  const generateFIR = (report: CrimeReport) => {
    const doc = new jsPDF();
    const assignedOfficer = officers.find(o => o.uid === report.assignedOfficerId);

    // Header
    doc.setFontSize(20);
    doc.setTextColor(30, 41, 59);
    doc.text("FIRST INFORMATION REPORT (FIR)", 105, 15, { align: "center" });
    doc.setFontSize(10);
    doc.text(`GuardianEye Crime Reporting System`, 105, 22, { align: "center" });
    doc.text(`Generated on: ${format(new Date(), 'PPP p')}`, 105, 27, { align: "center" });
    doc.setDrawColor(30, 41, 59);
    doc.line(20, 32, 190, 32);

    // Report Details
    autoTable(doc, {
      startY: 40,
      head: [['Field', 'Details']],
      body: [
        ['FIR ID', report.id],
        ['Crime Type', report.type.toUpperCase()],
        ['Date & Time of Incident', format(new Date(report.dateTime || report.createdAt), 'PPP p')],
        ['Location', report.location.address],
        ['Status', report.status.toUpperCase()],
        ['Priority', report.priority.toUpperCase()],
      ],
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59] }
    });

    // Reporter Details
    const reporterInfo = report.isAnonymous ? "ANONYMOUS" : report.reporterName;
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Reporter Information']],
      body: [
        ['Name', reporterInfo],
        ['Reporter ID', report.reporterId]
      ],
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59] }
    });

    // Description
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Crime Description']],
      body: [[report.description]],
      theme: 'plain',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] }
    });

    // Officer Info
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Assigned Officer']],
      body: [
        ['Name', assignedOfficer?.displayName || 'Not Assigned'],
        ['Officer ID', report.assignedOfficerId || 'N/A']
      ],
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59] }
    });

    // Footer
    const finalY = (doc as any).lastAutoTable.finalY + 30;
    if (finalY < 270) {
      doc.line(20, finalY, 70, finalY);
      doc.text("Officer Signature", 20, finalY + 5);
      
      doc.line(140, finalY, 190, finalY);
      doc.text("Department Seal", 140, finalY + 5);
    }

    doc.save(`FIR_${report.id}.pdf`);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport || !newNote.trim()) return;

    setActionLoading(true);
    try {
      const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm');
      const officerName = user.displayName || 'Officer';
      const noteWithMeta = `[${timestamp}] ${officerName}: ${newNote.trim()}`;
      
      await updateDoc(doc(db, 'reports', selectedReport.id), {
        notes: arrayUnion(noteWithMeta)
      });
      
      setNewNote('');
      // The snapshot listener will update the local state
    } catch (error) {
      console.error(error);
      alert('Failed to add note.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport || !chatMessage.trim() || !user) return;

    const newMessage = {
      id: Date.now().toString(),
      senderId: user.uid,
      senderName: user.displayName || 'Officer',
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

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Police Command Center</h1>
          <p className="text-slate-400">Manage investigations, assign officers, and monitor crime trends.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowAddOfficer(true)}
            className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors border border-slate-700"
          >
            <UserPlus className="w-4 h-4" />
            Add Officer
          </button>
          <button 
            onClick={exportToCSV}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-lg shadow-blue-600/20"
          >
            <FileText className="w-4 h-4" />
            Export Data
          </button>
        </div>
      </header>

      <AnimatePresence>
        {showAddOfficer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl max-w-md w-full"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Add New Officer</h2>
                <button onClick={() => setShowAddOfficer(false)} className="text-slate-500 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleAddOfficer} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Officer Email</label>
                  <input 
                    type="email"
                    required
                    value={officerEmail}
                    onChange={(e) => setOfficerEmail(e.target.value)}
                    placeholder="Enter user's email address"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-2 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                    User must have signed in to the system at least once.
                  </p>
                </div>
                <button 
                  type="submit"
                  disabled={actionLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {actionLoading ? "Processing..." : (
                    <>
                      <UserCheck className="w-5 h-5" />
                      Promote to Officer
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="sticky top-0 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 z-10">
                <div className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600/10 rounded-lg">
                      <ShieldAlert className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Case Management</h2>
                      <p className="text-xs text-slate-500 font-mono">ID: {selectedReport.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => generateFIR(selectedReport)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20"
                    >
                      <Download className="w-4 h-4" />
                      <span>Generate FIR</span>
                    </button>
                    <button 
                      onClick={() => setSelectedReport(null)}
                      className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>
                <div className="flex px-6 border-b border-slate-800">
                  {['details', 'timeline', 'chat'].map((tab) => (
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

              <div className="flex-1 overflow-y-auto p-8">
                {activeTab === 'details' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column: Case Details */}
                    <div className="space-y-8">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Status</p>
                          <select 
                            value={selectedReport.status}
                            onChange={(e) => handleStatusUpdate(selectedReport.id, e.target.value)}
                            className="w-full bg-transparent text-sm font-bold text-white outline-none"
                          >
                            <option value="submitted">Submitted</option>
                            <option value="investigating">Investigating</option>
                            <option value="resolved">Resolved</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </div>
                        <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Priority</p>
                          <p className="text-sm font-bold text-white uppercase">{selectedReport.priority}</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-start gap-4 p-4 bg-slate-950/50 border border-slate-800 rounded-2xl">
                          <MapPin className="w-5 h-5 text-blue-500 shrink-0 mt-1" />
                          <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Location</p>
                            <p className="text-sm text-slate-300">{selectedReport.location.address}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-4 p-4 bg-slate-950/50 border border-slate-800 rounded-2xl">
                          <Calendar className="w-5 h-5 text-blue-500 shrink-0 mt-1" />
                          <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Incident Date</p>
                            <p className="text-sm text-slate-300">{format(new Date(selectedReport.dateTime || selectedReport.createdAt), 'PPP p')}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-4 p-4 bg-slate-950/50 border border-slate-800 rounded-2xl">
                          <UserIcon className="w-5 h-5 text-blue-500 shrink-0 mt-1" />
                          <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Reporter</p>
                            <p className="text-sm text-slate-300">{selectedReport.isAnonymous ? 'Anonymous' : selectedReport.reporterName}</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Description</p>
                        <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl">
                          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                            {selectedReport.description}
                          </p>
                        </div>
                      </div>

                      {selectedReport.evidence && selectedReport.evidence.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Evidence</p>
                          <div className="grid grid-cols-3 gap-3">
                            {selectedReport.evidence.map((url, i) => (
                              <a 
                                key={i} 
                                href={url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="aspect-square bg-slate-950 border border-slate-800 rounded-xl overflow-hidden group relative"
                              >
                                <img src={url} alt={`Evidence ${i + 1}`} className="w-full h-full object-cover transition-transform group-hover:scale-110" referrerPolicy="no-referrer" />
                                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <ExternalLink className="w-4 h-4 text-white" />
                                </div>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Column: Investigation Notes */}
                    <div className="flex flex-col h-full min-h-[400px]">
                      <div className="flex items-center gap-2 mb-4">
                        <MessageSquare className="w-5 h-5 text-blue-500" />
                        <h3 className="text-lg font-bold text-white">Investigation Notes</h3>
                      </div>

                      <div className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl p-4 mb-4 overflow-y-auto space-y-4">
                        {selectedReport.notes && selectedReport.notes.length > 0 ? (
                          [...selectedReport.notes].reverse().map((note, i) => (
                            <div key={i} className="group">
                              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-sm text-slate-300 leading-relaxed">
                                {note}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-slate-600 text-center p-8">
                            <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
                            <p className="text-sm">No investigation notes yet.</p>
                            <p className="text-xs mt-1">Add a note below to start documenting the case.</p>
                          </div>
                        )}
                      </div>

                      <form onSubmit={handleAddNote} className="relative">
                        <textarea
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          placeholder="Add investigation update..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 pr-12 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] resize-none"
                        />
                        <button 
                          type="submit"
                          disabled={actionLoading || !newNote.trim()}
                          className="absolute bottom-3 right-3 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </form>
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
                          msg.senderId === user.uid ? "ml-auto items-end" : "items-start"
                        )}>
                          <div className={cn(
                            "p-3 rounded-2xl text-sm",
                            msg.senderId === user.uid 
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
                        placeholder="Type a message to the reporter..."
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-rose-500/10 rounded-xl">
              <ShieldAlert className="w-6 h-6 text-rose-500" />
            </div>
            <div>
              <p className="text-slate-500 text-sm font-medium">Pending Cases</p>
              <h3 className="text-2xl font-bold text-white">{reports.filter(r => r.status === 'submitted').length}</h3>
            </div>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <Clock className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-slate-500 text-sm font-medium">Active Investigations</p>
              <h3 className="text-2xl font-bold text-white">{reports.filter(r => r.status === 'investigating').length}</h3>
            </div>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-slate-500 text-sm font-medium">Resolved Today</p>
              <h3 className="text-2xl font-bold text-white">{reports.filter(r => r.status === 'resolved').length}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text"
                placeholder="Search cases..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-1">
              {['all', 'submitted', 'investigating', 'resolved'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                    filter === f ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-500 ml-2" />
              <select
                value={selectedOfficerId}
                onChange={(e) => setSelectedOfficerId(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Officers</option>
                {officers.map(officer => (
                  <option key={officer.uid} value={officer.uid}>
                    {officer.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-800/50 text-slate-400 text-xs font-bold uppercase tracking-widest">
                <th className="px-6 py-4">Case Details</th>
                <th className="px-6 py-4">Reporter</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4">Assigned To</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredReports.map((report) => (
                <tr key={report.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "p-2 rounded-lg shrink-0",
                        report.priority === 'critical' ? "bg-rose-500/10 text-rose-500" : "bg-blue-500/10 text-blue-500"
                      )}>
                        <ShieldAlert className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white mb-0.5">{report.type}</p>
                        <p className="text-xs text-slate-500 line-clamp-1">{report.location.address}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                        {report.reporterName.charAt(0)}
                      </div>
                      <span className="text-sm text-slate-300">{report.reporterName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md",
                      report.priority === 'critical' ? "bg-rose-500/10 text-rose-500" :
                      report.priority === 'urgent' ? "bg-amber-500/10 text-amber-500" :
                      "bg-blue-500/10 text-blue-500"
                    )}>
                      {report.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <select 
                      value={report.assignedOfficerId || ''}
                      onChange={(e) => handleAssignOfficer(report.id, e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 outline-none focus:ring-2 focus:ring-blue-500 w-full max-w-[150px]"
                    >
                      <option value="">Unassigned</option>
                      {officers.map(officer => (
                        <option key={officer.uid} value={officer.uid}>
                          {officer.displayName}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <select 
                      value={report.status}
                      onChange={(e) => handleStatusUpdate(report.id, e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="submitted">Submitted</option>
                      <option value="investigating">Investigating</option>
                      <option value="resolved">Resolved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => generateFIR(report)}
                        title="Generate FIR PDF"
                        className="p-2 bg-blue-600/10 text-blue-500 hover:bg-blue-600 hover:text-white rounded-lg transition-all"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setSelectedReport(report)}
                        className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"
                        title="View Case Details & Notes"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
