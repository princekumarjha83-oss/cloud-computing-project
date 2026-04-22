import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  CheckCircle2, 
  Info, 
  AlertCircle, 
  Trash2,
  Clock,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, onSnapshot, updateDoc, doc, deleteDoc, limit } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { Notification } from '../types';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const path = 'notifications';
    const q = query(
      collection(db, path),
      where('userId', '==', auth.currentUser.uid),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifications(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });

    return () => unsubscribe();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      console.error(error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Notifications</h1>
          <p className="text-slate-400">Stay updated on your reports and safety alerts.</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-sm font-bold text-blue-400">
          {notifications.filter(n => !n.read).length} Unread
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-900/50 animate-pulse rounded-2xl border border-slate-800" />
          ))
        ) : notifications.length > 0 ? (
          <AnimatePresence mode="popLayout">
            {notifications.map((n) => (
              <motion.div
                key={n.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className={cn(
                  "p-5 rounded-2xl border transition-all group relative",
                  n.read 
                    ? "bg-slate-900/50 border-slate-800/50 opacity-75" 
                    : "bg-slate-900 border-slate-800 shadow-lg shadow-blue-500/5"
                )}
              >
                <div className="flex gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                    n.read ? "bg-slate-800 text-slate-500" : "bg-blue-600/10 text-blue-500"
                  )}>
                    {n.title.toLowerCase().includes('status') ? <Clock className="w-6 h-6" /> :
                     n.title.toLowerCase().includes('alert') ? <ShieldAlert className="w-6 h-6" /> :
                     <Bell className="w-6 h-6" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className={cn("font-bold truncate", n.read ? "text-slate-400" : "text-white")}>
                        {n.title}
                      </h3>
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest whitespace-nowrap">
                        {format(new Date(n.createdAt), 'MMM d, HH:mm')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 leading-relaxed mb-3">{n.message}</p>
                    <div className="flex items-center gap-3">
                      {!n.read && (
                        <button 
                          onClick={() => markAsRead(n.id)}
                          className="text-xs font-bold text-blue-500 hover:text-blue-400 uppercase tracking-widest"
                        >
                          Mark as Read
                        </button>
                      )}
                      <button 
                        onClick={() => deleteNotification(n.id)}
                        className="text-xs font-bold text-slate-600 hover:text-rose-500 uppercase tracking-widest flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        ) : (
          <div className="text-center py-20 bg-slate-900/50 rounded-3xl border border-dashed border-slate-800">
            <Bell className="w-16 h-16 text-slate-800 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No notifications yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
