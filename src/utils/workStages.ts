/**
 * Étapes de travail par défaut pour la gestion de production
 * Ces étapes sont définies en dur dans le code et ne sont pas stockées en base de données
 */

export interface WorkStage {
  id: string;
  name: string;
  description: string;
  order_index: number;
  weight: number;
  color: string;
  is_active: boolean;
}

export const DEFAULT_WORK_STAGES: WorkStage[] = [
  {
    id: 'reception',
    name: 'Réception',
    description: 'Travail reçu et enregistré',
    order_index: 0,
    weight: 10,
    color: '#3b82f6',
    is_active: true
  },
  {
    id: 'modelisation',
    name: 'Modélisation',
    description: 'Conception et modélisation 3D',
    order_index: 1,
    weight: 25,
    color: '#8b5cf6',
    is_active: true
  },
  {
    id: 'production',
    name: 'Production',
    description: 'Fabrication du produit',
    order_index: 2,
    weight: 30,
    color: '#f59e0b',
    is_active: true
  },
  {
    id: 'finition',
    name: 'Finition',
    description: 'Finitions et polissage',
    order_index: 3,
    weight: 20,
    color: '#06b6d4',
    is_active: true
  },
  {
    id: 'controle',
    name: 'Contrôle qualité',
    description: 'Vérification et contrôle',
    order_index: 4,
    weight: 10,
    color: '#10b981',
    is_active: true
  },
  {
    id: 'pret',
    name: 'Prêt à livrer',
    description: 'Prêt pour la livraison',
    order_index: 5,
    weight: 5,
    color: '#22c55e',
    is_active: true
  }
];
