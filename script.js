"use strict";

const STORAGE_KEY = "taskflow_tasks";

const state = {
  tasks: [],
  filter: "all",
  query: "",
  editingId: null,
  deletingId: null,
  newTaskId: null
};

const dom = {
  currentDate: document.querySelector("#currentDate"),
  footerYear: document.querySelector("#footerYear"),

  taskForm: document.querySelector("#taskForm"),
  taskInput: document.querySelector("#taskInput"),
  formMessage: document.querySelector("#formMessage"),

  totalCount: document.querySelector("#totalCount"),
  pendingCount: document.querySelector("#pendingCount"),
  completedCount: document.querySelector("#completedCount"),
  progressText: document.querySelector("#progressText"),
  progressFill: document.querySelector("#progressFill"),
  progressTrack: document.querySelector("#progressTrack"),

  taskCountBadge: document.querySelector("#taskCountBadge"),
  visibleCount: document.querySelector("#visibleCount"),
  taskList: document.querySelector("#taskList"),

  searchInput: document.querySelector("#searchInput"),
  clearSearch: document.querySelector("#clearSearch"),
  filterTabs: document.querySelectorAll(".filter-tab")
};

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadTasks() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map(task => {
      if (!task || typeof task !== "object") return null;
      if (typeof task.id !== "string") task.id = createId();
      if (typeof task.text !== "string") return null;
      if (typeof task.completed !== "boolean") task.completed = false;
      if (typeof task.createdAt !== "string") task.createdAt = new Date().toISOString();
      return task;
    }).filter(Boolean);
  } catch {
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
  } catch {
    showFormMessage("Tasks could not be saved in this browser.", false);
  }
}

function formatHeaderDate(date = new Date()) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

function formatTaskDate(dateString) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function showFormMessage(message = "", success = false) {
  dom.formMessage.textContent = message;
  dom.formMessage.classList.toggle("is-success", Boolean(success));
}

function getVisibleTasks() {
  const normalizedQuery = state.query.trim().toLowerCase();

  return state.tasks
    .filter((task) => {
      if (state.filter === "active") {
        return !task.completed;
      }

      if (state.filter === "completed") {
        return task.completed;
      }

      return true;
    })
    .filter((task) => {
      if (!normalizedQuery) {
        return true;
      }

      return task.text.toLowerCase().includes(normalizedQuery);
    });
}

function getEmptyState() {
  const hasTasks = state.tasks.length > 0;

  const wrapper = document.createElement("div");
  wrapper.className = "empty-state";

  const illustration = document.createElement("div");
  illustration.className = "empty-illustration";

  const illustrationIcon = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );
  illustrationIcon.classList.add("icon");
  illustrationIcon.setAttribute("aria-hidden", "true");

  const use = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "use"
  );
  use.setAttribute("href", hasTasks ? "#icon-search" : "#icon-spark");

  illustrationIcon.append(use);
  illustration.append(illustrationIcon);

  const heading = document.createElement("h3");
  heading.textContent = hasTasks ? "No matching tasks" : "Your task list is clear";

  const message = document.createElement("p");
  message.textContent = hasTasks
    ? "Try another search or switch to a different filter."
    : "Add something meaningful to your day and it will appear here.";

  wrapper.append(illustration, heading, message);

  return wrapper;
}

function createIcon(symbolId) {
  const icon = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );

  icon.classList.add("icon");
  icon.setAttribute("aria-hidden", "true");

  const use = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "use"
  );
  use.setAttribute("href", symbolId);

  icon.append(use);

  return icon;
}

function createActionButton({
  label,
  iconId,
  className = "",
  action,
  taskId
}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `icon-button ${className}`.trim();
  button.dataset.action = action;
  button.dataset.id = taskId;
  button.append(createIcon(iconId));

  const labelSpan = document.createElement("span");
  labelSpan.textContent = label;
  button.append(labelSpan);

  return button;
}

function createTaskRow(task) {
  const row = document.createElement("article");
  row.className = "task-row";

  if (task.completed) {
    row.classList.add("is-completed");
  }

  if (task.id === state.newTaskId) {
    row.classList.add("is-new");
  }

  row.dataset.id = task.id;

  const checkbox = document.createElement("button");
  checkbox.type = "button";
  checkbox.className = "checkbox-button";
  checkbox.classList.toggle("is-checked", task.completed);
  checkbox.dataset.action = "toggle";
  checkbox.dataset.id = task.id;
  checkbox.setAttribute(
    "aria-label",
    task.completed ? `Mark "${task.text}" as active` : `Complete "${task.text}"`
  );
  checkbox.setAttribute("aria-pressed", String(task.completed));
  checkbox.append(createIcon("#icon-check"));

  const content = document.createElement("div");
  content.className = "task-content";

  if (state.editingId === task.id) {
    const editForm = document.createElement("form");
    editForm.className = "edit-form";
    editForm.dataset.action = "edit-form";
    editForm.dataset.id = task.id;

    const editInput = document.createElement("input");
    editInput.className = "edit-input";
    editInput.type = "text";
    editInput.maxLength = 180;
    editInput.value = task.text;
    editInput.setAttribute("aria-label", "Edit task title");

    const saveButton = createActionButton({
      label: "Save",
      iconId: "#icon-check",
      className: "save-button",
      action: "save-submit",
      taskId: task.id
    });
    saveButton.type = "submit";
    saveButton.removeAttribute("data-action");

    const cancelButton = createActionButton({
      label: "Cancel",
      iconId: "#icon-x",
      action: "cancel-edit",
      taskId: task.id
    });

    editForm.append(editInput, saveButton, cancelButton);
    content.append(editForm);

    requestAnimationFrame(() => {
      editInput.focus();
      editInput.select();
    });
  } else {
    const title = document.createElement("div");
    title.className = "task-title";
    title.textContent = task.text;

    const meta = document.createElement("div");
    meta.className = "task-meta";
    meta.textContent = `Created ${formatTaskDate(task.createdAt)}`;

    content.append(title, meta);
  }

  const actions = document.createElement("div");

  if (state.deletingId === task.id) {
    actions.className = "confirmation";

    const confirmationLabel = document.createElement("span");
    confirmationLabel.className = "confirmation-label";
    confirmationLabel.textContent = "Delete this task?";

    const cancelButton = createActionButton({
      label: "Cancel",
      iconId: "#icon-x",
      action: "cancel-delete",
      taskId: task.id
    });

    const deleteButton = createActionButton({
      label: "Delete",
      iconId: "#icon-trash",
      className: "danger",
      action: "confirm-delete",
      taskId: task.id
    });

    actions.append(confirmationLabel, cancelButton, deleteButton);
  } else if (state.editingId !== task.id) {
    actions.className = "task-actions";

    const editButton = createActionButton({
      label: "Edit",
      iconId: "#icon-edit",
      action: "edit",
      taskId: task.id
    });

    const deleteButton = createActionButton({
      label: "Delete",
      iconId: "#icon-trash",
      className: "danger",
      action: "delete",
      taskId: task.id
    });

    actions.append(editButton, deleteButton);
  }

  row.append(checkbox, content, actions);

  return row;
}

function renderTasks() {
  const visibleTasks = getVisibleTasks();

  dom.taskList.replaceChildren();

  if (visibleTasks.length === 0) {
    dom.taskList.append(getEmptyState());
  } else {
    const fragment = document.createDocumentFragment();

    visibleTasks.forEach((task) => {
      fragment.append(createTaskRow(task));
    });

    dom.taskList.append(fragment);
  }

  dom.visibleCount.textContent =
    `${visibleTasks.length} ${visibleTasks.length === 1 ? "shown" : "shown"}`;

  dom.clearSearch.hidden = state.query.length === 0;
}

function renderStats() {
  const total = state.tasks.length;
  const completed = state.tasks.filter((task) => task.completed).length;
  const pending = total - completed;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  dom.totalCount.textContent = String(total);
  dom.pendingCount.textContent = String(pending);
  dom.completedCount.textContent = String(completed);
  dom.taskCountBadge.textContent = String(total);
  dom.progressText.textContent = `${percentage}% Complete`;
  dom.progressFill.style.width = `${percentage}%`;
  dom.progressTrack.setAttribute("aria-valuenow", String(percentage));
}

function renderFilters() {
  dom.filterTabs.forEach((tab) => {
    const isActive = tab.dataset.filter === state.filter;

    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });
}

function render() {
  renderStats();
  renderFilters();
  renderTasks();
}

function addTask(text) {
  const normalizedText = text.trim();

  if (!normalizedText) {
    showFormMessage("Write a task before adding it.");
    dom.taskInput.focus();
    return;
  }

  const task = {
    id: createId(),
    text: normalizedText,
    completed: false,
    createdAt: new Date().toISOString()
  };

  state.tasks.unshift(task);
  state.newTaskId = task.id;

  saveTasks();
  render();

  dom.taskInput.value = "";
  dom.taskInput.focus();
  showFormMessage("Task added.", true);

  window.setTimeout(() => {
    if (state.newTaskId === task.id) {
      state.newTaskId = null;
    }
  }, 450);
}

function toggleTask(taskId) {
  const task = state.tasks.find((item) => item.id === taskId);

  if (!task) {
    return;
  }

  task.completed = !task.completed;
  state.editingId = null;
  state.deletingId = null;

  saveTasks();
  render();
}

function beginEdit(taskId) {
  state.editingId = taskId;
  state.deletingId = null;
  render();
}

function saveEdit(taskId, text) {
  const normalizedText = text.trim();

  if (!normalizedText) {
    return false;
  }

  const task = state.tasks.find((item) => item.id === taskId);

  if (!task) {
    return false;
  }

  task.text = normalizedText;
  state.editingId = null;

  saveTasks();
  render();

  return true;
}

function cancelEdit() {
  state.editingId = null;
  render();
}

function beginDelete(taskId) {
  state.deletingId = taskId;
  state.editingId = null;
  render();
}

function cancelDelete() {
  state.deletingId = null;
  render();
}

function deleteTask(taskId) {
  const row = dom.taskList.querySelector(`[data-id="${CSS.escape(taskId)}"]`);

  if (row) {
    row.classList.add("is-removing");
  }

  window.setTimeout(() => {
    state.tasks = state.tasks.filter((task) => task.id !== taskId);
    state.deletingId = null;

    saveTasks();
    render();
  }, 240);
}

function handleTaskListClick(event) {
  const actionButton = event.target.closest("[data-action]");

  if (!actionButton) {
    return;
  }

  const action = actionButton.dataset.action;
  const taskId = actionButton.dataset.id;

  if (action === "toggle") {
    toggleTask(taskId);
    return;
  }

  if (action === "edit") {
    beginEdit(taskId);
    return;
  }

  if (action === "cancel-edit") {
    cancelEdit();
    return;
  }



  if (action === "delete") {
    beginDelete(taskId);
    return;
  }

  if (action === "cancel-delete") {
    cancelDelete();
    return;
  }

  if (action === "confirm-delete") {
    deleteTask(taskId);
  }
}

function handleTaskListKeydown(event) {
  const editInput = event.target.closest(".edit-input");

  if (!editInput) {
    return;
  }

  const taskId = editInput.closest("[data-id]")?.dataset.id;

  if (!taskId) {
    return;
  }



  if (event.key === "Escape") {
    event.preventDefault();
    cancelEdit();
  }
}

function handleGlobalKeydown(event) {
  if (event.key !== "Escape") {
    return;
  }

  if (state.editingId !== null) {
    cancelEdit();
    return;
  }

  if (state.deletingId !== null) {
    cancelDelete();
  }
}

function initializeDate() {
  const now = new Date();

  dom.currentDate.textContent = formatHeaderDate(now);
  dom.currentDate.dateTime = now.toISOString();
  dom.footerYear.textContent = `© ${now.getFullYear()}`;
}

function initializeEventListeners() {
  const brandLogo = document.querySelector(".brand");
  if (brandLogo) {
    brandLogo.addEventListener("click", (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  const headingOrb = document.querySelector(".heading-orb");
  if (headingOrb) {
    headingOrb.addEventListener("click", () => {
      dom.taskInput.focus();
      dom.taskInput.select();
    });
  }

  dom.taskList.addEventListener("submit", (event) => {
    const editForm = event.target.closest(".edit-form");
    if (editForm) {
      event.preventDefault();
      const taskId = editForm.dataset.id;
      const input = editForm.querySelector(".edit-input");
      if (!saveEdit(taskId, input?.value || "")) {
        input?.focus();
        input?.classList.add("input-error");
      }
    }
  });

  dom.taskForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addTask(dom.taskInput.value);
  });

  dom.taskInput.addEventListener("input", () => {
    if (dom.formMessage.textContent) {
      showFormMessage("");
    }
  });

  dom.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value;
    renderTasks();
  });

  dom.clearSearch.addEventListener("click", () => {
    state.query = "";
    dom.searchInput.value = "";
    renderTasks();
    dom.searchInput.focus();
  });

  dom.filterTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      state.filter = tab.dataset.filter;
      render();
    });
  });

  dom.taskList.addEventListener("click", handleTaskListClick);
  dom.taskList.addEventListener("keydown", handleTaskListKeydown);
  document.addEventListener("keydown", handleGlobalKeydown);
}

function initialize() {
  state.tasks = loadTasks();
  initializeDate();
  initializeEventListeners();
  render();
}

initialize();