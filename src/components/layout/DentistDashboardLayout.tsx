import { ReactNode, useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  MessageSquare,
  HelpCircle,
  Camera,
  Package,
  User,
  FileText,
  Stethoscope,
  PackageOpen,
  CreditCard
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import DentalCloudLogo from '../common/DentalCloudLogo';
import PWAInstallPrompt from '../common/PWAInstallPrompt';

function getAppVersion(): string {
  const cachedVersion = localStorage.getItem('app_version');
  return cachedVersion || '1.0.0';
}

interface DentistDashboardLayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  cabinetBillingEnabled?: boolean;
}

export default function DentistDashboardLayout({
  children,
  currentPage,
  onNavigate,
  cabinetBillingEnabled = false
}: DentistDashboardLayoutProps) {
  const { user, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dentistProfile, setDentistProfile] = useState<any>(null);
  const [appVersion, setAppVersion] = useState<string>('');

  useEffect(() => {
    setAppVersion(getAppVersion());
  }, []);

  useEffect(() => {
    if (user) {
      loadDentistProfile();
    }
  }, [user]);

  const loadDentistProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('dentist_accounts')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      setDentistProfile(data);
    } catch (error) {
      console.error('Error loading dentist profile:', error);
    }
  };

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

  const navigation = [
    { name: 'Tableau de bord', icon: LayoutDashboard, page: 'dentist-dashboard', locked: false },
    { name: 'Patients', icon: User, page: 'dentist-patients', locked: !cabinetBillingEnabled },
    { name: 'Catalogue Actes', icon: Stethoscope, page: 'dentist-catalog', locked: !cabinetBillingEnabled },
    { name: 'Stock Fournitures', icon: PackageOpen, page: 'dentist-stock', locked: !cabinetBillingEnabled },
    { name: 'Facturation', icon: CreditCard, page: 'dentist-invoices', locked: !cabinetBillingEnabled },
    { name: 'Mes Commandes', icon: Package, page: 'dentist-orders', locked: false },
    { name: 'Laboratoires', icon: Users, page: 'dentist-laboratories', locked: false },
    { name: 'Photos', icon: Camera, page: 'dentist-photos', locked: false },
    { name: 'Abonnement', icon: Sparkles, page: 'dentist-subscription', locked: false },
    { name: 'Paramètres', icon: Settings, page: 'dentist-settings', locked: false },
  ];

  const bottomNavigation = [
    { name: 'Centre d\'aide', icon: HelpCircle, page: 'dentist-help' },
    { name: 'Support', icon: MessageSquare, page: 'dentist-support' },
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md border-b border-slate-200 z-30 px-4 shadow-md" style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))', paddingBottom: '1rem', height: 'calc(72px + env(safe-area-inset-top))' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2.5 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 transition-all duration-200 active:scale-95"
              aria-label="Toggle menu"
            >
              {sidebarOpen ? <X className="w-6 h-6 text-slate-700" /> : <Menu className="w-6 h-6 text-slate-700" />}
            </button>
            <div className="flex items-center gap-2">
              <DentalCloudLogo size={28} showText={false} />
              <h1 className="font-bold text-lg bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">DentalCloud</h1>
            </div>
          </div>
          {dentistProfile && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-full border border-blue-100">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-slate-700 truncate max-w-[100px]">
                {dentistProfile.name}
              </span>
            </div>
          )}
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
            {dentistProfile && (
              <div className="px-3 py-2 bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg border border-slate-200">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  Dr. {dentistProfile.name}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  {dentistProfile.email}
                </p>
              </div>
            )}
          </div>

          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.page;
              const isLocked = item.locked;

              return (
                <div key={item.page} className="relative">
                  <button
                    onClick={() => {
                      if (isLocked) {
                        onNavigate('dentist-subscription');
                      } else {
                        onNavigate(item.page);
                      }
                      setSidebarOpen(false);
                    }}
                    className={`
                      w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-200 relative touch-manipulation
                      ${isActive
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold shadow-lg shadow-blue-500/30'
                        : isLocked
                          ? 'text-slate-400 hover:bg-slate-50 active:bg-slate-100 active:scale-98'
                          : 'text-slate-700 hover:bg-slate-50 active:bg-slate-100 active:scale-98'
                      }
                    `}
                  >
                    <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                    <span className="text-[14px]">{item.name}</span>
                    {isLocked && (
                      <Lock className="w-3 h-3 ml-auto flex-shrink-0" />
                    )}
                  </button>
                </div>
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
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold shadow-lg'
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

      <main className="lg:pl-64 flex-1 overflow-y-auto lg:mt-0" style={{ marginTop: 'calc(72px + env(safe-area-inset-top))', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="p-4 sm:p-6 lg:p-8 min-h-full">
          {children}
        </div>
      </main>

      <PWAInstallPrompt />
    </div>
  );
}
