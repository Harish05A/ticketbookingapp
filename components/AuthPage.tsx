
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, ArrowRight, ShieldCheck, Mail, Lock, User, Key } from 'lucide-react';
import { apiClient } from '../services/api';

interface AuthPageProps {
  onLogin: (user: any, token: string) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isAdminMode, setIsAdminMode] = useState(false);
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
        onLogin(data.user, data.token);
      } else {
        const data = await apiClient.register(formData);
        onLogin(data.user, data.token);
      }
      navigate('/');
    } catch (err: any) {
      console.error(err);
      let message = 'Authentication failed.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        message = 'Invalid email or password.';
      } else if (err.code === 'auth/email-already-in-use') {
        message = 'This email is already registered.';
      } else {
        message = err.message || message;
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl transition-all duration-500">
        <div className="text-center mb-10">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl transition-all duration-500 ${isAdminMode ? 'bg-amber-600 shadow-amber-600/20' : 'bg-rose-600 shadow-rose-600/20'}`}>
            {isAdminMode ? <Key className="w-8 h-8 text-white" /> : <ShieldCheck className="w-8 h-8 text-white" />}
          </div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter">
            {isLogin ? 'Welcome Back' : isAdminMode ? 'Master Setup' : 'Create Account'}
          </h2>
          <p className="text-slate-500 mt-2">
            {isAdminMode ? 'Registering as System Administrator' : 'Access your tickets with Firebase Secure Auth'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/50 rounded-xl text-rose-500 text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
              <input
                type="text"
                placeholder="Username"
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 pl-12 pr-4 text-white focus:ring-2 focus:ring-rose-500 outline-none transition-all"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
            <input
              type="email"
              placeholder="Email Address"
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 pl-12 pr-4 text-white focus:ring-2 focus:ring-rose-500 outline-none transition-all"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
            <input
              type="password"
              placeholder="Password"
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 pl-12 pr-4 text-white focus:ring-2 focus:ring-rose-500 outline-none transition-all"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          {!isLogin && isAdminMode && (
            <div className="relative animate-in slide-in-from-top-2 duration-300">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500 w-5 h-5" />
              <input
                type="password"
                placeholder="Secret Admin Key"
                className="w-full bg-amber-600/5 border border-amber-600/30 rounded-2xl py-4 pl-12 pr-4 text-white focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                value={formData.adminKey}
                onChange={(e) => setFormData({ ...formData, adminKey: e.target.value })}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-4 font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl ${isAdminMode ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20' : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'} text-white`}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                {isLogin ? 'SIGN IN' : 'CREATE ACCOUNT'} <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        {!isLogin && (
          <div className="mt-4 flex items-center justify-center">
            <button 
              onClick={() => setIsAdminMode(!isAdminMode)}
              className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 hover:text-amber-500 transition-colors"
            >
              {isAdminMode ? 'Register as regular user' : 'Register as Master Admin'}
            </button>
          </div>
        )}

        <div className="mt-8 pt-8 border-t border-slate-800 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setIsAdminMode(false);
            }}
            className="text-slate-400 hover:text-white font-bold transition-colors"
          >
            {isLogin ? (
              <span className="flex items-center justify-center gap-2">
                New to CineQuest? <span className="text-rose-500">Create an account</span>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Already have an account? <span className="text-rose-500">Sign In</span>
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
