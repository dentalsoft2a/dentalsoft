import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchPhotoSubmissions,
  fetchStlFiles,
  fetchDentists,
  updatePhotoStatus,
  deletePhoto,
  uploadPhoto,
  markStlFileAsViewed,
  downloadStlFile,
  type PhotoFilters,
  type PhotosResponse,
  type StlFilesResponse,
  type DentistAccount,
} from '../services/photosService';

/**
 * Hook pour récupérer les photos avec pagination (25/page)
 * Cache: 5 minutes
 */
export function usePhotoSubmissions(
  laboratoryId: string | null,
  page: number = 1,
  filters: PhotoFilters = {}
) {
  return useQuery<PhotosResponse>({
    queryKey: ['photoSubmissions', laboratoryId, page, filters],
    queryFn: () => fetchPhotoSubmissions(laboratoryId!, page, filters),
    enabled: !!laboratoryId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    keepPreviousData: true, // Transitions de page fluides
    retry: 2,
  });
}

/**
 * Hook pour récupérer les fichiers STL avec pagination (25/page)
 * Cache: 5 minutes
 */
export function useStlFiles(
  laboratoryId: string | null,
  page: number = 1,
  viewedFilter: string = 'all'
) {
  return useQuery<StlFilesResponse>({
    queryKey: ['stlFiles', laboratoryId, page, viewedFilter],
    queryFn: () => fetchStlFiles(laboratoryId!, page, viewedFilter),
    enabled: !!laboratoryId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    keepPreviousData: true,
    retry: 2,
  });
}

/**
 * Hook pour récupérer la liste des dentistes
 * Cache: 15 minutes (données stables)
 */
export function useDentistsList() {
  return useQuery<DentistAccount[]>({
    queryKey: ['dentistsList'],
    queryFn: fetchDentists,
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
  });
}

/**
 * Mutation pour mettre à jour le statut d'une photo
 * Invalide automatiquement le cache de la page actuelle
 */
export function useUpdatePhotoStatus(
  laboratoryId: string | null,
  currentPage: number,
  filters: PhotoFilters
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ photoId, status }: { photoId: string; status: string }) =>
      updatePhotoStatus(photoId, status),
    onSuccess: () => {
      // Invalider seulement la page actuelle
      queryClient.invalidateQueries({
        queryKey: ['photoSubmissions', laboratoryId, currentPage, filters],
      });
    },
  });
}

/**
 * Mutation pour supprimer une photo
 * Invalide le cache de toutes les pages (car le total change)
 */
export function useDeletePhoto(laboratoryId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ photoId, photoUrl }: { photoId: string; photoUrl: string }) =>
      deletePhoto(photoId, photoUrl),
    onSuccess: () => {
      // Invalider toutes les pages car le total change
      queryClient.invalidateQueries({
        queryKey: ['photoSubmissions', laboratoryId],
      });
    },
  });
}

/**
 * Mutation pour uploader une photo
 * Invalide le cache et retourne à la page 1
 */
export function useUploadPhoto(laboratoryId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      file,
      dentistId,
      patientName,
      notes,
    }: {
      file: File;
      dentistId: string;
      patientName: string;
      notes?: string;
    }) => uploadPhoto(file, laboratoryId!, dentistId, patientName, notes),
    onSuccess: () => {
      // Invalider toutes les pages car nouvelle photo ajoutée
      queryClient.invalidateQueries({
        queryKey: ['photoSubmissions', laboratoryId],
      });
    },
  });
}

/**
 * Mutation pour marquer un fichier STL comme vu
 * Invalide le cache de la page actuelle
 */
export function useMarkStlViewed(
  laboratoryId: string | null,
  currentPage: number,
  viewedFilter: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fileId: string) => markStlFileAsViewed(fileId),
    onSuccess: () => {
      // Invalider la page actuelle des fichiers STL
      queryClient.invalidateQueries({
        queryKey: ['stlFiles', laboratoryId, currentPage, viewedFilter],
      });
    },
  });
}

/**
 * Mutation pour télécharger un fichier STL
 * Crée une URL signée et lance le téléchargement
 */
export function useDownloadStlFile() {
  return useMutation({
    mutationFn: ({ filePath, fileName }: { filePath: string; fileName: string }) =>
      downloadStlFile(filePath, fileName),
    onSuccess: (signedUrl, variables) => {
      // Créer un lien et cliquer dessus pour télécharger
      const link = document.createElement('a');
      link.href = signedUrl;
      link.download = variables.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
  });
}

/**
 * Helper pour précharger la page suivante
 * Améliore la perception de rapidité
 */
export function usePrefetchNextPage(
  laboratoryId: string | null,
  currentPage: number,
  totalPages: number,
  filters: PhotoFilters
) {
  const queryClient = useQueryClient();

  const prefetchNextPage = () => {
    if (currentPage < totalPages) {
      queryClient.prefetchQuery({
        queryKey: ['photoSubmissions', laboratoryId, currentPage + 1, filters],
        queryFn: () => fetchPhotoSubmissions(laboratoryId!, currentPage + 1, filters),
        staleTime: 5 * 60 * 1000,
      });
    }
  };

  return prefetchNextPage;
}

/**
 * Helper pour invalider manuellement le cache des photos
 */
export function useInvalidatePhotos() {
  const queryClient = useQueryClient();

  return (laboratoryId: string | null) => {
    queryClient.invalidateQueries({
      queryKey: ['photoSubmissions', laboratoryId],
    });
  };
}

/**
 * Helper pour invalider manuellement le cache des fichiers STL
 */
export function useInvalidateStlFiles() {
  const queryClient = useQueryClient();

  return (laboratoryId: string | null) => {
    queryClient.invalidateQueries({
      queryKey: ['stlFiles', laboratoryId],
    });
  };
}
