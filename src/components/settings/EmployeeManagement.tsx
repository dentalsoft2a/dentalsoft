import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Users, Plus, Edit, Trash2, Shield, Save, X } from 'lucide-react';

interface Employee {
  id: string;
  email: string;
  full_name: string;
  role_name: string;
  is_active: boolean;
  user_profile_id: string | null;
  created_at: string;
}

interface RolePermission {
  id: string;
  role_name: string;
  menu_access: Record<string, boolean>;
  permissions: Record<string, any>;
}

const AVAILABLE_MENUS = [
  { key: 'dashboard', label: 'Tableau de bord' },
  { key: 'calendar', label: 'Calendrier' },
  { key: 'proformas', label: 'Devis' },
  { key: 'delivery-notes', label: 'Bons de livraison' },
  { key: 'invoices', label: 'Factures' },
  { key: 'photos', label: 'Photos reçues' },
  { key: 'dentists', label: 'Dentistes' },
  { key: 'catalog', label: 'Catalogue' },
  { key: 'resources', label: 'Ressources' },
  { key: 'help-center', label: 'Centre d\'aide' },
  { key: 'settings', label: 'Paramètres' }
];

export default function EmployeeManagement() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editingRole, setEditingRole] = useState<RolePermission | null>(null);

  const [employeeForm, setEmployeeForm] = useState({
    email: '',
    full_name: '',
    role_name: '',
    password: ''
  });

  const [roleForm, setRoleForm] = useState({
    role_name: '',
    menu_access: {} as Record<string, boolean>
  });

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      const [employeesRes, rolesRes] = await Promise.all([
        supabase
          .from('laboratory_employees')
          .select('*')
          .eq('laboratory_profile_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('laboratory_role_permissions')
          .select('*')
          .eq('laboratory_profile_id', user.id)
          .order('role_name')
      ]);

      if (employeesRes.error) throw employeesRes.error;
      if (rolesRes.error) throw rolesRes.error;

      setEmployees(employeesRes.data || []);
      setRoles(rolesRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const openEmployeeModal = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee);
      setEmployeeForm({
        email: employee.email,
        full_name: employee.full_name,
        role_name: employee.role_name,
        password: ''
      });
    } else {
      setEditingEmployee(null);
      setEmployeeForm({ email: '', full_name: '', role_name: '', password: '' });
    }
    setShowEmployeeModal(true);
  };

  const openRoleModal = (role?: RolePermission) => {
    if (role) {
      setEditingRole(role);
      setRoleForm({
        role_name: role.role_name,
        menu_access: role.menu_access
      });
    } else {
      setEditingRole(null);
      setRoleForm({
        role_name: '',
        menu_access: {}
      });
    }
    setShowRoleModal(true);
  };

  const saveEmployee = async () => {
    if (!user || !employeeForm.email || !employeeForm.full_name || !employeeForm.role_name) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    if (!editingEmployee && !employeeForm.password) {
      alert('Veuillez définir un mot de passe pour le nouvel employé');
      return;
    }

    if (employeeForm.password && employeeForm.password.length < 6) {
      alert('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    try {
      if (editingEmployee) {
        const updates: any = {
          email: employeeForm.email,
          full_name: employeeForm.full_name,
          role_name: employeeForm.role_name
        };

        const { error } = await supabase
          .from('laboratory_employees')
          .update(updates)
          .eq('id', editingEmployee.id);

        if (error) throw error;

        if (employeeForm.password && editingEmployee.user_profile_id) {
          const { error: pwError } = await supabase.auth.admin.updateUserById(
            editingEmployee.user_profile_id,
            { password: employeeForm.password }
          );
          if (pwError) {
            console.error('Error updating password:', pwError);
            alert('Employé mis à jour mais erreur lors de la mise à jour du mot de passe');
          }
        }
      } else {
        try {
          const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: employeeForm.email,
            password: employeeForm.password,
            email_confirm: true,
            user_metadata: {
              full_name: employeeForm.full_name
            }
          });

          if (authError) throw authError;

          if (!authData.user) {
            throw new Error('Échec de la création du compte utilisateur');
          }

          const { error: employeeError } = await supabase
            .from('laboratory_employees')
            .insert({
              laboratory_profile_id: user.id,
              user_profile_id: authData.user.id,
              email: employeeForm.email,
              full_name: employeeForm.full_name,
              role_name: employeeForm.role_name,
              created_by: user.id
            });

          if (employeeError) throw employeeError;
        } catch (createError: any) {
          console.error('Error creating employee:', createError);
          alert(`Erreur lors de la création de l'employé: ${createError.message}`);
          return;
        }
      }

      setShowEmployeeModal(false);
      loadData();
    } catch (error: any) {
      console.error('Error saving employee:', error);
      alert('Erreur: ' + error.message);
    }
  };

  const toggleEmployeeStatus = async (employee: Employee) => {
    try {
      const { error } = await supabase
        .from('laboratory_employees')
        .update({ is_active: !employee.is_active })
        .eq('id', employee.id);

      if (error) throw error;
      loadData();
    } catch (error: any) {
      console.error('Error toggling employee status:', error);
      alert('Erreur: ' + error.message);
    }
  };

  const deleteEmployee = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet employé ?')) return;

    try {
      const { error } = await supabase
        .from('laboratory_employees')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadData();
    } catch (error: any) {
      console.error('Error deleting employee:', error);
      alert('Erreur: ' + error.message);
    }
  };

  const saveRole = async () => {
    if (!user || !roleForm.role_name) {
      alert('Veuillez renseigner le nom du rôle');
      return;
    }

    try {
      if (editingRole) {
        const { error } = await supabase
          .from('laboratory_role_permissions')
          .update({
            role_name: roleForm.role_name,
            menu_access: roleForm.menu_access
          })
          .eq('id', editingRole.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('laboratory_role_permissions')
          .insert({
            laboratory_profile_id: user.id,
            role_name: roleForm.role_name,
            menu_access: roleForm.menu_access,
            permissions: {}
          });

        if (error) throw error;
      }

      setShowRoleModal(false);
      loadData();
    } catch (error: any) {
      console.error('Error saving role:', error);
      alert('Erreur: ' + error.message);
    }
  };

  const deleteRole = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce rôle ?')) return;

    try {
      const { error } = await supabase
        .from('laboratory_role_permissions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadData();
    } catch (error: any) {
      console.error('Error deleting role:', error);
      alert('Erreur: ' + error.message);
    }
  };

  const toggleMenuAccess = (menuKey: string) => {
    setRoleForm(prev => ({
      ...prev,
      menu_access: {
        ...prev.menu_access,
        [menuKey]: !prev.menu_access[menuKey]
      }
    }));
  };

  if (loading) {
    return <div className="text-center py-12">Chargement...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Employés</h2>
              <p className="text-slate-600">Gérez les comptes employés de votre laboratoire</p>
            </div>
          </div>
          <button
            onClick={() => openEmployeeModal()}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 transition"
          >
            <Plus className="w-5 h-5" />
            Ajouter un employé
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Nom</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Rôle</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    Aucun employé. Cliquez sur "Ajouter un employé" pour commencer.
                  </td>
                </tr>
              ) : (
                employees.map(employee => (
                  <tr key={employee.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{employee.full_name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{employee.email}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                        {employee.role_name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleEmployeeStatus(employee)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
                          employee.is_active
                            ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200'
                            : 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200'
                        }`}
                      >
                        {employee.is_active ? 'Actif' : 'Inactif'}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEmployeeModal(employee)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteEmployee(employee.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Rôles et Permissions</h2>
              <p className="text-slate-600">Définissez les accès pour chaque rôle</p>
            </div>
          </div>
          <button
            onClick={() => openRoleModal()}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition"
          >
            <Plus className="w-5 h-5" />
            Ajouter un rôle
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.length === 0 ? (
            <div className="col-span-full bg-white rounded-2xl shadow-lg border border-slate-200 p-12 text-center">
              <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Aucun rôle défini</h3>
              <p className="text-slate-600">Cliquez sur "Ajouter un rôle" pour commencer</p>
            </div>
          ) : (
            roles.map(role => (
              <div key={role.id} className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 hover:shadow-xl transition">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900">{role.role_name}</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openRoleModal(role)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Modifier"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteRole(role.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-slate-600 font-semibold">Accès aux menus:</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(role.menu_access || {}).map(([key, value]) => {
                      if (!value) return null;
                      const menu = AVAILABLE_MENUS.find(m => m.key === key);
                      return (
                        <span
                          key={key}
                          className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full border border-purple-200"
                        >
                          {menu?.label || key}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showEmployeeModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowEmployeeModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">
                {editingEmployee ? 'Modifier l\'employé' : 'Nouvel employé'}
              </h3>
              <button
                onClick={() => setShowEmployeeModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Nom complet
                </label>
                <input
                  type="text"
                  value={employeeForm.full_name}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, full_name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Jean Dupont"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={employeeForm.email}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="jean@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Rôle
                </label>
                <select
                  value={employeeForm.role_name}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, role_name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sélectionner un rôle</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.role_name}>
                      {role.role_name}
                    </option>
                  ))}
                </select>
                {roles.length === 0 && (
                  <p className="text-sm text-amber-600 mt-1">
                    Veuillez d'abord créer un rôle dans la section "Rôles et Permissions"
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Mot de passe {editingEmployee && <span className="text-slate-500 font-normal">(laisser vide pour ne pas modifier)</span>}
                </label>
                <input
                  type="password"
                  value={employeeForm.password}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, password: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={editingEmployee ? "Nouveau mot de passe" : "Minimum 6 caractères"}
                  minLength={6}
                />
                <p className="text-xs text-slate-500 mt-1">
                  {editingEmployee
                    ? "Saisissez un nouveau mot de passe uniquement si vous souhaitez le modifier"
                    : "L'employé utilisera cet email et ce mot de passe pour se connecter"}
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEmployeeModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={saveEmployee}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 transition"
              >
                <Save className="w-4 h-4" />
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {showRoleModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowRoleModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">
                {editingRole ? 'Modifier le rôle' : 'Nouveau rôle'}
              </h3>
              <button
                onClick={() => setShowRoleModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Nom du rôle
                </label>
                <input
                  type="text"
                  value={roleForm.role_name}
                  onChange={(e) => setRoleForm({ ...roleForm, role_name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Technicien, Assistant, Manager..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Accès aux menus
                </label>
                <div className="space-y-2">
                  {AVAILABLE_MENUS.map(menu => (
                    <label key={menu.key} className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-purple-50 cursor-pointer transition">
                      <input
                        type="checkbox"
                        checked={roleForm.menu_access[menu.key] || false}
                        onChange={() => toggleMenuAccess(menu.key)}
                        className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm text-slate-700 font-medium">{menu.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowRoleModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={saveRole}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition"
              >
                <Save className="w-4 h-4" />
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
