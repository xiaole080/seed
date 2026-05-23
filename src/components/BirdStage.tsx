import { BirdSpeciesStage } from './BirdSpecies';
import type { EggSpeciesId, Stage } from '../data/types';

interface BirdStageProps {
  stage: Stage;
  size?: number;
  species?: EggSpeciesId;
}

export function BirdStage({ stage, size = 240, species = 'chicken' }: BirdStageProps) {
  return <BirdSpeciesStage species={species} stage={stage} size={size} />;
}
