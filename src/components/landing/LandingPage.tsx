import { ArrowRight, CheckCircle, Package, FileText, Receipt, Users, TrendingUp, Shield, Clock, Zap, Sparkles, Star, Heart, Award, Target, Rocket, MousePointerClick, BarChart3, Calendar, Printer, Box, AlertTriangle, TrendingDown, RefreshCw, MessageCircle, Headphones, Mail, UserPlus, Camera, Phone, Layers } from 'lucide-react';
import { useState, useEffect } from 'react';
import DentalCloudLogo from '../common/DentalCloudLogo';
import { supabase } from '../../lib/supabase';
import LoginPage from '../auth/LoginPage';
import RegisterPage from '../auth/RegisterPage';

export function LandingPage() {
  const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                (window.navigator as any).standalone === true;

  const [currentView, setCurrentView] = useState<'landing' | 'login' | 'register'>(
    isPWA ? 'login' : 'landing'
  );
  const [price, setPrice] = useState<number>(59.99);
  const [contactPhone, setContactPhone] = useState<string>('');

  useEffect(() => {
    loadPrice();
    loadContactPhone();
  }, []);

  const loadPrice = async () => {
    const { data } = await supabase
      .from('subscription_plans')
      .select('price_monthly')
      .eq('is_active', true)
      .maybeSingle();

    if (data && data.price_monthly) {
      setPrice(typeof data.price_monthly === 'string' ? parseFloat(data.price_monthly) : data.price_monthly);
    }
  };

  const loadContactPhone = async () => {
    try {
      const { data, error } = await supabase
        .from('smtp_settings')
        .select('contact_phone')
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error loading contact phone:', error);
        return;
      }

      if (data?.contact_phone) {
        setContactPhone(data.contact_phone);
        console.log('Contact phone loaded:', data.contact_phone);
      } else {
        console.log('No contact phone found in database');
      }
    } catch (error) {
      console.error('Error in loadContactPhone:', error);
    }
  };


  const features = [
    {
      icon: Camera,
      title: 'Envoi de photos pour dentistes',
      description: 'Application gratuite pour les dentistes ! Envoyez des photos directement au laboratoire de votre choix. Inscription simple et rapide.',
    },
    {
      icon: Package,
      title: 'Bons de livraison',
      description: 'Créez et gérez vos bons de livraison en quelques clics. Suivi complet de chaque livraison avec historique détaillé.',
    },
    {
      icon: Layers,
      title: 'Gestion de travaux Kanban',
      description: 'Visualisez et suivez l\'avancement de vos travaux en temps réel. Organisez par étapes de production avec drag & drop intuitif.',
    },
    {
      icon: FileText,
      title: 'Proformas intelligents',
      description: 'Générez des proformas professionnels à partir de vos bons de livraison. Conversion automatique en factures.',
    },
    {
      icon: Receipt,
      title: 'Facturation simplifiée',
      description: 'Transformez vos proformas en factures définitives. Export PDF automatique et numérotation intelligente.',
    },
    {
      icon: Users,
      title: 'Gestion des dentistes',
      description: 'Base de données complète de vos clients dentistes avec historique des prestations et statistiques.',
    },
    {
      icon: TrendingUp,
      title: 'Tableau de bord analytique',
      description: 'Visualisez votre activité en temps réel : CA mensuel, articles les plus facturés, proformas en attente.',
    },
  ];

  const benefits = [
    {
      icon: Clock,
      title: 'Gain de temps',
      description: 'Automatisez votre gestion administrative et concentrez-vous sur votre métier',
    },
    {
      icon: Shield,
      title: 'Sécurisé',
      description: 'Vos données sont protégées et sauvegardées automatiquement',
    },
    {
      icon: Zap,
      title: 'Rapide & fluide',
      description: 'Interface moderne et intuitive pour une productivité maximale',
    },
  ];

  if (currentView === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50">
        {!isPWA && (
          <nav className="bg-white/80 backdrop-blur-lg border-b border-slate-200 sticky top-0 z-50">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <DentalCloudLogo size={32} showText={true} />
                <button
                  onClick={() => setCurrentView('landing')}
                  className="px-3 sm:px-6 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-all duration-300 text-sm sm:text-base whitespace-nowrap"
                >
                  Retour
                </button>
              </div>
            </div>
          </nav>
        )}
        <LoginPage
          onToggleRegister={() => setCurrentView('register')}
        />
      </div>
    );
  }

  if (currentView === 'register') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50">
        {!isPWA && (
          <nav className="bg-white/80 backdrop-blur-lg border-b border-slate-200 sticky top-0 z-50">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <DentalCloudLogo size={32} showText={true} />
                <button
                  onClick={() => setCurrentView('landing')}
                  className="px-3 sm:px-6 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-all duration-300 text-sm sm:text-base whitespace-nowrap"
                >
                  Retour
                </button>
              </div>
            </div>
          </nav>
        )}
        <RegisterPage
          onToggleLogin={() => setCurrentView('login')}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50">
      <nav className="bg-white/80 backdrop-blur-lg border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <DentalCloudLogo size={32} showText={true} />
            <button
              onClick={() => setCurrentView('login')}
              className="px-3 sm:px-6 py-2 rounded-lg bg-gradient-to-r from-primary-500 to-cyan-500 text-white font-medium hover:shadow-lg transition-all duration-300 text-sm sm:text-base whitespace-nowrap"
            >
              Connexion
            </button>
          </div>
        </div>
      </nav>

      <>
          <section className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 sm:w-96 sm:h-96 bg-primary-200/30 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-0 left-0 w-64 h-64 sm:w-96 sm:h-96 bg-cyan-200/30 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}} />

            <div className="text-center max-w-4xl mx-auto relative z-10">
              <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-primary-50 to-cyan-50 border border-primary-200 text-primary-700 text-xs sm:text-sm font-medium mb-4 sm:mb-6 shadow-lg">
                <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 animate-pulse" />
                <span className="hidden sm:inline">Solution complète pour laboratoires dentaires</span>
                <span className="sm:hidden">Laboratoires dentaires</span>
              </div>

              <div className="mb-4 sm:mb-6 flex justify-center gap-2 sm:gap-4">
                <div className="w-10 h-10 sm:w-16 sm:h-16 rounded-lg sm:rounded-2xl bg-gradient-to-br from-primary-400 to-cyan-400 flex items-center justify-center transform -rotate-12 hover:rotate-0 transition-transform duration-300 shadow-xl animate-float">
                  <Package className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
                </div>
                <div className="w-12 h-12 sm:w-20 sm:h-20 rounded-lg sm:rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center transform rotate-6 hover:rotate-0 transition-transform duration-300 shadow-xl animate-float" style={{animationDelay: '0.5s'}}>
                  <FileText className="w-6 h-6 sm:w-10 sm:h-10 text-white" />
                </div>
                <div className="w-10 h-10 sm:w-16 sm:h-16 rounded-lg sm:rounded-2xl bg-gradient-to-br from-orange-400 to-amber-400 flex items-center justify-center transform -rotate-6 hover:rotate-0 transition-transform duration-300 shadow-xl animate-float" style={{animationDelay: '1s'}}>
                  <Receipt className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
                </div>
              </div>

              <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-6 bg-gradient-to-r from-slate-900 via-primary-900 to-slate-900 bg-clip-text text-transparent leading-tight px-2">
                Gérez votre laboratoire dentaire en toute simplicité
              </h1>

              <p className="text-sm sm:text-base md:text-lg lg:text-xl text-slate-600 mb-6 sm:mb-8 leading-relaxed px-4">
                De la création des bons de livraison à la facturation finale, DentalCloud centralise toute votre gestion administrative.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4">
                <button
                  onClick={() => setCurrentView('register')}
                  className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-lg sm:rounded-xl bg-gradient-to-r from-primary-500 to-cyan-500 text-white text-sm sm:text-base font-semibold hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-primary-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="relative z-10">Commencer - 1 mois offert</span>
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform relative z-10" />
                </button>

                <div className="relative">
                  <div className="absolute inset-0 bg-primary-100 rounded-xl sm:rounded-2xl blur-xl opacity-50" />
                  <div className="relative bg-white rounded-xl sm:rounded-2xl px-4 sm:px-6 py-2 sm:py-3 shadow-lg border border-primary-200">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600" />
                      <div className="text-slate-600">
                        <span className="text-xl sm:text-2xl md:text-3xl font-bold text-primary-600">{price.toFixed(2)}€</span>
                        <span className="text-sm sm:text-base md:text-lg">/mois</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 sm:mt-6 md:mt-8 flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-6 text-xs sm:text-sm text-slate-600 px-4">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                  <span className="font-semibold text-primary-600">1 mois offert</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                  <span>Sans engagement</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                  <span>Support inclus</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                  <span className="hidden sm:inline">Mises à jour gratuites</span>
                  <span className="sm:hidden">MAJ gratuites</span>
                </div>
              </div>

            </div>
          </section>

          <section className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-12 lg:py-16">
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 mb-8 sm:mb-12 lg:mb-16 shadow-lg">
              <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 max-w-4xl mx-auto">
                <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-lg sm:rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                  <Camera className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="text-lg sm:text-2xl lg:text-3xl font-bold text-slate-900 mb-2 sm:mb-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                    <span>Pour les dentistes : Totalement gratuit !</span>
                    <span className="text-xs sm:text-sm lg:text-base bg-emerald-500 text-white px-3 py-1 sm:px-4 sm:py-1.5 rounded-full font-medium inline-block w-fit">100% Gratuit</span>
                  </h3>
                  <p className="text-slate-700 text-sm sm:text-base lg:text-lg xl:text-xl leading-relaxed">
                    Envoyez vos photos de travaux directement au laboratoire de votre choix.
                    Créez simplement votre compte gratuit et commencez à communiquer en quelques secondes.
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center mb-6 sm:mb-8 lg:mb-12 px-4">
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-2 sm:mb-4 bg-gradient-to-r from-slate-900 to-primary-900 bg-clip-text text-transparent">
                Fonctionnalités complètes
              </h2>
              <p className="text-sm sm:text-base lg:text-lg text-slate-600 max-w-2xl mx-auto">
                Tout ce dont vous avez besoin pour gérer votre laboratoire
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                const gradients = [
                  'from-primary-500 to-cyan-500',
                  'from-emerald-500 to-teal-500',
                  'from-orange-500 to-amber-500',
                  'from-pink-500 to-rose-500',
                  'from-violet-500 to-purple-500',
                  'from-blue-500 to-indigo-500',
                ];
                return (
                  <div
                    key={index}
                    className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-lg border border-slate-200 hover:shadow-2xl transition-all duration-300 group hover:-translate-y-1 sm:hover:-translate-y-2 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br opacity-5 group-hover:opacity-10 transition-opacity rounded-full -mr-12 -mt-12 sm:-mr-16 sm:-mt-16" style={{backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))`}} />
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl bg-gradient-to-br ${gradients[index % gradients.length]} flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all shadow-lg`}>
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" />
                    </div>
                    <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-slate-900 mb-1.5 sm:mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-xs sm:text-sm lg:text-base text-slate-600 leading-relaxed">
                      {feature.description}
                    </p>
                    <div className="mt-3 sm:mt-4 flex gap-0.5 sm:gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 sm:w-4 sm:h-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-12 lg:py-16 bg-gradient-to-br from-slate-50 to-white rounded-2xl sm:rounded-3xl">
            <div className="text-center mb-6 sm:mb-10 lg:mb-16 px-4">
              <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-primary-100 text-primary-700 text-xs sm:text-sm font-medium mb-4 sm:mb-6">
                <MousePointerClick className="w-3 h-3 sm:w-4 sm:h-4" />
                Comment ça marche ?
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-2 sm:mb-4 bg-gradient-to-r from-slate-900 to-primary-900 bg-clip-text text-transparent">
                Workflow simple
              </h2>
              <p className="text-sm sm:text-base lg:text-lg text-slate-600 max-w-2xl mx-auto">
                Suivez vos travaux en quelques clics
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-8 sm:mb-12 lg:mb-16">
              <div className="relative">
                <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-lg border-2 border-primary-200 hover:border-primary-400 transition-all group">
                  <div className="absolute -top-3 -left-3 sm:-top-4 sm:-left-4 w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-primary-500 to-cyan-500 rounded-lg sm:rounded-xl flex items-center justify-center text-white font-bold text-base sm:text-lg lg:text-xl shadow-lg">
                    1
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-primary-500 to-cyan-500 rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4 mx-auto group-hover:scale-110 transition-transform">
                    <Package className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" />
                  </div>
                  <h3 className="text-sm sm:text-base lg:text-lg font-bold text-slate-900 mb-1.5 sm:mb-2 text-center">Bon de livraison</h3>
                  <p className="text-xs sm:text-sm text-slate-600 text-center leading-relaxed">
                    Créez un bon avec dentiste, patient et articles
                  </p>
                </div>
                <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-6">
                  <ArrowRight className="w-6 h-6 text-primary-400" />
                </div>
              </div>

              <div className="relative">
                <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-lg border-2 border-blue-200 hover:border-blue-400 transition-all group">
                  <div className="absolute -top-3 -left-3 sm:-top-4 sm:-left-4 w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-blue-500 to-sky-500 rounded-lg sm:rounded-xl flex items-center justify-center text-white font-bold text-base sm:text-lg lg:text-xl shadow-lg">
                    2
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-blue-500 to-sky-500 rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4 mx-auto group-hover:scale-110 transition-transform">
                    <Layers className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" />
                  </div>
                  <h3 className="text-sm sm:text-base lg:text-lg font-bold text-slate-900 mb-1.5 sm:mb-2 text-center">Suivi Kanban</h3>
                  <p className="text-xs sm:text-sm text-slate-600 text-center leading-relaxed">
                    Organisez les travaux par étapes de production
                  </p>
                </div>
                <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-6">
                  <ArrowRight className="w-6 h-6 text-blue-400" />
                </div>
              </div>

              <div className="relative">
                <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-lg border-2 border-emerald-200 hover:border-emerald-400 transition-all group">
                  <div className="absolute -top-3 -left-3 sm:-top-4 sm:-left-4 w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg sm:rounded-xl flex items-center justify-center text-white font-bold text-base sm:text-lg lg:text-xl shadow-lg">
                    3
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4 mx-auto group-hover:scale-110 transition-transform">
                    <FileText className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" />
                  </div>
                  <h3 className="text-sm sm:text-base lg:text-lg font-bold text-slate-900 mb-1.5 sm:mb-2 text-center">Conversion proforma</h3>
                  <p className="text-xs sm:text-sm text-slate-600 text-center leading-relaxed">
                    Convertissez en proforma avec calcul automatique
                  </p>
                </div>
                <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-6">
                  <ArrowRight className="w-6 h-6 text-emerald-400" />
                </div>
              </div>

              <div className="relative">
                <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-lg border-2 border-orange-200 hover:border-orange-400 transition-all group">
                  <div className="absolute -top-3 -left-3 sm:-top-4 sm:-left-4 w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg sm:rounded-xl flex items-center justify-center text-white font-bold text-base sm:text-lg lg:text-xl shadow-lg">
                    4
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4 mx-auto group-hover:scale-110 transition-transform">
                    <Receipt className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" />
                  </div>
                  <h3 className="text-sm sm:text-base lg:text-lg font-bold text-slate-900 mb-1.5 sm:mb-2 text-center">Génération facture</h3>
                  <p className="text-xs sm:text-sm text-slate-600 text-center leading-relaxed">
                    Transformez en facture avec export PDF
                  </p>
                </div>
                <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-6">
                  <ArrowRight className="w-6 h-6 text-orange-400" />
                </div>
              </div>

              <div className="relative">
                <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-lg border-2 border-rose-200 hover:border-rose-400 transition-all group">
                  <div className="absolute -top-3 -left-3 sm:-top-4 sm:-left-4 w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-rose-500 to-pink-500 rounded-lg sm:rounded-xl flex items-center justify-center text-white font-bold text-base sm:text-lg lg:text-xl shadow-lg">
                    5
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-rose-500 to-pink-500 rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4 mx-auto group-hover:scale-110 transition-transform">
                    <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" />
                  </div>
                  <h3 className="text-sm sm:text-base lg:text-lg font-bold text-slate-900 mb-1.5 sm:mb-2 text-center">Suivi & Analytics</h3>
                  <p className="text-xs sm:text-sm text-slate-600 text-center leading-relaxed">
                    Visualisez votre CA et statistiques
                  </p>
                </div>
              </div>
            </div>

            <div className="hidden lg:block bg-gradient-to-br from-slate-100 to-slate-50 rounded-2xl p-8 border border-slate-200">
              <h3 className="text-2xl font-bold text-slate-900 mb-6 text-center">Fonctionnalités clés pour votre quotidien</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex gap-4 items-start bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-cyan-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 mb-1">Calendrier intégré</h4>
                    <p className="text-sm text-slate-600">Visualisez toutes vos livraisons sur un calendrier mensuel avec système d'alertes pour les travaux urgents (48h)</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-sky-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Layers className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 mb-1">Gestion de production Kanban</h4>
                    <p className="text-sm text-slate-600">Suivez l'avancement de chaque travail en temps réel avec un tableau Kanban intuitif. Déplacez les travaux entre les étapes par simple glisser-déposer</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Printer className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 mb-1">Export PDF professionnel</h4>
                    <p className="text-sm text-slate-600">Générez des documents PDF avec votre logo et informations personnalisées pour chaque type de document</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 mb-1">Catalogue produits</h4>
                    <p className="text-sm text-slate-600">Créez votre catalogue de prothèses avec codes, descriptions et prix pour une saisie ultra-rapide</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-12 lg:py-16">
            <div className="text-center mb-6 sm:mb-8 lg:mb-12 px-4">
              <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 text-blue-700 text-xs sm:text-sm font-medium mb-4 sm:mb-6">
                <Box className="w-3 h-3 sm:w-4 sm:h-4" />
                Gestion des stocks
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-2 sm:mb-4 bg-gradient-to-r from-slate-900 to-primary-900 bg-clip-text text-transparent">
                <span className="hidden sm:inline">Comment fonctionne la gestion des stocks ?</span>
                <span className="sm:hidden">Gestion des stocks</span>
              </h2>
              <p className="text-sm sm:text-base lg:text-lg text-slate-600 max-w-2xl mx-auto">
                Gérez vos ressources en toute simplicité
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-12 lg:mb-16">
              <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-lg border border-slate-200 hover:shadow-xl transition-all">
                <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4">
                  <Box className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1.5 sm:mb-2">Créer des ressources</h3>
                <p className="text-xs sm:text-sm text-slate-600">
                  Ajoutez vos matières premières avec stock et seuil d'alerte
                </p>
              </div>

              <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-lg border border-slate-200 hover:shadow-xl transition-all">
                <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4">
                  <Package className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1.5 sm:mb-2">Variantes multiples</h3>
                <p className="text-xs sm:text-sm text-slate-600">
                  Créez des variantes avec stocks séparés
                </p>
              </div>

              <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-lg border border-slate-200 hover:shadow-xl transition-all">
                <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4">
                  <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1.5 sm:mb-2">Déduction automatique</h3>
                <p className="text-xs sm:text-sm text-slate-600">
                  Mise à jour automatique lors des livraisons
                </p>
              </div>

              <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-lg border border-slate-200 hover:shadow-xl transition-all">
                <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4">
                  <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1.5 sm:mb-2">Alertes intelligentes</h3>
                <p className="text-xs sm:text-sm text-slate-600">
                  Alertes visuelles au seuil critique
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 border border-blue-200">
              <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                  <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900 mb-1.5 sm:mb-2">Réapprovisionnement simple</h3>
                  <p className="text-xs sm:text-sm lg:text-base text-slate-600">
                    Ajoutez du stock facilement avec un système traçable.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div className="bg-white rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-4 shadow-sm">
                  <div className="text-xs sm:text-sm font-medium text-slate-700 mb-0.5 sm:mb-1">Stock actuel</div>
                  <div className="text-base sm:text-xl lg:text-2xl font-bold text-blue-600">100</div>
                </div>
                <div className="bg-white rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-4 shadow-sm">
                  <div className="text-xs sm:text-sm font-medium text-slate-700 mb-0.5 sm:mb-1">Seuil</div>
                  <div className="text-base sm:text-xl lg:text-2xl font-bold text-orange-600">20</div>
                </div>
                <div className="bg-white rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-4 shadow-sm">
                  <div className="text-xs sm:text-sm font-medium text-slate-700 mb-0.5 sm:mb-1">MAJ</div>
                  <div className="text-base sm:text-xl lg:text-2xl font-bold text-emerald-600"><span className="hidden sm:inline">Aujourd'hui</span><span className="sm:hidden">OK</span></div>
                </div>
              </div>
            </div>
          </section>

          <section className="hidden lg:block max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-gradient-to-br from-slate-50 to-white rounded-3xl">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 text-emerald-700 text-sm font-medium mb-6">
                <Headphones className="w-4 h-4" />
                Besoin d'aide ?
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-slate-900 to-primary-900 bg-clip-text text-transparent">
                Centre d'aide & Support
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-4">
                Notre équipe est là pour vous aider à résoudre vos problèmes rapidement
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-100 to-cyan-100 border border-blue-300 text-blue-800 text-sm font-medium">
                <UserPlus className="w-4 h-4" />
                Entraide communautaire : tous les utilisateurs peuvent s'aider mutuellement
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-8 border border-blue-200 mb-8">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">Communauté d'entraide</h3>
                  <p className="text-slate-700 mb-4 leading-relaxed">
                    Le centre d'aide DentalCloud n'est pas qu'un simple support technique ! C'est aussi une <span className="font-semibold text-blue-700">communauté collaborative</span> où tous les utilisateurs peuvent partager leurs expériences, astuces et solutions.
                  </p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageCircle className="w-5 h-5 text-emerald-600" />
                        <h4 className="font-bold text-slate-900">Posez vos questions</h4>
                      </div>
                      <p className="text-sm text-slate-600">
                        Partagez vos problèmes et obtenez des réponses d'autres laboratoires dentaires
                      </p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <Heart className="w-5 h-5 text-pink-600" />
                        <h4 className="font-bold text-slate-900">Aidez les autres</h4>
                      </div>
                      <p className="text-sm text-slate-600">
                        Partagez votre expertise et vos bonnes pratiques avec la communauté
                      </p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="w-5 h-5 text-amber-600" />
                        <h4 className="font-bold text-slate-900">Votez pour les solutions</h4>
                      </div>
                      <p className="text-sm text-slate-600">
                        Les meilleures réponses remontent en haut grâce aux votes de la communauté
                      </p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <Award className="w-5 h-5 text-violet-600" />
                        <h4 className="font-bold text-slate-900">Gagnez des badges</h4>
                      </div>
                      <p className="text-sm text-slate-600">
                        Recevez des badges et de la reconnaissance pour votre contribution
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={`grid gap-6 mb-8 ${contactPhone ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
              {contactPhone && (
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 hover:shadow-xl transition-all group">
                  <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Phone className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Téléphone</h3>
                  <p className="text-slate-600 mb-4">
                    Appelez-nous directement pour une assistance rapide
                  </p>
                  <a
                    href={`tel:${contactPhone.replace(/\s/g, '')}`}
                    className="inline-flex items-center gap-2 text-green-600 font-medium text-sm hover:text-green-700 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    {contactPhone}
                  </a>
                </div>
              )}

              <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 hover:shadow-xl transition-all group">
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <MessageCircle className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Chat en direct</h3>
                <p className="text-slate-600 mb-4">
                  Discutez avec notre équipe en temps réel pour une assistance immédiate
                </p>
                <div className="inline-flex items-center gap-2 text-emerald-600 font-medium text-sm">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  Disponible maintenant
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 hover:shadow-xl transition-all group">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Mail className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Support par email</h3>
                <p className="text-slate-600 mb-4">
                  Envoyez-nous un email détaillé et recevez une réponse dans les 24h
                </p>
                <div className="text-blue-600 font-medium text-sm">
                  support@dentalcloud.fr
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 hover:shadow-xl transition-all group">
                <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <FileText className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Base de connaissances</h3>
                <p className="text-slate-600 mb-4">
                  Consultez nos guides et tutoriels pour devenir expert de DentalCloud
                </p>
                <div className="text-violet-600 font-medium text-sm">
                  +50 articles disponibles
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl p-8 text-white shadow-xl">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-2">Un problème ? Contactez-nous !</h3>
                  <p className="text-white/90">
                    Notre équipe support est disponible du lundi au vendredi de 9h à 18h pour vous accompagner
                  </p>
                </div>
                <button className="px-8 py-4 rounded-xl bg-white text-emerald-600 font-semibold hover:shadow-2xl transition-all duration-300 flex items-center gap-2 group whitespace-nowrap">
                  <MessageCircle className="w-5 h-5" />
                  Ouvrir un ticket
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </section>

          <section className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-12 lg:py-16">
            <div className="text-center mb-6 sm:mb-8 lg:mb-12 px-4">
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-2 sm:mb-4 bg-gradient-to-r from-slate-900 to-primary-900 bg-clip-text text-transparent">
                Pourquoi DentalCloud ?
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                const gradients = [
                  'from-primary-500 to-cyan-500',
                  'from-emerald-500 to-teal-500',
                  'from-orange-500 to-amber-500',
                ];
                const shapes = [
                  'rounded-2xl rotate-0',
                  'rounded-2xl rotate-6',
                  'rounded-2xl -rotate-6',
                ];
                return (
                  <div
                    key={index}
                    className="text-center p-4 sm:p-5 lg:p-6 group"
                  >
                    <div className="relative inline-block mb-3 sm:mb-4">
                      <div className={`w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 ${shapes[index]} bg-gradient-to-br ${gradients[index]} flex items-center justify-center mx-auto shadow-2xl group-hover:scale-110 group-hover:rotate-0 transition-all duration-300`}>
                        <Icon className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-white" />
                      </div>
                      <div className={`absolute inset-0 w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 ${shapes[index]} bg-gradient-to-br ${gradients[index]} blur-xl opacity-50 group-hover:opacity-75 transition-opacity`} />
                    </div>
                    <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-slate-900 mb-1.5 sm:mb-2">
                      {benefit.title}
                    </h3>
                    <p className="text-xs sm:text-sm lg:text-base text-slate-600 leading-relaxed">
                      {benefit.description}
                    </p>
                    <div className="mt-3 sm:mt-4 inline-flex items-center gap-1 text-primary-600 font-medium text-xs sm:text-sm">
                      <Award className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>Garanti</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-12 lg:py-16">
            <div className="text-center mb-6 sm:mb-8 lg:mb-12 px-4">
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-2 sm:mb-3 text-slate-900">
                Tarif unique
              </h2>
              <p className="text-sm sm:text-base lg:text-lg text-slate-600">
                Un seul prix, toutes les fonctionnalités
              </p>
            </div>

            <div className="max-w-md mx-auto">
              <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-br from-slate-50 to-white p-4 sm:p-6 lg:p-8 text-center border-b border-slate-200">
                  <div className="inline-flex items-baseline gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                    <span className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900">{price.toFixed(2)}€</span>
                    <span className="text-base sm:text-lg lg:text-xl text-slate-600">/mois</span>
                  </div>
                  <p className="text-xs sm:text-sm lg:text-base text-slate-600 mt-1 sm:mt-2">Sans engagement</p>
                </div>

                <div className="p-4 sm:p-6 lg:p-8">
                  <div className="space-y-2.5 sm:space-y-3 lg:space-y-4 mb-6 sm:mb-8">
                    <div className="flex items-start gap-2 sm:gap-3">
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-xs sm:text-sm lg:text-base text-slate-700">Documents illimités</span>
                    </div>
                    <div className="flex items-start gap-2 sm:gap-3">
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-xs sm:text-sm lg:text-base text-slate-700">Gestion des stocks</span>
                    </div>
                    <div className="flex items-start gap-2 sm:gap-3">
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-xs sm:text-sm lg:text-base text-slate-700">Tableau de bord</span>
                    </div>
                    <div className="flex items-start gap-2 sm:gap-3">
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-xs sm:text-sm lg:text-base text-slate-700">Export PDF</span>
                    </div>
                    <div className="flex items-start gap-2 sm:gap-3">
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-xs sm:text-sm lg:text-base text-slate-700">Support prioritaire</span>
                    </div>
                    <div className="flex items-start gap-2 sm:gap-3">
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-xs sm:text-sm lg:text-base text-slate-700">Mises à jour auto</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setCurrentView('register')}
                    className="w-full px-6 sm:px-8 py-3 sm:py-4 rounded-lg sm:rounded-xl bg-gradient-to-r from-primary-500 to-cyan-500 text-white text-sm sm:text-base font-semibold hover:shadow-lg hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 group"
                  >
                    <span className="hidden sm:inline">Commencer l'essai gratuit</span>
                    <span className="sm:hidden">Essai gratuit</span>
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <p className="text-center text-xs sm:text-sm text-slate-500 mt-3 sm:mt-4">
                    30 jours d'essai gratuit
                  </p>
                </div>
              </div>
            </div>
          </section>

          <footer className="bg-slate-900 text-white py-8 sm:py-12 mt-10 sm:mt-16 lg:mt-20">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
                <div>
                  <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <img
                      src="/logo.png"
                      alt="DentalCloud Logo"
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl"
                    />
                    <span className="text-lg sm:text-xl font-bold">DentalCloud</span>
                  </div>
                  <p className="text-xs sm:text-sm lg:text-base text-slate-400">
                    Solution de gestion pour votre laboratoire dentaire.
                  </p>
                </div>

                <div>
                  <h4 className="text-sm sm:text-base font-semibold mb-3 sm:mb-4">Fonctionnalités</h4>
                  <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-slate-400">
                    <li>Bons de livraison</li>
                    <li>Proformas</li>
                    <li>Facturation</li>
                    <li>Tableau de bord</li>
                  </ul>
                </div>

                <div className="sm:col-span-2 md:col-span-1">
                  <h4 className="text-sm sm:text-base font-semibold mb-3 sm:mb-4">Support</h4>
                  <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-slate-400">
                    <li>Documentation</li>
                    <li>Contact</li>
                    <li>FAQ</li>
                  </ul>
                </div>
              </div>

              <div className="border-t border-slate-800 mt-6 sm:mt-8 pt-6 sm:pt-8 text-center text-xs sm:text-sm text-slate-400">
                <p>&copy; 2024 DentalCloud. Tous droits réservés.</p>
              </div>
            </div>
          </footer>
      </>
    </div>
  );
}
