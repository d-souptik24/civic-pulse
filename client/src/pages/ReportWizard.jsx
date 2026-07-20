import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock } from 'lucide-react';
import Step1Photo from '../components/Wizard/Step1Photo';
import Step2Details from '../components/Wizard/Step2Details';
import Step3Review from '../components/Wizard/Step3Review';
import { useAuth } from '../lib/AuthContext';

export default function ReportWizard() {
  const navigate = useNavigate();
  const { user, signInWithGoogle } = useAuth();
  const [step, setStep] = useState(1);
  const [issueData, setIssueData] = useState({});

  const handleStep1Complete = (data) => {
    setIssueData((prev) => ({ ...prev, ...data }));
    setStep(2);
  };

  const handleStep2Complete = (data) => {
    setIssueData((prev) => ({ ...prev, ...data }));
    setStep(3);
  };

  const handleBack = () => {
    if (step === 1) {
      navigate('/');
    } else {
      setStep((s) => s - 1);
    }
  };

  // Auth loading state
  if (user === undefined) {
    return (
      <div className="min-h-[calc(100vh-4rem)] pt-24 flex items-center justify-center" style={{ backgroundColor: 'var(--color-stone-paper)' }}>
        <div
          className="animate-spin rounded-full h-12 w-12"
          style={{ borderTop: '2px solid var(--color-plum)', borderBottom: '2px solid var(--color-plum)', borderLeft: '2px solid transparent', borderRight: '2px solid transparent' }}
        />
      </div>
    );
  }

  // Auth gate — themed for Plum & Stone
  if (user === null) {
    return (
      <div
        className="fixed inset-0 pt-16 flex items-center justify-center px-4 animate-fade-in"
        style={{ backgroundColor: 'var(--color-stone-paper)' }}
      >
        <div className="relative w-full max-w-md">
          {/* Gate Card */}
          <div className="card-white overflow-hidden">
            {/* Top accent bar */}
            <div className="h-1 w-full" style={{ background: 'var(--color-plum)' }} />

            <div className="p-5 sm:p-8 flex flex-col items-center text-center gap-5">

              {/* Lock icon */}
              <div className="relative">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(75, 46, 70, 0.05)', border: '1px solid rgba(75, 46, 70, 0.1)' }}
                >
                  <Lock size={28} style={{ color: 'var(--color-plum)' }} />
                </div>
                <div
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'var(--color-plum)' }}
                >
                  <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5L8 3" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>

              {/* Text */}
              <div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-ink)' }}>Sign in to Report</h2>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-fog)' }}>
                  Your reports reach city authorities faster when they're linked to a verified account. It also helps us give you credit on the leaderboard!
                </p>
              </div>

              {/* Benefit chips */}
              <div className="flex flex-wrap gap-2 justify-center">
                {['🏅 Earn civic points', '📍 Track your reports', '🔔 Get status updates'].map(b => (
                  <span
                    key={b}
                    className="text-xs px-3 py-1"
                    style={{ backgroundColor: 'var(--color-stone-paper)', color: 'var(--color-fog)', border: '1px solid var(--color-stone-line)', borderRadius: 'var(--radius-chip)' }}
                  >
                    {b}
                  </span>
                ))}
              </div>

              {/* Buttons */}
              <div className="w-full flex flex-col gap-3 mt-1">
                <button
                  onClick={signInWithGoogle}
                  className="w-full py-3.5 rounded-xl font-semibold flex items-center justify-center gap-3 text-sm transition-all shadow-sm"
                  style={{ backgroundColor: '#ffffff', color: '#1f2937', border: '1px solid var(--color-stone-line)' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-stone-paper)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#ffffff'}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </button>

                <button
                  onClick={() => navigate('/')}
                  className="w-full btn-ghost py-3"
                >
                  <ArrowLeft size={14} />
                  Back to Dashboard
                </button>
              </div>

            </div>
          </div>

          <p className="text-center text-xs mt-4" style={{ color: 'var(--color-fog)' }}>
            Only your display name and photo are stored — nothing private.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-[calc(100vh-4rem)] pt-24 px-4 pb-24 sm:pb-8 flex justify-center"
      style={{ backgroundColor: 'var(--color-stone-paper)' }}
    >
      <div className="w-full max-w-lg">
        {/* Header / Nav */}
        <div className="flex items-center justify-center mb-8">
          {/* Progress Indicators */}
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center">
                <div
                  className="w-2.5 h-2.5 rounded-full transition-colors duration-300"
                  style={{
                    backgroundColor: step >= i ? 'var(--color-plum)' : 'var(--color-stone-line)',
                  }}
                />
                {i < 3 && (
                  <div
                    className="w-8 h-0.5 mx-1 transition-colors duration-300"
                    style={{ backgroundColor: step > i ? 'var(--color-plum-light)' : 'var(--color-stone-line)' }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Wizard Steps */}
        <div className="relative">
          {step === 1 && <Step1Photo onComplete={handleStep1Complete} />}
          {step === 2 && (
            <Step2Details
              issueData={issueData}
              onNext={handleStep2Complete}
              onBack={handleBack}
            />
          )}
          {step === 3 && (
            <Step3Review
              issueData={issueData}
              onBack={handleBack}
            />
          )}
        </div>
      </div>
    </div>
  );
}
