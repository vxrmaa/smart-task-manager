# © 2026 Moullesh Varma Daksharaju
# Smart Task & Team Management System

from flask import Flask, request, jsonify, send_from_directory
import sqlite3
from flask_cors import CORS
import hashlib
import os

app = Flask(__name__)
CORS(app)

# Absolute path to DB — works regardless of working directory (critical for Render)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "database.db")
DIST_DIR = os.path.join(BASE_DIR, "dist")

# ---------------- DATABASE ----------------
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

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
    db.close()

create_tables()

# ---------------- AUTH ROUTES ----------------
@app.route('/register', methods=['POST'])
def register():
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400

    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    role = data.get('role', 'Member')

    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400

    if role not in ('Admin', 'Team Lead', 'Member'):
        return jsonify({"error": "Invalid role"}), 400

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
    finally:
        db.close()

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400

    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400

    hashed_pw = hash_password(password)
    db = get_db()
    try:
        user = db.execute(
            "SELECT id, username, role FROM users WHERE username=? AND password=?",
            (username, hashed_pw)
        ).fetchone()

        if user:
            return jsonify({"msg": "Login successful", "user": dict(user)}), 200
        else:
            return jsonify({"error": "Invalid credentials"}), 401
    finally:
        db.close()

# ---------------- TASK ROUTES ----------------
@app.route('/tasks', methods=['GET'])
def get_tasks():
    user_id = request.args.get('user_id')
    role = request.args.get('role')
    db = get_db()
    try:
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
        else:
            tasks = db.execute("""
                SELECT t.*, u.username as assignee_name, creator.username as creator_name
                FROM tasks t
                LEFT JOIN users u ON t.assigned_to = u.id
                LEFT JOIN users creator ON t.created_by = creator.id
                WHERE t.assigned_to = ?
            """, (user_id,)).fetchall()

        return jsonify([dict(t) for t in tasks])
    finally:
        db.close()

@app.route('/create_task', methods=['POST'])
def create_task():
    data = request.json
    if not data or not data.get('task'):
        return jsonify({"error": "Task description required"}), 400

    db = get_db()
    try:
        db.execute(
            "INSERT INTO tasks (task, assigned_to, created_by, deadline) VALUES (?, ?, ?, ?)",
            (data.get('task'), data.get('assigned_to'), data.get('created_by'), data.get('deadline') or None)
        )
        db.commit()
        return jsonify({"msg": "Task created successfully"}), 201
    finally:
        db.close()

@app.route('/update_task', methods=['POST'])
def update_task():
    data = request.json
    if not data or not data.get('id'):
        return jsonify({"error": "Task ID required"}), 400

    db = get_db()
    try:
        db.execute(
            "UPDATE tasks SET status=? WHERE id=?",
            (data.get('status'), data.get('id'))
        )
        db.commit()
        return jsonify({"msg": "Task updated successfully"})
    finally:
        db.close()

@app.route('/update_role', methods=['POST'])
def update_role():
    data = request.json
    if not data or not data.get('id'):
        return jsonify({"error": "User ID required"}), 400

    db = get_db()
    try:
        db.execute("UPDATE users SET role=? WHERE id=?", (data.get('role'), data.get('id')))
        db.commit()
        return jsonify({"msg": "Role updated successfully"})
    finally:
        db.close()

@app.route('/delete_user', methods=['DELETE'])
def delete_user():
    user_id = request.args.get('id')
    if not user_id:
        return jsonify({"error": "User ID required"}), 400

    db = get_db()
    try:
        db.execute("DELETE FROM tasks WHERE assigned_to=? OR created_by=?", (user_id, user_id))
        db.execute("DELETE FROM users WHERE id=?", (user_id,))
        db.commit()
        return jsonify({"msg": "User deleted successfully"})
    finally:
        db.close()

@app.route('/users', methods=['GET'])
def get_users():
    db = get_db()
    try:
        users = db.execute("SELECT id, username, role FROM users").fetchall()
        return jsonify([dict(u) for u in users])
    finally:
        db.close()

@app.route('/analytics', methods=['GET'])
def analytics():
    user_id = request.args.get('user_id')
    role = request.args.get('role')
    db = get_db()
    try:
        if role == 'Admin':
            data = db.execute("SELECT status, COUNT(*) as count FROM tasks GROUP BY status").fetchall()
        elif role == 'Team Lead':
            data = db.execute(
                "SELECT status, COUNT(*) as count FROM tasks WHERE created_by=? OR assigned_to=? GROUP BY status",
                (user_id, user_id)
            ).fetchall()
        else:
            data = db.execute(
                "SELECT status, COUNT(*) as count FROM tasks WHERE assigned_to=? GROUP BY status",
                (user_id,)
            ).fetchall()
        return jsonify([dict(d) for d in data])
    finally:
        db.close()

@app.route('/db-view', methods=['GET'])
def db_view():
    db = get_db()
    try:
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
    finally:
        db.close()

# ---------------- HEALTH CHECK ----------------
@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "db": DB_PATH, "dist": DIST_DIR}), 200

# ---------------- FRONTEND (serve built React app) ----------------
@app.route('/')
def serve_frontend():
    return send_from_directory(DIST_DIR, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    file_path = os.path.join(DIST_DIR, path)
    if os.path.exists(file_path):
        return send_from_directory(DIST_DIR, path)
    # React Router fallback
    return send_from_directory(DIST_DIR, 'index.html')

# ---------------- RUN ----------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)