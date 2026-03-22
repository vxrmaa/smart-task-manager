# © 2026 Moullesh Varma Daksharaju
# Smart Task & Team Management System (FINAL STABLE VERSION)

from flask import Flask, request, jsonify
import sqlite3
from flask_cors import CORS
import hashlib

app = Flask(__name__)
CORS(app)

# ---------------- DATABASE ----------------
def get_db():
    conn = sqlite3.connect("database.db")
    conn.row_factory = sqlite3.Row
    return conn

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

# Create tables automatically
def create_tables():
    db = get_db()
    db.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        plain_password TEXT,
        role TEXT NOT NULL CHECK(role IN ('Admin', 'Team Lead', 'Member'))
    )
    """)
    db.execute("""
    CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task TEXT,
        assigned_to INTEGER,
        created_by INTEGER,
        status TEXT DEFAULT 'Pending',
        deadline TEXT,
        FOREIGN KEY (assigned_to) REFERENCES users(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
    )
    """)
    db.commit()

create_tables()

# ---------------- AUTH ROUTES ----------------
@app.route('/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    role = data.get('role', 'Member')

    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400

    hashed_pw = hash_password(password)
    
    db = get_db()
    try:
        db.execute(
            "INSERT INTO users (username, password, plain_password, role) VALUES (?, ?, ?, ?)",
            (username, hashed_pw, password, role)
        )
        db.commit()
        return jsonify({"msg": "User registered successfully"}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "Username already exists"}), 400

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400

    hashed_pw = hash_password(password)

    db = get_db()
    user = db.execute(
        "SELECT id, username, role FROM users WHERE username=? AND password=?",
        (username, hashed_pw)
    ).fetchone()

    if user:
        return jsonify({"msg": "Login successful", "user": dict(user)}), 200
    else:
        return jsonify({"error": "Invalid credentials"}), 401

# ---------------- TASK ROUTES ----------------

# Create Task
@app.route('/create_task', methods=['POST'])
def create_task():
    data = request.json

    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    db = get_db()
    db.execute(
        "INSERT INTO tasks (task, assigned_to, created_by, deadline) VALUES (?, ?, ?, ?)",
        (data.get('task'), data.get('assigned_to'), data.get('created_by'), data.get('deadline'))
    )
    db.commit()

    return jsonify({"msg": "Task created successfully"})

# Get Tasks (Filtered by role)
@app.route('/tasks', methods=['GET'])
def get_tasks():
    user_id = request.args.get('user_id')
    role = request.args.get('role')

    db = get_db()
    
    if role == 'Admin':
        tasks = db.execute("""
            SELECT t.*, u.username as assignee_name, creator.username as creator_name
            FROM tasks t 
            LEFT JOIN users u ON t.assigned_to = u.id
            LEFT JOIN users creator ON t.created_by = creator.id
        """).fetchall()
    elif role == 'Team Lead':
        tasks = db.execute("""
            SELECT t.*, u.username as assignee_name, creator.username as creator_name
            FROM tasks t 
            LEFT JOIN users u ON t.assigned_to = u.id 
            LEFT JOIN users creator ON t.created_by = creator.id
            WHERE t.created_by = ? OR t.assigned_to = ?
        """, (user_id, user_id)).fetchall()
    else: # Member
        tasks = db.execute("""
            SELECT t.*, u.username as assignee_name, creator.username as creator_name
            FROM tasks t 
            LEFT JOIN users u ON t.assigned_to = u.id 
            LEFT JOIN users creator ON t.created_by = creator.id
            WHERE t.assigned_to = ?
        """, (user_id,)).fetchall()

    return jsonify([dict(t) for t in tasks])

# Update Task Status
@app.route('/update_task', methods=['POST'])
def update_task():
    data = request.json

    db = get_db()
    db.execute(
        "UPDATE tasks SET status=? WHERE id=?",
        (data.get('status'), data.get('id'))
    )
    db.commit()

    return jsonify({"msg": "Task updated successfully"})

# Update User Role
@app.route('/update_role', methods=['POST'])
def update_role():
    data = request.json
    db = get_db()
    db.execute("UPDATE users SET role=? WHERE id=?", (data.get('role'), data.get('id')))
    db.commit()
    return jsonify({"msg": "Role updated successfully"})

# Delete User
@app.route('/delete_user', methods=['DELETE'])
def delete_user():
    user_id = request.args.get('id')
    db = get_db()
    # Delete tasks assigned to or created by them to avoid orphaned data
    db.execute("DELETE FROM tasks WHERE assigned_to=? OR created_by=?", (user_id, user_id))
    db.execute("DELETE FROM users WHERE id=?", (user_id,))
    db.commit()
    return jsonify({"msg": "User deleted successfully"})

# Get Users
@app.route('/users', methods=['GET'])
def get_users():
    db = get_db()
    users = db.execute("SELECT id, username, role FROM users").fetchall()
    return jsonify([dict(u) for u in users])


# Analytics (for charts)
@app.route('/analytics', methods=['GET'])
def analytics():
    user_id = request.args.get('user_id')
    role = request.args.get('role')

    db = get_db()
    
    if role == 'Admin':
        data = db.execute("SELECT status, COUNT(*) as count FROM tasks GROUP BY status").fetchall()
    elif role == 'Team Lead':
        data = db.execute(
            "SELECT status, COUNT(*) as count FROM tasks WHERE created_by = ? OR assigned_to = ? GROUP BY status",
            (user_id, user_id)
        ).fetchall()
    else: # Member
        data = db.execute(
            "SELECT status, COUNT(*) as count FROM tasks WHERE assigned_to = ? GROUP BY status",
            (user_id,)
        ).fetchall()

    return jsonify([dict(d) for d in data])

# DB Viewer (Admin tool)
@app.route('/db-view', methods=['GET'])
def db_view():
    db = get_db()
    users = db.execute("SELECT id, username, plain_password, role FROM users").fetchall()
    tasks = db.execute("""
        SELECT t.id, t.task, u.username as assigned_to, c.username as created_by, t.status, t.deadline
        FROM tasks t
        LEFT JOIN users u ON t.assigned_to = u.id
        LEFT JOIN users c ON t.created_by = c.id
    """).fetchall()
    return jsonify({
        "users": [dict(u) for u in users],
        "tasks": [dict(t) for t in tasks]
    })

# ---------------- RUN ----------------
# ---------------- FRONTEND ----------------
import os

@app.route('/')
def serve_frontend():
    return send_from_directory('frontend/dist', 'index.html')


@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('frontend/dist', path)


# ---------------- RUN ----------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)