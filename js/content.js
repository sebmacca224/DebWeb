/** Static seed data. FastAPI can later provide these fields via JSON or Jinja. */
export const site = {
  author: {
    name: "Deborah Fowler",
    photoUrl: "/assets/deborah-fowler.jpg",
    photoAlt: "Deborah Fowler smiling by the sea",
    biography: [
      "Here is room for Deborah’s own introduction: the books she writes, the places that influence her, and the route that brought her to storytelling.",
      "There is no need for a long curriculum vitae. The goal is to help readers feel they have met the person behind the books.",
    ],
  },
  api: { newsletterSubscribe: "/api/newsletter/subscribe", contact: "/api/contact" },
};

const placeholderBook = (number) => ({
  id: `placeholder-${number}`,
  slug: `book-${number}`,
  title: `Book ${number}`,
  description: "A description of this book will be added here.",
  coverUrl: "/assets/book-placeholder.svg",
  coverAlt: `Placeholder cover for Book ${number}`,
  publicationDate: null,
  genre: "Mystery novel",
  isbn: null,
  purchaseLinks: [],
  featured: false,
  extract: null,
  isPlaceholder: true,
});

export const books = [{
  id: "secrets-in-st-ives", slug: "secrets-in-st-ives", title: "Secrets in St Ives",
  description: "A description of Secrets in St Ives will be added here.",
  coverUrl: "/assets/secrets-in-st-ives.jpg", coverAlt: "Cover of Secrets in St Ives by Deborah Fowler",
  publicationDate: null, genre: "Mystery novel", isbn: null, purchaseLinks: [], featured: true,
  extract: "A short approved sample from this book can appear here—only a few paragraphs, enough to draw a reader in without giving away the story.",
  isPlaceholder: false,
}, ...Array.from({ length: 14 }, (_, index) => placeholderBook(index + 2))];
