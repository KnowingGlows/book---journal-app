"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, Timestamp, getDocs, query, doc, updateDoc } from "firebase/firestore";
import Sidebar from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard";

interface ImportBook {
  title: string;
  author: string;
  status: "completed" | "reading";
  completedAt?: string;
  tags: string[];
}

const BOOKS: ImportBook[] = [
  { title: "You Can Win", author: "Shiv Khera", status: "completed", completedAt: "2021-08-11", tags: ["Self Development"] },
  { title: "Think and Grow Rich", author: "Napoleon Hill", status: "completed", completedAt: "2021-08-19", tags: ["Finance"] },
  { title: "How To Win Friends And Influence People", author: "Dale Carnegie", status: "completed", completedAt: "2021-09-11", tags: ["Self Development"] },
  { title: "The Psychology Of Money", author: "Morgan Housel", status: "completed", completedAt: "2021-10-22", tags: ["Finance"] },
  { title: "Atomic Habits", author: "James Clear", status: "completed", completedAt: "2021-11-06", tags: ["Self Development"] },
  { title: "The Theory Of Everything", author: "Stephen Hawking", status: "completed", completedAt: "2021-11-06", tags: ["Space"] },
  { title: "Rich Dad Poor Dad", author: "Robert T. Kiyosaki", status: "completed", completedAt: "2021-11-13", tags: ["Finance"] },
  { title: "As A Man Thinketh", author: "James Allen", status: "completed", completedAt: "2021-11-16", tags: ["Self Development"] },
  { title: "IKIGAI", author: "Hector Garcia & Francesc Miralles", status: "completed", completedAt: "2021-11-27", tags: ["Self Development"] },
  { title: "The Origin Of Almost Everything", author: "Stephen Hawking & Graham Lawton", status: "completed", completedAt: "2021-12-15", tags: ["Space"] },
  { title: "Attitude Is Everything", author: "Jeff Keller", status: "completed", completedAt: "2021-12-19", tags: ["Self Development"] },
  { title: "Hooked", author: "Nir Eyal & Ryan Hoover", status: "completed", completedAt: "2021-12-31", tags: ["Technology"] },
  { title: "Unscripted: The Great Rat Race Escape", author: "MJ DeMarco", status: "completed", completedAt: "2022-01-21", tags: ["Finance", "Self Development"] },
  { title: "Man's Search For Meaning", author: "Viktor E. Frankl", status: "completed", completedAt: "2022-01-28", tags: ["Psychology", "Self Development"] },
  { title: "Deep Work", author: "Cal Newport", status: "completed", completedAt: "2022-02-12", tags: ["Self Development"] },
  { title: "12 Rules For Life", author: "Jordan B. Peterson", status: "completed", completedAt: "2022-03-05", tags: ["Psychology", "Self Development"] },
  { title: "GRIT", author: "Angela Duckworth", status: "completed", completedAt: "2022-03-24", tags: ["Self Development"] },
  { title: "Riches Are Your Right", author: "Dr. Joseph Murphy", status: "completed", completedAt: "2022-03-29", tags: ["Self Development"] },
  { title: "Indistractable", author: "Nir Eyal", status: "completed", completedAt: "2022-04-15", tags: ["Self Development"] },
  { title: "The Millionaire Fastlane", author: "MJ DeMarco", status: "completed", completedAt: "2022-04-30", tags: ["Finance", "Self Development"] },
  { title: "The Miracle Morning", author: "Hal Elrod", status: "completed", completedAt: "2022-05-15", tags: ["Self Development"] },
  { title: "How To Raise Your Own Salary", author: "Napoleon Hill", status: "completed", completedAt: "2022-05-21", tags: ["Finance", "Self Development"] },
  { title: "How To Talk To Anyone", author: "Leil Lowndes", status: "completed", completedAt: "2022-06-11", tags: ["Communication"] },
  { title: "Eat That Frog", author: "Brian Tracy", status: "completed", completedAt: "2022-06-14", tags: ["Self Development"] },
  { title: "Quiet: The Power Of Introverts", author: "Susan Cain", status: "completed", completedAt: "2022-06-24", tags: ["Psychology"] },
  { title: "Business Strategy", author: "Brian Tracy", status: "completed", completedAt: "2022-06-26", tags: ["Business", "Finance"] },
  { title: "Time Management", author: "Brian Tracy", status: "completed", completedAt: "2022-06-28", tags: ["Self Development"] },
  { title: "Personal Success", author: "Brian Tracy", status: "completed", completedAt: "2022-06-30", tags: ["Self Development"] },
  { title: "Creativity And Problem Solving", author: "Brian Tracy", status: "completed", completedAt: "2022-07-02", tags: ["Self Development"] },
  { title: "Leadership", author: "Brian Tracy", status: "completed", completedAt: "2022-07-04", tags: ["Communication", "Self Development"] },
  { title: "Million Dollar Habits", author: "Brian Tracy", status: "completed", completedAt: "2022-07-12", tags: ["Finance", "Self Development"] },
  { title: "The 10X Rule", author: "Grant Cardone", status: "completed", completedAt: "2022-07-18", tags: ["Self Development"] },
  { title: "Thinking, Fast And Slow", author: "Daniel Kahneman", status: "completed", completedAt: "2022-08-20", tags: ["Self Development"] },
  { title: "Zero To One", author: "Peter Thiel", status: "completed", completedAt: "2022-08-27", tags: ["Business"] },
  { title: "Secrets Of The Millionaire Mind", author: "T. Harv Eker", status: "completed", completedAt: "2022-09-01", tags: ["Finance", "Self Development"] },
  { title: "How To Build A Billion Dollar App", author: "George Berkowski", status: "completed", completedAt: "2022-09-15", tags: ["Business"] },
  { title: "You Are Not Your Brain", author: "Jeffery M. Schwartz & Rebecca Gladding", status: "completed", completedAt: "2022-10-04", tags: ["Self Development"] },
  { title: "The Almanack Of Naval Ravikant", author: "Eric Jorgenson", status: "completed", completedAt: "2022-10-08", tags: ["Business", "Finance"] },
  { title: "Stolen Focus", author: "Johann Hari", status: "completed", completedAt: "2022-10-17", tags: ["Self Development"] },
  { title: "The Hard Thing About Hard Things", author: "Ben Horowitz", status: "completed", completedAt: "2022-10-24", tags: ["Business"] },
  { title: "The Millionaire Next Door", author: "Thomas J. Stanley & William D. Danko", status: "completed", completedAt: "2022-10-31", tags: ["Finance"] },
  { title: "Let's Build A Company", author: "Harpreet S. Grover & Vibhore Goyal", status: "completed", completedAt: "2022-11-05", tags: ["Business"] },
  { title: "Rework", author: "Jason Fried & David Heinemeier Hansson", status: "completed", completedAt: "2022-11-09", tags: ["Self Development"] },
  { title: "Unscripted", author: "MJ DeMarco", status: "completed", completedAt: "2022-11-26", tags: ["Finance", "Self Development"] },
  { title: "Funding Your Startup", author: "Dhruv Nath & Sushanto Mitra", status: "completed", completedAt: "2022-12-02", tags: ["Business"] },
  { title: "The One Thing", author: "Gary Keller & Jay Papasan", status: "completed", completedAt: "2022-12-07", tags: ["Self Development"] },
  { title: "The Minimalist Entrepreneur", author: "Sahil Lavingia", status: "completed", completedAt: "2023-01-01", tags: ["Business"] },
  { title: "The Source", author: "Sirshree", status: "completed", completedAt: "2022-12-19", tags: ["Self Development"] },
  { title: "The Lean Startup", author: "Eric Ries", status: "completed", completedAt: "2022-12-28", tags: ["Business"] },
  { title: "Steve Jobs", author: "Walter Isaacson", status: "completed", completedAt: "2023-01-19", tags: ["Biography"] },
  { title: "The Power Of Habit", author: "Charles Duhigg", status: "completed", completedAt: "2023-01-30", tags: ["Psychology"] },
  { title: "Originals", author: "Adam Grant", status: "completed", completedAt: "2023-02-07", tags: ["Self Development"] },
  { title: "The Go-Giver", author: "Bob Burg & John David Mann", status: "completed", completedAt: "2023-02-09", tags: ["Self Development"] },
  { title: "So Good They Can't Ignore You", author: "Cal Newport", status: "completed", completedAt: "2023-02-15", tags: ["Self Development"] },
  { title: "Drive", author: "Daniel H. Pink", status: "completed", completedAt: "2023-02-20", tags: ["Psychology"] },
  { title: "How To Live On 24 Hours A Day", author: "Arnold Bennett", status: "completed", completedAt: "2023-02-22", tags: ["Self Development"] },
  { title: "The Warren Buffett Way", author: "Robert G. Hagstrom", status: "completed", completedAt: "2023-03-04", tags: ["Finance"] },
  { title: "The 3 Alarms", author: "Eric Partaker", status: "completed", completedAt: "2023-03-08", tags: ["Self Development"] },
  { title: "Don't Believe Everything You Think", author: "Joseph Nguyen", status: "completed", completedAt: "2023-03-10", tags: ["Psychology", "Self Development"] },
  { title: "The Now Habit", author: "Neil Fiore", status: "completed", completedAt: "2023-03-17", tags: ["Self Development"] },
  { title: "What The Most Successful People Do Before Breakfast", author: "Laura Vanderkam", status: "completed", completedAt: "2023-03-21", tags: ["Self Development"] },
  { title: "Do The Hard Things First", author: "Scott Allan", status: "completed", completedAt: "2023-03-26", tags: ["Self Development"] },
  { title: "Do The Work", author: "Steven Pressfield", status: "completed", completedAt: "2023-03-28", tags: ["Self Development"] },
  { title: "The War Of Art", author: "Steven Pressfield", status: "completed", completedAt: "2023-03-31", tags: ["Psychology", "Self Development"] },
  { title: "Talent Is Overrated", author: "Geoff Colvin", status: "completed", completedAt: "2023-04-07", tags: ["Self Development"] },
  { title: "12 Months To $1 Million", author: "Ryan Daniel Moran", status: "completed", completedAt: "2023-04-15", tags: ["Business", "Finance"] },
  { title: "Outliers", author: "Malcolm Gladwell", status: "completed", completedAt: "2023-04-29", tags: ["Self Development"] },
  { title: "Dopamine Detox", author: "Thibaut Meurisse", status: "completed", completedAt: "2023-05-06", tags: ["Self Development"] },
  { title: "Ego Is The Enemy", author: "Ryan Holiday", status: "completed", completedAt: "2023-05-11", tags: ["Self Development"] },
  { title: "The Billion Dollar App", author: "Anuj Mahajan", status: "completed", completedAt: "2023-05-16", tags: ["Business"] },
  { title: "The Four", author: "Scott Galloway", status: "completed", completedAt: "2023-05-29", tags: ["Business"] },
  { title: "How To Create The Next Facebook", author: "Tom Taulli", status: "completed", completedAt: "2023-06-04", tags: ["Technology"] },
  { title: "Build Don't Talk", author: "Raj Shamani", status: "completed", completedAt: "2023-06-08", tags: ["Technology"] },
  { title: "Chanakya Neeti", author: "B.K. Chaturvedi", status: "completed", completedAt: "2023-06-12", tags: ["Self Development"] },
  { title: "How To Analyze People With Dark Psychology", author: "Will Hawkins", status: "completed", completedAt: "2023-06-15", tags: ["Psychology"] },
  { title: "Linchpin", author: "Seth Godin", status: "completed", completedAt: "2023-06-22", tags: ["Business", "Self Development"] },
  { title: "2030: How Today's Trends Will Collide And Reshape The Future", author: "Mauro F. Guillen", status: "completed", completedAt: "2023-07-02", tags: ["Technology"] },
  { title: "The Science Of Self Discipline", author: "Peter Hollins", status: "completed", completedAt: "2023-07-09", tags: ["Psychology", "Self Development"] },
  { title: "Distraction Addiction", author: "Lauren Bates", status: "completed", completedAt: "2023-07-10", tags: ["Self Development"] },
  { title: "The 50th Law", author: "50 Cent & Robert Greene", status: "completed", completedAt: "2023-07-21", tags: ["Psychology", "Self Development"] },
  { title: "Your Best Year Ever", author: "Michael Hyatt", status: "completed", completedAt: "2023-07-29", tags: ["Self Development"] },
  { title: "No Excuses: The Power Of Self Discipline", author: "Brian Tracy", status: "completed", completedAt: "2023-08-04", tags: ["Self Development"] },
  { title: "The Courage To Be Disliked", author: "Ichiro Kishimi & Fumitake Koga", status: "completed", completedAt: "2023-08-08", tags: ["Self Development"] },
  { title: "7 Sutras Of Innovation", author: "Nikhil Inamdar", status: "completed", completedAt: "2023-08-15", tags: ["Business"] },
  { title: "The Code Of The Extraordinary Mind", author: "Vishen Lakhiani", status: "completed", completedAt: "2023-08-29", tags: ["Self Development"] },
  { title: "The Startup Of You", author: "Reid Hoffman & Ben Casnocha", status: "completed", completedAt: "2023-09-05", tags: ["Business"] },
  { title: "Psycho-Cybernetics", author: "Maxwell Maltz", status: "completed", completedAt: "2023-09-20", tags: ["Self Development"] },
  { title: "Beyond Disruption", author: "W. Chan Kim & Renee Mauborgne", status: "completed", completedAt: "2023-09-25", tags: ["Business"] },
  { title: "Do It Today", author: "Darius Foroux", status: "completed", completedAt: "2023-09-27", tags: ["Psychology", "Self Development"] },
  { title: "The Lean Product Playbook", author: "Dan Olsen", status: "completed", completedAt: "2023-10-06", tags: ["Business"] },
  { title: "Doglapan", author: "Ashneer Grover", status: "completed", completedAt: "2023-10-11", tags: ["Biography"] },
  { title: "Mindset", author: "Carol S. Dweck", status: "completed", completedAt: "2023-10-19", tags: ["Self Development"] },
  { title: "The Self Discipline Manual", author: "Peter Hollins", status: "completed", completedAt: "2023-11-14", tags: ["Psychology", "Self Development"] },
  { title: "The Science Of Self-Learning", author: "Peter Hollins", status: "completed", completedAt: "2023-11-30", tags: ["Psychology", "Self Development"] },
  { title: "Do Epic Shit", author: "Ankur Warikoo", status: "completed", completedAt: "2023-12-01", tags: ["Self Development"] },
  { title: "The Way Of The Superior Man", author: "David Deida", status: "completed", completedAt: "2023-12-07", tags: ["Psychology", "Self Development"] },
  { title: "48 Hour Start-Up", author: "Fraser Doherty", status: "completed", completedAt: "2023-12-15", tags: ["Business"] },
  { title: "$100M Offers", author: "Alex Hormozi", status: "completed", completedAt: "2023-12-21", tags: ["Business"] },
  { title: "The 1-Page Marketing Plan", author: "Allan Dib", status: "completed", completedAt: "2023-12-27", tags: ["Business", "Marketing"] },
  { title: "Dumbing Us Down", author: "John Taylor Gatto", status: "completed", completedAt: "2024-01-09", tags: ["Psychology", "Sociology"] },
  { title: "The Power Of Positive Thinking", author: "Norman Vincent Peale", status: "completed", completedAt: "2024-01-19", tags: ["Self Development"] },
  { title: "DOTCOM Secrets", author: "Russell Brunson", status: "completed", completedAt: "2024-01-22", tags: ["Business", "Marketing"] },
  { title: "Win Your Inner Battles", author: "Darius Foroux", status: "completed", completedAt: "2024-01-24", tags: ["Self Development"] },
  { title: "Scientific Advertising", author: "Claude Hopkins", status: "completed", completedAt: "2024-01-26", tags: ["Business", "Marketing"] },
  { title: "Discipline Is Destiny", author: "Ryan Holiday", status: "completed", completedAt: "2024-02-04", tags: ["Self Development"] },
  { title: "The Diary Of A CEO", author: "Steven Bartlett", status: "completed", completedAt: "2024-02-11", tags: ["Self Development"] },
  { title: "The Innovation Stack", author: "Jim McKelvey", status: "completed", completedAt: "2024-02-15", tags: ["Business"] },
  { title: "Surrounded By Idiots", author: "Thomas Erikson", status: "completed", completedAt: "2024-02-21", tags: ["Psychology"] },
  { title: "The E-Myth Revisited", author: "Michael E. Gerber", status: "completed", completedAt: "2024-02-27", tags: ["Business"] },
  { title: "Startup To Proficorn", author: "Rajesh Jain", status: "completed", completedAt: "2024-03-06", tags: ["Business"] },
  { title: "Courage Is Calling", author: "Ryan Holiday", status: "completed", completedAt: "2024-03-14", tags: ["Self Development"] },
  { title: "Better Than Before", author: "Gretchen Rubin", status: "completed", completedAt: "2024-03-22", tags: ["Self Development"] },
  { title: "The Personal MBA", author: "Josh Kaufman", status: "completed", completedAt: "2024-04-10", tags: ["Business"] },
  { title: "The Dhoni Touch", author: "Bharat Sundaresan", status: "completed", completedAt: "2024-04-14", tags: ["Biography"] },
  { title: "The Power Of Now", author: "Eckhart Tolle", status: "completed", completedAt: "2024-04-19", tags: ["Self Development"] },
  { title: "The Greatest Salesman In The World", author: "Og Mandino", status: "completed", completedAt: "2024-04-25", tags: ["Business"] },
  { title: "Building A StoryBrand", author: "Donald Miller", status: "completed", completedAt: "2024-05-01", tags: ["Business", "Marketing"] },
  { title: "Game Of Sales", author: "David Perry", status: "completed", completedAt: "2024-05-10", tags: ["Business", "Marketing"] },
  { title: "Mind Reader", author: "David J. Lieberman", status: "completed", completedAt: "2024-05-16", tags: ["Psychology"] },
  { title: "How To Get Rich", author: "Felix Dennis", status: "completed", completedAt: "2024-06-05", tags: ["Finance", "Self Development"] },
  { title: "Shoe Dog", author: "Phil Knight", status: "completed", completedAt: "2024-06-20", tags: ["Biography"] },
  { title: "Hyper Focus", author: "Chris Bailey", status: "completed", completedAt: "2024-06-27", tags: ["Psychology"] },
  { title: "Predictably Irrational", author: "Dan Ariely", status: "completed", completedAt: "2024-07-04", tags: ["Psychology"] },
  { title: "Influence: The Psychology Of Persuasion", author: "Robert B. Cialdini", status: "completed", completedAt: "2024-07-24", tags: ["Psychology"] },
  { title: "The Compound Effect", author: "Darren Hardy", status: "completed", completedAt: "2024-07-26", tags: ["Self Development"] },
  { title: "The Magic Of Thinking Big", author: "David Schwartz", status: "completed", completedAt: "2024-08-05", tags: ["Self Development"] },
  { title: "Blink", author: "Malcolm Gladwell", status: "completed", completedAt: "2024-08-16", tags: ["Psychology", "Sociology"] },
  { title: "The 48 Laws Of Power", author: "Robert Greene", status: "completed", completedAt: "2024-09-03", tags: ["Psychology", "Sociology"] },
  { title: "Good To Great", author: "Jim Collins", status: "completed", completedAt: "2024-09-21", tags: ["Business"] },
  { title: "Elon Musk", author: "Walter Isaacson", status: "completed", completedAt: "2024-10-16", tags: ["Biography"] },
  { title: "Reality Transurfing Steps 1-5", author: "Vadim Zeland", status: "completed", completedAt: "2026-02-12", tags: ["Self Development"] },
  { title: "The Slight Edge", author: "Jeff Olson", status: "completed", completedAt: "2026-02-12", tags: ["Self Development"] },
  { title: "Mastery", author: "Robert Greene", status: "completed", completedAt: "2026-02-12", tags: ["Psychology", "Self Development"] },
  // In-Progress books
  { title: "The Innovators", author: "Walter Isaacson", status: "reading", tags: ["History", "Technology"] },
  { title: "The Law Of Success In 16 Lessons", author: "Napoleon Hill", status: "reading", tags: ["Finance", "Self Development"] },
  { title: "21 Lessons For The 21st Century", author: "Yuval Noah Harari", status: "reading", tags: ["History"] },
  { title: "The Undiscovered Self", author: "C.G. Jung", status: "reading", tags: ["Psychology"] },
  { title: "Shah Rukh Khan: Legend Icon Star", author: "Mohar Basu", status: "reading", tags: ["Biography", "History"] },
  { title: "The Laws Of Human Nature", author: "Robert Greene", status: "reading", tags: ["Psychology"] },
];

export default function ImportPage() {
  const { user } = useAuth();
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [skipped, setSkipped] = useState(0);
  const [fetchingCovers, setFetchingCovers] = useState(false);
  const [coverProgress, setCoverProgress] = useState(0);
  const [coverTotal, setCoverTotal] = useState(0);
  const [coversDone, setCoversDone] = useState(false);
  const [coversUpdated, setCoversUpdated] = useState(0);

  const fetchCovers = async () => {
    if (!user) return;
    setFetchingCovers(true);
    setCoverProgress(0);
    let updated = 0;

    const snap = await getDocs(query(collection(db, "users", user.uid, "books")));
    const booksWithoutCovers = snap.docs.filter((d) => !d.data().cover);
    setCoverTotal(booksWithoutCovers.length);

    for (let i = 0; i < booksWithoutCovers.length; i++) {
      const bookDoc = booksWithoutCovers[i];
      const data = bookDoc.data();
      const searchQuery = `${data.title} ${data.author}`;

      try {
        const res = await fetch(`/api/books/search?q=${encodeURIComponent(searchQuery)}`);
        const result = await res.json();
        const items = result.items || [];

        if (items.length > 0 && items[0].volumeInfo?.imageLinks?.thumbnail) {
          const cover = items[0].volumeInfo.imageLinks.thumbnail.replace("http:", "https:");
          const pageCount = items[0].volumeInfo?.pageCount || 0;
          const updateData: Record<string, unknown> = { cover };
          if (pageCount && !data.totalPages) {
            updateData.totalPages = pageCount;
            if (data.status === "completed") updateData.pagesRead = pageCount;
          }
          await updateDoc(doc(db, "users", user.uid, "books", bookDoc.id), updateData);
          updated++;
        }
      } catch {
        // skip failed lookups
      }

      setCoverProgress(i + 1);
      // Small delay to avoid hammering the API
      await new Promise((r) => setTimeout(r, 300));
    }

    setCoversUpdated(updated);
    setCoversDone(true);
    setFetchingCovers(false);
  };

  const runImport = async () => {
    if (!user) return;
    setImporting(true);
    setProgress(0);

    // Get existing books to avoid duplicates
    const existingSnap = await getDocs(query(collection(db, "users", user.uid, "books")));
    const existingTitles = new Set(
      existingSnap.docs.map((d) => (d.data().title as string).toLowerCase().trim())
    );

    let skippedCount = 0;
    const booksRef = collection(db, "users", user.uid, "books");

    for (let i = 0; i < BOOKS.length; i++) {
      const book = BOOKS[i];

      if (existingTitles.has(book.title.toLowerCase().trim())) {
        skippedCount++;
        setProgress(i + 1);
        continue;
      }

      const bookData: Record<string, unknown> = {
        title: book.title,
        author: book.author,
        cover: "",
        totalPages: 0,
        pagesRead: 0,
        status: book.status,
        description: "",
        createdAt: Timestamp.now(),
        readingLog: [],
        notes: [],
        tags: book.tags,
      };

      if (book.status === "completed" && book.completedAt) {
        bookData.completedAt = Timestamp.fromDate(new Date(book.completedAt));
        bookData.pagesRead = bookData.totalPages as number;
      }

      await addDoc(booksRef, bookData);
      setProgress(i + 1);
    }

    setSkipped(skippedCount);
    setDone(true);
    setImporting(false);
  };

  return (
    <AuthGuard>
      <Sidebar />
      <main className="ml-64 flex min-h-screen items-center justify-center bg-[#09090b] p-8">
        <div className="animate-fade-in max-w-md text-center">
          <h1 className="text-2xl font-bold text-white">Import Notion Books</h1>
          <p className="mt-2 text-sm text-zinc-500">
            {BOOKS.filter((b) => b.status === "completed").length} completed books &middot;{" "}
            {BOOKS.filter((b) => b.status === "reading").length} currently reading
          </p>

          {!done ? (
            <>
              {importing ? (
                <div className="mt-8">
                  <div className="h-2 overflow-hidden rounded-full bg-[#1a1a1e]">
                    <div
                      className="h-full rounded-full bg-violet-500 transition-all"
                      style={{ width: `${(progress / BOOKS.length) * 100}%` }}
                    />
                  </div>
                  <p className="mt-3 text-sm text-zinc-400">
                    {progress} / {BOOKS.length} books processed...
                  </p>
                </div>
              ) : (
                <button
                  onClick={runImport}
                  className="mt-8 rounded-xl bg-violet-600 px-8 py-3 text-sm font-medium text-white transition-all hover:bg-violet-500"
                >
                  Start Import
                </button>
              )}
            </>
          ) : (
            <div className="mt-8 rounded-2xl border border-[#1e1e22] bg-[#111113] p-6">
              <p className="text-lg font-semibold text-emerald-400">Import Complete!</p>
              <p className="mt-2 text-sm text-zinc-400">
                Added {BOOKS.length - skipped} books{skipped > 0 ? ` (${skipped} already existed)` : ""}
              </p>
              <a
                href="/books"
                className="mt-4 inline-block rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-violet-500"
              >
                View Your Library
              </a>
            </div>
          )}

          {/* Fetch Covers Section */}
          <div className="mt-8 rounded-2xl border border-[#1e1e22] bg-[#111113] p-6">
            <h2 className="text-sm font-semibold text-white">Fetch Book Covers</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Looks up each book without a cover via Google Books API and fills in the cover image + page count.
            </p>

            {coversDone ? (
              <div className="mt-4">
                <p className="text-sm text-emerald-400">
                  Updated {coversUpdated} / {coverTotal} books with covers
                </p>
              </div>
            ) : fetchingCovers ? (
              <div className="mt-4">
                <div className="h-2 overflow-hidden rounded-full bg-[#1a1a1e]">
                  <div
                    className="h-full rounded-full bg-violet-500 transition-all"
                    style={{ width: `${coverTotal ? (coverProgress / coverTotal) * 100 : 0}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-zinc-400">
                  {coverProgress} / {coverTotal} books checked...
                </p>
              </div>
            ) : (
              <button
                onClick={fetchCovers}
                className="mt-4 rounded-xl bg-[#1a1a1e] px-6 py-2.5 text-sm font-medium text-violet-400 transition-all hover:bg-[#222226]"
              >
                Fetch Covers
              </button>
            )}
          </div>

          <p className="mt-6 text-[10px] text-zinc-700">
            Duplicates are automatically skipped based on title
          </p>
        </div>
      </main>
    </AuthGuard>
  );
}
