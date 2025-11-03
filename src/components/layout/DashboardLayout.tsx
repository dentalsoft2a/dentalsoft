import { ReactNode, useState } from 'react';
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
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import DentalSoftLogo from '../common/DentalSoftLogo';

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
  const { profile, userProfile, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isSubscriptionInactive = userProfile?.subscription_status !== 'active' && userProfile?.subscription_status !== 'trialing';
  const showSubscriptionWarning = isSubscriptionInactive && !isSuperAdmin;

  const navigation = [
    { name: 'Tableau de bord', icon: LayoutDashboard, page: 'dashboard', allowedForCancelled: true },
    { name: 'Calendrier', icon: Calendar, page: 'calendar', allowedForCancelled: false },
    { name: 'Proformas', icon: FileText, page: 'proformas', allowedForCancelled: true },
    { name: 'Factures', icon: Receipt, page: 'invoices', allowedForCancelled: true },
    { name: 'Bons de livraison', icon: Truck, page: 'delivery-notes', allowedForCancelled: true },
    { name: 'Dentistes', icon: Users, page: 'dentists', allowedForCancelled: false },
    { name: 'Catalogue', icon: Package, page: 'catalog', allowedForCancelled: false },
    { name: 'Ressources', icon: Box, page: 'resources', allowedForCancelled: false },
    { name: 'Paramètres', icon: Settings, page: 'settings', allowedForCancelled: true },
  ];

  const bottomNavigation = [
    { name: 'Centre d\'aide', icon: HelpCircle, page: 'help-center' },
    { name: 'Mon abonnement', icon: CreditCard, page: 'subscription' },
    { name: 'Support', icon: MessageSquare, page: 'support' },
    ...(isSuperAdmin ? [{ name: 'Admin', icon: Shield, page: 'admin' }] : [])
  ];

  return (
    <div className="min-h-screen">
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-slate-200 z-40 px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-primary-50 transition-all duration-200 hover:scale-105"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <h1 className="font-semibold bg-gradient-to-r from-primary-600 to-cyan-600 bg-clip-text text-transparent">DentalSoft</h1>
          </div>
        </div>
      </div>

      <aside className={`
        fixed top-0 left-0 bottom-0 w-64 bg-white/90 backdrop-blur-xl border-r border-slate-200/50 z-50 shadow-xl
        transition-all duration-300 lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-slate-200/50">
            <DentalSoftLogo size={36} showText={true} />
            {profile && (
              <p className="text-sm text-slate-600 mt-3 pl-1">{profile.laboratory_name}</p>
            )}
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
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
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 relative
                    ${isDisabled
                      ? 'opacity-50 cursor-not-allowed text-slate-400'
                      : isActive
                        ? 'bg-gradient-to-r from-primary-500 to-cyan-500 text-white font-medium shadow-lg shadow-primary-500/30 scale-105'
                        : 'text-slate-700 hover:bg-slate-50 hover:scale-102 hover:shadow-sm'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                  {(showBadge || showResourceBadge) && (
                    <span className="ml-auto px-2 py-0.5 bg-orange-500 text-white text-xs font-bold rounded-full animate-pulse">
                      {badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-200/50 space-y-1">
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
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                    ${isActive
                      ? 'bg-gradient-to-r from-primary-500 to-cyan-500 text-white shadow-lg scale-105'
                      : 'text-slate-700 hover:bg-slate-100 hover:scale-102'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </div>

          <div className="p-4 border-t border-slate-200/50">
            {profile && (
              <div className="mb-4 px-4 py-3 bg-gradient-to-r from-primary-50 to-cyan-50 rounded-lg border border-primary-100">
                <p className="text-sm font-medium text-slate-900">
                  {profile.first_name} {profile.last_name}
                </p>
              </div>
            )}
            <button
              onClick={() => signOut()}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-all duration-200 hover:scale-102"
            >
              <LogOut className="w-5 h-5" />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="lg:pl-64 pt-16 lg:pt-0">
        <div className="p-6 lg:p-8">
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
