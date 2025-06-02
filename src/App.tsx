import { useState, useEffect } from 'react'
import { fetchBranches, fetchDBBranches } from './api/libraryApi';
import { updateBooks, enrichBooksWithBRN, checkAvailability } from './api/booksApi';
import type { Branch } from './api/libraryApi';
import Papa from "papaparse";
import './App.css'

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [timeLeft, setTimeLeft] = useState<{ minutes: number; seconds: number } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [library, setLibrary] = useState<string>("AMKPL");
  const [books, setBooks] = useState<{ title: string, author: string, code: string, category: string}[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function checkAvailableBooks() {
    if (library) {
      checkAvailability(library)
        .then((data) => {
          setBooks(data);
          setError(null);
        })
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    }
  }

  function updateLibrary() {
    fetchBranches()
      .then(() => fetchDBBranches()) 
      .then((data) => {
        setBranches(data);
        setError(null);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleProcessClick = () => {
    if (selectedFile) {
      updateGRBooks(selectedFile);
    } else {
      alert("Please upload a file first.");
    }
  };

  function updateGRBooks(files) {
    setProcessing(true);
    setProgress({ current: 0, total: 0 });
    setTimeLeft(null);

    Papa.parse(files, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const tbr = results.data.filter(
          (row) => String(row['Exclusive Shelf']).trim().toLowerCase() === 'to-read'
        );

        const GRbooks: Book[] = tbr.map((row: any) => ({
          book_id: row["Book Id"],
          title: row["Title"].replace(/\s*\([^)]*\)\s*$/, '').trim(),
          author: row["Author l-f"],
          brn: null,
        }));

        setProgress({ current: 0, total: GRbooks.length });

        try {
          await updateBooks(GRbooks)
          console.log("Books have been updated!");

          const estimatedTimePerBook = 12.5;
          let startTime = Date.now();

          await enrichBooksWithBRN(GRbooks, GRbooks.length, (current, total) => {
            setProgress({ current, total });

            const elapsed = (Date.now() - startTime) / 1000;
            const avgTimePerBook = elapsed / current;
            const remaining = avgTimePerBook * (total - current);

            const minutes = Math.floor(remaining / 60);
            const seconds = Math.floor(remaining % 60);

            setTimeLeft({ minutes, seconds });
          });

          console.log("Books have been enriched with BRN!");
        } catch (err) {
          console.error(err);
        } finally {
          setProcessing(false);
          setTimeLeft(null);
        }
      },
    });
  };

  useEffect(() => {
    fetchDBBranches()
      .then((data) => {
        setBranches(data);
        setError(null);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div>
        <h1>Book Hound</h1>
        <h2>Library Book Availability:</h2>
        <div>
          <input
            type="file"
            name="file"
            accept=".csv"
            onChange={handleFileChange}
            />
            <button onClick={handleProcessClick} disabled={!selectedFile}>
              Process File
            </button>
        </div>
        <div>
          {processing && (
            <div>
              <p>Processing book {progress.current} of {progress.total}</p>
              {timeLeft !== null && (
                <p>Estimated time left: {timeLeft.minutes}m {timeLeft.seconds}s</p>
              )}
            </div>
          )}
        </div>
        <select 
          value={library}
          onChange={e => setLibrary(e.target.value)}>
            {branches.map((branch) => (
              <option key={branch.branch_code} value={branch.branch_code}>{branch.branch_name}</option>
            ))}
        </select>
<ul>
  {books.map((book, i) => (
    <li key={i}>
      <strong>{book.title}</strong> by {book.author} (Shelf: {book.category} - {book.code})
    </li>
  ))}
</ul>


        <button onClick={checkAvailableBooks}>Check Availability</button>
        <button onClick={updateLibrary}>Update Library Branches</button>
      </div>
    </>
  )
}

export default App
