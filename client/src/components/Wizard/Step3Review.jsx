import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { checkDuplicate, createIssue } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';

export default function Step3Review({ issueData, onBack }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [isChecking, setIsChecking] = useState(true);
  const [duplicateIssue, setDuplicateIssue] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Run geo-deduplication check on mount
  useEffect(() => {
    let mounted = true;

    const runCheck = async () => {
      try {
        const token = await user.getIdToken();
        const res = await checkDuplicate(issueData.location.lat, issueData.location.lng, issueData.category, token);
        if (mounted) {
          if (res.isDuplicate && res.duplicateId) {
            setDuplicateIssue(res);
          }
          setIsChecking(false);
        }
      } catch (err) {
        console.error('Dedup check failed:', err);
        // Fail open: if dedup fails (e.g. backend not ready), allow submission anyway
        if (mounted) setIsChecking(false);
      }
    };

    runCheck();
    return () => { mounted = false; };
  }, [issueData]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      await createIssue({
        ...issueData,
      }, token);
      // Success! Go back to dashboard
      navigate('/');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to submit issue');
      setIsSubmitting(false);
    }
  };

  if (isChecking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
        <Loader2 className="animate-spin text-[#00D4AA]" size={32} />
        <p className="text-slate-400">Checking for similar reports nearby...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-100">Review & Submit</h2>
        <p className="text-slate-400 mt-2">Almost done! Review your report before submitting.</p>
      </div>

      {duplicateIssue && (
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-5">
          <div className="flex gap-3">
            <AlertTriangle className="text-orange-400 shrink-0" />
            <div>
              <h4 className="text-orange-400 font-semibold mb-1">Similar Issue Detected</h4>
              <p className="text-sm text-orange-200/80 mb-3">
                Someone recently reported a similar {issueData.category.replace('_', ' ')} issue very close to this location.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => navigate(`/issues/${duplicateIssue.duplicateId}`)}
                  className="text-xs bg-orange-500/20 text-orange-300 px-3 py-1.5 rounded-lg hover:bg-orange-500/30 transition-colors"
                >
                  View Existing Issue
                </button>
                <button
                  onClick={() => setDuplicateIssue(null)}
                  className="text-xs text-orange-400 hover:text-orange-300 py-1.5"
                >
                  Ignore & Submit Mine
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="glass-card p-6 rounded-2xl flex flex-col gap-5">
        <div className="relative aspect-video rounded-xl overflow-hidden bg-black/50">
          <img src={issueData.imageUrl} alt="Issue" className="w-full h-full object-cover opacity-80" />
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
            <h3 className="font-semibold text-lg text-white">{issueData.title}</h3>
            <div className="flex gap-2 mt-1">
              <span className="text-xs px-2 py-0.5 bg-[#00D4AA]/30 text-[#00D4AA] rounded backdrop-blur-sm capitalize">
                {issueData.category.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        {issueData.description && (
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Description</span>
            <p className="text-sm text-slate-300 mt-1">{issueData.description}</p>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm text-center">
          {error}
        </div>
      )}

      <div className="flex gap-4 mt-2">
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="flex-1 py-3 rounded-xl font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || duplicateIssue}
          className="flex-[2] py-3 rounded-xl font-semibold text-slate-900 bg-[#00D4AA] hover:bg-[#00b38f] shadow-[0_0_20px_rgba(0,212,170,0.3)] disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              Submitting...
            </>
          ) : (
            <>
              <CheckCircle size={18} />
              Submit Report
            </>
          )}
        </button>
      </div>
    </div>
  );
}
