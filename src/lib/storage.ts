import { supabase } from '@/lib/supabase';

/**
 * Deletes a file from the 'assets' Supabase storage bucket.
 * 
 * @param filePath - The path to the file within the 'assets' bucket (e.g., 'folder/image.png').
 */
export async function deleteAsset(filePath: string) {
  const { data, error } = await supabase
    .storage
    .from('assets')
    .remove([filePath]);

  if (error) {
    console.error('Error deleting asset:', error);
    throw error;
  }

  console.log('Asset deleted successfully:', data);
  return data;
}
