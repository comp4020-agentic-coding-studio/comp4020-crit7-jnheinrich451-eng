// The routes the invariants run against. When you add a page, add its route
// here, or the invariants stop covering it. Course pages are one template,
// so a course per gate outcome covers the shapes it renders; /applications/1/
// is the demo request a fresh database is seeded with.
export const ROUTES = [
  "/",
  "/readme/",
  "/guide/",
  "/courses/COMP6466/",
  "/courses/COMP6242/",
  "/courses/COMP8620/",
  "/courses/COMP6120/",
  "/applications/",
  "/applications/1/",
  "/record/",
  "/plan/",
  "/login/",
  "/register/",
  "/verify/",
  "/catalogue/",
  "/catalogue/?kind=course&code=COMP6434&year=2027",
  "/catalogue/?kind=course&code=COMP8880&year=2027",
  "/catalogue/?kind=specialisation&code=ARTIF-SPEC&year=2027",
];
