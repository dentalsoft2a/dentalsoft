import { ArrowRight, CheckCircle, Package, FileText, Receipt, Users, TrendingUp, Shield, Clock, Zap, Sparkles, Star, Heart, Award, Target, Rocket, MousePointerClick, BarChart3, Calendar, Printer, Box, AlertTriangle, TrendingDown, RefreshCw, MessageCircle, Headphones, Mail, UserPlus, Camera, Phone } from 'lucide-react';
import { useState, useEffect } from 'react';
import DentalCloudLogo from '../common/DentalCloudLogo';
import { supabase } from '../../lib/supabase';
import LoginPage from '../auth/LoginPage';
import RegisterPage from '../auth/RegisterPage';

export function LandingPage() {
  const [currentView, setCurrentView] = useState<'landing' | 'login' | 'register'>('landing');
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
      icon: Package,
      title: 'Bons de livraison',
      description: 'Créez et gérez vos bons de livraison en quelques clics. Suivi complet de chaque livraison avec historique détaillé.',
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
    {
      icon: Package,
      title: 'Catalogue de produits',
      description: 'Gérez votre catalogue complet de prothèses avec codes, noms et prix. Mise à jour facile et rapide.',
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
        <nav className="bg-white/80 backdrop-blur-lg border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
        <LoginPage onToggleRegister={() => setCurrentView('register')} />
      </div>
    );
  }

  if (currentView === 'register') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50">
        <nav className="bg-white/80 backdrop-blur-lg border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
        <RegisterPage onToggleLogin={() => setCurrentView('login')} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50">
      <nav className="bg-white/80 backdrop-blur-lg border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary-200/30 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-200/30 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}} />

            <div className="text-center max-w-4xl mx-auto relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary-50 to-cyan-50 border border-primary-200 text-primary-700 text-sm font-medium mb-6 shadow-lg">
                <Sparkles className="w-4 h-4 animate-pulse" />
                Solution complète pour laboratoires dentaires
              </div>

              <div className="mb-6 flex justify-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-cyan-400 flex items-center justify-center transform -rotate-12 hover:rotate-0 transition-transform duration-300 shadow-xl animate-float">
                  <Package className="w-8 h-8 text-white" />
                </div>
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center transform rotate-6 hover:rotate-0 transition-transform duration-300 shadow-xl animate-float" style={{animationDelay: '0.5s'}}>
                  <FileText className="w-10 h-10 text-white" />
                </div>
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-400 flex items-center justify-center transform -rotate-6 hover:rotate-0 transition-transform duration-300 shadow-xl animate-float" style={{animationDelay: '1s'}}>
                  <Receipt className="w-8 h-8 text-white" />
                </div>
              </div>

              <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-slate-900 via-primary-900 to-slate-900 bg-clip-text text-transparent leading-tight">
                Gérez votre laboratoire dentaire en toute simplicité
              </h1>

              <p className="text-xl text-slate-600 mb-8 leading-relaxed">
                De la création des bons de livraison à la facturation finale, DentalCloud centralise toute votre gestion administrative dans une seule application moderne et intuitive.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <button
                  onClick={() => setCurrentView('register')}
                  className="px-8 py-4 rounded-xl bg-gradient-to-r from-primary-500 to-cyan-500 text-white font-semibold hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center gap-2 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-primary-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="relative z-10">Commencer maintenant</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform relative z-10" />
                </button>

                <div className="relative">
                  <div className="absolute inset-0 bg-primary-100 rounded-2xl blur-xl opacity-50" />
                  <div className="relative bg-white rounded-2xl px-6 py-3 shadow-lg border border-primary-200">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary-600" />
                      <div className="text-slate-600">
                        <span className="text-3xl font-bold text-primary-600">{price.toFixed(2)}€</span>
                        <span className="text-lg">/mois</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Sans engagement</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Support inclus</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Mises à jour gratuites</span>
                </div>
              </div>

            </div>
          </section>

          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-slate-900 to-primary-900 bg-clip-text text-transparent">
                Fonctionnalités complètes
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Tout ce dont vous avez besoin pour gérer efficacement votre laboratoire dentaire
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                    className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 hover:shadow-2xl transition-all duration-300 group hover:-translate-y-2 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br opacity-5 group-hover:opacity-10 transition-opacity rounded-full -mr-16 -mt-16" style={{backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))`}} />
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradients[index % gradients.length]} flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all shadow-lg`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-slate-600 leading-relaxed">
                      {feature.description}
                    </p>
                    <div className="mt-4 flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-gradient-to-br from-slate-50 to-white rounded-3xl">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 text-primary-700 text-sm font-medium mb-6">
                <MousePointerClick className="w-4 h-4" />
                Comment ça marche ?
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-slate-900 to-primary-900 bg-clip-text text-transparent">
                Un workflow simple et efficace
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Suivez vos travaux du début à la fin en quelques clics
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-6 mb-16">
              <div className="relative">
                <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-primary-200 hover:border-primary-400 transition-all group">
                  <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br from-primary-500 to-cyan-500 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                    1
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-cyan-500 rounded-xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform">
                    <Package className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2 text-center">Bon de livraison</h3>
                  <p className="text-sm text-slate-600 text-center leading-relaxed">
                    Créez un bon de livraison avec les détails du dentiste, patient et articles
                  </p>
                </div>
                <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-6">
                  <ArrowRight className="w-6 h-6 text-primary-400" />
                </div>
              </div>

              <div className="relative">
                <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-emerald-200 hover:border-emerald-400 transition-all group">
                  <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                    2
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform">
                    <FileText className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2 text-center">Conversion en proforma</h3>
                  <p className="text-sm text-slate-600 text-center leading-relaxed">
                    Convertissez automatiquement en proforma avec calcul des totaux et taxes
                  </p>
                </div>
                <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-6">
                  <ArrowRight className="w-6 h-6 text-emerald-400" />
                </div>
              </div>

              <div className="relative">
                <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-orange-200 hover:border-orange-400 transition-all group">
                  <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                    3
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform">
                    <Receipt className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2 text-center">Génération facture</h3>
                  <p className="text-sm text-slate-600 text-center leading-relaxed">
                    Transformez la proforma en facture définitive avec export PDF
                  </p>
                </div>
                <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-6">
                  <ArrowRight className="w-6 h-6 text-orange-400" />
                </div>
              </div>

              <div className="relative">
                <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-violet-200 hover:border-violet-400 transition-all group">
                  <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                    4
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform">
                    <BarChart3 className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2 text-center">Suivi & Analytics</h3>
                  <p className="text-sm text-slate-600 text-center leading-relaxed">
                    Visualisez votre CA et vos statistiques sur le tableau de bord
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-100 to-slate-50 rounded-2xl p-8 border border-slate-200">
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
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 mb-1">Base dentistes complète</h4>
                    <p className="text-sm text-slate-600">Gérez tous vos clients dentistes avec leurs coordonnées, historique des travaux et statistiques de CA</p>
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

          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 text-blue-700 text-sm font-medium mb-6">
                <Box className="w-4 h-4" />
                Gestion des stocks
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-slate-900 to-primary-900 bg-clip-text text-transparent">
                Comment fonctionne la gestion des stocks ?
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Gérez vos ressources et matières premières avec précision et facilité
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 hover:shadow-xl transition-all">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-4">
                  <Box className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Créer des ressources</h3>
                <p className="text-sm text-slate-600">
                  Ajoutez vos matières premières (céramique, zircone, métaux, etc.) avec stock initial et seuil d'alerte
                </p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 hover:shadow-xl transition-all">
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center mb-4">
                  <Package className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Variantes multiples</h3>
                <p className="text-sm text-slate-600">
                  Créez des variantes (couleurs, tailles, types) pour chaque ressource avec stocks séparés
                </p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 hover:shadow-xl transition-all">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center mb-4">
                  <TrendingDown className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Déduction automatique</h3>
                <p className="text-sm text-slate-600">
                  Le stock se met à jour automatiquement lors de la création des bons de livraison
                </p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 hover:shadow-xl transition-all">
                <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center mb-4">
                  <AlertTriangle className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Alertes intelligentes</h3>
                <p className="text-sm text-slate-600">
                  Recevez des alertes visuelles lorsque le stock atteint le seuil critique défini
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-8 border border-blue-200">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <RefreshCw className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Réapprovisionnement simple</h3>
                  <p className="text-slate-600">
                    Ajoutez facilement du stock avec un système de mouvements traçables. Chaque entrée et sortie est enregistrée avec date, quantité et raison.
                  </p>
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="text-sm font-medium text-slate-700 mb-1">Stock actuel</div>
                  <div className="text-2xl font-bold text-blue-600">100 unités</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="text-sm font-medium text-slate-700 mb-1">Seuil d'alerte</div>
                  <div className="text-2xl font-bold text-orange-600">20 unités</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="text-sm font-medium text-slate-700 mb-1">Dernière mise à jour</div>
                  <div className="text-2xl font-bold text-emerald-600">Aujourd'hui</div>
                </div>
              </div>
            </div>
          </section>

          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-gradient-to-br from-slate-50 to-white rounded-3xl">
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

          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-slate-900 to-primary-900 bg-clip-text text-transparent">
                Pourquoi choisir DentalCloud ?
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
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
                    className="text-center p-6 group"
                  >
                    <div className="relative inline-block mb-4">
                      <div className={`w-20 h-20 ${shapes[index]} bg-gradient-to-br ${gradients[index]} flex items-center justify-center mx-auto shadow-2xl group-hover:scale-110 group-hover:rotate-0 transition-all duration-300`}>
                        <Icon className="w-10 h-10 text-white" />
                      </div>
                      <div className={`absolute inset-0 w-20 h-20 ${shapes[index]} bg-gradient-to-br ${gradients[index]} blur-xl opacity-50 group-hover:opacity-75 transition-opacity`} />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">
                      {benefit.title}
                    </h3>
                    <p className="text-slate-600 leading-relaxed">
                      {benefit.description}
                    </p>
                    <div className="mt-4 inline-flex items-center gap-1 text-primary-600 font-medium text-sm">
                      <Award className="w-4 h-4" />
                      <span>Garanti</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-3 text-slate-900">
                Tarif unique et transparent
              </h2>
              <p className="text-lg text-slate-600">
                Un seul prix, toutes les fonctionnalités
              </p>
            </div>

            <div className="max-w-md mx-auto">
              <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-br from-slate-50 to-white p-8 text-center border-b border-slate-200">
                  <div className="inline-flex items-baseline gap-2 mb-2">
                    <span className="text-6xl font-bold text-slate-900">{price.toFixed(2)}€</span>
                    <span className="text-xl text-slate-600">/mois</span>
                  </div>
                  <p className="text-slate-600 mt-2">Sans engagement</p>
                </div>

                <div className="p-8">
                  <div className="space-y-4 mb-8">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">Documents illimités</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">Gestion complète des stocks</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">Tableau de bord analytique</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">Export PDF professionnel</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">Support prioritaire</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">Mises à jour automatiques</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setCurrentView('register')}
                    className="w-full px-8 py-4 rounded-xl bg-gradient-to-r from-primary-500 to-cyan-500 text-white font-semibold hover:shadow-lg hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 group"
                  >
                    Commencer l'essai gratuit
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <p className="text-center text-sm text-slate-500 mt-4">
                    30 jours d'essai gratuit
                  </p>
                </div>
              </div>
            </div>
          </section>

          <footer className="bg-slate-900 text-white py-12 mt-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid md:grid-cols-3 gap-8">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-cyan-500 flex items-center justify-center">
                      <Package className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xl font-bold">DentalCloud</span>
                  </div>
                  <p className="text-slate-400">
                    La solution de gestion complète pour votre laboratoire dentaire.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-4">Fonctionnalités</h4>
                  <ul className="space-y-2 text-slate-400">
                    <li>Bons de livraison</li>
                    <li>Proformas</li>
                    <li>Facturation</li>
                    <li>Tableau de bord</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-4">Support</h4>
                  <ul className="space-y-2 text-slate-400">
                    <li>Documentation</li>
                    <li>Contact</li>
                    <li>FAQ</li>
                  </ul>
                </div>
              </div>

              <div className="border-t border-slate-800 mt-8 pt-8 text-center text-slate-400">
                <p>&copy; 2024 DentalCloud. Tous droits réservés.</p>
              </div>
            </div>
          </footer>
      </>
    </div>
  );
}
