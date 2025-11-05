import { ReactNode, useState, useEffect } from 'react';
import {
  LayoutDashboard,
  FileText,
  Receipt,
  Truck,
  Users,
  Package,
  Settings,
  LogOut,
  Menu,
  X,
  Calendar,
  MessageSquare,
  CreditCard,
  Shield,
  Box,
  HelpCircle,
  AlertTriangle,
  Camera
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { supabase } from '../../lib/supabase';
import DentalCloudLogo from '../common/DentalCloudLogo';

interface DashboardLayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  isSuperAdmin?: boolean;
  lowStockCount?: number;
  lowStockResourcesCount?: number;
  hasValidSubscription?: boolean;
}

export default function DashboardLayout({ children, currentPage, onNavigate, isSuperAdmin, lowStockCount = 0, lowStockResourcesCount = 0, hasValidSubscription = true }: DashboardLayoutProps) {
  const { profile, userProfile, signOut, isEmployee, laboratoryId, employeeInfo } = useAuth();
  const { hasMenuAccess, isOwner, rolePermissions, loading: permissionsLoading } = usePermissions();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [laboratoryProfile, setLaboratoryProfile] = useState<any>(null);

  useEffect(() => {
    console.log('DashboardLayout - isEmployee:', isEmployee);
    console.log('DashboardLayout - employeeInfo:', employeeInfo);
    console.log('DashboardLayout - rolePermissions:', rolePermissions);
    console.log('DashboardLayout - permissionsLoading:', permissionsLoading);
  }, [isEmployee, employeeInfo, rolePermissions, permissionsLoading]);

  const isSubscriptionInactive = userProfile?.subscription_status !== 'active' && userProfile?.subscription_status !== 'trialing';
  const showSubscriptionWarning = isSubscriptionInactive && !isSuperAdmin;

  useEffect(() => {
    if (isEmployee && laboratoryId) {
      supabase
        .from('profiles')
        .select('*')
        .eq('id', laboratoryId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setLaboratoryProfile(data);
        });
    }
  }, [isEmployee, laboratoryId]);

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [sidebarOpen]);

  const allNavigation = [
    { name: 'Tableau de bord', icon: LayoutDashboard, page: 'dashboard', allowedForCancelled: true, menuKey: 'dashboard' },
    { name: 'Calendrier', icon: Calendar, page: 'calendar', allowedForCancelled: false, menuKey: 'calendar' },
    { name: 'Proformas', icon: FileText, page: 'proformas', allowedForCancelled: true, menuKey: 'proformas' },
    { name: 'Factures', icon: Receipt, page: 'invoices', allowedForCancelled: true, menuKey: 'invoices' },
    { name: 'Bons de livraison', icon: Truck, page: 'delivery-notes', allowedForCancelled: true, menuKey: 'delivery-notes' },
    { name: 'Photos reçues', icon: Camera, page: 'photos', allowedForCancelled: false, menuKey: 'photos' },
    { name: 'Dentistes', icon: Users, page: 'dentists', allowedForCancelled: false, menuKey: 'dentists' },
    { name: 'Catalogue', icon: Package, page: 'catalog', allowedForCancelled: false, menuKey: 'catalog' },
    { name: 'Ressources', icon: Box, page: 'resources', allowedForCancelled: false, menuKey: 'resources' },
    { name: 'Paramètres', icon: Settings, page: 'settings', allowedForCancelled: true, menuKey: 'settings' },
  ];

  const navigation = isEmployee
    ? allNavigation.filter(item => hasMenuAccess(item.menuKey))
    : allNavigation;

  const allBottomNavigation = [
    { name: 'Centre d\'aide', icon: HelpCircle, page: 'help-center', menuKey: 'help-center' },
    { name: 'Mon abonnement', icon: CreditCard, page: 'subscription' },
    { name: 'Support', icon: MessageSquare, page: 'support' },
    ...(isSuperAdmin && !isEmployee ? [{ name: 'Admin', icon: Shield, page: 'admin' }] : [])
  ];

  const bottomNavigation = isEmployee
    ? allBottomNavigation.filter(item => !item.menuKey || hasMenuAccess(item.menuKey))
    : allBottomNavigation;

  return (
    <div className="min-h-screen">
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md border-b border-slate-200 z-40 px-4 py-4 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2.5 rounded-xl hover:bg-gradient-to-r hover:from-primary-50 hover:to-cyan-50 transition-all duration-200 active:scale-95"
              aria-label="Toggle menu"
            >
              {sidebarOpen ? <X className="w-6 h-6 text-slate-700" /> : <Menu className="w-6 h-6 text-slate-700" />}
            </button>
            <div className="flex items-center gap-2">
              <DentalCloudLogo size={28} showText={false} />
              <h1 className="font-bold text-lg bg-gradient-to-r from-primary-600 to-cyan-600 bg-clip-text text-transparent">DentalCloud</h1>
            </div>
          </div>
          {(profile || laboratoryProfile) && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-primary-50 to-cyan-50 rounded-full border border-primary-100">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-slate-700 truncate max-w-[100px]">
                {isEmployee ? laboratoryProfile?.laboratory_name : profile?.first_name}
              </span>
            </div>
          )}
        </div>
      </div>

      <aside className={`
        fixed top-0 left-0 bottom-0 w-[85vw] max-w-[320px] bg-white/95 backdrop-blur-xl border-r border-slate-200/50 z-50 shadow-2xl
        transition-all duration-300 ease-out lg:w-64 lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          <div className="p-5 border-b border-slate-200/50">
            <div className="flex items-center justify-between mb-4">
              <DentalCloudLogo size={36} showText={true} />
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors active:scale-95"
                aria-label="Close menu"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            {(profile || laboratoryProfile) && (
              <div className="px-3 py-2 bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg border border-slate-200">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {isEmployee ? laboratoryProfile?.laboratory_name : profile?.laboratory_name}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  {isEmployee ? profile?.email || userProfile?.email : profile?.email}
                </p>
              </div>
            )}
          </div>

          <nav className="flex-1 p-3 space-y-0.5 overflow-hidden">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.page;
              const showBadge = item.page === 'catalog' && lowStockCount > 0;
              const showResourceBadge = item.page === 'resources' && lowStockResourcesCount > 0;
              const badgeCount = item.page === 'catalog' ? lowStockCount : lowStockResourcesCount;
              const isDisabled = !hasValidSubscription && !isSuperAdmin && !item.allowedForCancelled;
              return (
                <button
                  key={item.page}
                  onClick={() => {
                    onNavigate(item.page);
                    setSidebarOpen(false);
                  }}
                  disabled={isDisabled}
                  className={`
                    w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-200 relative touch-manipulation
                    ${isDisabled
                      ? 'opacity-50 cursor-not-allowed text-slate-400'
                      : isActive
                        ? 'bg-gradient-to-r from-primary-500 to-cyan-500 text-white font-semibold shadow-lg shadow-primary-500/30'
                        : 'text-slate-700 hover:bg-slate-50 active:bg-slate-100 active:scale-98'
                    }
                  `}
                >
                  <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                  <span className="text-[14px]">{item.name}</span>
                  {(showBadge || showResourceBadge) && (
                    <div className="ml-auto flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                      <span className="px-1.5 py-0.5 bg-orange-500 text-white text-[10px] font-bold rounded-full animate-pulse">
                        {badgeCount}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="p-3 border-t border-slate-200/50 space-y-0.5">
            {bottomNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.page;
              return (
                <button
                  key={item.page}
                  onClick={() => {
                    onNavigate(item.page);
                    setSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-200 touch-manipulation
                    ${isActive
                      ? 'bg-gradient-to-r from-primary-500 to-cyan-500 text-white font-semibold shadow-lg'
                      : 'text-slate-700 hover:bg-slate-100 active:bg-slate-200 active:scale-98'
                    }
                  `}
                >
                  <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                  <span className="text-[13px]">{item.name}</span>
                </button>
              );
            })}
          </div>

          <div className="p-3 border-t border-slate-200/50">
            <button
              onClick={() => {
                signOut();
                setSidebarOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2.5 px-3 py-2.5 rounded-xl text-red-600 bg-red-50 hover:bg-red-100 active:bg-red-200 transition-all duration-200 active:scale-98 font-medium touch-manipulation"
            >
              <LogOut className="w-[18px] h-[18px]" />
              <span className="text-[14px]">Déconnexion</span>
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <main className="lg:pl-64 pt-[72px] lg:pt-0 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8">
          {showSubscriptionWarning && (
            <div className="mb-6 bg-orange-50 border-l-4 border-orange-500 p-4 rounded-lg shadow-md">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-orange-800 mb-1">
                    Abonnement inactif
                  </h3>
                  <p className="text-sm text-orange-700">
                    {userProfile?.subscription_status === 'past_due'
                      ? 'Votre dernier paiement a échoué. Veuillez mettre à jour vos informations de paiement pour continuer à utiliser toutes les fonctionnalités.'
                      : userProfile?.subscription_status === 'canceled'
                      ? 'Votre abonnement a été annulé. Certaines fonctionnalités sont limitées.'
                      : 'Votre abonnement n\'est pas actif. Veuillez renouveler votre abonnement pour accéder à toutes les fonctionnalités.'}
                  </p>
                  <button
                    onClick={() => onNavigate('subscription')}
                    className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    <CreditCard className="w-4 h-4" />
                    Gérer mon abonnement
                  </button>
                </div>
              </div>
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
