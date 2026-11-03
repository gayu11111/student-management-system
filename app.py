import sqlite3
from flask import Flask, jsonify, request, render_template

app = Flask(__name__)
DB_NAME = "students.db"


def get_db():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row 
    return conn


def init_db():
    conn = get_db()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS students (
            id     INTEGER PRIMARY KEY AUTOINCREMENT,
            name   TEXT NOT NULL,
            email  TEXT NOT NULL UNIQUE,
            phone  TEXT,
            course TEXT NOT NULL,
            year   INTEGER NOT NULL
        )
        """
    )
    conn.commit()
    conn.close()


init_db()


@app.route("/")
def home():
    return render_template("index.html")
def check_data(data):
    """Return an error message, or None if everything is fine."""
    if not data:
        return "No data received"
    if not str(data.get("name", "")).strip():
        return "Name is required"
    if "@" not in str(data.get("email", "")):
        return "A valid email is required"
    if not str(data.get("course", "")).strip():
        return "Course is required"
    if str(data.get("year", "")) not in ["1", "2", "3", "4", "5", "6"]:
        return "Year must be between 1 and 6"
    return None


# READ - all students
@app.route("/api/students", methods=["GET"])
def get_students():
    conn = get_db()
    rows = conn.execute("SELECT * FROM students ORDER BY id DESC").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


# READ - one student
@app.route("/api/students/<int:student_id>", methods=["GET"])
def get_student(student_id):
    conn = get_db()
    row = conn.execute("SELECT * FROM students WHERE id = ?", (student_id,)).fetchone()
    conn.close()
    if row is None:
        return jsonify(error="Student not found"), 404
    return jsonify(dict(row))

# CREATE
@app.route("/api/students", methods=["POST"])
def add_student():
    data = request.get_json(silent=True)
    error = check_data(data)
    if error:
        return jsonify(error=error), 400

    conn = get_db()
    try:
        cur = conn.execute(
            "INSERT INTO students (name, email, phone, course, year) "
            "VALUES (?, ?, ?, ?, ?)",
            (
                data["name"].strip(),
                data["email"].strip().lower(),
                data.get("phone", ""),
                data["course"].strip(),
                int(data["year"]),
            ),
        )
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify(error="This email already exists"), 409
    new_id = cur.lastrowid
    conn.close()
    return jsonify(id=new_id, message="Student added"), 201

# UPDATE
@app.route("/api/students/<int:student_id>", methods=["PUT"])
def update_student(student_id):
    data = request.get_json(silent=True)
    error = check_data(data)
    if error:
        return jsonify(error=error), 400

    conn = get_db()
    try:
        cur = conn.execute(
            "UPDATE students SET name=?, email=?, phone=?, course=?, year=? "
            "WHERE id=?",
            (
                data["name"].strip(),
                data["email"].strip().lower(),
                data.get("phone", ""),
                data["course"].strip(),
                int(data["year"]),
                student_id,
            ),
        )
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify(error="This email already exists"), 409
    conn.close()
    if cur.rowcount == 0:
        return jsonify(error="Student not found"), 404
    return jsonify(message="Student updated")


# DELETE
@app.route("/api/students/<int:student_id>", methods=["DELETE"])
def delete_student(student_id):
    conn = get_db()
    cur = conn.execute("DELETE FROM students WHERE id = ?", (student_id,))
    conn.commit()
    conn.close()
    if cur.rowcount == 0:
        return jsonify(error="Student not found"), 404
    return jsonify(message="Student deleted")
if __name__ == "__main__":
    app.run(debug=True)