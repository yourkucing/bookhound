import supabase from './supabase';

export interface Book {
  book_id: string;
  title: string;
  author: string;
  brn?: string;
}

export async function checkAvailability(library: string): Promise<{ title: string, author: string, code: string, category: string}[]> {

  const booksForLoan: { title: string; author: string; code: string; category: string; }[] = [];

  try {
    console.log(library);
    const { data, error } = await supabase
      .from('books')
      .select('title, author, availability')
      .not('availability', 'is', null);
      //.contains('availability', { library: library, avail: true });
    
      if (error) {
        console.error("Supabase error:", error);
        return booksForLoan;
      }

      console.log(data);

      if (data) {
        for (const book of data) {
          if (!Array.isArray(book.availability)) continue;
          
          const match = book.availability.find((entry: any) => entry.library === library && entry.avail === true);
          if (match) {
            booksForLoan.push({
              title: book.title,
              author: book.author,
              code: match.code,
              category: match.category
            });
          }
        }
      }
  }
  catch (err) {
    console.error(err);
  }

  return booksForLoan;
}

export async function fetchAvailableBooks(brn: string): Promise<{ library: string; avail: boolean; code: string; category: string; }[]> {

  const availableBooks: { library: string; avail: boolean; code: string; category: string; }[] = [];
  const brnInt = parseInt(brn, 10);

  try {
    const response = await fetch(`/api/v2/Catalogue/GetAvailabilityInfo?BRN=${brnInt}&Limit=30`, {
      method: 'GET',
      headers: {
        "X-Api-Key": import.meta.env.VITE_X_API_KEY,
        "X-App-Code": import.meta.env.VITE_X_API_CODE,
        "User-Agent": "MyApp/1.0"
      }
    });

    if (!response.ok) throw new Error(`API failed for BRN ${brnInt}`);

    const result = await response.json();
    
    if(Array.isArray(result.items)) {
      for (const item of result.items) {
        availableBooks.push({
          library: item.location?.code ?? null,
          avail: item.status?.code === "In",
          code: item.formattedCallNumber ?? null,
          category: item.usageLevel?.code ?? null
        })
      }
    }
  } catch (err) {
    console.error(`Error checking availability for BRN ${brnInt}:`, err);
  }

  await new Promise((resolve) => setTimeout(resolve, 5000));

  console.log(availableBooks)
  return availableBooks;
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

export async function enrichBooksWithBRN(
  books: Book[],
  limit = 500,
  onProgress?: (current: number, total: number) => void) {

  const total = Math.min(books.length, limit);

  for (let i = 0; i < books.length && i < limit; i++) {
    const book = books[i];

    const params = new URLSearchParams({
      Title: book.title.replace(/:/g, ''),
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
      const match = data.titles.find((entry) => {
        const clean = (str: string) =>
          str.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();

        const entryFormat = entry.format?.name?.toLowerCase() ?? '';
        const entryTitle = clean(entry.title || '');
        const entryAuthor = clean(entry.author ?? '');
        const entryLanguage = Array.isArray(entry.language)
          ? entry.language.map((lang: string) => lang.toLowerCase())
          : [];

        const targetTitle = clean(book.title);
        const wordsInTarget = targetTitle.split(' ');
        const targetAuthor = clean(book.author);

        return (
          entryFormat === 'book' &&
          wordsInTarget.every((word) => entryTitle.includes(word)) &&
          entryAuthor.includes(targetAuthor) &&
          entryLanguage.includes('english')
        );
      });

      if (match) {
        const brn = match.brn;
        console.log("Matched BRN:", brn);
        console.log("Matched Title:", match.title);
        console.log("Matched Author:", match.author);

        await new Promise((res) => setTimeout(res, 5000));

        console.log("Checking availability now...");

        const availability = await fetchAvailableBooks(brn)

        await supabase
          .from("books")
          .update({ brn, availability })
          .eq("book_id", book.book_id);
        console.log(`Updated BRN for "${book.title}": ${brn}`);
      } else {
        console.log(`No BRN found for "${book.title}"`);
      }
    } catch (err) {
      console.error(`Failed to enrich "${book.title}"`, err);
    }

    if (onProgress) onProgress(i+1, total);
    await new Promise((res) => setTimeout(res, 5000));
  }
}
