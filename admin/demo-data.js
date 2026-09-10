import { books, site } from "/js/content.js";

// Demo-only data. Authentication and /api/admin/* integration belong in FastAPI.
export const adminData = {
  books,
  author: site.author,
  newsletters: [
    { id: "demo-new-book", subject: "My new book", previewText: "A little news from Deborah", content: "Hello,\n\nI wanted to share a little news about my latest book.\n\nWith best wishes,\nDeborah", lastEdited: "Today", isDemo: true },
    { id: "demo-summer-update", subject: "Summer update", previewText: "Books, reading and a summer note", content: "Hello,\n\nA short summer note for readers will go here.\n\nWith best wishes,\nDeborah", lastEdited: "4 days ago", isDemo: true },
  ],
};
