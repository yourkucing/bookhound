import supabase from './supabase';

export interface Book {
  book_id: string;
  title: string;
  author: string;
  brn?: string;
}

const API_URL = import.meta.env.VITE_API_URL;

// Function to fetch books from API
export async function fetchBooks(): Promise<Book[]> {
  const response = await fetch(`${API_URL}/books`);
  if (!response.ok) {
    throw new Error('Failed to fetch books');
  }
  const data = await response.json();
  return data;
}

export async function updateBooks(books: Book[]) {
    const { data, error } = await supabase
        .from('books')
        .upsert(books, { onConflict: 'book_id' });

    if (error) {
        console.error('Error upserting books:', error);
        throw error;
    }

    return data;
}

export async function getBRN(): Promise<Book[]> {
  const response = await fetch(`/api/v2/Catalogue/GetBranches?LibraryTypes=RL,PL&ListType=onsite`, {
    method: 'GET',
    headers: {
        "X-Api-Key": import.meta.env.VITE_X_API_KEY,
        "X-App-Code": import.meta.env.VITE_X_API_CODE,
        "User-Agent": "MyApp/1.0"
    },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch branches');
  }
  const data = await response.json();

  const branches: Branch[] = data.branches.map((branch: any) => ({
    branch_code: branch.branchCode,
    branch_name: branch.branchName,
    closed: branch.timing.openingHours === "",
  }));

  console.log(branches)

  await updateBranches(branches);

  return branches;
}