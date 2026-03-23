import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  LogOut, 
  LayoutDashboard, 
  CheckSquare, 
  BarChart2, 
  Users as UsersIcon, 
  Plus, 
  X,
  Target,
  Database
} from 'lucide-react';
import './Dashboard.css';

const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://127.0.0.1:10000'
  : '';

function Dashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('tasks');
  const [tasks, setTasks] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [usersInfo, setUsersInfo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbView, setDbView] = useState({ users: [], tasks: [] });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({ task: '', assigned_to: '', deadline: '' });
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'Member' });

  useEffect(() => {
    fetchData();
  }, [user, activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch Tasks
      const tasksRes = await axios.get(`${API_URL}/tasks?user_id=${user.id}&role=${user.role}`);
      setTasks(tasksRes.data);

      // Fetch Analytics
      if (activeTab === 'analytics' || activeTab === 'dashboard') {
        const analyticsRes = await axios.get(`${API_URL}/analytics?user_id=${user.id}&role=${user.role}`);
        setAnalytics(analyticsRes.data);
      }

      // Fetch Users Info for Admin/Team Lead
      if (user.role !== 'Member') {
        const usersRes = await axios.get(`${API_URL}/users`);
        setUsersInfo(usersRes.data);
      }

      // Fetch DB View for Admin
      if (user.role === 'Admin' && activeTab === 'database') {
        const dbRes = await axios.get(`${API_URL}/db-view`);
        setDbView(dbRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/create_task`, {
        ...newTask,
        created_by: user.id
      });
      setIsModalOpen(false);
      setNewTask({ task: '', assigned_to: '', deadline: '' });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStatus = async (taskId, currentStatus) => {
    const nextStatus = currentStatus === 'Pending' ? 'In Progress' : currentStatus === 'In Progress' ? 'Completed' : 'Pending';
    try {
      await axios.post(`${API_URL}/update_task`, {
        id: taskId,
        status: nextStatus
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm("Are you sure you want to remove this member? This will also delete their assigned tasks.")) return;
    try {
      await axios.delete(`${API_URL}/delete_user?id=${id}`);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateRole = async (id, newRole) => {
    try {
      await axios.post(`${API_URL}/update_role`, { id, role: newRole });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/register`, newUser);
      setIsUserModalOpen(false);
      setNewUser({ username: '', password: '', role: 'Member' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || "Error creating user");
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar glass-panel">
        <div className="sidebar-header">
          <Target size={32} color="var(--primary)" />
          <h2>Smart<span className="text-gradient-primary">Task</span></h2>
        </div>

        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeTab === 'tasks' ? 'active' : ''}`}
            onClick={() => setActiveTab('tasks')}
          >
            <CheckSquare size={20} /> My Tasks
          </button>
          
          {(user.role === 'Admin' || user.role === 'Team Lead') && (
            <button 
              className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              <BarChart2 size={20} /> Analytics
            </button>
          )}

          {user.role === 'Admin' && (
            <button 
              className={`nav-item ${activeTab === 'team' ? 'active' : ''}`}
              onClick={() => setActiveTab('team')}
            >
              <UsersIcon size={20} /> Team Members
            </button>
          )}
          {user.role === 'Admin' && (
            <button 
              className={`nav-item ${activeTab === 'database' ? 'active' : ''}`}
              onClick={() => setActiveTab('database')}
            >
              <Database size={20} /> Database
            </button>
          )}
        </nav>

        <div className="user-profile">
          <div className="avatar">{user.username.charAt(0).toUpperCase()}</div>
          <div className="user-info">
            <span className="username">{user.username}</span>
            <span className="role badge badge-progress">{user.role}</span>
          </div>
          <button className="logout-btn" onClick={onLogout} title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="topbar">
          <h1>
            {activeTab === 'tasks' && 'Task Board'}
            {activeTab === 'analytics' && 'Project Analytics'}
            {activeTab === 'team' && 'Team Directory'}
            {activeTab === 'database' && '🗄️ Database Viewer'}
          </h1>
          
          {(user.role === 'Admin' || user.role === 'Team Lead') && activeTab === 'tasks' && (
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              <Plus size={18} /> New Task
            </button>
          )}
          {user.role === 'Admin' && activeTab === 'team' && (
            <button className="btn btn-primary" onClick={() => setIsUserModalOpen(true)}>
              <Plus size={18} /> Add Member
            </button>
          )}
        </header>

        {loading ? (
          <div className="loader">Loading...</div>
        ) : (
          <div className="content-area animate-fade-in">
            {activeTab === 'tasks' && (
              <div className="task-grid">
                {['Pending', 'In Progress', 'Completed'].map(statusGroup => (
                  <div key={statusGroup} className="task-column glass-panel">
                    <h3>{statusGroup}</h3>
                    <div className="task-list">
                      {tasks.filter(t => t.status === statusGroup).map(task => (
                        <div key={task.id} className="task-card">
                          <h4>{task.task}</h4>
                          <div className="task-meta text-muted">
                            {task.deadline && <span>Due: {task.deadline}</span>}
                            {(user.role === 'Admin' || user.role === 'Team Lead') && (
                              <span>Assignee: {task.assignee_name || 'Unassigned'}</span>
                            )}
                          </div>
                          <button 
                            className={`btn btn-secondary status-btn badge-btn badge-${statusGroup.toLowerCase().replace(' ', '-')}`}
                            onClick={() => handleUpdateStatus(task.id, task.status)}
                          >
                            {task.status} →
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="analytics-grid">
                {analytics.map(item => (
                  <div key={item.status} className={`stat-card glass-panel border-${item.status.toLowerCase().replace(' ', '-')}`}>
                    <h3>{item.status} Tasks</h3>
                    <div className="stat-value">{item.count}</div>
                  </div>
                ))}
                {analytics.length === 0 && <p className="text-muted">No analytics data available yet.</p>}
              </div>
            )}

            {activeTab === 'database' && (
              <div className="db-viewer">
                <div className="db-table-section glass-panel">
                  <h3>👤 Users Table</h3>
                  <div className="table-scroll">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Username</th>
                          <th>Password</th>
                          <th>Role</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dbView.users.map(u => (
                          <tr key={u.id}>
                            <td>{u.id}</td>
                            <td>{u.username}</td>
                            <td><code style={{background:'rgba(255,255,255,0.05)', padding:'2px 8px', borderRadius:'4px', fontSize:'0.85rem'}}>{u.plain_password || '••••••••'}</code></td>
                            <td><span className="badge badge-progress">{u.role}</span></td>
                          </tr>
                        ))}
                        {dbView.users.length === 0 && <tr><td colSpan="3" style={{textAlign:'center', color:'var(--text-muted)'}}>No users yet</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="db-table-section glass-panel" style={{marginTop:'24px'}}>
                  <h3>✅ Tasks Table</h3>
                  <div className="table-scroll">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Task</th>
                          <th>Assigned To</th>
                          <th>Created By</th>
                          <th>Status</th>
                          <th>Deadline</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dbView.tasks.map(t => (
                          <tr key={t.id}>
                            <td>{t.id}</td>
                            <td>{t.task}</td>
                            <td>{t.assigned_to || '—'}</td>
                            <td>{t.created_by || '—'}</td>
                            <td><span className={`badge badge-${(t.status||'pending').toLowerCase().replace(' ','-')}`}>{t.status}</span></td>
                            <td>{t.deadline || '—'}</td>
                          </tr>
                        ))}
                        {dbView.tasks.length === 0 && <tr><td colSpan="6" style={{textAlign:'center', color:'var(--text-muted)'}}>No tasks yet</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'team' && (
              <div className="team-grid">
                {usersInfo.map(u => (
                  <div key={u.id} className="user-card glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div className="avatar large">{u.username.charAt(0).toUpperCase()}</div>
                    <h3>{u.username}</h3>
                    {user.role === 'Admin' && u.id !== user.id ? (
                      <select 
                        className="input-field select-field badge-select"
                        value={u.role}
                        onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                        style={{ padding: '6px 12px', fontSize: '0.85rem', width: '100%', marginBottom: '16px', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}
                      >
                        <option value="Admin">Admin</option>
                        <option value="Team Lead">Team Lead</option>
                        <option value="Member">Member</option>
                      </select>
                    ) : (
                      <span className="badge badge-pending" style={{ marginBottom: '16px' }}>{u.role}</span>
                    )}
                    
                    {user.role === 'Admin' && u.id !== user.id && (
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => handleDeleteUser(u.id)}
                        style={{ width: '100%', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)', marginTop: 'auto' }}
                      >
                         Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Create Task Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal glass-panel animate-fade-in">
            <div className="modal-header">
              <h2>Create New Task</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreateTask}>
              <div className="input-group">
                <label>Task Description</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={newTask.task}
                  onChange={e => setNewTask({...newTask, task: e.target.value})}
                  required 
                />
              </div>

              <div className="input-group">
                <label>Assign To</label>
                <select 
                  className="input-field"
                  value={newTask.assigned_to}
                  onChange={e => setNewTask({...newTask, assigned_to: e.target.value})}
                  required
                >
                  <option value="">Select Team Member</option>
                  {usersInfo.map(u => (
                    <option key={u.id} value={u.id}>{u.username} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label>Deadline (Optional)</label>
                <input 
                  type="date" 
                  className="input-field"
                  value={newTask.deadline}
                  onChange={e => setNewTask({...newTask, deadline: e.target.value})}
                />
              </div>

              <button type="submit" className="btn btn-primary w-100 mt-4">
                Assign Task
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {isUserModalOpen && (
        <div className="modal-overlay">
          <div className="modal glass-panel animate-fade-in">
            <div className="modal-header">
              <h2>Add New Member</h2>
              <button className="close-btn" onClick={() => setIsUserModalOpen(false)}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreateUser}>
              <div className="input-group">
                <label>Username</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={newUser.username}
                  onChange={e => setNewUser({...newUser, username: e.target.value})}
                  required 
                />
              </div>

              <div className="input-group">
                <label>Password</label>
                <input 
                  type="password" 
                  className="input-field" 
                  value={newUser.password}
                  onChange={e => setNewUser({...newUser, password: e.target.value})}
                  required 
                />
              </div>

              <div className="input-group">
                <label>Role</label>
                <select 
                  className="input-field"
                  value={newUser.role}
                  onChange={e => setNewUser({...newUser, role: e.target.value})}
                  required
                >
                  <option value="Admin">Admin</option>
                  <option value="Team Lead">Team Lead</option>
                  <option value="Member">Member</option>
                </select>
              </div>

              <button type="submit" className="btn btn-primary w-100 mt-4">
                Add Member
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
