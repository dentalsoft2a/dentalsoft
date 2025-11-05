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
    role_name: ''
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
        role_name: employee.role_name
      });
    } else {
      setEditingEmployee(null);
      setEmployeeForm({ email: '', full_name: '', role_name: '' });
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

    try {
      if (editingEmployee) {
        const { error } = await supabase
          .from('laboratory_employees')
          .update({
            email: employeeForm.email,
            full_name: employeeForm.full_name,
            role_name: employeeForm.role_name
          })
          .eq('id', editingEmployee.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('laboratory_employees')
          .insert({
            laboratory_profile_id: user.id,
            email: employeeForm.email,
            full_name: employeeForm.full_name,
            role_name: employeeForm.role_name,
            created_by: user.id
          });

        if (error) throw error;
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
            <Users className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-slate-800">Employés</h2>
          </div>
          <button
            onClick={() => openEmployeeModal()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5" />
            Ajouter un employé
          </button>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Nom</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Rôle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
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
                  <tr key={employee.id}>
                    <td className="px-6 py-4 text-sm text-slate-900">{employee.full_name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{employee.email}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{employee.role_name}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleEmployeeStatus(employee)}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          employee.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {employee.is_active ? 'Actif' : 'Inactif'}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEmployeeModal(employee)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteEmployee(employee.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition"
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
            <Shield className="w-6 h-6 text-purple-600" />
            <h2 className="text-2xl font-bold text-slate-800">Rôles et Permissions</h2>
          </div>
          <button
            onClick={() => openRoleModal()}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            <Plus className="w-5 h-5" />
            Ajouter un rôle
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.length === 0 ? (
            <div className="col-span-full bg-white rounded-lg shadow p-8 text-center text-slate-500">
              Aucun rôle défini. Cliquez sur "Ajouter un rôle" pour commencer.
            </div>
          ) : (
            roles.map(role => (
              <div key={role.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-800">{role.role_name}</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openRoleModal(role)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteRole(role.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-slate-600 font-medium">Accès aux menus:</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(role.menu_access || {}).map(([key, value]) => {
                      if (!value) return null;
                      const menu = AVAILABLE_MENUS.find(m => m.key === key);
                      return (
                        <span
                          key={key}
                          className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-800">
                {editingEmployee ? 'Modifier l\'employé' : 'Nouvel employé'}
              </h3>
              <button
                onClick={() => setShowEmployeeModal(false)}
                className="p-2 hover:bg-slate-100 rounded transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nom complet
                </label>
                <input
                  type="text"
                  value={employeeForm.full_name}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Jean Dupont"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={employeeForm.email}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="jean@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Rôle
                </label>
                <select
                  value={employeeForm.role_name}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, role_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEmployeeModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={saveEmployee}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Save className="w-4 h-4" />
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {showRoleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-800">
                {editingRole ? 'Modifier le rôle' : 'Nouveau rôle'}
              </h3>
              <button
                onClick={() => setShowRoleModal(false)}
                className="p-2 hover:bg-slate-100 rounded transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nom du rôle
                </label>
                <input
                  type="text"
                  value={roleForm.role_name}
                  onChange={(e) => setRoleForm({ ...roleForm, role_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Technicien, Assistant, Manager..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Accès aux menus
                </label>
                <div className="space-y-2">
                  {AVAILABLE_MENUS.map(menu => (
                    <label key={menu.key} className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={roleForm.menu_access[menu.key] || false}
                        onChange={() => toggleMenuAccess(menu.key)}
                        className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm text-slate-700">{menu.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowRoleModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={saveRole}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
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
