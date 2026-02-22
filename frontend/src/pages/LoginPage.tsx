import { FormEvent, useState } from 'react';
import { AxiosError } from 'axios';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setAuth } from '../features/auth/authSlice';
import api, { API_BASE_URL } from '../services/api';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@laundrypos.local');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.post('/auth/login', { email, password });
      dispatch(setAuth(res.data.data));
      navigate('/dashboard');
    } catch (err) {
      const axiosError = err as AxiosError<{ error?: { message?: string } }>;
      if (!axiosError.response) {
        setError(`Cannot reach API server at ${API_BASE_URL}. Make sure backend is running.`);
        return;
      }
      setError(axiosError.response.data?.error?.message ?? 'Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen grid place-items-center">
      <form onSubmit={submit} className="bg-white p-6 rounded shadow w-96 space-y-3">
        <h1 className="text-2xl font-bold">Login</h1>
        {error && <p className="text-red-600">{error}</p>}
        <input className="w-full" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input className="w-full" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
        <button className="bg-blue-600 text-white w-full">Sign In</button>
      </form>
    </div>
  );
}
