import { useState, useEffect } from 'react';
import { Users, MessageSquare, DollarSign, Activity, Shield, Key, Mail, ArrowLeft, TrendingUp, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { UsersManagement } from './UsersManagement';
import { SubscriptionSettings } from './SubscriptionSettings';
import { SupportTickets } from './SupportTickets';
import { AdminAuditLog } from './AdminAuditLog';
import { AccessCodesManagement } from './AccessCodesManagement';
import { SmtpSettings } from './SmtpSettings';

type TabType = 'users' | 'subscriptions' | 'codes' | 'smtp' | 'support' | 'audit';

interface SuperAdminPanelProps {
  onNavigate?: (page: string) => void;
}

export function SuperAdminPanel({ onNavigate }: SuperAdminPanelProps = {}) {
  const [activeTab, setActiveTab] = useState<TabType>('users');
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

  const tabs = [
    { id: 'users' as TabType, label: 'Utilisateurs', icon: Users, color: 'from-blue-500 to-blue-600' },
    { id: 'subscriptions' as TabType, label: 'Abonnements', icon: DollarSign, color: 'from-emerald-500 to-emerald-600' },
    { id: 'codes' as TabType, label: 'Codes d\'accès', icon: Key, color: 'from-amber-500 to-amber-600' },
    { id: 'smtp' as TabType, label: 'Configuration Email', icon: Mail, color: 'from-pink-500 to-pink-600' },
    { id: 'support' as TabType, label: 'Support', icon: MessageSquare, color: 'from-orange-500 to-orange-600' },
    { id: 'audit' as TabType, label: 'Audit', icon: Activity, color: 'from-slate-500 to-slate-600' }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl blur-lg opacity-30 animate-pulse"></div>
                <div className="relative w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <Shield className="w-8 h-8 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  Panneau Super Admin
                </h1>
                <p className="text-slate-600 mt-1">Gestion et supervision complète de la plateforme</p>
              </div>
            </div>
            {onNavigate && (
              <button
                onClick={() => onNavigate('dashboard')}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all font-medium shadow-sm hover:shadow-md"
              >
                <ArrowLeft className="w-5 h-5" />
                Retour au Dashboard
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((stat, index) => {
              const Icon = stat.icon;
              const getIconColor = (color: string) => {
                if (color.includes('blue')) return 'text-blue-600';
                if (color.includes('emerald')) return 'text-emerald-600';
                if (color.includes('orange')) return 'text-orange-600';
                if (color.includes('violet')) return 'text-violet-600';
                return 'text-slate-600';
              };
              return (
                <div
                  key={index}
                  className="group relative bg-white rounded-2xl p-6 border border-slate-200 hover:border-slate-300 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`${stat.bgColor} p-3 rounded-xl shadow-sm group-hover:shadow-md transition-shadow`}>
                      <Icon className={`w-6 h-6 ${getIconColor(stat.color)}`} />
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      stat.trend.includes('+')
                        ? 'bg-emerald-100 text-emerald-700'
                        : stat.trend === 'Urgent'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {stat.trend}
                    </span>
                  </div>
                  <div>
                    <p className="text-slate-600 text-sm font-medium mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50/50">
            <div className="flex overflow-x-auto hide-scrollbar">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      relative flex items-center gap-3 px-8 py-5 font-semibold transition-all whitespace-nowrap group
                      ${isActive
                        ? 'text-slate-900'
                        : 'text-slate-600 hover:text-slate-900'
                      }
                    `}
                  >
                    <div className={`
                      p-2 rounded-lg transition-all
                      ${isActive
                        ? `bg-gradient-to-br ${tab.color} shadow-lg`
                        : 'bg-slate-200 group-hover:bg-slate-300'
                      }
                    `}>
                      <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-600'}`} />
                    </div>
                    <span>{tab.label}</span>
                    {isActive && (
                      <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${tab.color} rounded-t-full`}></div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-8">
            {activeTab === 'users' && <UsersManagement onStatsUpdate={loadStats} />}
            {activeTab === 'subscriptions' && <SubscriptionSettings />}
            {activeTab === 'codes' && <AccessCodesManagement />}
            {activeTab === 'smtp' && <SmtpSettings />}
            {activeTab === 'support' && <SupportTickets />}
            {activeTab === 'audit' && <AdminAuditLog />}
          </div>
        </div>
      </div>
    </div>
  );
}
