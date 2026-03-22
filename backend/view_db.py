import sqlite3

def view_db():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    
    print("\n---------------- USERS TABLE ----------------")
    print(f"{'ID':<5} {'Username':<20} {'Password':<20} {'Role':<15}")
    print("-" * 65)
    try:
        cursor.execute("SELECT id, username, COALESCE(plain_password, '(hashed)') as password, role FROM users")
        rows = cursor.fetchall()
        for row in rows:
            print(f"{row[0]:<5} {row[1]:<20} {row[2]:<20} {row[3]:<15}")
    except Exception as e:
        print("Error reading users:", e)
        
    print("\n---------------- TASKS TABLE ----------------")
    try:
        cursor.execute("SELECT * FROM tasks")
        rows = cursor.fetchall()
        for row in rows:
            print(row)
    except Exception as e:
        print("Error reading tasks:", e)
        
    conn.close()

if __name__ == '__main__':
    view_db()
