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
  if (!response.ok) { const detail = Array.isArray(payload?.detail) ? payload.detail[0]?.msg : payload?.detail; const error = new Error(detail || "The request could not be completed."); error.status = response.status; throw error; }
  return payload;
}

async function loadAdminData() {
  const [books, newsletters, author] = await Promise.all([
    apiRequest("/api/admin/books"),
    apiRequest("/api/admin/newsletters"),
    apiRequest("/api/admin/author"),
  ]);
  adminData.books = books;
  adminData.newsletters = newsletters;
  if (author) adminData.author = author;
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
  return `<section class="admin-page"><p class="eyebrow">Private admin</p><h1>Welcome</h1><p class="admin-intro">Signed in as ${escapeHtml(adminEmail)}. Changes made here are stored securely and update the public website.</p><div class="admin-stat-row"><div><strong>${adminData.books.length}</strong><span>Catalogue books</span></div><div><strong>${adminData.newsletters.length}</strong><span>Newsletter drafts</span></div><div><strong>${featured}</strong><span>Featured books</span></div></div><div class="admin-action-grid"><article><p class="eyebrow">Books</p><h2>Manage the catalogue</h2><p>Add books, revise descriptions, replace covers and choose a featured title.</p>${route("/admin/books", "Manage books", "admin-button")}</article><article><p class="eyebrow">Newsletter</p><h2>Write to readers</h2><p>Create a draft, check its preview, and send it through Brevo.</p>${route("/admin/newsletter", "Write newsletter", "admin-button")}</article><article><p class="eyebrow">Website</p><h2>Author information</h2><p>Update Deborah’s name, biography and portrait.</p>${route("/admin/website", "Edit website", "admin-button")}</article></div></section>`;
}

function booksView() { return `<section class="admin-page"><div class="admin-page-heading"><div><p class="eyebrow">Catalogue</p><h1>Books</h1><p>${adminData.books.length} saved ${adminData.books.length === 1 ? "book" : "books"}.</p></div>${route("/admin/books/new", "+ Add book", "admin-button")}</div><div class="admin-book-list"><div class="admin-book-list-head"><span>Cover</span><span>Title</span><span>Published</span><span>Featured</span><span>Actions</span></div>${adminData.books.length ? adminData.books.map(bookRow).join("") : "<p>No books have been saved yet. Choose Add book to begin.</p>"}</div>${adminStatus("books-status")}</section>`; }

function field(label, name, value = "", options = {}) { const { type = "text", required = false, hint = "" } = options; return `<label class="admin-field">${label}${required ? " <span aria-hidden=\"true\">*</span>" : ""}<input type="${type}" name="${name}" value="${escapeHtml(value || "")}" ${required ? "required" : ""} />${hint ? `<small>${hint}</small>` : ""}</label>`; }
function bookFormView(book) {
  const editing = Boolean(book);
  const value = book || { title: "", subtitle: "", description: "", publicationDate: "", genre: "", isbn: "", purchaseLinks: [], featured: false, coverUrl: "/assets/book-placeholder.svg", coverAlt: "Book cover preview" };
  const links = Object.fromEntries(value.purchaseLinks.map((link) => [link.label.toLowerCase(), link.url]));
  return `<section class="admin-page">
    <div class="admin-page-heading"><div><p class="eyebrow">Catalogue</p><h1>${editing ? "Edit book" : "Add new book"}</h1><p>${editing ? "Update this book’s public information." : "Enter the book information below. Only the title is required."}</p></div></div>
    <form class="admin-form" data-form="book" data-record-id="${escapeHtml(value.id || "")}" data-cover-url="${escapeHtml(value.coverUrl)}" novalidate>
      <div class="admin-form-grid">
        ${field("Book title", "title", value.title, { required: true })}
        ${field("Subtitle", "subtitle", value.subtitle)}
        ${field("Publication date", "publicationDate", value.publicationDate, { type: "date" })}
        ${field("Genre", "genre", value.genre)}
        ${field("ISBN", "isbn", value.isbn)}
      </div>
      <label class="admin-field admin-field-wide">Description<textarea name="description" rows="6">${escapeHtml(value.description)}</textarea></label>
      <label class="admin-field admin-field-wide">Short extract <span>Optional</span><textarea name="extract" rows="7">${escapeHtml(value.extract || "")}</textarea></label>
      <div class="admin-image-field">
        <div class="admin-image-preview"><img src="${escapeHtml(value.coverUrl)}" alt="${escapeHtml(value.coverAlt)}" data-image-preview /></div>
        <label class="admin-field">Cover image<input type="file" name="cover" accept="image/png,image/jpeg,image/webp" data-image-input /><small>JPEG, PNG or WebP, up to 8 MB. It uploads when you save.</small></label>
      </div>
      <fieldset class="admin-purchase-links"><legend>Purchase links <span>Optional</span></legend><div class="admin-form-grid">
        ${field("Amazon", "amazon", links.amazon, { type: "url" })}
        ${field("Bookshop", "bookshop", links.bookshop, { type: "url" })}
        ${field("Publisher’s page", "publisher", links["publisher’s page"] || links.publisher, { type: "url" })}
      </div></fieldset>
      <label class="admin-check"><input type="checkbox" name="featured" ${value.featured ? "checked" : ""} /> Feature this book</label>
      <div class="admin-form-actions">${route("/admin/books", "Cancel", "admin-button admin-button-secondary")}<button class="admin-button" type="submit">${editing ? "Save changes" : "Save book"}</button></div>
      ${adminStatus("book-status")}
    </form>
  </section>`;
}

function newsletterListView() { return `<section class="admin-page"><div class="admin-page-heading"><div><p class="eyebrow">Newsletter</p><h1>Newsletter drafts</h1><p>Drafts are private. A newsletter is emailed only after the final confirmation.</p></div>${route("/admin/newsletter/new", "+ New newsletter", "admin-button")}</div><div class="newsletter-draft-list">${adminData.newsletters.length ? adminData.newsletters.map((item) => `<article><p class="eyebrow">${escapeHtml(item.status || "draft")}</p><h2>${escapeHtml(item.subject)}</h2><p>${escapeHtml(item.previewText || "No preview text")}</p>${route(`/admin/newsletter/${item.id}`, "Edit draft", "admin-text-button")}</article>`).join("") : "<p>No drafts have been saved yet.</p>"}</div></section>`; }
function newsletterEditorView(draft) {
  const value = draft || { subject: "", previewText: "", content: "" };
  return `<section class="admin-page"><div class="admin-page-heading"><div><p class="eyebrow">Newsletter</p><h1>${draft ? "Edit draft" : "New newsletter"}</h1><p>Save and preview before sending. Sending to all subscribers always asks for confirmation.</p></div></div><form class="admin-form" data-form="newsletter" data-record-id="${escapeHtml(value.id || "")}" novalidate>${field("Subject", "subject", value.subject, { required: true })}${field("Preview text", "previewText", value.previewText)}<label class="admin-field admin-field-wide">Newsletter content <textarea name="content" rows="12" required>${escapeHtml(value.content)}</textarea></label>${field("Test email address", "testEmail", adminEmail, { type: "email", hint: "Used only when you choose Send test." })}<div class="admin-form-actions">${route("/admin/newsletter", "Cancel", "admin-button admin-button-secondary")}<button class="admin-button admin-button-secondary" type="button" data-action="preview-newsletter">Preview email</button><button class="admin-button admin-button-secondary" type="button" data-action="send-test-newsletter">Send test</button><button class="admin-button" type="submit">Save draft</button><button class="admin-button admin-button-danger" type="button" data-action="send-newsletter">Send newsletter</button></div>${adminStatus("newsletter-status")}<section class="newsletter-preview" hidden aria-live="polite"><p class="eyebrow">Email preview</p><div><p class="wordmark">Deborah <em>Fowler</em></p><h2 data-preview-subject></h2><p data-preview-content></p></div></section></form></section>`;
}

function websiteView() { const author = adminData.author; const biography = Array.isArray(author.biography) ? author.biography.join("\n\n") : author.biography; return `<section class="admin-page"><div class="admin-page-heading"><div><p class="eyebrow">Website</p><h1>Author information</h1><p>Save changes here to update the stored author profile.</p></div></div><form class="admin-form" data-form="website" data-photo-url="${escapeHtml(author.photoUrl || "/assets/deborah-fowler.jpg")}" novalidate>${field("Author name", "authorName", author.name, { required: true })}<label class="admin-field admin-field-wide">Biography<textarea name="biography" rows="10" required>${escapeHtml(biography)}</textarea></label><div class="admin-image-field"><div class="admin-image-preview admin-author-preview"><img src="${escapeHtml(author.photoUrl || "/assets/deborah-fowler.jpg")}" alt="${escapeHtml(author.photoAlt || "Deborah Fowler")}" data-image-preview /></div><label class="admin-field">Author image<input type="file" name="authorImage" accept="image/png,image/jpeg,image/webp" data-image-input /><small>JPEG, PNG or WebP, up to 8 MB. It uploads when you save.</small></label></div><div class="admin-form-actions"><button class="admin-button" type="submit">Save changes</button></div>${adminStatus("website-status")}</form></section>`; }
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
      await loadAdminData();
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
async function uploadSelectedImage(input) { if (!input?.files[0]) return null; const body = new FormData(); body.append("image", input.files[0]); return (await apiRequest("/api/admin/images", { method: "POST", body })).url; }
function purchaseLinks(form) { return [["Amazon", form.amazon.value], ["Bookshop", form.bookshop.value], ["Publisher’s page", form.publisher.value]].filter(([, url]) => url.trim()).map(([label, url]) => ({ label, url: url.trim() })); }
async function handleSave(form) {
  const required = [...form.querySelectorAll("[required]")].find((input) => !input.value.trim()); const statusId = `${form.dataset.form}-status`;
  if (required) { required.focus(); setStatus(statusId, "Please complete the required fields before saving.", "error"); return; }
  const button = form.querySelector('button[type="submit"]'); button.disabled = true; button.textContent = "Saving…";
  try {
    if (form.dataset.form === "book") {
      const uploaded = await uploadSelectedImage(form.cover); const id = form.dataset.recordId;
      const payload = { title: form.title.value.trim(), subtitle: form.subtitle.value.trim() || null, description: form.description.value.trim(), coverUrl: uploaded || form.dataset.coverUrl, coverAlt: `Cover of ${form.title.value.trim()}`, publicationDate: form.publicationDate.value || null, genre: form.genre.value.trim() || null, isbn: form.isbn.value.trim() || null, purchaseLinks: purchaseLinks(form), featured: form.featured.checked, extract: form.extract.value.trim() || null };
      const saved = await apiRequest(id ? `/api/admin/books/${encodeURIComponent(id)}` : "/api/admin/books", { method: id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const index = adminData.books.findIndex((book) => book.id === saved.id); if (index >= 0) adminData.books[index] = saved; else adminData.books.push(saved); form.dataset.recordId = saved.id; form.dataset.coverUrl = saved.coverUrl; history.replaceState({}, "", `/admin/books/${saved.id}`);
    } else if (form.dataset.form === "newsletter") {
      const id = form.dataset.recordId; const payload = { subject: form.subject.value.trim(), previewText: form.previewText.value.trim() || null, content: form.content.value.trim() };
      const saved = await apiRequest(id ? `/api/admin/newsletters/${encodeURIComponent(id)}` : "/api/admin/newsletters", { method: id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const index = adminData.newsletters.findIndex((draft) => draft.id === saved.id); if (index >= 0) adminData.newsletters[index] = saved; else adminData.newsletters.push(saved); form.dataset.recordId = saved.id; history.replaceState({}, "", `/admin/newsletter/${saved.id}`);
    } else if (form.dataset.form === "website") {
      const uploaded = await uploadSelectedImage(form.authorImage); const saved = await apiRequest("/api/admin/author", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.authorName.value.trim(), biography: form.biography.value.trim(), photoUrl: uploaded || form.dataset.photoUrl, photoAlt: `Portrait of ${form.authorName.value.trim()}` }) }); adminData.author = saved; form.dataset.photoUrl = saved.photoUrl;
    }
    isDirty = false; setStatus(statusId, "Changes saved.", "notice");
  } catch (error) { setStatus(statusId, error.message, "error"); }
  finally { button.disabled = false; button.textContent = form.dataset.form === "newsletter" ? "Save draft" : (form.dataset.recordId ? "Save changes" : "Save book"); }
}
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
  if (action === "send-test-newsletter") { const form = event.target.closest("form"); const id = form.dataset.recordId; if (!id || isDirty) setStatus("newsletter-status", "Save the latest version of this draft before sending a test.", "error"); else if (!form.testEmail.value.trim() || !form.testEmail.validity.valid) setStatus("newsletter-status", "Enter a valid test email address.", "error"); else apiRequest(`/api/admin/newsletters/${encodeURIComponent(id)}/test`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.testEmail.value.trim() }) }).then(() => setStatus("newsletter-status", "Test email sent.", "notice")).catch((error) => setStatus("newsletter-status", error.message, "error")); }
  if (action === "send-newsletter") { const form = event.target.closest("form"); if (!form.dataset.recordId || isDirty) { setStatus("newsletter-status", "Save the latest version of this draft before sending.", "error"); return; } newsletterSendDialog.dataset.draftId = form.dataset.recordId; newsletterSendDialog.showModal(); }
});
deleteDialog.addEventListener("close", async () => { if (deleteDialog.returnValue === "confirm" && pendingDelete) { try { await apiRequest(`/api/admin/books/${encodeURIComponent(pendingDelete.id)}`, { method: "DELETE" }); adminData.books = adminData.books.filter((book) => book.id !== pendingDelete.id); render(); setStatus("books-status", `“${pendingDelete.title}” was deleted.`, "notice"); } catch (error) { setStatus("books-status", error.message, "error"); } } pendingDelete = null; });
newsletterSendDialog.addEventListener("close", async () => { if (newsletterSendDialog.returnValue === "confirm") { const id = newsletterSendDialog.dataset.draftId; try { await apiRequest(`/api/admin/newsletters/${encodeURIComponent(id)}/send`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmation: "SEND" }) }); setStatus("newsletter-status", "Newsletter sent to the Brevo subscriber list.", "notice"); } catch (error) { setStatus("newsletter-status", error.message, "error"); } } });
window.addEventListener("popstate", render);
window.addEventListener("beforeunload", (event) => { if (isDirty) { event.preventDefault(); event.returnValue = ""; } });

async function start() {
  try {
    const session = await apiRequest("/api/admin/session");
    isAuthenticated = true;
    adminEmail = session.email;
    await loadAdminData();
  } catch (_) {
    isAuthenticated = false;
  }
  setAdminChrome();
  render();
}

start();
