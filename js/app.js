import { books as seedBooks, site } from "./content.js";
import { apiUrl } from "./config.js";
import { aboutView, bookDetailView, booksView, contactView, homeView, newsletterView, notFoundView } from "./views.js";

const main = document.querySelector("main");
const nav = document.querySelector(".site-nav");
const menuButton = document.querySelector(".menu-toggle");
let books = seedBooks;
const pageMetadata = {
  "/": ["Deborah Fowler — Mystery Novels", "Discover the books of Deborah Fowler."],
  "/about": ["About Deborah Fowler", "Learn more about mystery author Deborah Fowler."],
  "/books": ["Books by Deborah Fowler", "Browse Deborah Fowler’s mystery novels."],
  "/newsletter": ["Newsletter — Deborah Fowler", "Receive occasional book news from Deborah Fowler."],
  "/contact": ["Contact Deborah Fowler", "Get in touch with Deborah Fowler."],
};

function normalisePath(pathname = window.location.pathname) { const path = pathname.replace(/\/+$/, "") || "/"; return path === "/index.html" ? "/" : path; }
async function loadBooks() {
  const endpoint = apiUrl("/api/books");
  if (!endpoint) return seedBooks;
  try {
    const response = await fetch(endpoint, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("Catalogue request was not successful");
    const data = await response.json();
    return Array.isArray(data) && data.length ? data : seedBooks;
  } catch {
    // The static seed keeps the preview usable if the backend is unavailable.
    return seedBooks;
  }
}
async function loadAuthor() {
  const endpoint = apiUrl("/api/author");
  if (!endpoint) return;
  try {
    const response = await fetch(endpoint, { headers: { Accept: "application/json" } });
    if (!response.ok) return;
    const author = await response.json();
    site.author = {
      name: author.name,
      photoUrl: author.photoUrl || site.author.photoUrl,
      photoAlt: author.photoAlt || `Portrait of ${author.name}`,
      biography: author.biography.split(/\n\s*\n/).filter(Boolean),
    };
  } catch {
    // Keep the approved static content if the author profile cannot be loaded.
  }
}
function setMetadata(path, book) { const [title, description] = book ? [`${book.title} — Deborah Fowler`, book.description] : (pageMetadata[path] || ["Page not found — Deborah Fowler", "Deborah Fowler mystery novels."]); document.title = title; document.querySelector('meta[name="description"]').setAttribute("content", description); document.querySelector('meta[property="og:title"]').setAttribute("content", title); document.querySelector('meta[property="og:description"]').setAttribute("content", description); }
function closeMenu() { nav.classList.remove("open"); menuButton.setAttribute("aria-expanded", "false"); }
function render() {
  const path = normalisePath();
  const bookMatch = path.match(/^\/books\/([^/]+)$/);
  const book = bookMatch ? books.find((item) => item.slug === decodeURIComponent(bookMatch[1])) : null;
  const routes = { "/": () => homeView(books), "/about": aboutView, "/books": () => booksView(books), "/newsletter": newsletterView, "/contact": contactView };
  main.innerHTML = bookMatch ? bookDetailView(book) : (routes[path] ? routes[path]() : notFoundView());
  setMetadata(path, book); document.querySelectorAll(".site-nav a").forEach((link) => link.classList.toggle("active", normalisePath(link.pathname) === path)); closeMenu(); bindForms(); main.focus();
}
function navigate(path) { window.history.pushState({}, "", path); render(); }
function setFormState(form, type, text = "") { const message = form.querySelector(".form-message"); const button = form.querySelector('button[type="submit"]'); form.dataset.state = type; message.textContent = text; button.disabled = type === "loading"; if (type === "loading") button.dataset.originalLabel = button.textContent; button.textContent = type === "loading" ? "Sending…" : (button.dataset.originalLabel || button.textContent); }
function validateForm(form) { const invalid = [...form.elements].find((element) => element.willValidate && !element.validity.valid); if (!invalid) return true; invalid.focus(); setFormState(form, "error", invalid.name === "email" ? "Please enter a valid email address." : `Please complete the ${invalid.name} field.`); return false; }
async function submitForm(event) {
  event.preventDefault(); const form = event.currentTarget; if (!validateForm(form)) return; setFormState(form, "loading");
  const endpoint = apiUrl(form.dataset.endpoint);
  if (!endpoint) { setFormState(form, "error", "This form is not connected yet. Please try again once the website service is live."); return; }
  try {
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
    if (!response.ok) throw new Error("Request rejected");
    setFormState(form, "success", form.classList.contains("newsletter-form") ? "Thank you. Please check your email to confirm your subscription." : "Thank you. Your message has been sent."); form.reset();
  } catch { setFormState(form, "error", "This form is not connected yet. Please try again once the website service is live."); }
}
function bindForms() { document.querySelectorAll("main form").forEach((form) => form.addEventListener("submit", submitForm)); }
document.addEventListener("click", (event) => { const link = event.target.closest("a[data-route]"); if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); navigate(link.pathname); });
menuButton.addEventListener("click", () => { const isOpen = nav.classList.toggle("open"); menuButton.setAttribute("aria-expanded", String(isOpen)); });
window.addEventListener("popstate", render);
document.querySelector("#year").textContent = new Date().getFullYear();
document.querySelector(".footer-form").addEventListener("submit", submitForm);
await Promise.all([loadBooks().then((loadedBooks) => { books = loadedBooks; }), loadAuthor()]);
render();
