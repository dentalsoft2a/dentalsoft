import { useState, useEffect } from 'react';
import { BrowserRouter, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { queryClient } from './lib/queryClient';
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
import ExtensionsPage from './components/extensions/ExtensionsPage';
import DentistRegisterPage from './components/dentist/DentistRegisterPage';
import DentistPhotoPanel from './components/dentist/DentistPhotoPanel';
import DentistDashboardLayout from './components/layout/DentistDashboardLayout';
import DentistDashboardPage from './components/dentist/DentistDashboardPage';
import DentistLaboratoriesPage from './components/dentist/DentistLaboratoriesPage';
import DentistOrdersPage from './components/dentist/DentistOrdersPage';
import DentistPhotosPage from './components/dentist/DentistPhotosPage';
import DentistSettingsPage from './components/dentist/DentistSettingsPage';
import { useDeviceDetection } from './hooks/useDeviceDetection';
import PhotoSubmissionsPage from './components/photos/PhotoSubmissionsPage';
import PurchaseOrderPage from './components/purchase-orders/PurchaseOrderPage';
import OnboardingWizard from './components/onboarding/OnboardingWizard';
import DentalOnboardingWizard from './components/dentist/onboarding/DentalOnboardingWizard';
import DentalPatientsPage from './components/dentist/cabinet/DentalPatientsPage';
import DentalCatalogPage from './components/dentist/cabinet/DentalCatalogPage';
import DentalStockPage from './components/dentist/cabinet/DentalStockPage';
import DentalInvoicesPage from './components/dentist/cabinet/DentalInvoicesPage';
import DentistSubscriptionPage from './components/dentist/DentistSubscriptionPage';
import SubscriptionGuard from './components/dentist/SubscriptionGuard';
import { ServerStatusMonitor } from './components/common/ServerStatusMonitor';
import { ImpersonationBanner } from './components/common/ImpersonationBanner';
import { CookieConsent } from './components/common/CookieConsent';
import { LegalNotice } from './components/legal/LegalNotice';
import { PrivacyPolicy } from './components/legal/PrivacyPolicy';
import { TermsOfService } from './components/legal/TermsOfService';
import QuoteRequestsPage from './components/quotes/QuoteRequestsPage';
import { supabase } from './lib/supabase';
import { usePermissions } from './hooks/usePermissions';

function AppContent() {
  const { user, loading, isEmployee, isImpersonating, userProfile } = useAuth();
  const { isMobile } = useDeviceDetection();
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
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [needsDentalOnboarding, setNeedsDentalOnboarding] = useState(false);

  // Only show server monitor for authenticated users
  const showServerMonitor = !!user;

  useEffect(() => {
    if (user) {
      checkSuperAdminAndSubscription();
      loadLowStockCount();
      loadLowStockResourcesCount();
      checkOnboardingStatus();
    } else {
      setIsDentist(false);
      setIsSuperAdmin(false);
      setInitialPageSet(false);
      setNeedsOnboarding(false);
    }
  }, [user]);

  const checkOnboardingStatus = async () => {
    if (!userProfile) return;

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('onboarding_completed, role')
        .eq('id', userProfile.id)
        .maybeSingle();

      if (error) throw error;

      if (data && !data.onboarding_completed && data.role !== 'super_admin' && data.role !== 'dentist_account') {
        setNeedsOnboarding(true);
      } else {
        setNeedsOnboarding(false);
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    }
  };

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
      .select('id, subscription_status, subscription_plan_id')
      .eq('id', user.id)
      .maybeSingle();

    if (dentistData) {
      setIsDentist(true);

      // Check if dentist has access (trial or active subscription)
      const hasAccess = dentistData.subscription_status === 'trial' || dentistData.subscription_status === 'active';

      // Check if dentist needs onboarding for cabinet billing
      if (hasAccess) {
        const { count: servicesCount, error: servicesError } = await supabase
          .from('dental_catalog_items')
          .select('id', { count: 'exact', head: true })
          .eq('dentist_id', user.id);

        if (servicesError) {
          console.error('Error checking services count:', servicesError);
        }

        console.log('[App] Services count for dentist:', servicesCount);

        // If cabinet billing is enabled but no services, show onboarding
        setNeedsDentalOnboarding(servicesCount === null || servicesCount === 0);
      } else {
        setNeedsDentalOnboarding(false);
      }

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
    // Allow access to legal pages without authentication
    if (currentPath === 'legal-notice') {
      return <LegalNotice />;
    }
    if (currentPath === 'privacy-policy') {
      return <PrivacyPolicy />;
    }
    if (currentPath === 'terms-of-service') {
      return <TermsOfService />;
    }

    if (currentPath !== '' && currentPath !== 'register-dentist' && currentPath !== 'dashboard') {
      return <Navigate to="/" replace />;
    }
    return (
      <>
        {isImpersonating && <ImpersonationBanner />}
        <CookieConsent />
        {currentPath === 'register-dentist' ? <DentistRegisterPage onNavigate={(page) => navigate(`/${page}`)} /> : <LandingPage />}
      </>
    );
  }

  if (isDentist) {
    // Show dental onboarding if needed
    if (needsDentalOnboarding && currentPath !== 'dental-onboarding') {
      return <Navigate to="/dental-onboarding" replace />;
    }

    if (currentPath === 'dental-onboarding') {
      if (!needsDentalOnboarding) {
        return <Navigate to="/dentist-dashboard" replace />;
      }
      return (
        <>
          {showServerMonitor && <ServerStatusMonitor />}
          {isImpersonating && <ImpersonationBanner />}
          <DentalOnboardingWizard />
        </>
      );
    }

    // Sur mobile, afficher uniquement le panel photo
    if (isMobile) {
      return (
        <>
          {showServerMonitor && <ServerStatusMonitor />}
          {isImpersonating && <ImpersonationBanner />}
          <DentistPhotoPanel />
        </>
      );
    }

    // Sur desktop, afficher l'interface complète avec layout
    const dentistPages = ['dentist-dashboard', 'dentist-orders', 'dentist-laboratories', 'dentist-photos', 'dentist-settings', 'dentist-help', 'dentist-support', 'dentist-patients', 'dentist-catalog', 'dentist-stock', 'dentist-invoices', 'dentist-subscription'];

    if (currentPath === '' || !dentistPages.includes(currentPath)) {
      return <Navigate to="/dentist-dashboard" replace />;
    }

    const renderDentistPage = () => {
      switch (currentPath) {
        case 'dentist-dashboard':
          return <DentistDashboardPage onNavigate={(page) => navigate(`/${page}`)} />;
        case 'dentist-orders':
          return <DentistOrdersPage />;
        case 'dentist-laboratories':
          return <DentistLaboratoriesPage />;
        case 'dentist-photos':
          return <DentistPhotosPage />;
        case 'dentist-patients':
          return (
            <SubscriptionGuard
              feature="Gestion des Patients"
              onSubscribe={() => navigate('/dentist-subscription')}
            >
              <DentalPatientsPage />
            </SubscriptionGuard>
          );
        case 'dentist-catalog':
          return (
            <SubscriptionGuard
              feature="Catalogue Actes"
              onSubscribe={() => navigate('/dentist-subscription')}
            >
              <DentalCatalogPage />
            </SubscriptionGuard>
          );
        case 'dentist-stock':
          return (
            <SubscriptionGuard
              feature="Stock Fournitures"
              onSubscribe={() => navigate('/dentist-subscription')}
            >
              <DentalStockPage />
            </SubscriptionGuard>
          );
        case 'dentist-invoices':
          return (
            <SubscriptionGuard
              feature="Facturation"
              onSubscribe={() => navigate('/dentist-subscription')}
            >
              <DentalInvoicesPage />
            </SubscriptionGuard>
          );
        case 'dentist-subscription':
          return <DentistSubscriptionPage />;
        case 'dentist-settings':
          return <DentistSettingsPage />;
        case 'dentist-help':
          return <HelpCenterPage />;
        case 'dentist-support':
          return <SupportPage />;
        default:
          return <Navigate to="/dentist-dashboard" replace />;
      }
    };

    return (
      <>
        {showServerMonitor && <ServerStatusMonitor />}
        {isImpersonating && <ImpersonationBanner />}
        <CookieConsent />
        <DentistDashboardLayout
          currentPage={currentPath}
          onNavigate={(page) => navigate(`/${page}`)}
        >
          {renderDentistPage()}
        </DentistDashboardLayout>
      </>
    );
  }

  if (needsOnboarding && currentPath !== 'onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  if (currentPath === 'onboarding') {
    if (!needsOnboarding) {
      return <Navigate to="/dashboard" replace />;
    }
    return (
      <>
        {showServerMonitor && <ServerStatusMonitor />}
        {isImpersonating && <ImpersonationBanner />}
        <OnboardingWizard />
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
      case 'purchase-orders':
        return <PurchaseOrderPage />;
      case 'settings':
        return <SettingsPage />;
      case 'support':
        return <SupportPage />;
      case 'subscription':
        return <SubscriptionPage />;
      case 'extensions':
        return <ExtensionsPage />;
      case 'help-center':
        return <HelpCenterPage />;
      case 'photos':
        return <PhotoSubmissionsPage />;
      case 'quotes':
        return <QuoteRequestsPage />;
      case 'legal-notice':
        return <LegalNotice />;
      case 'privacy-policy':
        return <PrivacyPolicy />;
      case 'terms-of-service':
        return <TermsOfService />;
      default:
        return <Navigate to="/dashboard" replace />;
    }
  };

  return (
    <>
      {showServerMonitor && <ServerStatusMonitor />}
      {isImpersonating && <ImpersonationBanner />}
      <CookieConsent />
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
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
