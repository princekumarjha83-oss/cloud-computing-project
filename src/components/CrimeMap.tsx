import React, { useState, useEffect } from 'react';
import { 
  Map as MapIcon, 
  Layers, 
  Navigation, 
  Filter, 
  Search,
  AlertTriangle,
  Shield,
  TrendingUp,
  Info
} from 'lucide-react';
import { motion } from 'motion/react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { CrimeReport } from '../types';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  ZAxis, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

const CRIME_TYPES = [
  'Theft', 'Assault', 'Cybercrime', 'Harassment', 'Vandalism', 'Fraud', 'Drug Related', 'Other'
];

export default function CrimeMap() {
  const [reports, setReports] = useState<CrimeReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'reports'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CrimeReport)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Mock data for visualization if no reports exist
  const chartData = reports.length > 0 
    ? reports.map(r => ({
        x: (r.location.lat % 1) * 100, // Normalized for demo
        y: (r.location.lng % 1) * 100, // Normalized for demo
        z: r.priority === 'critical' ? 100 : r.priority === 'urgent' ? 60 : 30,
        type: r.type,
        address: r.location.address
      }))
    : [
        { x: 20, y: 30, z: 100, type: 'Theft', address: 'Downtown' },
        { x: 40, y: 50, z: 60, type: 'Assault', address: 'Westside' },
        { x: 60, y: 20, z: 30, type: 'Cybercrime', address: 'Tech Park' },
        { x: 80, y: 70, z: 100, type: 'Vandalism', address: 'East End' },
      ];

  const crimeTrends = CRIME_TYPES.slice(0, 3).map(type => {
    const count = reports.filter(r => r.type === type).length;
    const total = reports.length || 1;
    const percentage = (count / total) * 100;
    return {
      label: type,
      value: percentage,
      trend: count > 0 ? `+${count}` : '0',
      color: type === 'Theft' ? 'bg-blue-500' : type === 'Assault' ? 'bg-rose-500' : 'bg-purple-500'
    };
  });

  return (
    <div className="space-y-6 h-full flex flex-col">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Crime Visualization</h1>
          <p className="text-slate-400">Real-time spatial analysis of reported incidents.</p>
        </div>
        <div className="flex gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <button className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold uppercase tracking-wider">Heatmap</button>
          <button className="px-4 py-2 text-slate-500 hover:text-slate-300 rounded-lg text-sm font-bold uppercase tracking-wider">Markers</button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1">
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden relative min-h-[500px] flex flex-col">
          <div className="absolute top-6 left-6 z-10 space-y-3">
            <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800 p-4 rounded-2xl shadow-2xl max-w-xs">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                <span className="text-xs font-bold text-white uppercase tracking-widest">Live Feed</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Showing {reports.length} active incidents across the city. High density detected in central districts.
              </p>
            </div>
          </div>

          <div className="absolute top-6 right-6 z-10 flex flex-col gap-2">
            <button className="p-3 bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors shadow-xl">
              <Layers className="w-5 h-5" />
            </button>
            <button className="p-3 bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors shadow-xl">
              <Navigation className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 bg-[radial-gradient(circle_at_center,_#1e293b_1px,_transparent_1px)] [background-size:24px_24px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 40, right: 40, bottom: 40, left: 40 }}>
                <XAxis type="number" dataKey="x" hide />
                <YAxis type="number" dataKey="y" hide />
                <ZAxis type="number" dataKey="z" range={[100, 1000]} />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl shadow-2xl">
                          <p className="text-xs font-bold text-white uppercase mb-1">{data.type}</p>
                          <p className="text-[10px] text-slate-500">{data.address}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter name="Crimes" data={chartData}>
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.z === 100 ? '#f43f5e' : entry.z === 60 ? '#f59e0b' : '#3b82f6'} 
                      fillOpacity={0.6}
                      stroke={entry.z === 100 ? '#f43f5e' : entry.z === 60 ? '#f59e0b' : '#3b82f6'}
                      strokeWidth={2}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="p-6 bg-slate-950/50 border-t border-slate-800 flex items-center justify-between">
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <span className="text-xs font-medium text-slate-400">Critical</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-xs font-medium text-slate-400">Urgent</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-xs font-medium text-slate-400">Normal</span>
              </div>
            </div>
            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
              Last Updated: {format(new Date(), 'HH:mm:ss')}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-bold text-white">Crime Trends</h3>
            </div>
            <div className="space-y-4">
              {crimeTrends.map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs font-bold mb-2">
                    <span className="text-slate-400 uppercase tracking-wider">{item.label}</span>
                    <span className={item.trend.startsWith('+') ? 'text-rose-400' : 'text-emerald-400'}>{item.trend}</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full", item.color)} style={{ width: `${item.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-600 border border-blue-500 p-6 rounded-3xl shadow-lg shadow-blue-600/20">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-white" />
              <h3 className="text-lg font-bold text-white">Safety Score</h3>
            </div>
            <div className="text-4xl font-bold text-white mb-2">84<span className="text-xl opacity-60">/100</span></div>
            <p className="text-blue-100 text-sm leading-relaxed">
              Your current area is rated as "Very Safe". Police patrols are active in your vicinity.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
            <div className="flex items-center gap-3 mb-4">
              <Info className="w-5 h-5 text-slate-500" />
              <h3 className="text-white font-bold">Map Legend</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">High Risk Zone</p>
                  <p className="text-[10px] text-slate-500">Avoid after 10 PM</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center">
                  <Shield className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Police Station</p>
                  <p className="text-[10px] text-slate-500">24/7 Active Duty</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
