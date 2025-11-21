import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

export interface PhotoSubmission {
  id: string;
  dentist_id: string;
  laboratory_id: string;
  patient_name: string;
  photo_url: string;
  notes: string | null;
  status: string;
  created_at: string;
  dentist_accounts?: {
    name: string;
    email: string;
    phone: string | null;
  };
}

export interface StlFile {
  id: string;
  delivery_note_id: string | null;
  dentist_id: string;
  laboratory_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
  notes: string | null;
  viewed_by_lab: boolean;
  viewed_at: string | null;
  dentist_name?: string;
  delivery_number?: string;
  patient_name?: string;
}

export interface DentistAccount {
  id: string;
  name: string;
  email: string;
}

export interface PhotosResponse {
  photos: PhotoSubmission[];
  totalCount: number;
  limit: number;
  offset: number;
  totalPages: number;
}

export interface StlFilesResponse {
  files: StlFile[];
  totalCount: number;
  limit: number;
  offset: number;
  totalPages: number;
}

export interface PhotoFilters {
  status?: string;
  search?: string;
}

/**
 * Récupère les photos soumises avec pagination (25 par page)
 */
export async function fetchPhotoSubmissions(
  laboratoryId: string,
  page: number = 1,
  filters: PhotoFilters = {}
): Promise<PhotosResponse> {
  try {
    const limit = 25;
    const offset = (page - 1) * limit;

    logger.debug('[PhotosService] Fetching photo submissions:', {
      laboratoryId,
      page,
      limit,
      offset,
      filters,
    });

    const { data, error } = await supabase.rpc('get_photo_submissions_paginated', {
      p_laboratory_id: laboratoryId,
      p_limit: limit,
      p_offset: offset,
      p_status: filters.status || 'all',
      p_search: filters.search || '',
    });

    if (error) {
      logger.error('[PhotosService] Error fetching photo submissions:', error);
      throw error;
    }

    logger.debug('[PhotosService] Photo submissions fetched successfully:', {
      totalCount: data.totalCount,
      photosCount: data.photos.length,
    });

    return data as PhotosResponse;
  } catch (error) {
    logger.error('[PhotosService] Failed to fetch photo submissions:', error);
    throw error;
  }
}

/**
 * Récupère les fichiers STL avec pagination (25 par page)
 */
export async function fetchStlFiles(
  laboratoryId: string,
  page: number = 1,
  viewedFilter: string = 'all'
): Promise<StlFilesResponse> {
  try {
    const limit = 25;
    const offset = (page - 1) * limit;

    logger.debug('[PhotosService] Fetching STL files:', {
      laboratoryId,
      page,
      limit,
      offset,
      viewedFilter,
    });

    const { data, error } = await supabase.rpc('get_stl_files_paginated', {
      p_laboratory_id: laboratoryId,
      p_limit: limit,
      p_offset: offset,
      p_viewed_filter: viewedFilter,
    });

    if (error) {
      logger.error('[PhotosService] Error fetching STL files:', error);
      throw error;
    }

    logger.debug('[PhotosService] STL files fetched successfully:', {
      totalCount: data.totalCount,
      filesCount: data.files.length,
    });

    return data as StlFilesResponse;
  } catch (error) {
    logger.error('[PhotosService] Failed to fetch STL files:', error);
    throw error;
  }
}

/**
 * Récupère la liste des dentistes (pour autocomplete)
 */
export async function fetchDentists(): Promise<DentistAccount[]> {
  try {
    const { data, error } = await supabase
      .from('dentist_accounts')
      .select('id, name, email')
      .order('name');

    if (error) throw error;

    return data || [];
  } catch (error) {
    logger.error('[PhotosService] Error loading dentists:', error);
    throw error;
  }
}

/**
 * Met à jour le statut d'une photo
 */
export async function updatePhotoStatus(
  photoId: string,
  status: string
): Promise<void> {
  try {
    logger.debug('[PhotosService] Updating photo status:', { photoId, status });

    const { error } = await supabase
      .from('photo_submissions')
      .update({ status })
      .eq('id', photoId);

    if (error) throw error;

    logger.info('[PhotosService] Photo status updated successfully');
  } catch (error) {
    logger.error('[PhotosService] Error updating photo status:', error);
    throw error;
  }
}

/**
 * Supprime une photo (base de données et storage)
 */
export async function deletePhoto(
  photoId: string,
  photoUrl: string
): Promise<void> {
  try {
    logger.debug('[PhotosService] Deleting photo:', { photoId });

    // Supprimer de la base de données
    const { error: dbError } = await supabase
      .from('photo_submissions')
      .delete()
      .eq('id', photoId);

    if (dbError) throw dbError;

    // Extraire le chemin du fichier depuis l'URL
    // URL format: https://xxx.supabase.co/storage/v1/object/public/dentist-photos/path/file.jpg
    const urlParts = photoUrl.split('/dentist-photos/');
    if (urlParts.length > 1) {
      const filePath = urlParts[1];

      // Supprimer du storage
      const { error: storageError } = await supabase.storage
        .from('dentist-photos')
        .remove([filePath]);

      if (storageError) {
        logger.warn('[PhotosService] Error deleting file from storage:', storageError);
        // Ne pas throw, la suppression DB est plus importante
      }
    }

    logger.info('[PhotosService] Photo deleted successfully');
  } catch (error) {
    logger.error('[PhotosService] Error deleting photo:', error);
    throw error;
  }
}

/**
 * Upload une nouvelle photo
 */
export async function uploadPhoto(
  file: File,
  laboratoryId: string,
  dentistId: string,
  patientName: string,
  notes?: string
): Promise<PhotoSubmission> {
  try {
    logger.debug('[PhotosService] Uploading photo:', {
      fileName: file.name,
      fileSize: file.size,
      laboratoryId,
      dentistId,
      patientName,
    });

    // Upload du fichier
    const fileExt = file.name.split('.').pop();
    const fileName = `${laboratoryId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('dentist-photos')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    // Récupérer l'URL publique
    const {
      data: { publicUrl },
    } = supabase.storage.from('dentist-photos').getPublicUrl(fileName);

    // Créer l'enregistrement en base
    const { data, error: insertError } = await supabase
      .from('photo_submissions')
      .insert({
        dentist_id: dentistId,
        laboratory_id: laboratoryId,
        patient_name: patientName,
        photo_url: publicUrl,
        notes: notes || null,
        status: 'pending',
      })
      .select(
        `
        *,
        dentist_accounts (
          name,
          email,
          phone
        )
      `
      )
      .single();

    if (insertError) throw insertError;

    logger.info('[PhotosService] Photo uploaded successfully');

    return data as PhotoSubmission;
  } catch (error) {
    logger.error('[PhotosService] Error uploading photo:', error);
    throw error;
  }
}

/**
 * Marque un fichier STL comme vu
 */
export async function markStlFileAsViewed(fileId: string): Promise<void> {
  try {
    logger.debug('[PhotosService] Marking STL file as viewed:', { fileId });

    const { error } = await supabase.rpc('mark_stl_file_as_viewed', {
      p_file_id: fileId,
    });

    if (error) throw error;

    logger.info('[PhotosService] STL file marked as viewed');
  } catch (error) {
    logger.error('[PhotosService] Error marking STL file as viewed:', error);
    throw error;
  }
}

/**
 * Télécharge un fichier STL
 */
export async function downloadStlFile(
  filePath: string,
  fileName: string
): Promise<string> {
  try {
    logger.debug('[PhotosService] Creating signed URL for STL file:', {
      filePath,
      fileName,
    });

    const { data, error } = await supabase.storage
      .from('stl-files')
      .createSignedUrl(filePath, 3600); // 1 heure

    if (error) throw error;

    if (!data?.signedUrl) {
      throw new Error('Failed to create signed URL');
    }

    logger.info('[PhotosService] Signed URL created successfully');

    return data.signedUrl;
  } catch (error) {
    logger.error('[PhotosService] Error creating signed URL:', error);
    throw error;
  }
}
