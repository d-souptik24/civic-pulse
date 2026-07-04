import { useState, useRef } from 'react';
import { UploadCloud, Loader2, Image as ImageIcon } from 'lucide-react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';
import { analyzePhoto } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';

export default function Step1Photo({ onComplete }) {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setError(null);
    setUploadProgress(0);

    try {
      // 1. Upload to Firebase Storage
      const storageRef = ref(storage, `issues/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      const imageUrl = await new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
          },
          (error) => {
            console.error('Storage upload failed:', error);
            reject(new Error('Failed to upload image. Please try again.'));
          },
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(url);
          }
        );
      });

      // 2. Call AI Analysis (Pipeline 1)
      setUploadProgress(100); // Upload done, now waiting for AI
      const token = await user.getIdToken();
      const analysisResult = await analyzePhoto(imageUrl, token);

      // 3. Complete Step 1
      onComplete({
        imageUrl,
        category: analysisResult.category,
        severity: analysisResult.severity,
        title: analysisResult.title || 'Reported Issue', // Fallback if backend doesn't provide
        isAuthentic: analysisResult.isAuthentic ?? false,
        confidence: analysisResult.confidence ?? 0,
        reasoning: analysisResult.reasoning || null,
      });

    } catch (err) {
      console.error(err);
      setError(err.message || 'Analysis failed. Make sure the backend is running.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-100">Capture the Issue</h2>
        <p className="text-slate-400 mt-2">Take a clear photo of the problem for our AI to analyze.</p>
      </div>

      {!previewUrl ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-600 hover:border-[#00D4AA] rounded-2xl p-12 text-center cursor-pointer transition-colors bg-slate-800/50 flex flex-col items-center justify-center min-h-[300px]"
        >
          <UploadCloud size={48} className="text-slate-400 mb-4" />
          <p className="text-slate-200 font-medium text-lg">Click to select photo</p>
          <p className="text-slate-500 text-sm mt-1">JPEG, PNG up to 10MB</p>
        </div>
      ) : (
        <div className="relative rounded-2xl overflow-hidden bg-black/50 aspect-video flex items-center justify-center">
          <img src={previewUrl} alt="Preview" className="max-h-[300px] object-contain" />
          {!isAnalyzing && (
            <button 
              onClick={() => { setFile(null); setPreviewUrl(null); }}
              className="absolute top-4 right-4 bg-black/70 hover:bg-black text-white p-2 rounded-full transition-colors backdrop-blur-sm"
            >
              ✕
            </button>
          )}
        </div>
      )}

      <input 
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        className="hidden"
      />

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm text-center">
          {error}
        </div>
      )}

      <button
        onClick={handleAnalyze}
        disabled={!file || isAnalyzing}
        className={`w-full py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 transition-all ${
          !file 
            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
            : isAnalyzing
              ? 'bg-[#00D4AA]/20 text-[#00D4AA] cursor-wait'
              : 'bg-[#00D4AA] hover:bg-[#00b38f] text-slate-900 shadow-[0_0_20px_rgba(0,212,170,0.3)] hover:shadow-[0_0_30px_rgba(0,212,170,0.5)]'
        }`}
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="animate-spin" size={20} />
            {uploadProgress < 100 
              ? `Uploading... ${Math.round(uploadProgress)}%` 
              : 'AI Analyzing Photo...'}
          </>
        ) : (
          <>
            <ImageIcon size={20} />
            Analyze with AI
          </>
        )}
      </button>
    </div>
  );
}
