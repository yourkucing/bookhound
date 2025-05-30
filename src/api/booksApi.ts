import supabase from './supabase';

export interface Book {
  book_id: string;
  title: string;
  author: string;
  brn?: string;
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

export async function enrichBooksWithBRN(books: Book[], limit = 500) {
  for (let i = 0; i < books.length && i < limit; i++) {
    const book = books[i];

    const params = new URLSearchParams({
      Title: book.title,
      Author: book.author,
    });

    try {
      const response = await fetch(`/api/v2/Catalogue/GetTitles?${params}`, {
        method: 'GET',
        headers: {
          "X-Api-Key": import.meta.env.VITE_X_API_KEY,
          "X-App-Code": import.meta.env.VITE_X_API_CODE,
          "User-Agent": "MyApp/1.0",
        },
      });

      if (response.status === 429) {
        console.warn("429 Rate limit hit, stopping enrichment.");
        break;
      }

      const data = await response.json();
      const brn = data?.titles?.[0]?.brn;

      if (brn) {
        await supabase
          .from("books")
          .update({ brn })
          .eq("book_id", book.book_id);
        console.log(`Updated BRN for "${book.title}": ${brn}`);
      } else {
        console.log(`No BRN found for "${book.title}"`);
      }
    } catch (err) {
      console.error(`Failed to enrich "${book.title}"`, err);
    }

    await new Promise((res) => setTimeout(res, 5000)); // ⏱️ throttle 1 req/sec
  }
}
