import { useState } from 'react';
import axios from 'axios';
import { User, Lock, Users, LogIn, UserPlus, Target } from 'lucide-react';
import './Login.css';

const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://127.0.0.1:10000'
  : '';

function Login({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Member');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (isLogin) {
        const res = await axios.post(`${API_URL}/login`, { username, password });
        onLogin(res.data.user);
      } else {
        await axios.post(`${API_URL}/register`, { username, password, role });
        // Automatically log in after registration
        const res = await axios.post(`${API_URL}/login`, { username, password });
        onLogin(res.data.user);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred during authentication');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card glass glass-panel animate-fade-in">
        <div className="login-header">
          <div className="logo-icon">
            <Target size={40} color="var(--primary)" />
          </div>
          <h1>
            Smart<span className="text-gradient-primary">Task</span>
          </h1>
          <p className="subtitle text-muted">
            {isLogin ? 'Welcome back! Please login to your account.' : 'Create an account to start managing your team.'}
          </p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label>Username</label>
            <div className="input-icon-wrapper">
              <User className="input-icon text-muted" size={18} />
              <input
                type="text"
                className="input-field"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label>Password</label>
            <div className="input-icon-wrapper">
              <Lock className="input-icon text-muted" size={18} />
              <input
                type="password"
                className="input-field"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {!isLogin && (
            <div className="input-group">
              <label>Role</label>
              <div className="input-icon-wrapper">
                <Users className="input-icon text-muted" size={18} />
                <select
                  className="input-field select-field"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="Admin">Admin</option>
                  <option value="Team Lead">Team Lead</option>
                  <option value="Member">Member</option>
                </select>
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-primary submit-btn">
            {isLogin ? (
              <><LogIn size={18} /> Sign In</>
            ) : (
              <><UserPlus size={18} /> Sign Up</>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <span
              className="toggle-link text-gradient-primary"
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
            >
              {isLogin ? 'Register now' : 'Login instead'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
