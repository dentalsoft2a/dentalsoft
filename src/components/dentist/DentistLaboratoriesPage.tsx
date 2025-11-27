import { useEffect, useState } from 'react';
import { Search, Mail, Phone, MapPin, Star, StarOff, Building2, Package, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useDebounce } from '../../hooks/useDebounce';
import { usePagination } from '../../hooks/usePagination';
import PaginationControls from '../common/PaginationControls';

interface Laboratory {
  id: string;
  laboratory_name: string;
  laboratory_email: string;
  laboratory_phone: string;
  laboratory_address: string;
  isFavorite?: boolean;
  totalOrders?: number;
  activeOrders?: number;
}

export default function DentistLaboratoriesPage() {
  const { user } = useAuth();
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    if (user) {
      loadLaboratories();
    }
  }, [user]);

  const loadLaboratories = async () => {
    if (!user) return;

    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, laboratory_name, laboratory_email, laboratory_phone, laboratory_address')
        .not('laboratory_name', 'is', null)
        .order('laboratory_name');

      if (profilesError) throw profilesError;

      // Filtrer les laboratoires qui ont un nom valide et au moins un email
      const validLabs = (profilesData || []).filter(lab =>
        lab.laboratory_name &&
        lab.laboratory_name.trim().length > 0 &&
        lab.laboratory_email &&
        lab.laboratory_email.trim().length > 0
      );

      const { data: favoritesData } = await supabase
        .from('dentist_favorite_laboratories')
        .select('laboratory_profile_id')
        .eq('dentist_id', user.id);

      const favoriteIds = new Set(favoritesData?.map(f => f.laboratory_profile_id) || []);

      const labsWithStats = await Promise.all(
        validLabs.map(async (lab) => {
          const { data: ordersData } = await supabase
            .from('delivery_notes')
            .select('id, status')
            .eq('dentist_id', user.id)
            .eq('user_id', lab.id);

          const orders = ordersData || [];
          const activeOrders = orders.filter(o => o.status === 'pending' || o.status === 'in_progress');

          return {
            ...lab,
            isFavorite: favoriteIds.has(lab.id),
            totalOrders: orders.length,
            activeOrders: activeOrders.length,
          };
        })
      );

      labsWithStats.sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return 0;
      });

      setLaboratories(labsWithStats);
    } catch (error) {
      console.error('Error loading laboratories:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (labId: string) => {
    if (!user) return;

    try {
      const lab = laboratories.find(l => l.id === labId);
      if (!lab) return;

      if (lab.isFavorite) {
        const { error } = await supabase
          .from('dentist_favorite_laboratories')
          .delete()
          .eq('dentist_id', user.id)
          .eq('laboratory_profile_id', labId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('dentist_favorite_laboratories')
          .insert({
            dentist_id: user.id,
            laboratory_profile_id: labId,
          });

        if (error) throw error;
      }

      await loadLaboratories();
    } catch (error) {
      console.error('Error toggling favorite:', error);
      alert('Erreur lors de la mise à jour des favoris');
    }
  };

  const filteredLaboratories = laboratories.filter((lab) =>
    lab.laboratory_name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
    lab.laboratory_email?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
  );

  const pagination = usePagination(filteredLaboratories, { initialPageSize: 12 });
  const paginatedLaboratories = pagination.paginatedItems;

  return (
    <div>
      <div className="mb-6 md:mb-8 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Laboratoires</h1>
            <p className="text-slate-600 mt-1 md:mt-2 text-sm md:text-base">Gérez vos laboratoires partenaires</p>
          </div>
        </div>
      </div>

      <div className="mb-4 md:mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un laboratoire..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 md:pl-12 pr-4 md:pr-5 py-2.5 md:py-3.5 border border-slate-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 outline-none transition-all duration-200 hover:border-slate-400 bg-white shadow-sm placeholder:text-slate-400 text-sm md:text-base"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-600 bg-white rounded-2xl shadow-sm border border-slate-200">
          <div className="animate-pulse">Chargement...</div>
        </div>
      ) : filteredLaboratories.length === 0 ? (
        <div className="p-12 text-center bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-sm border border-slate-200">
          <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 text-lg">
            {searchTerm ? 'Aucun laboratoire trouvé' : 'Aucun laboratoire disponible'}
          </p>
          {!searchTerm && (
            <p className="text-slate-500 text-sm mt-2">
              Les laboratoires partenaires apparaîtront ici
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedLaboratories.map((lab) => (
              <div
                key={lab.id}
                className="bg-white rounded-2xl shadow-md border border-slate-200 hover:shadow-xl hover:border-blue-300 transition-all duration-300 overflow-hidden group"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 transition-transform duration-300">
                          {lab.laboratory_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-lg text-slate-900 group-hover:text-blue-700 transition-colors">
                              {lab.laboratory_name}
                            </h3>
                            {lab.isFavorite && (
                              <div className="flex items-center gap-1.5 px-2 py-1 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg">
                                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                <span className="text-xs font-bold text-amber-700">Favori</span>
                              </div>
                            )}
                          </div>
                          {lab.activeOrders !== undefined && lab.activeOrders > 0 ? (
                            <div className="flex items-center gap-1.5 mt-1">
                              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-sm shadow-emerald-500/50"></div>
                              <span className="text-xs font-medium text-emerald-600">
                                {lab.activeOrders} commande{lab.activeOrders > 1 ? 's' : ''} active{lab.activeOrders > 1 ? 's' : ''}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 mt-1">
                              <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                              <span className="text-xs font-medium text-slate-500">
                                Aucune commande active
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    {lab.laboratory_email && (
                      <div className="flex items-center gap-3 text-sm text-slate-600 group/item hover:text-blue-600 transition-colors">
                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center group-hover/item:bg-blue-50 transition-colors">
                          <Mail className="w-4 h-4" />
                        </div>
                        <span className="truncate">{lab.laboratory_email}</span>
                      </div>
                    )}

                    {lab.laboratory_phone && (
                      <div className="flex items-center gap-3 text-sm text-slate-600 group/item hover:text-blue-600 transition-colors">
                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center group-hover/item:bg-blue-50 transition-colors">
                          <Phone className="w-4 h-4" />
                        </div>
                        <span>{lab.laboratory_phone}</span>
                      </div>
                    )}

                    {lab.laboratory_address && (
                      <div className="flex items-center gap-3 text-sm text-slate-600 group/item hover:text-blue-600 transition-colors">
                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center group-hover/item:bg-blue-50 transition-colors">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <span className="line-clamp-2">{lab.laboratory_address}</span>
                      </div>
                    )}
                  </div>

                  {lab.totalOrders !== undefined && lab.totalOrders > 0 && (
                    <div className="pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Package className="w-4 h-4 text-blue-500" />
                          <span className="font-medium">
                            {lab.totalOrders} commande{lab.totalOrders === 1 ? '' : 's'}
                          </span>
                        </div>
                        {lab.activeOrders !== undefined && lab.activeOrders > 0 && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                            <span className="font-medium">
                              {lab.activeOrders} en cours
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => toggleFavorite(lab.id)}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-md font-medium ${
                        lab.isFavorite
                          ? 'bg-amber-500 text-white hover:bg-amber-600'
                          : 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                      }`}
                    >
                      {lab.isFavorite ? (
                        <>
                          <StarOff className="w-4 h-4" />
                          <span>Retirer des favoris</span>
                        </>
                      ) : (
                        <>
                          <Star className="w-4 h-4" />
                          <span>Ajouter aux favoris</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredLaboratories.length > 0 && (
            <PaginationControls
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              pageSize={pagination.pageSize}
              startIndex={pagination.startIndex}
              endIndex={pagination.endIndex}
              hasNextPage={pagination.hasNextPage}
              hasPrevPage={pagination.hasPrevPage}
              onNextPage={pagination.nextPage}
              onPrevPage={pagination.prevPage}
              onGoToPage={pagination.goToPage}
              onPageSizeChange={pagination.setPageSize}
              pageSizeOptions={[12, 24, 48]}
            />
          )}
        </>
      )}
    </div>
  );
}
