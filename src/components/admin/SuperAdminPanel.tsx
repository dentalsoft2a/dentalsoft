import { useState, useEffect } from 'react';
import { Users, Settings, MessageSquare, DollarSign, Activity, Shield, Search, Filter, Key, Mail } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { UsersManagement } from './UsersManagement';
import { SubscriptionSettings } from './SubscriptionSettings';
import { SupportTickets } from './SupportTickets';
import { AdminAuditLog } from './AdminAuditLog';
import { AccessCodesManagement } from './AccessCodesManagement';
import { SmtpSettings } from './SmtpSettings';

type TabType = 'users' | 'subscriptions' | 'codes' | 'smtp' | 'support' | 'audit';

export function SuperAdminPanel() {
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

    const plansRes = await supabase.from('subscription_plans').select('price_monthly').single();
    const monthlyRevenue = (subsRes.count || 0) * (plansRes.data?.price_monthly || 0);

    setStats({
      totalUsers: usersRes.count || 0,
      activeSubscriptions: subsRes.count || 0,
      openTickets: ticketsRes.count || 0,
      monthlyRevenue
    });
  };

  const tabs = [
    { id: 'users' as TabType, label: 'Utilisateurs', icon: Users },
    { id: 'subscriptions' as TabType, label: 'Abonnements', icon: DollarSign },
    { id: 'codes' as TabType, label: 'Codes d\'accès', icon: Key },
    { id: 'smtp' as TabType, label: 'Configuration Email', icon: Mail },
    { id: 'support' as TabType, label: 'Support', icon: MessageSquare },
    { id: 'audit' as TabType, label: 'Audit', icon: Activity }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50">
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-6 shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Panneau Super Admin</h1>
              <p className="text-slate-300 text-sm">Gestion complète de la plateforme</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-primary-300" />
                <div>
                  <p className="text-sm text-slate-300">Utilisateurs</p>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-emerald-300" />
                <div>
                  <p className="text-sm text-slate-300">Abonnements actifs</p>
                  <p className="text-2xl font-bold">{stats.activeSubscriptions}</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-8 h-8 text-orange-300" />
                <div>
                  <p className="text-sm text-slate-300">Tickets ouverts</p>
                  <p className="text-2xl font-bold">{stats.openTickets}</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <Activity className="w-8 h-8 text-violet-300" />
                <div>
                  <p className="text-sm text-slate-300">CA mensuel</p>
                  <p className="text-2xl font-bold">{stats.monthlyRevenue.toFixed(2)}€</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-200">
            <div className="flex overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap
                      ${activeTab === tab.id
                        ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-6">
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
