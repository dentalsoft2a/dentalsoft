import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  Search, Filter, Plus, Clock, AlertTriangle, CheckCircle2,
  TrendingUp, Users, Calendar, LayoutGrid, List, ChevronDown,
  MessageSquare, User, Tag, Layers, ArrowUpCircle, ArrowDownCircle,
  MinusCircle, X, FileText, Edit2, Trash2, Briefcase
} from 'lucide-react';
import { useLockScroll } from '../../hooks/useLockScroll';
import { useEmployeePermissions } from '../../hooks/useEmployeePermissions';
import WorkDetailModal from './WorkDetailModal';
import WorkKanbanView from './WorkKanbanView';
import { ExtensionGuard } from '../common/ExtensionGuard';
import { DEFAULT_PRODUCTION_STAGES, type StandardProductionStage } from '../../config/defaultProductionStages';

interface DeliveryNote {
  id: string;
  delivery_number: string;
  date: string;
  patient_name: string | null;
  items?: Array<{ description: string; quantity: number }>;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'urgent' | 'high' | 'normal' | 'low';
  progress_percentage: number;
  due_date: string | null;
  is_blocked: boolean;
  blocked_reason: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  current_stage_id: string | null;
  dentists?: { name: string };
  current_stage?: { name: string; color: string };
  assignments?: Array<{
    laboratory_employee_id: string;
    employee: { id: string; full_name: string };
  }>;
  comments_count?: number;
}

type WorkStage = StandardProductionStage;

interface Stats {
  total: number;
  inProgress: number;
  completed: number;
  overdue: number;
  blocked: number;
  urgent: number;
}

export default function WorkManagementPage() {
  const { user } = useAuth();
  const employeePerms = useEmployeePermissions();
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<DeliveryNote[]>([]);
  const [workStages, setWorkStages] = useState<WorkStage[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
    blocked: 0,
    urgent: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [showMyWorksOnly, setShowMyWorksOnly] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    assignee: 'all',
    dueDate: 'all'
  });

  useLockScroll(!!selectedNote);

  useEffect(() => {
    if (user) {
      setWorkStages(DEFAULT_PRODUCTION_STAGES);
      loadDeliveryNotes();
    }
  }, [user]);

  useEffect(() => {
    if (user && !employeePerms.loading) {
      console.log('[WorkManagement] Loading data with permissions:', {
        isEmployee: employeePerms.isEmployee,
        canEditAllStages: employeePerms.canEditAllStages,
        allowedStagesCount: employeePerms.allowedStages.length,
        allowedStages: employeePerms.allowedStages
      });
      setWorkStages(DEFAULT_PRODUCTION_STAGES);
      loadDeliveryNotes();
    }
  }, [employeePerms.loading, employeePerms.allowedStages.join(','), employeePerms.canEditAllStages]);

  useEffect(() => {
    applyFilters();
  }, [deliveryNotes, searchTerm, filters, showMyWorksOnly, employeePerms.isEmployee]);


  const loadDeliveryNotes = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const userId = employeePerms.isEmployee ? employeePerms.laboratoryId : user.id;
      if (!userId) return;

      const { data, error } = await supabase
        .from('delivery_notes')
        .select(`
          *,
          dentists(name)
        `)
        .eq('user_id', userId)
        .neq('status', 'completed')
        .neq('status', 'refused')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const notesWithDetails = await Promise.all(
        (data || []).map(async (note) => {
          const { data: assignments } = await supabase
            .from('work_assignments')
            .select('laboratory_employee_id, employee:laboratory_employees(id, full_name)')
            .eq('delivery_note_id', note.id);

          const { count } = await supabase
            .from('work_comments')
            .select('*', { count: 'exact', head: true })
            .eq('delivery_note_id', note.id);

          const currentStage = DEFAULT_PRODUCTION_STAGES.find(s => s.id === note.current_stage_id);

          return {
            ...note,
            assignments: assignments || [],
            comments_count: count || 0,
            current_stage: currentStage ? { name: currentStage.name, color: currentStage.color } : undefined
          };
        })
      );

      setDeliveryNotes(notesWithDetails);
      calculateStats(notesWithDetails);
    } catch (error) {
      console.error('Error loading delivery notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (notes: DeliveryNote[]) => {
    const now = new Date();
    const stats: Stats = {
      total: notes.length,
      inProgress: notes.filter(n => n.status === 'in_progress').length,
      completed: notes.filter(n => n.status === 'completed').length,
      overdue: notes.filter(n => n.due_date && new Date(n.due_date) < now && n.status !== 'completed').length,
      blocked: notes.filter(n => n.is_blocked).length,
      urgent: notes.filter(n => n.priority === 'urgent').length
    };
    setStats(stats);
  };

  const applyFilters = () => {
    let filtered = [...deliveryNotes];

    // Employee filter: show only notes in allowed stages (strict filtering)
    if (employeePerms.isEmployee && !employeePerms.canEditAllStages) {
      filtered = filtered.filter(note => {
        // If no stage assigned yet, check if employee has access to first stage
        if (!note.current_stage_id) {
          const firstStage = DEFAULT_PRODUCTION_STAGES[0];
          const canAccessFirstStage = employeePerms.allowedStages.includes(firstStage.id);
          console.log('[WorkManagement] Note without stage:', {
            deliveryNumber: note.delivery_number,
            canAccessFirstStage
          });
          return canAccessFirstStage;
        }

        // Only show notes in allowed stages (regardless of assignment)
        const isAllowed = employeePerms.allowedStages.includes(note.current_stage_id);
        console.log('[WorkManagement] Note filter:', {
          deliveryNumber: note.delivery_number,
          currentStageId: note.current_stage_id,
          isAllowed,
          allowedStages: employeePerms.allowedStages
        });

        return isAllowed;
      });
    }

    // Filter by "My Works Only" toggle
    if (showMyWorksOnly && employeePerms.isEmployee) {
      filtered = filtered.filter(note =>
        note.assignments?.some(
          assignment => assignment.laboratory_employee_id === employeePerms.employeeId
        )
      );
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(note =>
        note.delivery_number.toLowerCase().includes(search) ||
        note.patient_name?.toLowerCase().includes(search) ||
        note.dentists?.name.toLowerCase().includes(search)
      );
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(note => note.status === filters.status);
    }

    if (filters.priority !== 'all') {
      filtered = filtered.filter(note => note.priority === filters.priority);
    }

    if (filters.dueDate === 'overdue') {
      const now = new Date();
      filtered = filtered.filter(note =>
        note.due_date && new Date(note.due_date) < now && note.status !== 'completed'
      );
    } else if (filters.dueDate === 'today') {
      const today = new Date().toISOString().split('T')[0];
      filtered = filtered.filter(note => note.due_date === today);
    } else if (filters.dueDate === 'week') {
      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      filtered = filtered.filter(note =>
        note.due_date && new Date(note.due_date) <= weekFromNow
      );
    }

    setFilteredNotes(filtered);
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <ArrowUpCircle className="w-4 h-4 text-red-500" />;
      case 'high':
        return <ArrowUpCircle className="w-4 h-4 text-orange-500" />;
      case 'low':
        return <ArrowDownCircle className="w-4 h-4 text-blue-500" />;
      default:
        return <MinusCircle className="w-4 h-4 text-slate-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'low': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 75) return 'from-emerald-500 to-teal-500';
    if (percentage >= 40) return 'from-primary-500 to-cyan-500';
    return 'from-red-500 to-orange-500';
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
          <span className="text-slate-600 font-medium">Chargement...</span>
        </div>
      </div>
    );
  }

  return (
    <ExtensionGuard
      featureKey="work_management"
      fallbackMessage="La gestion avancée des travaux avec Kanban, affectation des employés et suivi de progression nécessite l'extension Gestion des Travaux."
    >
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 md:gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Gestion des Travaux</h1>
            <p className="text-sm md:text-base text-slate-600 mt-1">Suivez l'avancement de vos bons de livraison en temps réel</p>
          </div>
        <button
          onClick={() => setSelectedNote('new')}
          className="flex items-center justify-center gap-2 px-4 md:px-5 py-2.5 md:py-3 bg-gradient-to-r from-primary-600 to-cyan-600 text-white rounded-xl hover:from-primary-700 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl text-sm md:text-base"
        >
          <Plus className="w-4 h-4 md:w-5 md:h-5" />
          Nouveau travail
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 md:gap-4">
        <div className="bg-white rounded-lg md:rounded-xl p-3 md:p-4 border border-slate-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-slate-600 font-medium">Total</p>
              <p className="text-xl md:text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mt-0.5 md:mt-1">{stats.total}</p>
            </div>
            <div className="w-8 h-8 md:w-12 md:h-12 rounded-lg bg-gradient-to-br from-slate-500 to-slate-600 shadow-lg flex items-center justify-center">
              <Layers className="w-4 h-4 md:w-6 md:h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg md:rounded-xl p-3 md:p-4 border border-slate-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-slate-600 font-medium">En cours</p>
              <p className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary-900 to-primary-700 bg-clip-text text-transparent mt-0.5 md:mt-1">{stats.inProgress}</p>
            </div>
            <div className="w-8 h-8 md:w-12 md:h-12 rounded-lg bg-gradient-to-br from-primary-500 to-cyan-500 shadow-lg flex items-center justify-center">
              <Clock className="w-4 h-4 md:w-6 md:h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg md:rounded-xl p-3 md:p-4 border border-slate-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-slate-600 font-medium">Terminés</p>
              <p className="text-xl md:text-2xl font-bold bg-gradient-to-r from-emerald-900 to-emerald-700 bg-clip-text text-transparent mt-0.5 md:mt-1">{stats.completed}</p>
            </div>
            <div className="w-8 h-8 md:w-12 md:h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 md:w-6 md:h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg md:rounded-xl p-3 md:p-4 border border-slate-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-slate-600 font-medium">En retard</p>
              <p className="text-xl md:text-2xl font-bold bg-gradient-to-r from-red-900 to-red-700 bg-clip-text text-transparent mt-0.5 md:mt-1">{stats.overdue}</p>
            </div>
            <div className="w-8 h-8 md:w-12 md:h-12 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 shadow-lg flex items-center justify-center">
              <Calendar className="w-4 h-4 md:w-6 md:h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg md:rounded-xl p-3 md:p-4 border border-slate-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-slate-600 font-medium">Bloqués</p>
              <p className="text-xl md:text-2xl font-bold bg-gradient-to-r from-orange-900 to-orange-700 bg-clip-text text-transparent mt-0.5 md:mt-1">{stats.blocked}</p>
            </div>
            <div className="w-8 h-8 md:w-12 md:h-12 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 md:w-6 md:h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg md:rounded-xl p-3 md:p-4 border border-slate-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-slate-600 font-medium">Urgents</p>
              <p className="text-xl md:text-2xl font-bold bg-gradient-to-r from-red-900 to-red-700 bg-clip-text text-transparent mt-0.5 md:mt-1">{stats.urgent}</p>
            </div>
            <div className="w-8 h-8 md:w-12 md:h-12 rounded-lg bg-gradient-to-br from-red-500 to-rose-500 shadow-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 md:w-6 md:h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg md:rounded-xl shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300">
        <div className="p-3 md:p-4 border-b border-slate-200">
          <div className="flex flex-col lg:flex-row gap-3 md:gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 md:pl-10 pr-3 md:pr-4 py-2 md:py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm md:text-base"
              />
            </div>

            <div className="flex gap-2">
              {employeePerms.isEmployee && employeePerms.canViewAllWorks && (
                <button
                  onClick={() => setShowMyWorksOnly(!showMyWorksOnly)}
                  className={`flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-lg border transition-all text-sm md:text-base ${
                    showMyWorksOnly
                      ? 'bg-primary-50 border-primary-300 text-primary-700'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                  title="Afficher uniquement mes travaux assignés"
                >
                  <Briefcase className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="hidden md:inline">Mes travaux</span>
                </button>
              )}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-lg border transition-all text-sm md:text-base ${
                  showFilters
                    ? 'bg-primary-50 border-primary-300 text-primary-700'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Filter className="w-4 h-4 md:w-5 md:h-5" />
                <span className="hidden sm:inline">Filtres</span>
                <ChevronDown className={`w-3.5 h-3.5 md:w-4 md:h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>

              <div className="flex bg-slate-100 rounded-lg p-0.5 md:p-1">
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 rounded-md transition-all ${
                    viewMode === 'kanban'
                      ? 'bg-white text-primary-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span className="hidden sm:inline text-xs md:text-sm font-medium">Kanban</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 rounded-md transition-all ${
                    viewMode === 'list'
                      ? 'bg-white text-primary-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <List className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span className="hidden sm:inline text-xs md:text-sm font-medium">Liste</span>
                </button>
              </div>
            </div>
          </div>

          {showFilters && (
            <div className="mt-3 md:mt-4 grid grid-cols-1 md:grid-cols-4 gap-3 p-3 md:p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <label className="block text-xs md:text-sm font-medium text-slate-700 mb-1">Statut</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-2.5 md:px-3 py-1.5 md:py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm md:text-base"
                >
                  <option value="all">Tous</option>
                  <option value="pending">En attente</option>
                  <option value="in_progress">En cours</option>
                  <option value="completed">Terminé</option>
                </select>
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-slate-700 mb-1">Priorité</label>
                <select
                  value={filters.priority}
                  onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                  className="w-full px-2.5 md:px-3 py-1.5 md:py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm md:text-base"
                >
                  <option value="all">Toutes</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">Haute</option>
                  <option value="normal">Normale</option>
                  <option value="low">Basse</option>
                </select>
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-slate-700 mb-1">Échéance</label>
                <select
                  value={filters.dueDate}
                  onChange={(e) => setFilters({ ...filters, dueDate: e.target.value })}
                  className="w-full px-2.5 md:px-3 py-1.5 md:py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm md:text-base"
                >
                  <option value="all">Toutes</option>
                  <option value="overdue">En retard</option>
                  <option value="today">Aujourd'hui</option>
                  <option value="week">Cette semaine</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => setFilters({ status: 'all', priority: 'all', assignee: 'all', dueDate: 'all' })}
                  className="w-full px-3 md:px-4 py-1.5 md:py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium text-sm md:text-base"
                >
                  <X className="w-3.5 h-3.5 md:w-4 md:h-4 inline mr-1.5 md:mr-2" />
                  Réinitialiser
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-4">
          {viewMode === 'kanban' ? (
            <WorkKanbanView
              deliveryNotes={filteredNotes}
              workStages={workStages}
              onSelectNote={setSelectedNote}
              onRefresh={loadDeliveryNotes}
            />
          ) : (
            <div className="space-y-3">
              {filteredNotes.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">Aucun travail trouvé</p>
                </div>
              ) : (
                filteredNotes.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => setSelectedNote(note.id)}
                    className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-slate-900 group-hover:text-primary-600 transition-colors">
                            {note.delivery_number}
                          </h3>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${getPriorityColor(note.priority)}`}>
                            {getPriorityIcon(note.priority)}
                            {note.priority === 'urgent' ? 'Urgent' : note.priority === 'high' ? 'Haute' : note.priority === 'low' ? 'Basse' : 'Normale'}
                          </span>
                          {note.is_blocked && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                              <AlertTriangle className="w-3 h-3" />
                              Bloqué
                            </span>
                          )}
                          {note.due_date && isOverdue(note.due_date) && note.status !== 'completed' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                              <Clock className="w-3 h-3" />
                              En retard
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 mb-3">
                          <div className="flex items-center gap-1.5">
                            <User className="w-4 h-4" />
                            <span>{note.dentists?.name}</span>
                          </div>
                          {note.patient_name && (
                            <div className="flex items-center gap-1.5">
                              <User className="w-4 h-4" />
                              <span>{note.patient_name}</span>
                            </div>
                          )}
                          {note.due_date && (
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-4 h-4" />
                              <span>{new Date(note.due_date).toLocaleDateString('fr-FR')}</span>
                            </div>
                          )}
                          {note.current_stage && (
                            <div className="flex items-center gap-1.5">
                              <Tag className="w-4 h-4" style={{ color: note.current_stage.color }} />
                              <span>{note.current_stage.name}</span>
                            </div>
                          )}
                          {note.comments_count > 0 && (
                            <div className="flex items-center gap-1.5">
                              <MessageSquare className="w-4 h-4" />
                              <span>{note.comments_count}</span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600 font-medium">Progression</span>
                            <span className="text-slate-900 font-bold">{note.progress_percentage}%</span>
                          </div>
                          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full bg-gradient-to-r ${getProgressColor(note.progress_percentage)} transition-all duration-500`}
                              style={{ width: `${note.progress_percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedNote(note.id);
                        }}
                        className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {selectedNote && (
        <WorkDetailModal
          noteId={selectedNote === 'new' ? null : selectedNote}
          workStages={workStages}
          onClose={() => setSelectedNote(null)}
          onSave={() => {
            setSelectedNote(null);
            loadDeliveryNotes();
          }}
        />
      )}
      </div>
    </ExtensionGuard>
  );
}
