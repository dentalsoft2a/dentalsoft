import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LandingPage } from './components/landing/LandingPage';
import DashboardLayout from './components/layout/DashboardLayout';
import DashboardPage from './components/dashboard/DashboardPage';
import CalendarPage from './components/calendar/CalendarPage';
import ProformasPage from './components/proformas/ProformasPage';
import InvoicesPage from './components/invoices/InvoicesPage';
import DeliveryNotesPage from './components/delivery-notes/DeliveryNotesPage';
import DentistsPage from './components/dentists/DentistsPage';
import CatalogPage from './components/catalog/CatalogPage';
import ResourcesPage from './components/resources/ResourcesPage';
import SettingsPage from './components/settings/SettingsPage';
import { SuperAdminPanel } from './components/admin/SuperAdminPanel';
import { SupportPage } from './components/support/SupportPage';
import { SubscriptionPage } from './components/subscription/SubscriptionPage';
import HelpCenterPage from './components/help-center/HelpCenterPage';
import DentistRegisterPage from './components/dentist/DentistRegisterPage';
import DentistPhotoPanel from './components/dentist/DentistPhotoPanel';
import PhotoSubmissionsPage from './components/photos/PhotoSubmissionsPage';
import { supabase } from './lib/supabase';
import { usePermissions } from './hooks/usePermissions';

function AppContent() {
  const { user, loading, isEmployee } = useAuth();
  const { getFirstAllowedPage, hasMenuAccess, loading: permissionsLoading } = usePermissions();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isDentist, setIsDentist] = useState(false);
  const [checkingUserType, setCheckingUserType] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [lowStockResourcesCount, setLowStockResourcesCount] = useState(0);
  const [initialPageSet, setInitialPageSet] = useState(false);

  useEffect(() => {
    if (user) {
      checkSuperAdminAndSubscription();
      loadLowStockCount();
      loadLowStockResourcesCount();
    } else {
      setIsDentist(false);
      setIsSuperAdmin(false);
      setInitialPageSet(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && isEmployee && !permissionsLoading && !checkingUserType && !initialPageSet) {
      const firstPage = getFirstAllowedPage();
      setCurrentPage(firstPage);
      setInitialPageSet(true);
    }
  }, [user, isEmployee, permissionsLoading, checkingUserType, initialPageSet]);

  useEffect(() => {
    if (user && isEmployee && !permissionsLoading) {
      if (currentPage === 'admin') {
        const firstAllowedPage = getFirstAllowedPage();
        setCurrentPage(firstAllowedPage);
        return;
      }

      const pageToMenuKey: Record<string, string> = {
        'dashboard': 'dashboard',
        'calendar': 'calendar',
        'proformas': 'proformas',
        'invoices': 'invoices',
        'delivery-notes': 'delivery-notes',
        'photos': 'photos',
        'dentists': 'dentists',
        'catalog': 'catalog',
        'resources': 'resources',
        'help-center': 'help-center',
        'settings': 'settings'
      };

      const menuKey = pageToMenuKey[currentPage];
      if (menuKey && !hasMenuAccess(menuKey)) {
        const firstAllowedPage = getFirstAllowedPage();
        setCurrentPage(firstAllowedPage);
      }
    }
  }, [currentPage, user, isEmployee, permissionsLoading]);

  const checkSuperAdminAndSubscription = async () => {
    if (!user) return;

    setCheckingUserType(true);

    const { data: dentistData } = await supabase
      .from('dentist_accounts')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (dentistData) {
      setIsDentist(true);
      setCurrentPage('dentist-panel');
      setCheckingUserType(false);
      return;
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('role, subscription_status, trial_ends_at, subscription_ends_at')
      .eq('id', user.id)
      .single();

    if (data) {
      setIsSuperAdmin(data.role === 'super_admin');
      setSubscriptionStatus(data.subscription_status);

      if (!isEmployee) {
        setCurrentPage('dashboard');
        setInitialPageSet(true);
      }

      // Check if subscription or trial has expired
      const now = new Date();
      if (data.subscription_status === 'trial' && data.trial_ends_at) {
        const trialEnd = new Date(data.trial_ends_at);
        if (now > trialEnd) {
          setSubscriptionStatus('expired');
        }
      } else if (data.subscription_status === 'active' && data.subscription_ends_at) {
        const subEnd = new Date(data.subscription_ends_at);
        if (now > subEnd) {
          setSubscriptionStatus('expired');
        }
      }
    }

    setCheckingUserType(false);
  };

  const loadLowStockCount = async () => {
    if (!user) return;

    try {
      // catalog_items doesn't have stock tracking - use resources instead
      setLowStockCount(0);
    } catch (error) {
      console.error('Error loading low stock count:', error);
    }
  };

  const loadLowStockResourcesCount = async () => {
    if (!user) return;

    try {
      const { data: resourcesData, error: resourcesError } = await supabase
        .from('resources')
        .select('id, stock_quantity, low_stock_threshold, has_variants')
        .eq('user_id', user.id)
        .eq('track_stock', true);

      if (resourcesError) throw resourcesError;

      let lowStockCount = 0;

      for (const resource of (resourcesData || [])) {
        if (resource.has_variants) {
          const { data: variantsData } = await supabase
            .from('resource_variants')
            .select('stock_quantity, low_stock_threshold, is_active')
            .eq('resource_id', resource.id)
            .eq('is_active', true);

          const lowStockVariants = (variantsData || []).filter(
            v => v.stock_quantity <= v.low_stock_threshold
          );
          lowStockCount += lowStockVariants.length;
        } else {
          if (resource.stock_quantity <= resource.low_stock_threshold) {
            lowStockCount++;
          }
        }
      }

      setLowStockResourcesCount(lowStockCount);
    } catch (error) {
      console.error('Error loading low stock resources count:', error);
    }
  };

  if (loading || checkingUserType || (isEmployee && permissionsLoading)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
          <span className="text-slate-600 font-medium">Chargement...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  if (isDentist) {
    return <DentistPhotoPanel />;
  }

  if (currentPage === 'admin') {
    if (isSuperAdmin) {
      return <SuperAdminPanel onNavigate={setCurrentPage} />;
    } else {
      setCurrentPage('dashboard');
      return null;
    }
  }

  // If subscription is expired or cancelled, redirect to subscription page
  const hasValidSubscription = subscriptionStatus === 'active' || subscriptionStatus === 'trial';
  const allowedPagesForCancelled = ['dashboard', 'proformas', 'invoices', 'delivery-notes', 'settings', 'subscription', 'support', 'help-center'];
  if (!hasValidSubscription && !isSuperAdmin && !allowedPagesForCancelled.includes(currentPage)) {
    setCurrentPage('subscription');
  }

  const handleStockUpdate = () => {
    loadLowStockCount();
    loadLowStockResourcesCount();
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage onNavigate={setCurrentPage} />;
      case 'calendar':
        return <CalendarPage />;
      case 'proformas':
        return <ProformasPage />;
      case 'invoices':
        return <InvoicesPage />;
      case 'delivery-notes':
        return <DeliveryNotesPage />;
      case 'dentists':
        return <DentistsPage />;
      case 'catalog':
        return <CatalogPage />;
      case 'resources':
        return <ResourcesPage onStockUpdate={handleStockUpdate} />;
      case 'settings':
        return <SettingsPage />;
      case 'support':
        return <SupportPage />;
      case 'subscription':
        return <SubscriptionPage />;
      case 'help-center':
        return <HelpCenterPage />;
      case 'photos':
        return <PhotoSubmissionsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <DashboardLayout
      currentPage={currentPage}
      onNavigate={(page) => {
        // Block admin page for non-super admins
        if (page === 'admin' && !isSuperAdmin) {
          return;
        }

        // Allow navigation to specific pages even with invalid subscription
        const allowedPagesForCancelled = ['dashboard', 'proformas', 'invoices', 'delivery-notes', 'settings', 'subscription', 'support', 'help-center'];
        if (!hasValidSubscription && !isSuperAdmin && !allowedPagesForCancelled.includes(page)) {
          return;
        }
        setCurrentPage(page);
      }}
      isSuperAdmin={isSuperAdmin}
      lowStockCount={lowStockCount}
      lowStockResourcesCount={lowStockResourcesCount}
      hasValidSubscription={hasValidSubscription}
    >
      {renderPage()}
    </DashboardLayout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
