import { useState, useRef } from 'react';
import { UploadCloud, Loader2, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
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
  const [rejection, setRejection] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
      setError(null);
      setRejection(null);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setError(null);
    setRejection(null);
    setUploadProgress(0);

    try {
      const storageRef = ref(storage, `issues/${Date.now()}_${file.name}`);
      const metadata = { customMetadata: { userId: user.uid } };
      const uploadTask = uploadBytesResumable(storageRef, file, metadata);

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

      setUploadProgress(100);
      const token = await user.getIdToken();
      const analysisResult = await analyzePhoto(imageUrl, token);

      if (analysisResult.isAuthentic === false) {
        // Delete orphaned image
        try {
          await deleteObject(storageRef);
        } catch (e) {
          console.error('Failed to delete rejected image from storage:', e);
        }
        setRejection({ reasoning: analysisResult.reasoning });
        return;
      }

      onComplete({
        imageUrl,
        category: analysisResult.category,
        severity: analysisResult.severity,
        title: analysisResult.title || 'Reported Issue',
        isAuthentic: analysisResult.isAuthentic ?? false,
        confidence: analysisResult.confidence ?? 0,
        reasoning: analysisResult.reasoning || null,
        verdictToken: analysisResult.verdictToken
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
      {/* Heading */}
      <div className="card-white p-4 sm:p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">Capture the Issue</h2>
          <p style={{ color: 'var(--color-fog)' }}>Take a clear photo of the problem for our AI to analyze.</p>
        </div>

        {!previewUrl ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-dashed border-2 rounded-2xl p-6 sm:p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[300px]"
            style={{ borderColor: 'var(--color-stone-line)', backgroundColor: 'rgba(34,31,38,0.02)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-plum)'; e.currentTarget.style.backgroundColor = 'rgba(75, 46, 70, 0.02)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-stone-line)'; e.currentTarget.style.backgroundColor = 'rgba(34,31,38,0.02)'; }}
          >
            <UploadCloud size={48} className="mb-4" style={{ color: 'var(--color-fog)' }} />
            <p className="font-medium text-lg" style={{ color: 'var(--color-ink)' }}>Click to select photo</p>
            <p className="text-sm mt-1" style={{ color: 'var(--color-fog)' }}>JPEG, PNG up to 10MB</p>
          </div>
        ) : (
          <div
            className="relative rounded-2xl overflow-hidden aspect-video flex items-center justify-center border"
            style={{ backgroundColor: 'var(--color-stone-paper)', borderColor: 'var(--color-stone-line)' }}
          >
            <img src={previewUrl} alt="Preview" className="max-h-[300px] object-contain" />
            {!isAnalyzing && (
              <button
                onClick={() => { setFile(null); setPreviewUrl(null); }}
                className="absolute top-4 right-4 p-2 rounded-full transition-colors"
                style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: '#ffffff' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.75)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.5)'}
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
          <div className="mt-4 p-4 rounded-xl text-sm text-center" style={{ backgroundColor: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', color: '#dc2626' }}>
            {error}
          </div>
        )}

        {rejection ? (
          <div className="mt-6 p-4 sm:p-5 rounded-2xl animate-fade-in" style={{ backgroundColor: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)' }}>
            <div className="flex gap-3 mb-4">
              <AlertTriangle style={{ color: '#dc2626', flexShrink: 0 }} />
              <div>
                <h4 className="font-semibold mb-1" style={{ color: '#dc2626' }}>Photo Not Accepted</h4>
                <p className="text-sm" style={{ color: 'var(--color-ink)' }}>
                  Our AI could not identify a civic infrastructure issue in this photo.
                </p>
              </div>
            </div>
            
            <div className="p-3 mb-4 rounded-xl text-sm italic" style={{ backgroundColor: 'var(--color-stone-paper)', color: 'var(--color-fog)' }}>
              " {rejection.reasoning} "
            </div>

            <button
              onClick={() => { setFile(null); setPreviewUrl(null); setRejection(null); }}
              className="w-full py-3 rounded-xl font-medium text-sm transition-all"
              style={{ backgroundColor: '#dc2626', color: 'white' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              Try a Different Photo
            </button>
          </div>
        ) : (
          <button
            onClick={handleAnalyze}
            disabled={!file || isAnalyzing}
            className="btn-primary mt-6 w-full py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
        )}
      </div>
    </div>
  );
}
