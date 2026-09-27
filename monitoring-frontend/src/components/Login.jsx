import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authApi.login(username, password);
      
      if (response.success && response.token) {
        onLogin(response.user);
        navigate('/laporan', { replace: true });
      } else {
        setError(response.message || 'Login failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #1a5c38 0%, #0f3d24 100%)', fontFamily: "'Segoe UI', sans-serif" }}>
      <div className="w-full max-w-md p-8" style={{ background: '#ffffff', borderRadius: 18, boxShadow: '0 24px 80px rgba(0,0,0,0.4)' }}>
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-xl mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: '#1a5c38' }}>
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold" style={{ color: '#1a5c38' }}>Kasir Warung Monitor</h1>
          <p className="mt-2" style={{ color: '#888888', fontSize: 12 }}>Powered by DEN POS</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Username Field */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-lg transition-all"
              style={{ border: '1.5px solid #e0e0d8', fontSize: 13, outline: 'none' }}
              placeholder="Enter your username"
              autoComplete="off"
            />
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg transition-all"
              style={{ border: '1.5px solid #e0e0d8', fontSize: 13, outline: 'none' }}
              placeholder="Enter your password"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: '#ffebee', border: '1px solid #e0e0d8', color: '#d32f2f' }}>
              {error}
            </div>
          )}

          {/* Demo Credentials Hint */}
          {!error && (
            <div className="px-4 py-3 rounded-lg text-xs" style={{ backgroundColor: '#e8f5ee', border: '1px solid #a8d5b8', color: '#1a5c38' }}>
              <strong>Demo Credentials:</strong><br />
              Admin: admin / admin123<br />
              Manager: manager / manager123<br />
              Viewer: viewer / viewer123
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full text-white py-3 px-6 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: loading ? '#aaaaaa' : '#1a5c38', fontSize: 13, fontWeight: 700 }}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Logging in...
              </span>
            ) : (
              'Login'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center text-sm" style={{ color: '#888888' }}>
          <p>Kasir Warung Monitoring System v1.0</p>
        </div>
      </div>
    </div>
  );
}
