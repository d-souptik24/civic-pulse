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
      await createIssue({ ...issueData }, token);
      navigate('/');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to submit issue');
      setIsSubmitting(false);
    }
  };

  if (isChecking) {
    return (
      <div className="card-white p-6 sm:p-12 flex flex-col items-center justify-center min-h-[300px] gap-4">
        <Loader2 className="animate-spin" size={32} style={{ color: 'var(--color-plum)' }} />
        <p style={{ color: 'var(--color-fog)' }}>Checking for similar reports nearby...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Duplicate Warning */}
      {duplicateIssue && (
        <div
          className="p-5 rounded-2xl"
          style={{ backgroundColor: 'rgba(198,125,45,0.06)', border: '1px solid rgba(198,125,45,0.2)' }}
        >
          <div className="flex gap-3">
            <AlertTriangle style={{ color: 'var(--color-signal-amber)', flexShrink: 0 }} />
            <div>
              <h4 className="font-semibold mb-1" style={{ color: 'var(--color-signal-amber)' }}>Similar Issue Detected</h4>
              <p className="text-sm mb-3" style={{ color: 'var(--color-signal-amber)' }}>
                Someone recently reported a similar {issueData.category.replace('_', ' ')} issue very close to this location.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => navigate(`/issues/${duplicateIssue.duplicateId}`)}
                  className="text-xs px-3 py-1.5 transition-colors"
                  style={{ backgroundColor: 'rgba(198,125,45,0.12)', color: 'var(--color-signal-amber)', borderRadius: '8px' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(198,125,45,0.2)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(198,125,45,0.12)'}
                >
                  View Existing Issue
                </button>
                <button
                  onClick={() => setDuplicateIssue(null)}
                  className="text-xs py-1.5 transition-colors"
                  style={{ color: 'var(--color-signal-amber)' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  Ignore & Submit Mine
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Card */}
      <div className="card-white overflow-hidden">
        <div className="text-center p-4 sm:p-6" style={{ borderBottom: '1px solid var(--color-stone-line)' }}>
          <h2 className="text-2xl font-bold mb-1">Review & Submit</h2>
          <p style={{ color: 'var(--color-fog)' }}>Almost done! Review your report before submitting.</p>
        </div>

        <div className="p-4 sm:p-6 flex flex-col gap-5">
          {/* Photo Preview */}
          <div className="relative aspect-video overflow-hidden" style={{ borderRadius: '16px', border: '1px solid var(--color-stone-line)' }}>
            <img src={issueData.imageUrl} alt="Issue" className="w-full h-full object-cover opacity-90" />
            <div
              className="absolute bottom-0 left-0 right-0 p-4"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }}
            >
              <h3 className="font-semibold text-lg text-white">{issueData.title}</h3>
              <div className="flex gap-2 mt-1">
                <span
                  className="text-xs px-2 py-0.5 capitalize"
                  style={{ backgroundColor: 'rgba(62,122,84,0.3)', color: '#ffffff', backdropFilter: 'blur(4px)', borderRadius: 'var(--radius-badge)' }}
                >
                  {issueData.category.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          {issueData.description && (
            <div>
              <span
                className="text-caption-label block mb-1"
                style={{ color: 'var(--color-fog)', fontSize: 'var(--text-caption)' }}
              >
                Description
              </span>
              <p className="text-sm">{issueData.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          className="p-4 rounded-xl text-sm text-center"
          style={{ backgroundColor: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', color: '#dc2626' }}
        >
          {error}
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex gap-4 mt-2">
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="btn-secondary flex-1"
        >
          Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !!duplicateIssue}
          className="btn-primary flex-[2] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <><Loader2 className="animate-spin" size={18} />Submitting...</>
          ) : (
            <><CheckCircle size={18} />Submit Report</>
          )}
        </button>
      </div>
    </div>
  );
}
