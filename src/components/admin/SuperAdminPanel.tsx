import { useState, useEffect } from 'react';
import { Users, MessageSquare, DollarSign, Activity, Shield, Key, Mail, ArrowLeft, TrendingUp, AlertCircle, Bell, Settings, ChevronDown, Gift, Building2, Database } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { UsersManagement } from './UsersManagement';
import { SubscriptionSettings } from './SubscriptionSettings';
import { SupportTickets } from './SupportTickets';
import { AdminAuditLog } from './AdminAuditLog';
import { AccessCodesManagement } from './AccessCodesManagement';
import { SmtpSettings } from './SmtpSettings';
import AlertsManagement from './AlertsManagement';
import { ReferralManagement } from './ReferralManagement';
import { CompanySettings } from './CompanySettings';
import DatabaseOptimization from './DatabaseOptimization';

type TabType = 'users' | 'subscriptions' | 'codes' | 'smtp' | 'support' | 'audit' | 'alerts' | 'referrals' | 'company' | 'database';
type CategoryType = 'gestion' | 'configuration' | 'suivi';

interface SuperAdminPanelProps {
  onNavigate?: (page: string) => void;
}

export function SuperAdminPanel({ onNavigate }: SuperAdminPanelProps = {}) {
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [openCategory, setOpenCategory] = useState<CategoryType | null>('gestion');
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSubscriptions: 0,
    openTickets: 0,
    monthlyRevenue: 0
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const [usersRes, subsRes, ticketsRes] = await Promise.all([
      supabase.from('user_profiles').select('*', { count: 'exact' }),
      supabase.from('user_profiles').select('*', { count: 'exact' }).eq('subscription_status', 'active'),
      supabase.from('support_tickets').select('*', { count: 'exact' }).in('status', ['open', 'in_progress'])
    ]);

    const plansRes = await supabase.from('subscription_plans').select('price_monthly').maybeSingle();
    const monthlyRevenue = (subsRes.count || 0) * (plansRes.data?.price_monthly || 0);

    setStats({
      totalUsers: usersRes.count || 0,
      activeSubscriptions: subsRes.count || 0,
      openTickets: ticketsRes.count || 0,
      monthlyRevenue
    });
  };

  const menuCategories = [
    {
      id: 'gestion' as CategoryType,
      label: 'Gestion',
      icon: Users,
      items: [
        { id: 'users' as TabType, label: 'Utilisateurs', icon: Users },
        { id: 'subscriptions' as TabType, label: 'Abonnements', icon: DollarSign },
        { id: 'referrals' as TabType, label: 'Affiliations', icon: Gift },
        { id: 'codes' as TabType, label: 'Codes d\'accès', icon: Key }
      ]
    },
    {
      id: 'configuration' as CategoryType,
      label: 'Configuration',
      icon: Settings,
      items: [
        { id: 'company' as TabType, label: 'Entreprise', icon: Building2 },
        { id: 'smtp' as TabType, label: 'Email', icon: Mail },
        { id: 'alerts' as TabType, label: 'Alertes', icon: Bell },
        { id: 'database' as TabType, label: 'Base de données', icon: Database }
      ]
    },
    {
      id: 'suivi' as CategoryType,
      label: 'Suivi',
      icon: Activity,
      items: [
        { id: 'support' as TabType, label: 'Support', icon: MessageSquare },
        { id: 'audit' as TabType, label: 'Audit', icon: Activity }
      ]
    }
  ];

  const statCards = [
    {
      label: 'Utilisateurs totaux',
      value: stats.totalUsers,
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      trend: '+12%'
    },
    {
      label: 'Abonnements actifs',
      value: stats.activeSubscriptions,
      icon: TrendingUp,
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50',
      trend: '+8%'
    },
    {
      label: 'Tickets ouverts',
      value: stats.openTickets,
      icon: AlertCircle,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
      trend: stats.openTickets > 5 ? 'Urgent' : 'Normal'
    },
    {
      label: 'Revenus mensuels',
      value: `${stats.monthlyRevenue.toFixed(2)}€`,
      icon: DollarSign,
      color: 'from-violet-500 to-violet-600',
      bgColor: 'bg-violet-50',
      trend: '+15%'
    }
  ];

  const toggleCategory = (categoryId: CategoryType) => {
    setOpenCategory(openCategory === categoryId ? null : categoryId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/20 to-slate-100">
      <div className="bg-white/95 backdrop-blur-md border-b border-slate-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-cyan-500 rounded-xl blur-md opacity-30"></div>
                <div className="relative w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-primary-600 to-cyan-600 bg-clip-text text-transparent">Super Admin</h1>
                <p className="text-xs sm:text-sm text-slate-600 hidden sm:block">Panneau d'administration</p>
              </div>
            </div>
            {onNavigate && (
              <button
                onClick={() => onNavigate('dashboard')}
                className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-gradient-to-r from-slate-100 to-slate-50 hover:from-slate-200 hover:to-slate-100 text-slate-700 rounded-xl transition-all text-sm font-medium shadow-sm hover:shadow-md active:scale-95"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Retour</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {statCards.map((stat, index) => {
              const Icon = stat.icon;
              const getIconColor = (color: string) => {
                if (color.includes('blue')) return 'text-primary-600';
                if (color.includes('emerald')) return 'text-emerald-600';
                if (color.includes('orange')) return 'text-orange-600';
                if (color.includes('violet')) return 'text-violet-600';
                return 'text-slate-600';
              };
              const getBgColor = (color: string) => {
                if (color.includes('blue')) return 'bg-gradient-to-br from-primary-50 to-cyan-50';
                if (color.includes('emerald')) return 'bg-gradient-to-br from-emerald-50 to-green-50';
                if (color.includes('orange')) return 'bg-gradient-to-br from-orange-50 to-amber-50';
                if (color.includes('violet')) return 'bg-gradient-to-br from-violet-50 to-purple-50';
                return 'bg-slate-50';
              };
              return (
                <div key={index} className="group bg-white rounded-xl p-3 sm:p-4 border border-slate-200/50 hover:border-slate-300 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`${getBgColor(stat.color)} p-2 rounded-lg`}>
                      <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${getIconColor(stat.color)}`} />
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      stat.trend.includes('+') ? 'bg-emerald-100 text-emerald-700' :
                      stat.trend === 'Urgent' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {stat.trend}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mb-1">{stat.label}</p>
                  <p className="text-lg sm:text-xl font-bold text-slate-900">{stat.value}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-slate-200/50 shadow-sm overflow-hidden">
              {menuCategories.map((category) => {
                const CategoryIcon = category.icon;
                const isOpen = openCategory === category.id;
                return (
                  <div key={category.id} className="border-b border-slate-200/50 last:border-b-0">
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gradient-to-r hover:from-primary-50/50 hover:to-cyan-50/50 transition-all duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <CategoryIcon className="w-5 h-5 text-slate-600" />
                        <span className="font-semibold text-slate-900">{category.label}</span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="bg-slate-50/50">
                        {category.items.map((item) => {
                          const ItemIcon = item.icon;
                          const isActive = activeTab === item.id;
                          return (
                            <button
                              key={item.id}
                              onClick={() => setActiveTab(item.id)}
                              className={`w-full flex items-center gap-3 px-4 py-3 pl-12 transition-all duration-200 ${
                                isActive
                                  ? 'bg-gradient-to-r from-primary-600 to-cyan-600 text-white shadow-md'
                                  : 'text-slate-700 hover:bg-white/80'
                              }`}
                            >
                              <ItemIcon className="w-4 h-4" />
                              <span className="text-sm font-medium">{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex-1">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-slate-200/50 shadow-sm p-4 sm:p-6">
              {activeTab === 'users' && <UsersManagement onStatsUpdate={loadStats} />}
              {activeTab === 'subscriptions' && <SubscriptionSettings />}
              {activeTab === 'referrals' && <ReferralManagement />}
              {activeTab === 'company' && <CompanySettings />}
              {activeTab === 'alerts' && <AlertsManagement />}
              {activeTab === 'codes' && <AccessCodesManagement />}
              {activeTab === 'smtp' && <SmtpSettings />}
              {activeTab === 'database' && <DatabaseOptimization />}
              {activeTab === 'support' && <SupportTickets />}
              {activeTab === 'audit' && <AdminAuditLog />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
