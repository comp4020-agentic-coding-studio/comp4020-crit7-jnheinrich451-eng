// The course catalogue: postgraduate courses from ANU Programs & Courses
// (search: postgraduate, COMP), transcribed by hand from John's screenshots
// of the listing. Code, title, offering terms and units only — requisites
// live in ./requisites.ts, and only for the courses we've verified.
// An empty `terms` means the listing showed no offering.

export type Term = "Summer" | "S1" | "Autumn" | "Winter" | "S2" | "Spring";

export interface CatalogueCourse {
  code: string;
  title: string;
  terms: Term[];
  units: number;
}

export const COURSES: CatalogueCourse[] = [
  { code: "COMP6034", title: "Network Security", terms: ["S2"], units: 6 },
  { code: "COMP6120", title: "Software Engineering", terms: ["S2"], units: 6 },
  { code: "COMP6240", title: "Relational Databases", terms: ["S1", "S2"], units: 6 },
  { code: "COMP6242", title: "Deep Learning", terms: ["S1"], units: 6 },
  { code: "COMP6250", title: "Professional Practice: Holistic Thinking and Communication", terms: [], units: 6 },
  { code: "COMP6260", title: "Foundations of Computing", terms: ["S2"], units: 6 },
  { code: "COMP6261", title: "Information Theory", terms: ["S2"], units: 6 },
  { code: "COMP6262", title: "Logic", terms: ["S1"], units: 6 },
  { code: "COMP6300", title: "Computer Architecture", terms: ["S1"], units: 6 },
  { code: "COMP6310", title: "Systems, Networks and Concurrency", terms: ["S2"], units: 6 },
  { code: "COMP6320", title: "Artificial Intelligence", terms: ["S1"], units: 6 },
  { code: "COMP6330", title: "Operating Systems Implementation", terms: ["S2"], units: 6 },
  { code: "COMP6331", title: "Computer Networks", terms: ["S1"], units: 6 },
  { code: "COMP6361", title: "Principles of Programming Languages", terms: ["S2"], units: 6 },
  { code: "COMP6390", title: "Human-Computer Interaction", terms: ["S2"], units: 6 },
  { code: "COMP6434", title: "Data Wrangling", terms: ["S2"], units: 6 },
  { code: "COMP6442", title: "Software Construction", terms: ["S1", "S2"], units: 6 },
  { code: "COMP6445", title: "Computing Research Methods", terms: ["S1"], units: 6 },
  { code: "COMP6464", title: "High Performance Scientific Computing", terms: ["S2"], units: 6 },
  { code: "COMP6466", title: "Algorithms", terms: ["S2"], units: 6 },
  { code: "COMP6470", title: "Special Topics in Computing", terms: [], units: 6 },
  { code: "COMP6490", title: "Document Analysis", terms: [], units: 6 },
  { code: "COMP6528", title: "Computer Vision", terms: ["S1"], units: 6 },
  { code: "COMP6540", title: "Game Development", terms: [], units: 6 },
  { code: "COMP6670", title: "Introduction to Machine Learning", terms: ["S2"], units: 6 },
  { code: "COMP6710", title: "Structured Programming", terms: ["S1", "S2"], units: 6 },
  { code: "COMP6720", title: "Art and Interaction Computing", terms: [], units: 6 },
  { code: "COMP6730", title: "Programming for Scientists", terms: ["S1", "S2"], units: 6 },
  { code: "COMP6780", title: "Web Development and Design", terms: [], units: 6 },
  { code: "COMP6800", title: "Cyber Security Foundations", terms: ["S1"], units: 6 },
  { code: "COMP7710", title: "Programming Fundamentals", terms: ["S1", "S2"], units: 12 },
  { code: "COMP8011", title: "Advanced Topics in Formal Methods and Programming Languages", terms: ["S2"], units: 6 },
  { code: "COMP8020", title: "Advanced Topics in Human-Centred and Creative Computing", terms: ["S2"], units: 6 },
  { code: "COMP8045", title: "Advanced Topics in Computer Systems & Architecture", terms: ["S1"], units: 6 },
  { code: "COMP8131", title: "Managing Software Quality and Process", terms: ["S1"], units: 6 },
  { code: "COMP8260", title: "Professional Practice: Responsible Innovation and Leadership", terms: [], units: 6 },
  { code: "COMP8280", title: "Responsible Practice, Innovation and Leadership", terms: ["S1", "S2"], units: 6 },
  { code: "COMP8300", title: "Parallel Systems", terms: ["S1"], units: 6 },
  { code: "COMP8350", title: "Sound and Music Computing", terms: ["S1"], units: 6 },
  { code: "COMP8410", title: "Data Mining", terms: ["S1"], units: 6 },
  { code: "COMP8430", title: "Data Wrangling", terms: [], units: 6 },
  { code: "COMP8460", title: "Advanced Algorithms", terms: [], units: 6 },
  { code: "COMP8490", title: "Document Analysis", terms: ["S2"], units: 6 },
  { code: "COMP8500", title: "Advanced Computing Team Project", terms: [], units: 12 },
  { code: "COMP8535", title: "Engineering Data Analytics", terms: ["S1"], units: 6 },
  { code: "COMP8536", title: "Advanced Topics in Deep Learning for Computer Vision", terms: [], units: 6 },
  { code: "COMP8539", title: "Advanced Topics in Computer Vision", terms: ["S2"], units: 6 },
  { code: "COMP8600", title: "Statistical Machine Learning", terms: ["S1"], units: 6 },
  { code: "COMP8610", title: "Computer Graphics", terms: ["S1"], units: 6 },
  { code: "COMP8620", title: "Advanced Topics in Artificial Intelligence", terms: ["S2"], units: 6 },
  { code: "COMP8650", title: "Advanced Topics in Machine Learning", terms: ["S1"], units: 6 },
  { code: "COMP8691", title: "Optimisation", terms: [], units: 6 },
  { code: "COMP8703", title: "Vulnerability Research and Exploit Mitigation", terms: ["S1"], units: 6 },
  { code: "COMP8712", title: "Compiler Construction", terms: [], units: 6 },
  { code: "COMP8715", title: "Advanced Computing Team Project", terms: ["S1", "S2"], units: 6 },
  { code: "COMP8800", title: "Advanced Computing Research Project", terms: ["S1", "S2"], units: 12 },
  { code: "COMP8820", title: "Exchange Program for Graduate Students in Computer Science", terms: ["S1", "S2"], units: 6 },
  { code: "COMP8830", title: "Computing Internship", terms: ["S1", "S2"], units: 12 },
  { code: "COMP8880", title: "Computational Methods for Network Science", terms: [], units: 6 },
  { code: "COMP8980", title: "Computational Methods for Network Science", terms: [], units: 6 },
  { code: "ENGN6528", title: "Computer Vision", terms: ["S1"], units: 6 },
  { code: "ENGN6539", title: "Computer Networks", terms: ["S1"], units: 6 },
  { code: "ENGN8501", title: "Advanced Topics in Computer Vision", terms: [], units: 6 },
  { code: "ENGN9820", title: "Non Award Engineering and Computer Science Research Exchange", terms: ["Summer", "S1", "Autumn", "Winter", "S2", "Spring"], units: 3 },
  { code: "ENVS6025", title: "Complex Environmental Problems in Action", terms: ["S2"], units: 6 },
  { code: "MATH6111", title: "Scientific Computing", terms: ["S1"], units: 6 },
  { code: "MATH6112", title: "Matrix Computations", terms: ["S2"], units: 6 },
  { code: "MATH6213", title: "Complex Analysis", terms: ["S2"], units: 6 },
  { code: "MATH6406", title: "Partial Differential Equations, Fourier Analysis and Complex Analysis", terms: ["S2"], units: 6 },
  { code: "MATH8201", title: "Topics in Computational Maths", terms: ["S1"], units: 6 },
];
