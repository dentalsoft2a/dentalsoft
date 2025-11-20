export interface StandardProductionStage {
  id: string;
  name: string;
  description: string;
  order_index: number;
  color: string;
  requires_approval: boolean;
}

export const DEFAULT_PRODUCTION_STAGES: StandardProductionStage[] = [
  {
    id: 'stage-reception',
    name: 'Réception',
    description: 'Réception et vérification du bon de livraison',
    order_index: 1,
    color: '#3B82F6',
    requires_approval: false
  },
  {
    id: 'stage-modelisation',
    name: 'Modélisation',
    description: 'Modélisation 3D et conception numérique',
    order_index: 2,
    color: '#8B5CF6',
    requires_approval: false
  },
  {
    id: 'stage-production',
    name: 'Production',
    description: 'Fabrication et production des prothèses',
    order_index: 3,
    color: '#F59E0B',
    requires_approval: false
  },
  {
    id: 'stage-finition',
    name: 'Finition',
    description: 'Finition et polissage des prothèses',
    order_index: 4,
    color: '#EC4899',
    requires_approval: false
  },
  {
    id: 'stage-controle',
    name: 'Contrôle Qualité',
    description: 'Contrôle qualité et validation finale',
    order_index: 5,
    color: '#EF4444',
    requires_approval: true
  },
  {
    id: 'stage-pret',
    name: 'Prêt à Livrer',
    description: 'Prêt pour expédition au cabinet dentaire',
    order_index: 6,
    color: '#10B981',
    requires_approval: false
  }
];

export function getStageById(stageId: string): StandardProductionStage | undefined {
  return DEFAULT_PRODUCTION_STAGES.find(stage => stage.id === stageId);
}

export function getStageByIndex(index: number): StandardProductionStage | undefined {
  return DEFAULT_PRODUCTION_STAGES.find(stage => stage.order_index === index);
}

export function getStageByName(name: string): StandardProductionStage | undefined {
  return DEFAULT_PRODUCTION_STAGES.find(stage => stage.name.toLowerCase() === name.toLowerCase());
}

export function calculateProgressFromStage(currentStageId: string | null): number {
  if (!currentStageId) return 0;

  const currentStage = getStageById(currentStageId);
  if (!currentStage) return 0;

  const totalStages = DEFAULT_PRODUCTION_STAGES.length;
  const currentIndex = currentStage.order_index - 1;

  return Math.round((currentIndex / totalStages) * 100);
}

export function getNextStage(currentStageId: string | null): StandardProductionStage | null {
  if (!currentStageId) return DEFAULT_PRODUCTION_STAGES[0];

  const currentStage = getStageById(currentStageId);
  if (!currentStage) return DEFAULT_PRODUCTION_STAGES[0];

  const nextIndex = currentStage.order_index;
  if (nextIndex >= DEFAULT_PRODUCTION_STAGES.length) return null;

  return getStageByIndex(nextIndex + 1) || null;
}

export function getPreviousStages(currentStageId: string): StandardProductionStage[] {
  const currentStage = getStageById(currentStageId);
  if (!currentStage) return [];

  return DEFAULT_PRODUCTION_STAGES.filter(stage => stage.order_index < currentStage.order_index);
}

export function isLastStage(stageId: string): boolean {
  const stage = getStageById(stageId);
  return stage?.order_index === DEFAULT_PRODUCTION_STAGES.length;
}
