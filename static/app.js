const API = "/api/students";
let students = [];

// Make text safe before putting it inside HTML
function esc(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// READ: get all students from the backend and show them
async function loadStudents() {
  const res = await fetch(API);
  students = await res.json();
  showStudents();
}

function showStudents() {
  const tbody = document.getElementById("student-rows");
  tbody.innerHTML = "";
  students.forEach(function (s) {
    tbody.innerHTML +=
      "<tr>" +
      "<td>" + s.id + "</td>" +
      "<td>" + esc(s.name) + "</td>" +
      "<td>" + esc(s.course) + "</td>" +
      "<td>" + s.year + "</td>" +
      "<td>" +
      '<button onclick="viewStudent(' + s.id + ')">View</button> ' +
      '<button onclick="editStudent(' + s.id + ')">Edit</button> ' +
      '<button onclick="deleteStudent(' + s.id + ')">Delete</button>' +
      "</td>" +
      "</tr>";
  });
}

// CREATE + UPDATE: runs when the form is submitted
document.getElementById("student-form").addEventListener("submit", async function (e) {
  e.preventDefault(); // stop the page from reloading

  const id = document.getElementById("student-id").value;
  const body = {
    name: document.getElementById("name").value,
    email: document.getElementById("email").value,
    phone: document.getElementById("phone").value,
    course: document.getElementById("course").value,
    year: document.getElementById("year").value,
  };

  // If there is an id we are editing (PUT), otherwise adding (POST)
  const url = id ? API + "/" + id : API;
  const method = id ? "PUT" : "POST";

  const res = await fetch(url, {
    method: method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();

  if (!res.ok) {
    document.getElementById("form-error").textContent = data.error;
    return;
  }
  resetForm();
  loadStudents();
});

// VIEW: show full details of one student
function viewStudent(id) {
  const s = students.find(function (x) { return x.id === id; });
  const box = document.getElementById("details");
  box.innerHTML =
    "<b>" + esc(s.name) + "</b><br>" +
    "Email: " + esc(s.email) + "<br>" +
    "Phone: " + (esc(s.phone) || "-") + "<br>" +
    "Course: " + esc(s.course) + "<br>" +
    "Year: " + s.year;
  box.hidden = false;
}

// EDIT: fill the form with the student's data
function editStudent(id) {
  const s = students.find(function (x) { return x.id === id; });
  document.getElementById("student-id").value = s.id;
  document.getElementById("name").value = s.name;
  document.getElementById("email").value = s.email;
  document.getElementById("phone").value = s.phone;
  document.getElementById("course").value = s.course;
  document.getElementById("year").value = s.year;
  document.getElementById("form-title").textContent = "Edit Student";
  document.getElementById("save-btn").textContent = "Update Student";
  document.getElementById("cancel-btn").hidden = false;
}

// DELETE
async function deleteStudent(id) {
  if (!confirm("Delete this student?")) return;
  await fetch(API + "/" + id, { method: "DELETE" });
  document.getElementById("details").hidden = true;
  loadStudents();
}

function resetForm() {
  document.getElementById("student-form").reset();
  document.getElementById("student-id").value = "";
  document.getElementById("form-title").textContent = "Add Student";
  document.getElementById("save-btn").textContent = "Add Student";
  document.getElementById("cancel-btn").hidden = true;
  document.getElementById("form-error").textContent = "";
}

document.getElementById("cancel-btn").addEventListener("click", resetForm);

loadStudents();