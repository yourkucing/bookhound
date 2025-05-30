import { useState, useEffect } from 'react'
import { fetchBranches, fetchDBBranches } from './api/libraryApi';
import { updateBooks, enrichBooksWithBRN } from './api/booksApi';
import type { Branch } from './api/libraryApi';
import type { Book } from './api/booksApi';
import Papa from "papaparse";
import './App.css'

function App() {
  const [available, setAvailable] = useState<boolean[] | null>(null);
  const [library, setLibrary] = useState<string>('');
  const [books, setBooks] = useState<Book[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function checkAvailability() {
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

  function updateGRBooks(files) {
    Papa.parse(files, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {

        const tbr = results.data.filter(
          (row) => String(row['Exclusive Shelf']).trim().toLowerCase() === 'to-read'
        );

        const GRbooks: Book[] = tbr.map((row: any) => ({
          book_id: row["Book Id"],
          title: row["Title"].replace(/\s*\([^)]*\)\s*$/, '').trim(),
          author: row["Author l-f"],
          brn: null,
        }));

      updateBooks(GRbooks)
        .then(() => {
          console.log("Books have been updated!");
          return enrichBooksWithBRN(GRbooks); // enrich after upsert
        })
        .then(() => {
          console.log("Books have been enriched with BRN!");
        })
        .catch(err => console.error(err));
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
            onChange={ e => updateGRBooks(e.target.files[0])}
            />
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
            {book} - {available ? (available[i] ? 'Available' : 'Not available') : 'Unknown'}
          </li>
        ))}
        </ul>

        <button onClick={checkAvailability}>Check Availability</button>
        <button onClick={updateLibrary}>Update Library Branches</button>
      </div>
    </>
  )
}

export default App
