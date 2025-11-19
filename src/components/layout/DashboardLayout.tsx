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
  Camera,
  Cloud,
  Link as LinkIcon,
  ClipboardCheck,
  Tag,
  Home,
  MoreHorizontal
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { supabase } from '../../lib/supabase';
import DentalCloudLogo from '../common/DentalCloudLogo';
import PWAInstallPrompt from '../common/PWAInstallPrompt';

function getAppVersion(): string {
  const cachedVersion = localStorage.getItem('app_version');
  return cachedVersion || '1.0.0';
}

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
  const [appVersion, setAppVersion] = useState<string>('');

  useEffect(() => {
    setAppVersion(getAppVersion());
  }, []);

  useEffect(() => {
    console.log('DashboardLayout - isEmployee:', isEmployee);
    console.log('DashboardLayout - employeeInfo:', employeeInfo);
    console.log('DashboardLayout - rolePermissions:', rolePermissions);
    console.log('DashboardLayout - permissionsLoading:', permissionsLoading);
  }, [isEmployee, employeeInfo, rolePermissions, permissionsLoading]);

  const isSubscriptionInactive = userProfile?.subscription_status !== 'active' && userProfile?.subscription_status !== 'trial';
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
    { name: 'Gestion des travaux', icon: ClipboardCheck, page: 'work-management', allowedForCancelled: true, menuKey: 'work-management' },
    { name: 'Photos reçues', icon: Camera, page: 'photos', allowedForCancelled: false, menuKey: 'photos' },
    { name: 'Dentistes', icon: Users, page: 'dentists', allowedForCancelled: false, menuKey: 'dentists' },
    { name: 'Catalogue', icon: Package, page: 'catalog', allowedForCancelled: false, menuKey: 'catalog' },
    { name: 'Ressources', icon: Box, page: 'resources', allowedForCancelled: false, menuKey: 'resources' },
    { name: 'N° Lot', icon: Tag, page: 'batch-management', allowedForCancelled: false, menuKey: 'batch-management' },
    { name: 'Paramètres', icon: Settings, page: 'settings', allowedForCancelled: true, menuKey: 'settings' },
  ];

  const navigation = isEmployee
    ? allNavigation.filter(item => hasMenuAccess(item.menuKey))
    : allNavigation;

  const allBottomNavigation = [
    { name: 'Centre d\'aide', icon: HelpCircle, page: 'help-center', menuKey: 'help-center' },
    { name: 'Extensions', icon: Cloud, page: 'extensions' },
    { name: 'Mon abonnement', icon: CreditCard, page: 'subscription' },
    { name: 'Support', icon: MessageSquare, page: 'support' },
    ...(isSuperAdmin && !isEmployee ? [{ name: 'Admin', icon: Shield, page: 'admin' }] : [])
  ];

  const bottomNavigation = isEmployee
    ? allBottomNavigation.filter(item => !item.menuKey || hasMenuAccess(item.menuKey))
    : allBottomNavigation;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-b border-slate-200/50 z-30 px-4 shadow-sm" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))', paddingBottom: '0.75rem', height: 'calc(72px + env(safe-area-inset-top))' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DentalCloudLogo size={32} showText={false} />
            <div>
              <h1 className="font-bold text-base bg-gradient-to-r from-primary-600 to-cyan-600 bg-clip-text text-transparent leading-tight">DentalCloud</h1>
              {(profile || laboratoryProfile) && (
                <p className="text-[10px] text-slate-500 leading-tight truncate max-w-[150px]">
                  {isEmployee ? laboratoryProfile?.laboratory_name : profile?.laboratory_name}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(lowStockCount > 0 || lowStockResourcesCount > 0) && (
              <div className="relative">
                <div className="flex items-center gap-1 px-2 py-1 bg-orange-50 rounded-full border border-orange-200">
                  <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                  <span className="text-[10px] font-bold text-orange-600">{lowStockCount + lowStockResourcesCount}</span>
                </div>
              </div>
            )}
            {(profile || laboratoryProfile) && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                {(isEmployee ? laboratoryProfile?.laboratory_name : profile?.first_name)?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </div>

      <aside className={`
        fixed top-0 left-0 bottom-0 w-[85vw] max-w-[320px] bg-white/95 backdrop-blur-xl border-r border-slate-200/50 z-40 shadow-2xl
        transition-all duration-300 ease-out lg:w-64 lg:translate-x-0 lg:z-50
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

          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
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
            <div className="mt-2 text-center">
              <p className="text-[10px] text-slate-400 font-mono">
                v{appVersion}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[35] lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <main className="lg:pl-64 flex-1 overflow-y-auto lg:mt-0" style={{ marginTop: 'calc(72px + env(safe-area-inset-top))', paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
        <div className="p-4 sm:p-6 lg:p-8 min-h-full">
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

      <PWAInstallPrompt />

      {/* Bottom Navigation - Mobile Only */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-200/50 shadow-2xl z-50" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}>
        <div className="grid grid-cols-5 gap-1 px-2 pt-2">
          <button
            onClick={() => onNavigate('dashboard')}
            className={`relative flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-all duration-200 touch-manipulation ${
              currentPage === 'dashboard'
                ? 'bg-gradient-to-b from-primary-50 to-cyan-50 text-primary-600 scale-105'
                : 'text-slate-600 active:bg-slate-50 active:scale-95'
            }`}
          >
            <Home className={`w-5 h-5 transition-all ${currentPage === 'dashboard' ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
            <span className={`text-[10px] font-medium transition-all ${currentPage === 'dashboard' ? 'font-bold' : ''}`}>Accueil</span>
            {currentPage === 'dashboard' && (
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-12 h-1 bg-gradient-to-r from-primary-500 to-cyan-500 rounded-full"></div>
            )}
          </button>

          <button
            onClick={() => onNavigate('delivery-notes')}
            className={`relative flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-all duration-200 touch-manipulation ${
              currentPage === 'delivery-notes'
                ? 'bg-gradient-to-b from-primary-50 to-cyan-50 text-primary-600 scale-105'
                : 'text-slate-600 active:bg-slate-50 active:scale-95'
            }`}
          >
            <Truck className={`w-5 h-5 transition-all ${currentPage === 'delivery-notes' ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
            <span className={`text-[10px] font-medium transition-all ${currentPage === 'delivery-notes' ? 'font-bold' : ''}`}>Bons</span>
            {currentPage === 'delivery-notes' && (
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-12 h-1 bg-gradient-to-r from-primary-500 to-cyan-500 rounded-full"></div>
            )}
          </button>

          <button
            onClick={() => onNavigate('invoices')}
            className={`relative flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-all duration-200 touch-manipulation ${
              currentPage === 'invoices'
                ? 'bg-gradient-to-b from-primary-50 to-cyan-50 text-primary-600 scale-105'
                : 'text-slate-600 active:bg-slate-50 active:scale-95'
            }`}
          >
            <Receipt className={`w-5 h-5 transition-all ${currentPage === 'invoices' ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
            <span className={`text-[10px] font-medium transition-all ${currentPage === 'invoices' ? 'font-bold' : ''}`}>Factures</span>
            {currentPage === 'invoices' && (
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-12 h-1 bg-gradient-to-r from-primary-500 to-cyan-500 rounded-full"></div>
            )}
          </button>

          <button
            onClick={() => onNavigate('dentists')}
            className={`relative flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-all duration-200 touch-manipulation ${
              currentPage === 'dentists'
                ? 'bg-gradient-to-b from-primary-50 to-cyan-50 text-primary-600 scale-105'
                : 'text-slate-600 active:bg-slate-50 active:scale-95'
            }`}
          >
            <Users className={`w-5 h-5 transition-all ${currentPage === 'dentists' ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
            <span className={`text-[10px] font-medium transition-all ${currentPage === 'dentists' ? 'font-bold' : ''}`}>Clients</span>
            {currentPage === 'dentists' && (
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-12 h-1 bg-gradient-to-r from-primary-500 to-cyan-500 rounded-full"></div>
            )}
          </button>

          <button
            onClick={() => setSidebarOpen(true)}
            className="relative flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-slate-600 active:bg-slate-50 active:scale-95 transition-all duration-200 touch-manipulation"
          >
            {(lowStockCount > 0 || lowStockResourcesCount > 0) && (
              <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center shadow-md animate-pulse">
                <span className="text-[8px] font-bold text-white">{lowStockCount + lowStockResourcesCount}</span>
              </div>
            )}
            <MoreHorizontal className="w-5 h-5 stroke-[2]" />
            <span className="text-[10px] font-medium">Plus</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
