import React, { useState } from 'react';
import { 
  Camera, 
  MapPin, 
  Send, 
  Mic,
  MicOff,
  Sparkles,
  History,
  MessageCircle,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  Search,
  AlertCircle,
  FileText,
  Clock,
  Shield,
  EyeOff,
  Upload,
  X,
  Image as ImageIcon,
  Film,
  Music,
  File as FileIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, addDoc, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { cn } from '../lib/utils';
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const CRIME_TYPES = [
  'Theft', 'Assault', 'Cybercrime', 'Harassment', 'Vandalism', 'Fraud', 'Drug Related', 'Other'
];

export default function ReportCrime({ onComplete }: { onComplete: () => void }) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    type: '',
    description: '',
    isAnonymous: false,
    priority: 'normal' as 'normal' | 'urgent' | 'critical',
    location: {
      lat: 0,
      lng: 0,
      address: ''
    }
  });
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const getFilePreview = (file: File) => {
    if (file.type.startsWith('image/')) {
      return (
        <img 
          src={URL.createObjectURL(file)} 
          alt="Preview" 
          className="w-full h-full object-cover"
          onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
        />
      );
    }
    if (file.type.startsWith('video/')) return <Film className="w-8 h-8 text-purple-400" />;
    if (file.type.startsWith('audio/')) return <Music className="w-8 h-8 text-emerald-400" />;
    if (file.type === 'application/pdf') return <FileIcon className="w-8 h-8 text-rose-400" />;
    return <FileText className="w-8 h-8 text-slate-600" />;
  };

  const startSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setFormData(prev => ({ ...prev, description: prev.description + ' ' + transcript }));
    };

    recognition.start();
  };

  const analyzeCrime = async () => {
    if (!formData.description.trim()) return;
    setIsAnalyzing(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze this crime description and categorize it into one of these types: ${CRIME_TYPES.join(', ')}. 
        Also determine the priority (normal, urgent, critical) and provide a brief justification.
        Description: "${formData.description}"`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING },
              priority: { type: Type.STRING, enum: ['normal', 'urgent', 'critical'] },
              justification: { type: Type.STRING }
            },
            required: ['category', 'priority']
          }
        }
      });

      const result = JSON.parse(response.text);
      setFormData(prev => ({
        ...prev,
        type: CRIME_TYPES.includes(result.category) ? result.category : 'Other',
        priority: result.priority
      }));
    } catch (error) {
      console.error('AI Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const checkDuplicates = async () => {
    if (!formData.description.trim() || !formData.location.address.trim()) return;
    
    const reportsRef = collection(db, 'reports');
    const q = query(
      reportsRef, 
      where('location.address', '==', formData.location.address),
      limit(5)
    );

    try {
      const snapshot = await getDocs(q);
      const duplicates = snapshot.docs.filter(doc => {
        const data = doc.data();
        // Simple similarity check: if type is same and description has common words
        return data.type === formData.type && 
               data.description.toLowerCase().includes(formData.description.toLowerCase().split(' ')[0]);
      });

      if (duplicates.length > 0) {
        setDuplicateWarning(`Warning: ${duplicates.length} similar report(s) found at this location. Are you reporting a new incident?`);
      } else {
        setDuplicateWarning(null);
      }
    } catch (error) {
      console.error('Duplicate check failed:', error);
    }
  };

  const handleLocationDetect = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setFormData(prev => ({
          ...prev,
          location: {
            ...prev.location,
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address: 'Detected Location (GPS)'
          }
        }));
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    // Final validation
    if (!formData.type || !formData.description.trim() || !formData.location.address.trim()) {
      alert('Missing required information. Please go back and complete all steps.');
      return;
    }

    setLoading(true);
    const path = 'reports';
    try {
      // IP Logging
      let userIp = 'Unknown';
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipRes.json();
        userIp = ipData.ip;
      } catch (e) {
        console.error('Failed to fetch IP:', e);
      }

      const evidenceUrls = [];
      for (const file of files) {
        const storageRef = ref(storage, `evidence/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        evidenceUrls.push(url);
      }

      await addDoc(collection(db, path), {
        ...formData,
        reporterId: auth.currentUser.uid,
        reporterName: formData.isAnonymous ? 'Anonymous' : auth.currentUser.displayName,
        evidence: evidenceUrls,
        status: 'submitted',
        notes: [],
        timeline: [
          {
            status: 'submitted',
            message: 'Report filed successfully',
            timestamp: new Date().toISOString()
          }
        ],
        createdAt: new Date().toISOString(),
        metadata: {
          ipAddress: userIp,
          userAgent: navigator.userAgent
        }
      });

      onComplete();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Report a Crime</h1>
        <p className="text-slate-400">Provide as much detail as possible to help the investigation.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="flex border-b border-slate-800">
          {[1, 2, 3].map((s) => (
            <div 
              key={s}
              className={cn(
                "flex-1 py-4 text-center text-sm font-bold transition-colors",
                step === s ? "text-blue-500 bg-blue-500/5" : "text-slate-600"
              )}
            >
              Step {s}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-8">
          {step === 1 && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">Type of Crime</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {CRIME_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({ ...formData, type })}
                      className={cn(
                        "px-4 py-3 rounded-xl text-sm font-medium border transition-all",
                        formData.type === type 
                          ? "bg-blue-600 border-blue-600 text-white" 
                          : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-slate-300">Description</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={startSpeechRecognition}
                      className={cn(
                        "p-2 rounded-lg transition-all",
                        isRecording ? "bg-rose-500 text-white animate-pulse" : "bg-slate-800 text-slate-400 hover:text-white"
                      )}
                      title="Voice-to-text"
                    >
                      {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={analyzeCrime}
                      disabled={isAnalyzing || !formData.description.trim()}
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/10 text-blue-500 text-xs font-bold rounded-lg border border-blue-500/20 hover:bg-blue-600/20 transition-all disabled:opacity-50"
                    >
                      {isAnalyzing ? (
                        <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3" />
                      )}
                      AI Categorize
                    </button>
                  </div>
                </div>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  onBlur={checkDuplicates}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Describe the incident in detail..."
                />
                {duplicateWarning && (
                  <div className="mt-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-200/80">{duplicateWarning}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isAnonymous: !formData.isAnonymous })}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg border transition-all",
                    formData.isAnonymous ? "bg-purple-500/10 border-purple-500/50 text-purple-400" : "bg-slate-800 border-slate-700 text-slate-400"
                  )}
                >
                  <EyeOff className="w-4 h-4" />
                  Report Anonymously
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">Location</label>
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={formData.location.address}
                    onChange={(e) => setFormData({ ...formData, location: { ...formData.location, address: e.target.value }})}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl p-4 text-white outline-none"
                    placeholder="Enter address or location name"
                  />
                  <button
                    type="button"
                    onClick={handleLocationDetect}
                    className="p-4 bg-blue-600/10 text-blue-500 border border-blue-500/20 rounded-xl hover:bg-blue-600/20 transition-colors"
                  >
                    <MapPin className="w-6 h-6" />
                  </button>
                </div>
                <div className="h-48 bg-slate-800 rounded-2xl border border-slate-700 flex items-center justify-center text-slate-500 italic">
                  Map Integration Placeholder
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">Priority Level</label>
                <div className="flex gap-3">
                  {['normal', 'urgent', 'critical'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setFormData({ ...formData, priority: p as any })}
                      className={cn(
                        "flex-1 py-3 rounded-xl text-sm font-bold uppercase tracking-wider border transition-all",
                        formData.priority === p 
                          ? p === 'critical' ? "bg-rose-600 border-rose-600 text-white" : "bg-blue-600 border-blue-600 text-white"
                          : "bg-slate-800 border-slate-700 text-slate-400"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">Evidence (Photos, Videos, Audio, PDFs)</label>
                <div 
                  className={cn(
                    "grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl border-2 border-dashed transition-all",
                    isDragging ? "border-blue-500 bg-blue-500/10" : "border-slate-800 bg-slate-900/50"
                  )}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {files.map((file, i) => (
                    <div key={i} className="relative aspect-square bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-center overflow-hidden group">
                      {getFilePreview(file)}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <p className="text-[10px] text-white font-medium truncate px-2 max-w-full">{file.name}</p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                        className="absolute top-1 right-1 p-1 bg-rose-500 rounded-full text-white z-10 hover:scale-110 transition-transform shadow-lg"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <label className="aspect-square bg-slate-800/50 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-500/5 transition-all group">
                    <Upload className="w-8 h-8 text-slate-600 group-hover:text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-blue-400">Add Evidence</span>
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*,video/*,audio/*,.pdf"
                      className="hidden" 
                      onChange={(e) => e.target.files && setFiles([...files, ...Array.from(e.target.files)])}
                    />
                  </label>
                </div>
                <p className="mt-3 text-[10px] text-slate-500 italic">
                  Supported formats: Photos (JPG, PNG), Videos (MP4), Audio (MP3, WAV), Documents (PDF).
                </p>
              </div>

              <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                <div className="flex gap-4">
                  <Shield className="w-6 h-6 text-blue-500 shrink-0" />
                  <div>
                    <h4 className="text-white font-bold mb-1">Secure Submission</h4>
                    <p className="text-sm text-slate-400">
                      Your report will be encrypted and sent directly to the police department. 
                      You can track the status in your dashboard.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <div className="mt-10 flex justify-between gap-4">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-8 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition-colors"
              >
                Back
              </button>
            )}
            {step < 3 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 1) {
                    if (!formData.type) {
                      alert('Please select a crime type.');
                      return;
                    }
                    if (!formData.description.trim()) {
                      alert('Please provide a description of the incident.');
                      return;
                    }
                  }
                  if (step === 2) {
                    if (!formData.location.address.trim()) {
                      alert('Please provide a location or address.');
                      return;
                    }
                  }
                  setStep(step + 1);
                }}
                className="flex-1 px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
              >
                Next Step
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Submit Report
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
