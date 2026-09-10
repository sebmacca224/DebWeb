import { adminData } from "./demo-data.js";
import { apiUrl } from "/js/config.js";

const root = document.querySelector("#admin-main");
const navigation = document.querySelector(".admin-nav");
const deleteDialog = document.querySelector("#delete-dialog");
const newsletterSendDialog = document.querySelector("#newsletter-send-dialog");
let isDirty = false;
let pendingDelete = null;
let isAuthenticated = false;
let adminEmail = "";

const cleanPath = (path = location.pathname) => (path.replace(/\/+$/, "") || "/admin").replace("/admin/index.html", "/admin");
const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
const route = (path, label, classes = "") => `<a href="${path}" data-admin-route class="${classes}">${label}</a>`;
const adminStatus = (id) => `<p id="${id}" class="admin-status" role="status" aria-live="polite"></p>`;

async function apiRequest(path, options = {}) {
  const endpoint = apiUrl(path);
  if (!endpoint) throw new Error("The website API is not configured.");
  const response = await fetch(endpoint, { credentials: "include", ...options });
  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.detail || "The request could not be completed.");
  return payload;
}

function loginView(message = "") {
  return `<section class="admin-page admin-login"><p class="eyebrow">Private area</p><h1>Sign in</h1><p>Sign in with Deborah’s authorised website account to manage books and newsletters.</p><form class="admin-form" data-form="login" novalidate>${field("Email address", "email", "", { type: "email", required: true })}${field("Password", "password", "", { type: "password", required: true })}<div class="admin-form-actions"><button class="admin-button" type="submit">Sign in</button></div>${adminStatus("login-status")}</form>${message ? `<p class="admin-status" data-type="error">${escapeHtml(message)}</p>` : ""}</section>`;
}

function bookRow(book) {
  const publication = book.publicationDate || "Not added";
  return `<article class="admin-book-row" data-book-id="${escapeHtml(book.id)}"><div class="admin-cover"><img src="${escapeHtml(book.coverUrl)}" alt="${escapeHtml(book.coverAlt)}" /></div><div><h3>${escapeHtml(book.title)}</h3><p>${escapeHtml(book.genre)}</p></div><p class="admin-row-date">${escapeHtml(publication)}</p><p class="admin-row-feature">${book.featured ? "Featured" : "—"}</p><div class="admin-row-actions"><button class="admin-text-button" data-action="edit-book" data-book-id="${escapeHtml(book.id)}">Edit</button><button class="admin-text-button admin-delete-link" data-action="delete-book" data-book-id="${escapeHtml(book.id)}">Delete</button></div></article>`;
}

function dashboardView() {
  const featured = adminData.books.filter((book) => book.featured).length;
  return `<section class="admin-page"><p class="eyebrow">Private admin</p><h1>Welcome</h1><p class="admin-intro">Signed in as ${escapeHtml(adminEmail)}. This area is visible only after server-side account verification.</p><div class="admin-stat-row"><div><strong>${adminData.books.length}</strong><span>Demo catalogue books</span></div><div><strong>${adminData.newsletters.length}</strong><span>Demo newsletter drafts</span></div><div><strong>${featured}</strong><span>Featured books</span></div></div><div class="admin-action-grid"><article><p class="eyebrow">Books</p><h2>Manage the catalogue</h2><p>Add books, revise descriptions, replace covers and choose a featured title.</p>${route("/admin/books", "Manage books", "admin-button")}</article><article><p class="eyebrow">Newsletter</p><h2>Write to readers</h2><p>Create a draft, check its preview, and prepare it for the newsletter provider.</p>${route("/admin/newsletter", "Write newsletter", "admin-button")}</article><article><p class="eyebrow">Website</p><h2>Author information</h2><p>Update Deborah’s name, biography and portrait when the backend is ready.</p>${route("/admin/website", "Edit website", "admin-button")}</article></div></section>`;
}

function booksView() { return `<section class="admin-page"><div class="admin-page-heading"><div><p class="eyebrow">Catalogue</p><h1>Books</h1><p>${adminData.books.length} demo entries from the shared public catalogue.</p></div>${route("/admin/books/new", "+ Add book", "admin-button")}</div><div class="admin-book-list"><div class="admin-book-list-head"><span>Cover</span><span>Title</span><span>Published</span><span>Featured</span><span>Actions</span></div>${adminData.books.map(bookRow).join("")}</div></section>`; }

function field(label, name, value = "", options = {}) { const { type = "text", required = false, hint = "" } = options; return `<label class="admin-field">${label}${required ? " <span aria-hidden=\"true\">*</span>" : ""}<input type="${type}" name="${name}" value="${escapeHtml(value || "")}" ${required ? "required" : ""} />${hint ? `<small>${hint}</small>` : ""}</label>`; }
function bookFormView(book) {
  const editing = Boolean(book);
  const value = book || { title: "", subtitle: "", description: "", publicationDate: "", genre: "", isbn: "", purchaseLinks: [], featured: false, coverUrl: "/assets/book-placeholder.svg", coverAlt: "Book cover preview" };
  const links = Object.fromEntries(value.purchaseLinks.map((link) => [link.label.toLowerCase(), link.url]));
  return `<section class="admin-page"><div class="admin-page-heading"><div><p class="eyebrow">Catalogue</p><h1>${editing ? "Edit book" : "Add new book"}</h1><p>${editing ? "This form is populated from demo catalogue data." : "Enter the details that will eventually be sent to FastAPI."}</p></div></div><form class="admin-form" data-form="book" novalidate><div class="admin-form-grid">${field("Book title", "title", value.title, { required: true })}${field("Subtitle", "subtitle", value.subtitle)}${field("Publication date", "publicationDate", value.publicationDate, { type: "date" })}${field("Genre", "genre", value.genre)}${field("ISBN", "isbn", value.isbn)}</div><label class="admin-field admin-field-wide">Description<textarea name="description" rows="6">${escapeHtml(value.description)}</textarea></label><div class="admin-image-field"><div class="admin-image-preview"><img src="${escapeHtml(value.coverUrl)}" alt="${escapeHtml(value.coverAlt)}" data-image-preview /></div><label class="admin-field">Cover image<input type="file" name="cover" accept="image/png,image/jpeg,image/webp" data-image-input /><small>Image preview only. Uploading will be connected to Supabase Storage later.</small></label></div><fieldset class="admin-purchase-links"><legend>Purchase links <span>Optional</span></legend><div class="admin-form-grid">${field("Amazon", "amazon", links.amazon)}${field("Bookshop", "bookshop", links.bookshop)}${field("Other", "other", links.other)}</div></fieldset><label class="admin-check"><input type="checkbox" name="featured" ${value.featured ? "checked" : ""} /> Feature this book</label><div class="admin-form-actions">${route("/admin/books", "Cancel", "admin-button admin-button-secondary")}<button class="admin-button" type="submit">${editing ? "Save changes" : "Save book"}</button></div>${adminStatus("book-status")}</form></section>`;
}

function newsletterListView() { return `<section class="admin-page"><div class="admin-page-heading"><div><p class="eyebrow">Newsletter</p><h1>Newsletter drafts</h1><p>These are clearly labelled development drafts. No emails have been sent.</p></div>${route("/admin/newsletter/new", "+ New newsletter", "admin-button")}</div><div class="newsletter-draft-list">${adminData.newsletters.map((item) => `<article><p class="eyebrow">Demo draft · last edited ${item.lastEdited}</p><h2>${escapeHtml(item.subject)}</h2><p>${escapeHtml(item.previewText)}</p>${route(`/admin/newsletter/${item.id}`, "Edit draft", "admin-text-button")}</article>`).join("")}</div></section>`; }
function newsletterEditorView(draft) {
  const value = draft || { subject: "", previewText: "", content: "" };
  return `<section class="admin-page"><div class="admin-page-heading"><div><p class="eyebrow">Newsletter</p><h1>${draft ? "Edit demo draft" : "New newsletter"}</h1><p>Draft saving and email delivery will be connected to the newsletter provider via FastAPI.</p></div></div><form class="admin-form" data-form="newsletter" novalidate>${field("Subject", "subject", value.subject, { required: true })}${field("Preview text", "previewText", value.previewText)}<label class="admin-field admin-field-wide">Newsletter content <textarea name="content" rows="12" required>${escapeHtml(value.content)}</textarea></label><div class="admin-form-actions">${route("/admin/newsletter", "Cancel", "admin-button admin-button-secondary")}<button class="admin-button admin-button-secondary" type="button" data-action="preview-newsletter">Preview email</button><button class="admin-button admin-button-secondary" type="button" data-action="send-test-newsletter">Send test</button><button class="admin-button" type="submit">Save draft</button><button class="admin-button admin-button-disabled" type="button" data-action="send-newsletter">Send newsletter</button></div>${adminStatus("newsletter-status")}<section class="newsletter-preview" hidden aria-live="polite"><p class="eyebrow">Email preview</p><div><p class="wordmark">Deborah <em>Fowler</em></p><h2 data-preview-subject></h2><p data-preview-content></p></div></section></form></section>`;
}

function websiteView() { const author = adminData.author; return `<section class="admin-page"><div class="admin-page-heading"><div><p class="eyebrow">Website</p><h1>Author information</h1><p>These shared values will update the public About and Home pages once FastAPI is connected.</p></div></div><form class="admin-form" data-form="website" novalidate>${field("Author name", "authorName", author.name, { required: true })}<label class="admin-field admin-field-wide">Biography<textarea name="biography" rows="10" required>${escapeHtml(author.biography.join("\n\n"))}</textarea></label><div class="admin-image-field"><div class="admin-image-preview admin-author-preview"><img src="${escapeHtml(author.photoUrl)}" alt="${escapeHtml(author.photoAlt)}" data-image-preview /></div><label class="admin-field">Author image<input type="file" name="authorImage" accept="image/png,image/jpeg,image/webp" data-image-input /><small>Preview only. FastAPI will later upload the image to Supabase Storage.</small></label></div><div class="admin-form-actions"><button class="admin-button" type="submit">Save changes</button></div>${adminStatus("website-status")}</form></section>`; }
function notFoundView() { return `<section class="admin-page"><p class="eyebrow">Admin</p><h1>Page not found</h1>${route("/admin", "Return to dashboard", "admin-button")}</section>`; }

function render() {
  if (!isAuthenticated) {
    root.innerHTML = loginView();
    bindLoginForm();
    root.focus();
    return;
  }
  const path = cleanPath();
  const bookEdit = path.match(/^\/admin\/books\/([^/]+)$/);
  const draftEdit = path.match(/^\/admin\/newsletter\/([^/]+)$/);
  const book = bookEdit && bookEdit[1] !== "new" ? adminData.books.find((item) => item.id === decodeURIComponent(bookEdit[1])) : null;
  const draft = draftEdit && draftEdit[1] !== "new" ? adminData.newsletters.find((item) => item.id === decodeURIComponent(draftEdit[1])) : null;
  const pages = { "/admin": dashboardView, "/admin/books": booksView, "/admin/newsletter": newsletterListView, "/admin/website": websiteView };
  root.innerHTML = bookEdit ? bookFormView(book) : draftEdit ? newsletterEditorView(draft) : (pages[path] ? pages[path]() : notFoundView());
  navigation.querySelectorAll("a").forEach((link) => link.classList.toggle("active", cleanPath(link.pathname) === path));
  bindPageInteractions(); root.focus();
}

function setAdminChrome() {
  document.body.classList.toggle("admin-authenticated", isAuthenticated);
  const note = document.querySelector("[data-admin-note]");
  const logout = document.querySelector('[data-action="logout"]');
  note.textContent = isAuthenticated ? `Signed in as ${adminEmail}` : "Private admin";
  logout.hidden = !isAuthenticated;
}

function bindLoginForm() {
  const form = root.querySelector('[data-form="login"]');
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector("button[type=submit]");
    button.disabled = true;
    button.textContent = "Signing in…";
    try {
      await apiRequest("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email.value.trim(), password: form.password.value }),
      });
      const session = await apiRequest("/api/admin/session");
      isAuthenticated = true;
      adminEmail = session.email;
      setAdminChrome();
      render();
    } catch (error) {
      setStatus("login-status", error.message, "error");
      button.disabled = false;
      button.textContent = "Sign in";
    }
  });
}

function routeTo(path) { if (isDirty && !window.confirm("You have unsaved changes. Leave this page without saving?")) return; isDirty = false; history.pushState({}, "", path); render(); }
function setStatus(id, message, type = "notice") { const status = document.querySelector(`#${id}`); status.textContent = message; status.dataset.type = type; }
function formChanged() { isDirty = true; }
function handleImagePreview(input) { const file = input.files[0]; const status = input.closest("form").querySelector(".admin-status"); if (!file) return; if (!file.type.startsWith("image/")) { input.value = ""; status.textContent = "Please choose a PNG, JPEG or WebP image."; status.dataset.type = "error"; return; } const preview = input.closest("form").querySelector("[data-image-preview]"); preview.src = URL.createObjectURL(file); preview.alt = `Preview of ${file.name}`; status.textContent = "Image preview ready. It has not been uploaded."; status.dataset.type = "notice"; formChanged(); }
function handleSave(form) { const required = [...form.querySelectorAll("[required]")].find((input) => !input.value.trim()); const statusId = `${form.dataset.form}-status`; if (required) { required.focus(); setStatus(statusId, "Please complete the required fields before saving.", "error"); return; } setStatus(statusId, "Saving is not connected yet. Your changes have not been stored.", "notice"); }
function previewNewsletter(form) { const preview = form.querySelector(".newsletter-preview"); preview.hidden = false; preview.querySelector("[data-preview-subject]").textContent = form.subject.value || "Newsletter subject"; preview.querySelector("[data-preview-content]").textContent = form.content.value || "Newsletter content will appear here."; }
function bindPageInteractions() {
  root.querySelectorAll("form").forEach((form) => { form.addEventListener("input", formChanged); form.addEventListener("submit", (event) => { event.preventDefault(); handleSave(form); }); });
  root.querySelectorAll("[data-image-input]").forEach((input) => input.addEventListener("change", () => handleImagePreview(input)));
}

document.addEventListener("click", (event) => {
  const link = event.target.closest("a[data-admin-route]"); if (link) { event.preventDefault(); routeTo(link.pathname); return; }
  const action = event.target.dataset.action;
  if (action === "logout") {
    apiRequest("/api/auth/logout", { method: "POST" }).catch(() => undefined).finally(() => {
      isAuthenticated = false; adminEmail = ""; setAdminChrome(); render();
    });
    return;
  }
  if (action === "edit-book") routeTo(`/admin/books/${event.target.dataset.bookId}`);
  if (action === "delete-book") { pendingDelete = adminData.books.find((book) => book.id === event.target.dataset.bookId); document.querySelector("#delete-title").textContent = `Delete “${pendingDelete.title}”?`; deleteDialog.showModal(); }
  if (action === "preview-newsletter") previewNewsletter(event.target.closest("form"));
  if (action === "send-test-newsletter") setStatus("newsletter-status", "Test email delivery is not connected yet. Connect the newsletter provider before sending.", "notice");
  if (action === "send-newsletter") newsletterSendDialog.showModal();
});
deleteDialog.addEventListener("close", () => { if (deleteDialog.returnValue === "confirm" && pendingDelete) { const status = document.querySelector(".admin-status"); if (status) { status.textContent = `“${pendingDelete.title}” was not deleted. Deletion will be enabled once the backend is connected.`; status.dataset.type = "notice"; } } pendingDelete = null; });
newsletterSendDialog.addEventListener("close", () => { if (newsletterSendDialog.returnValue === "confirm") setStatus("newsletter-status", "Newsletter delivery is not configured yet. Connect the newsletter provider before sending.", "notice"); });
window.addEventListener("popstate", render);
window.addEventListener("beforeunload", (event) => { if (isDirty) { event.preventDefault(); event.returnValue = ""; } });

async function start() {
  try {
    const session = await apiRequest("/api/admin/session");
    isAuthenticated = true;
    adminEmail = session.email;
  } catch (_) {
    isAuthenticated = false;
  }
  setAdminChrome();
  render();
}

start();
