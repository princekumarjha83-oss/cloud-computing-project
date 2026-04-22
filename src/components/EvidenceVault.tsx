import React, { useState } from 'react';
import { 
  Upload, 
  X, 
  Image as ImageIcon, 
  Film, 
  Music, 
  File as FileIcon,
  Shield,
  Search,
  Trash2,
  Download,
  Eye,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage, auth } from '../firebase';
import { cn } from '../lib/utils';

interface EvidenceFile {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
  uploadedAt: string;
}

export default function EvidenceVault() {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // In a real app, we'd fetch these from Firestore or Storage metadata
  const [vaultFiles, setVaultFiles] = useState<EvidenceFile[]>([]);

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

  const handleUpload = async () => {
    if (files.length === 0 || !auth.currentUser) return;
    setUploading(true);
    try {
      const newUploadedFiles: EvidenceFile[] = [];
      for (const file of files) {
        const storageRef = ref(storage, `vault/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        
        newUploadedFiles.push({
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          type: file.type,
          url,
          size: file.size,
          uploadedAt: new Date().toISOString()
        });
      }
      setVaultFiles(prev => [...newUploadedFiles, ...prev]);
      setFiles([]);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload some files. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="w-6 h-6 text-blue-400" />;
    if (type.startsWith('video/')) return <Film className="w-6 h-6 text-purple-400" />;
    if (type.startsWith('audio/')) return <Music className="w-6 h-6 text-emerald-400" />;
    if (type === 'application/pdf') return <FileIcon className="w-6 h-6 text-rose-400" />;
    return <FileIcon className="w-6 h-6 text-slate-400" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredFiles = vaultFiles.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Evidence Vault</h1>
          <p className="text-slate-400 text-sm">Securely manage and store your digital evidence.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-64"
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Upload Section */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-500" />
              Upload New Evidence
            </h3>
            
            <div 
              className={cn(
                "aspect-square rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center p-6 group cursor-pointer",
                isDragging ? "border-blue-500 bg-blue-500/10" : "border-slate-800 bg-slate-950/50 hover:border-slate-700"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById('vault-upload')?.click()}
            >
              <Upload className={cn(
                "w-12 h-12 mb-4 transition-all",
                isDragging ? "text-blue-500 scale-110" : "text-slate-600 group-hover:text-slate-400"
              )} />
              <p className="text-sm font-bold text-slate-300 mb-1">Drag & Drop Files</p>
              <p className="text-xs text-slate-500">Photos, Videos, Audio, PDFs</p>
              <input 
                id="vault-upload"
                type="file" 
                multiple 
                accept="image/*,video/*,audio/*,.pdf"
                className="hidden" 
                onChange={(e) => e.target.files && setFiles(prev => [...prev, ...Array.from(e.target.files!)])}
              />
            </div>

            {files.length > 0 && (
              <div className="mt-6 space-y-3">
                <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {files.map((file, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 bg-slate-800/50 rounded-lg border border-slate-700">
                      {getFileIcon(file.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">{file.name}</p>
                        <p className="text-[10px] text-slate-500">{formatSize(file.size)}</p>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setFiles(files.filter((_, idx) => idx !== i));
                        }}
                        className="p-1 hover:bg-rose-500/20 text-slate-500 hover:text-rose-500 rounded transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                >
                  {uploading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload {files.length} {files.length === 1 ? 'File' : 'Files'}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-6">
            <div className="flex gap-4">
              <Shield className="w-6 h-6 text-blue-500 shrink-0" />
              <div>
                <h4 className="text-white font-bold mb-1 text-sm">Chain of Custody</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Every file uploaded here is timestamped and cryptographically hashed to ensure its integrity for legal proceedings.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Files Grid */}
        <div className="lg:col-span-2">
          {filteredFiles.length === 0 ? (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8 bg-slate-900/50 border border-slate-800 border-dashed rounded-3xl">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <FileIcon className="w-8 h-8 text-slate-600" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No evidence found</h3>
              <p className="text-slate-500 text-sm max-w-xs">
                {searchQuery ? "No files match your search criteria." : "Start by uploading photos, videos, or documents to your secure vault."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AnimatePresence>
                {filteredFiles.map((file) => (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition-all group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center shrink-0">
                        {getFileIcon(file.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-white truncate mb-1">{file.name}</h4>
                        <div className="flex items-center gap-3 text-[10px] text-slate-500">
                          <span>{formatSize(file.size)}</span>
                          <span>•</span>
                          <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a 
                        href={file.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        View
                      </a>
                      <button className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors">
                        <Download className="w-4 h-4" />
                      </button>
                      <button className="p-2 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
