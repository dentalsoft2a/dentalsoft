import { Camera, FileText, ShoppingCart, History, Bell } from 'lucide-react';

interface Laboratory {
  laboratory_id: string;
  laboratory_name: string;
  allow_orders: boolean;
  allow_quotes: boolean;
  portal_message: string | null;
}

interface DentistNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  laboratories: Laboratory[];
  unreadNotifications: number;
}

export default function DentistNavigation({
  activeTab,
  onTabChange,
  laboratories,
  unreadNotifications
}: DentistNavigationProps) {
  const hasAnyOrdersEnabled = laboratories.some(lab => lab.allow_orders);
  const hasAnyQuotesEnabled = laboratories.some(lab => lab.allow_quotes);

  const tabs = [
    {
      id: 'photos',
      label: 'Photos',
      icon: Camera,
      visible: true,
      description: 'Envoyer des photos'
    },
    {
      id: 'quotes',
      label: 'Devis',
      icon: FileText,
      visible: hasAnyQuotesEnabled,
      description: 'Demandes de devis'
    },
    {
      id: 'orders',
      label: 'Commandes',
      icon: ShoppingCart,
      visible: hasAnyOrdersEnabled,
      description: 'Mes commandes'
    },
    {
      id: 'history',
      label: 'Historique',
      icon: History,
      visible: hasAnyOrdersEnabled || hasAnyQuotesEnabled,
      description: 'Derniers 30 jours'
    }
  ].filter(tab => tab.visible);

  return (
    <div className="bg-white border-b border-slate-200">
      {/* Mobile Navigation */}
      <div className="md:hidden">
        <div className="flex overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex-1 min-w-[80px] px-3 py-3 text-xs font-medium transition-all duration-200 relative ${
                  isActive
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-slate-600 hover:text-primary-600 border-b-2 border-transparent'
                }`}
              >
                <div className="flex flex-col items-center gap-1">
                  <div className="relative">
                    <Icon className="w-5 h-5" />
                    {tab.id === 'history' && unreadNotifications > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unreadNotifications > 9 ? '9+' : unreadNotifications}
                      </span>
                    )}
                  </div>
                  <span>{tab.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop Navigation */}
      <div className="hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`group inline-flex items-center gap-2 px-1 py-4 border-b-2 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-slate-600 hover:text-primary-600 hover:border-slate-300'
                  }`}
                >
                  <div className="relative">
                    <Icon className={`w-5 h-5 transition-transform duration-200 ${
                      isActive ? 'scale-110' : 'group-hover:scale-110'
                    }`} />
                    {tab.id === 'history' && unreadNotifications > 0 && (
                      <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                        {unreadNotifications > 9 ? '9+' : unreadNotifications}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-start">
                    <span>{tab.label}</span>
                    <span className={`text-xs transition-opacity duration-200 ${
                      isActive ? 'text-primary-500 opacity-100' : 'text-slate-400 opacity-0 group-hover:opacity-100'
                    }`}>
                      {tab.description}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Notification Bell (Always visible) */}
      {unreadNotifications > 0 && (
        <div className="absolute top-4 right-4 md:top-6 md:right-6">
          <button
            onClick={() => onTabChange('history')}
            className="relative p-2 text-slate-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all duration-200"
            title={`${unreadNotifications} notification${unreadNotifications > 1 ? 's' : ''} non lue${unreadNotifications > 1 ? 's' : ''}`}
          >
            <Bell className="w-6 h-6" />
            <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
              {unreadNotifications > 9 ? '9+' : unreadNotifications}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
