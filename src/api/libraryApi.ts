import supabase from './supabase';

export interface Branch {
  branch_code: string;
  branch_name: string;
  closed: boolean;
}

// Function to fetch books from API
export async function fetchBranches(): Promise<Branch[]> {
  const response = await fetch(`/api/v1/Library/GetBranches?LibraryTypes=RL,PL&ListType=onsite`, {
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

export async function updateBranches(branches: Branch[]) {
    const { data, error } = await supabase
        .from('libraries')
        .upsert(branches, { onConflict: 'branch_code' });

    if (error) {
        console.error('Error upserting branches:', error);
        throw error;
    }

    return data;
}

export async function fetchDBBranches() {
    const { data, error } = await supabase
        .from('libraries')
        .select()
        .eq('closed', false);

    if (error) {
        console.error('Error selecting branches:', error);
        throw error;
    }

    const branches: Branch[] = data.map((branch: any) => ({
    branch_code: branch.branch_code,
    branch_name: branch.branch_name,
    closed: false,
  }));
    return branches;
}