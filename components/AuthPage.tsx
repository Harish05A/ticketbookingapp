
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, ArrowRight, ShieldCheck, Mail, Lock, User, Key, Building2, CheckCircle } from 'lucide-react';
import { apiClient } from '../services/api';

interface AuthPageProps {
  onLogin: (user: any, token: string) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isStaffMode, setIsStaffMode] = useState(false);
  const [onboardingUser, setOnboardingUser] = useState<any>(null);
  const [onboardingUsername, setOnboardingUsername] = useState('');
  
  const [formData, setFormData] = useState({ username: '', email: '', password: '', adminKey: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isLogin) {
        const data = await apiClient.login({ email: formData.email, password: formData.password });
        
        if (data.user.needsOnboarding) {
          setOnboardingUser(data.user);
          setIsLoading(false);
          return;
        }

        if (isStaffMode && !data.user.is_staff && !data.user.is_superuser) {
          throw new Error("Administrative access required.");
        }
        onLogin(data.user, data.token);
      } else {
        const data = await apiClient.register(formData);
        onLogin(data.user, data.token);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardingUsername) return;
    
    setIsLoading(true);
    try {
      const finalProfile = await apiClient.completeTheaterOnboarding(
        onboardingUser.id,
        onboardingUsername,
        onboardingUser.pendingTheater
      );
      const token = await (apiClient as any).auth?.currentUser?.getIdToken();
      onLogin(finalProfile, token);
      navigate('/admin');
    } catch (err: any) {
      setError(err.message || "Failed to finalize profile.");
    } finally {
      setIsLoading(false);
    }
  };

  if (onboardingUser) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Building2 className="text-white w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white">Setup Your Profile</h2>
            <p className="text-slate-500 text-xs mt-1">Welcome to {onboardingUser.pendingTheater.name}</p>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl mb-6">
            <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest mb-1">Assigned Venue</p>
            <p className="text-white text-sm font-bold">{onboardingUser.pendingTheater.name}</p>
          </div>

          <form onSubmit={handleCompleteOnboarding} className="space-y-4">
            <AuthInput 
              icon={<User className="w-4 h-4" />} 
              placeholder="Choose Management Username" 
              value={onboardingUsername} 
              onChange={setOnboardingUsername} 
            />
            <button
              type="submit"
              disabled={isLoading || !onboardingUsername}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-bold text-sm flex items-center justify-center gap-2 text-white transition-all disabled:opacity-50"
            >
              {isLoading ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <>Finalize Account <CheckCircle className="w-4 h-4" /></>}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl">
        <div className="text-center mb-8">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4 ${isStaffMode ? 'bg-amber-600' : 'bg-rose-600'}`}>
            {isStaffMode ? <Key className="text-white w-6 h-6" /> : <ShieldCheck className="text-white w-6 h-6" />}
          </div>
          <h2 className="text-xl font-bold text-white">
            {isLogin ? (isStaffMode ? 'Admin Portal' : 'Login') : 'Register'}
          </h2>
          <p className="text-slate-500 text-xs mt-1">CineQuest Secure Authentication</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-500 text-[10px] font-bold uppercase">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <AuthInput icon={<User className="w-4 h-4" />} placeholder="Full Name" value={formData.username} onChange={v => setFormData({...formData, username: v})} />
          )}
          <AuthInput type="email" icon={<Mail className="w-4 h-4" />} placeholder="Email Address" value={formData.email} onChange={v => setFormData({...formData, email: v})} />
          <AuthInput type="password" icon={<Lock className="w-4 h-4" />} placeholder="Password" value={formData.password} onChange={v => setFormData({...formData, password: v})} />

          {!isLogin && isStaffMode && (
            <AuthInput type="password" icon={<Key className="w-4 h-4 text-amber-500" />} placeholder="Secret Master Key" value={formData.adminKey} onChange={v => setFormData({...formData, adminKey: v})} />
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 text-white transition-all ${isStaffMode ? 'bg-amber-600 hover:bg-amber-500' : 'bg-rose-600 hover:bg-rose-500'}`}
          >
            {isLoading ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col gap-3">
          <button onClick={() => setIsStaffMode(!isStaffMode)} className="text-[10px] font-bold text-slate-500 hover:text-white uppercase tracking-wider text-center">
            {isStaffMode ? 'Login as standard user' : 'Switch to Staff Portal'}
          </button>
          <button onClick={() => setIsLogin(!isLogin)} className="text-xs text-rose-500 font-bold text-center">
            {isLogin ? "Don't have an account? Sign up" : 'Already registered? Login'}
          </button>
        </div>
      </div>
    </div>
  );
};

const AuthInput: React.FC<{ icon: any, placeholder: string, value: string, onChange: (v: string) => void, type?: string }> = ({ icon, placeholder, value, onChange, type = "text" }) => (
  <div className="relative group">
    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-white transition-colors">
      {icon}
    </div>
    <input type={type} required placeholder={placeholder} className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:ring-1 focus:ring-slate-500 outline-none transition-all placeholder:text-slate-600" value={value} onChange={e => onChange(e.target.value)} />
  </div>
);

export default AuthPage;
