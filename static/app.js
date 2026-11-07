const API = "/api/students";
const $ = function (id) { return document.getElementById(id); };

let students = [];
let viewing = null; // the student shown in the view dialog
const state = { year: "all", sort: "newest", view: "cards", search: "" };

try {
  const saved = localStorage.getItem("sms-view");
  if (saved === "table" || saved === "cards") state.view = saved;
} catch (e) { /* storage blocked: fine */ }

// ---------- Small helpers ----------
function esc(text) {
  const div = document.createElement("div");
  div.textContent = text == null ? "" : text;
  return div.innerHTML;
}

function initials(name) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0] ? parts[0].charAt(0) : "";
  const second = parts[1] ? parts[1].charAt(0) : "";
  return (first + second).toUpperCase();
}

function idLabel(id) {
  return "ID " + String(id).padStart(3, "0");
}

let toastTimer;
function showToast(message, type) {
  const toast = $("toast");
  toast.textContent = message;
  toast.className = "show " + (type || "success");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { toast.className = ""; }, 2600);
}

const SERVER_DOWN = "Can't reach the server. Start it with python app.py.";

// ---------- Load data ----------
async function loadStudents() {
  try {
    const res = await fetch(API);
    students = await res.json();
    render();
  } catch (err) {
    $("hero-count").textContent = "Can't reach the server";
    showToast(SERVER_DOWN, "error");
  }
}

// ---------- Filter + sort ----------
function visibleStudents() {
  const term = state.search.trim().toLowerCase();

  const list = students.filter(function (s) {
    if (state.year !== "all" && String(s.year) !== state.year) return false;
    if (!term) return true;
    return (
      s.name.toLowerCase().includes(term) ||
      s.email.toLowerCase().includes(term) ||
      s.course.toLowerCase().includes(term)
    );
  });

  list.sort(function (a, b) {
    if (state.sort === "name") return a.name.localeCompare(b.name);
    if (state.sort === "course") return a.course.localeCompare(b.course) || a.name.localeCompare(b.name);
    if (state.sort === "year") return a.year - b.year || a.name.localeCompare(b.name);
    return b.id - a.id; // newest first
  });
  return list;
}

// ---------- Render ----------
function render() {
  renderHero();
  renderList();
}

function renderHero() {
  const total = students.length;
  const courses = new Set(students.map(function (s) { return s.course.trim().toLowerCase(); })).size;

  $("hero-count").textContent = total === 0
    ? "No students enrolled yet"
    : total + (total === 1 ? " student" : " students") + " enrolled across " +
      courses + (courses === 1 ? " course" : " courses");

  // Which years to show: always 1 to 4, plus any other year that exists
  const years = [1, 2, 3, 4];
  students.forEach(function (s) { if (years.indexOf(s.year) === -1) years.push(s.year); });
  years.sort(function (a, b) { return a - b; });

  const counts = {};
  years.forEach(function (y) {
    counts[y] = students.filter(function (s) { return s.year === y; }).length;
  });

  // Segmented bar
  $("year-bar").innerHTML = years
    .filter(function (y) { return counts[y] > 0; })
    .map(function (y) {
      return '<span data-year="' + y + '" style="flex:' + counts[y] + '" title="Year ' + y + ": " + counts[y] + '"></span>';
    })
    .join("");

  // Filter chips (the legend of the bar)
  let chips =
    '<button type="button" class="chip" data-year-filter="all" aria-pressed="' + (state.year === "all") + '">' +
    "All years <b>" + total + "</b></button>";
  years.forEach(function (y) {
    chips +=
      '<button type="button" class="chip" data-year-filter="' + y + '" aria-pressed="' + (state.year === String(y)) + '">' +
      '<span class="dot" data-year="' + y + '"></span>Year ' + y + " <b>" + counts[y] + "</b></button>";
  });
  $("year-filters").innerHTML = chips;
}

function renderList() {
  const list = visibleStudents();
  const showCards = state.view === "cards";

  $("view-cards").setAttribute("aria-pressed", showCards);
  $("view-table").setAttribute("aria-pressed", !showCards);

  // Cards
  $("cards").innerHTML = list.map(function (s) {
    return (
      '<button type="button" class="id-card" data-action="view" data-id="' + s.id + '" data-year="' + s.year + '">' +
        '<span class="monogram">' + esc(initials(s.name)) + "</span>" +
        '<span class="id-name">' + esc(s.name) + "</span>" +
        '<span class="id-course">' + esc(s.course) + "</span>" +
        '<span class="id-band"><span>Year ' + s.year + "</span><span>" + idLabel(s.id) + "</span></span>" +
      "</button>"
    );
  }).join("");

  // Table
  $("student-rows").innerHTML = list.map(function (s) {
    return (
      "<tr>" +
        "<td>" + idLabel(s.id) + "</td>" +
        '<td><span class="row-name" data-year="' + s.year + '"><span class="monogram">' + esc(initials(s.name)) + "</span>" + esc(s.name) + "</span></td>" +
        "<td>" + esc(s.course) + "</td>" +
        '<td><span class="year-tag" data-year="' + s.year + '">Year ' + s.year + "</span></td>" +
        '<td><span class="row-actions">' +
          '<button type="button" class="btn btn-sm" data-action="view" data-id="' + s.id + '">View</button>' +
          '<button type="button" class="btn btn-sm" data-action="edit" data-id="' + s.id + '">Edit</button>' +
          '<button type="button" class="btn btn-sm btn-danger" data-action="delete" data-id="' + s.id + '">Delete</button>' +
        "</span></td>" +
      "</tr>"
    );
  }).join("");

  const hasRows = list.length > 0;
  $("cards").hidden = !(showCards && hasRows);
  $("table-wrap").hidden = showCards || !hasRows;

  // Empty states
  const empty = $("empty");
  if (hasRows) {
    empty.hidden = true;
  } else if (students.length === 0) {
    empty.innerHTML =
      "<h2>No students yet</h2><p>Add your first student to start the register.</p>" +
      '<button type="button" class="btn btn-accent" data-action="add">Add student</button>';
    empty.hidden = false;
  } else {
    empty.innerHTML = "<h2>No students match</h2><p>Try a different search, or choose All years.</p>";
    empty.hidden = false;
  }

  // Result note
  const filtering = state.year !== "all" || state.search.trim() !== "";
  $("result-note").textContent = filtering && students.length
    ? "Showing " + list.length + " of " + students.length + (students.length === 1 ? " student" : " students")
    : "";
}

// ---------- Toolbar events ----------
$("search").addEventListener("input", function (e) {
  state.search = e.target.value;
  renderList();
});

$("sort").addEventListener("change", function (e) {
  state.sort = e.target.value;
  renderList();
});

function setView(view) {
  state.view = view;
  try { localStorage.setItem("sms-view", view); } catch (e) { /* ignore */ }
  renderList();
}
$("view-cards").addEventListener("click", function () { setView("cards"); });
$("view-table").addEventListener("click", function () { setView("table"); });

$("year-filters").addEventListener("click", function (e) {
  const chip = e.target.closest("[data-year-filter]");
  if (!chip) return;
  state.year = chip.dataset.yearFilter;
  render();
});

$("add-btn").addEventListener("click", function () { openForm(null); });

// ---------- Clicks on cards, rows and the empty state ----------
document.addEventListener("click", function (e) {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const action = el.dataset.action;

  if (action === "add") return openForm(null);

  const student = students.find(function (s) { return s.id === Number(el.dataset.id); });
  if (!student) return;

  if (action === "view") openView(student, false);
  if (action === "edit") openForm(student);
  if (action === "delete") openView(student, true);
});

// ---------- Add / edit dialog ----------
const formDialog = $("form-dialog");

function openForm(student) {
  $("student-form").reset();
  $("form-error").textContent = "";
  $("student-id").value = student ? student.id : "";

  if (student) {
    $("name").value = student.name;
    $("email").value = student.email;
    $("phone").value = student.phone || "";
    $("course").value = student.course;
    $("year").value = student.year;
  }
  $("form-title").textContent = student ? "Edit student" : "Add student";
  $("save-btn").textContent = student ? "Save changes" : "Add student";

  if (viewDialog.open) viewDialog.close();
  formDialog.showModal();
}

$("cancel-btn").addEventListener("click", function () { formDialog.close(); });

$("student-form").addEventListener("submit", async function (e) {
  e.preventDefault();
  $("form-error").textContent = "";

  const id = $("student-id").value;
  const body = {
    name: $("name").value,
    email: $("email").value,
    phone: $("phone").value,
    course: $("course").value,
    year: $("year").value,
  };

  try {
    const res = await fetch(id ? API + "/" + id : API, {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (!res.ok) {
      $("form-error").textContent = data.error;
      return;
    }
    formDialog.close();
    showToast(id ? "Changes saved" : "Student added", "success");
    loadStudents();
  } catch (err) {
    $("form-error").textContent = SERVER_DOWN;
  }
});

// ---------- View dialog (also handles delete confirmation) ----------
const viewDialog = $("view-dialog");

function openView(student, askDelete) {
  viewing = student;
  const mono = $("v-mono");
  mono.textContent = initials(student.name);
  mono.setAttribute("data-year", student.year);

  $("v-name").textContent = student.name;
  $("v-id").textContent = idLabel(student.id);
  $("v-email").textContent = student.email;
  $("v-phone").textContent = student.phone || "Not added";
  $("v-course").textContent = student.course;
  $("v-year").textContent = "Year " + student.year;

  showDeleteConfirm(askDelete);
  if (!viewDialog.open) viewDialog.showModal();
}

function showDeleteConfirm(show) {
  $("v-actions").hidden = show;
  $("v-confirm").hidden = !show;
  if (show) {
    $("v-confirm-text").textContent = "Delete " + viewing.name + "? This can't be undone.";
  }
}

$("v-close").addEventListener("click", function () { viewDialog.close(); });
$("v-edit").addEventListener("click", function () { openForm(viewing); });
$("v-delete").addEventListener("click", function () { showDeleteConfirm(true); });
$("v-keep").addEventListener("click", function () { showDeleteConfirm(false); });

$("v-confirm-delete").addEventListener("click", async function () {
  try {
    const res = await fetch(API + "/" + viewing.id, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      showToast(data.error, "error");
      return;
    }
    viewDialog.close();
    showToast("Student deleted", "success");
    loadStudents();
  } catch (err) {
    showToast(SERVER_DOWN, "error");
  }
});

// Click on the dark backdrop closes a dialog
[formDialog, viewDialog].forEach(function (dlg) {
  dlg.addEventListener("click", function (e) {
    if (e.target === dlg) dlg.close();
  });
});

// ---------- Export CSV ----------
function csvCell(value) {
  let text = String(value == null ? "" : value);
  if (/^[=+\-@]/.test(text)) text = "'" + text; // stops Excel running it as a formula
  return '"' + text.replace(/"/g, '""') + '"';
}

$("export-btn").addEventListener("click", function () {
  const rows = visibleStudents();
  if (rows.length === 0) {
    showToast("No students to export", "error");
    return;
  }
  const lines = [["ID", "Name", "Email", "Phone", "Course", "Year"].map(csvCell).join(",")];
  rows.forEach(function (s) {
    lines.push([s.id, s.name, s.email, s.phone, s.course, s.year].map(csvCell).join(","));
  });

  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "students.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
  showToast("Exported " + rows.length + (rows.length === 1 ? " student" : " students"), "success");
});

loadStudents();