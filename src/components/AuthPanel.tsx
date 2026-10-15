import { useState, type FormEvent } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { api, type User } from '../lib/api';

interface AuthPanelProps {
  onAuthenticated: (user: User) => void;
  onGuest: () => void;
}

export default function AuthPanel({ onAuthenticated, onGuest }: AuthPanelProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = mode === 'login'
        ? await api.login(username.trim(), password)
        : await api.register(username.trim(), password);
      onAuthenticated(user);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100 flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl mb-8 text-amber-900">🏴‍☠️ Treasure Hunt Game 🏴‍☠️</h1>

      <div
        className="w-full p-6 bg-amber-200/80 backdrop-blur-sm rounded-xl shadow-lg border-2 border-amber-400"
        style={{ maxWidth: 360 }}
      >
        <h2 className="text-2xl mb-4 text-center text-amber-900">
          {mode === 'login' ? '登入' : '註冊'}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="username" className="text-amber-900">帳號</Label>
            <Input
              id="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="3-20 個英數字或底線"
              autoComplete="username"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password" className="text-amber-900">密碼</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="至少 6 個字元"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button
            type="submit"
            disabled={submitting}
            className="text-lg py-4 bg-amber-600 hover:bg-amber-700 text-white"
          >
            {submitting ? '處理中...' : mode === 'login' ? '登入' : '註冊並登入'}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm text-amber-800">
          {mode === 'login' ? '還沒有帳號？' : '已經有帳號？'}
          <button
            type="button"
            className="ml-2 underline text-amber-900"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError('');
            }}
          >
            {mode === 'login' ? '註冊' : '登入'}
          </button>
        </div>

        <div className="mt-4 text-center">
          <Button
            type="button"
            variant="outline"
            onClick={onGuest}
            className="w-full text-amber-900"
          >
            以訪客身分遊玩（不記錄分數）
          </Button>
        </div>
      </div>
    </div>
  );
}
