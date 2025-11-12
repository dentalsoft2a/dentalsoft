import { useState, useEffect } from 'react';
import { BrowserRouter, Navigate, useNavigate, useLocation } from 'react-router-dom';
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
import WorkManagementPage from './components/work/WorkManagementPage';
import ResourcesPage from './components/resources/ResourcesPage';
import BatchManagementPage from './components/batch/BatchManagementPage';
import SettingsPage from './components/settings/SettingsPage';
import { SuperAdminPanel } from './components/admin/SuperAdminPanel';
import { SupportPage } from './components/support/SupportPage';
import { SubscriptionPage } from './components/subscription/SubscriptionPage';
import HelpCenterPage from './components/help-center/HelpCenterPage';
import DentistRegisterPage from './components/dentist/DentistRegisterPage';
import DentistPhotoPanel from './components/dentist/DentistPhotoPanel';
import PhotoSubmissionsPage from './components/photos/PhotoSubmissionsPage';
import { ServerStatusMonitor } from './components/common/ServerStatusMonitor';
import { ImpersonationBanner } from './components/common/ImpersonationBanner';
import { supabase } from './lib/supabase';
import { usePermissions } from './hooks/usePermissions';

function AppContent() {
  const { user, loading, isEmployee, isImpersonating } = useAuth();
  const { getFirstAllowedPage, hasMenuAccess, loading: permissionsLoading } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname.substring(1);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isDentist, setIsDentist] = useState(false);
  const [checkingUserType, setCheckingUserType] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [lowStockResourcesCount, setLowStockResourcesCount] = useState(0);
  const [initialPageSet, setInitialPageSet] = useState(false);

  // Only show server monitor for authenticated users
  const showServerMonitor = !!user;

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
      navigate(`/${firstPage}`, { replace: true });
      setInitialPageSet(true);
    }
  }, [user, isEmployee, permissionsLoading, checkingUserType, initialPageSet, navigate]);

  useEffect(() => {
    if (user && isEmployee && !permissionsLoading) {
      if (currentPath === 'admin') {
        const firstAllowedPage = getFirstAllowedPage();
        navigate(`/${firstAllowedPage}`, { replace: true });
        return;
      }

      const pageToMenuKey: Record<string, string> = {
        'dashboard': 'dashboard',
        'calendar': 'calendar',
        'proformas': 'proformas',
        'invoices': 'invoices',
        'delivery-notes': 'delivery-notes',
        'work-management': 'work-management',
        'photos': 'photos',
        'dentists': 'dentists',
        'catalog': 'catalog',
        'resources': 'resources',
        'batch-management': 'batch-management',
        'help-center': 'help-center',
        'settings': 'settings'
      };

      const menuKey = pageToMenuKey[currentPath];
      if (menuKey && !hasMenuAccess(menuKey)) {
        const firstAllowedPage = getFirstAllowedPage();
        navigate(`/${firstAllowedPage}`, { replace: true });
      }
    }
  }, [currentPath, user, isEmployee, permissionsLoading, navigate, getFirstAllowedPage, hasMenuAccess]);

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
      setCheckingUserType(false);
      return;
    }

    const { data } = await supabase
      .from('user_profiles')
      .select('role, subscription_status, trial_ends_at, subscription_ends_at')
      .eq('id', user.id)
      .maybeSingle();

    if (data) {
      setIsSuperAdmin(data.role === 'super_admin');
      setSubscriptionStatus(data.subscription_status);

      if (!isEmployee) {
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
      const { data: catalogData, error: catalogError } = await supabase
        .from('catalog_items')
        .select('stock_quantity, low_stock_threshold')
        .eq('user_id', user.id)
        .eq('track_stock', true)
        .eq('is_active', true);

      if (catalogError) throw catalogError;

      const lowStockItems = (catalogData || []).filter(
        item => item.stock_quantity <= item.low_stock_threshold
      );

      setLowStockCount(lowStockItems.length);
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
    if (currentPath !== '' && currentPath !== 'register-dentist' && currentPath !== 'dashboard') {
      return <Navigate to="/" replace />;
    }
    return (
      <>
        {isImpersonating && <ImpersonationBanner />}
        {currentPath === 'register-dentist' ? <DentistRegisterPage onNavigate={(page) => navigate(`/${page}`)} /> : <LandingPage />}
      </>
    );
  }

  if (isDentist) {
    if (currentPath !== 'dentist-panel' && currentPath !== '') {
      return <Navigate to="/dentist-panel" replace />;
    }
    return (
      <>
        {showServerMonitor && <ServerStatusMonitor />}
        {isImpersonating && <ImpersonationBanner />}
        <DentistPhotoPanel />
      </>
    );
  }

  if (currentPath === 'admin') {
    if (isSuperAdmin) {
      return (
        <>
          {showServerMonitor && <ServerStatusMonitor />}
          {isImpersonating && <ImpersonationBanner />}
          <SuperAdminPanel onNavigate={(page) => navigate(`/${page}`)} />
        </>
      );
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }

  // If subscription is expired or cancelled, redirect to subscription page
  // Only redirect if subscription status has been loaded (not null)
  const hasValidSubscription = subscriptionStatus === 'active' || subscriptionStatus === 'trial';
  const allowedPagesForCancelled = ['', 'dashboard', 'proformas', 'invoices', 'delivery-notes', 'work-management', 'settings', 'subscription', 'support', 'help-center'];

  // Don't redirect if subscription status hasn't been loaded yet
  if (!checkingUserType && subscriptionStatus !== null && !hasValidSubscription && !isSuperAdmin && !allowedPagesForCancelled.includes(currentPath)) {
    return <Navigate to="/subscription" replace />;
  }

  const handleStockUpdate = () => {
    loadLowStockCount();
    loadLowStockResourcesCount();
  };

  const renderPage = () => {
    switch (currentPath) {
      case 'dashboard':
      case '':
        return <DashboardPage onNavigate={(page) => navigate(`/${page}`)} />;
      case 'calendar':
        return <CalendarPage />;
      case 'proformas':
        return <ProformasPage />;
      case 'invoices':
        return <InvoicesPage />;
      case 'delivery-notes':
        return <DeliveryNotesPage />;
      case 'work-management':
        return <WorkManagementPage />;
      case 'dentists':
        return <DentistsPage />;
      case 'catalog':
        return <CatalogPage />;
      case 'resources':
        return <ResourcesPage onStockUpdate={handleStockUpdate} />;
      case 'batch-management':
        return <BatchManagementPage />;
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
        return <Navigate to="/dashboard" replace />;
    }
  };

  return (
    <>
      {showServerMonitor && <ServerStatusMonitor />}
      {isImpersonating && <ImpersonationBanner />}
      <DashboardLayout
        currentPage={currentPath}
        onNavigate={(page) => {
          // Block admin page for non-super admins
          if (page === 'admin' && !isSuperAdmin) {
            return;
          }

          // Allow navigation to specific pages even with invalid subscription
          const allowedPagesForCancelled = ['dashboard', 'proformas', 'invoices', 'delivery-notes', 'work-management', 'settings', 'subscription', 'support', 'help-center', 'photos'];
          if (!hasValidSubscription && !isSuperAdmin && !allowedPagesForCancelled.includes(page)) {
            return;
          }
          navigate(`/${page}`);
        }}
        isSuperAdmin={isSuperAdmin}
        lowStockCount={lowStockCount}
        lowStockResourcesCount={lowStockResourcesCount}
        hasValidSubscription={hasValidSubscription}
      >
        {renderPage()}
      </DashboardLayout>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
