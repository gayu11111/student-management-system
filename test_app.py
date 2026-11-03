import os
import unittest

import app as app_module


class StudentTests(unittest.TestCase):
    def setUp(self):
        # use a separate database so your real data is not touched
        app_module.DB_NAME = "test_students.db"
        app_module.init_db()
        self.client = app_module.app.test_client()

    def tearDown(self):
        os.remove("test_students.db")

    def test_add_and_list(self):
        student = {"name": "Gayu", "email": "g@x.com", "course": "BCA", "year": "2"}
        res = self.client.post("/api/students", json=student)
        self.assertEqual(res.status_code, 201)
        students = self.client.get("/api/students").get_json()
        self.assertEqual(len(students), 1)
        self.assertEqual(students[0]["name"], "Gayu")

    def test_bad_email_rejected(self):
        student = {"name": "Gayu", "email": "oops", "course": "BCA", "year": "2"}
        res = self.client.post("/api/students", json=student)
        self.assertEqual(res.status_code, 400)

    def test_delete(self):
        student = {"name": "Gayu", "email": "g@x.com", "course": "BCA", "year": "2"}
        new_id = self.client.post("/api/students", json=student).get_json()["id"]
        res = self.client.delete("/api/students/" + str(new_id))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(self.client.get("/api/students").get_json(), [])


if __name__ == "__main__":
    unittest.main()