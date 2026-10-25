import { useTranslation } from 'react-i18next';
import { Text } from '@react-three/drei';
export const RecipeStages = ({ stages = [], currentStage = 0, position = [-3, 1, 0], baseFontSize = 0.24 }) => {
  const { t } = useTranslation();
  return (
  <group position={position}>
    {stages.slice(currentStage, currentStage + 4).map((stage, i) => <Text
      key={currentStage + i} position={[0, -i * 0.45, 0]}
      fontSize={Math.max(0.12, baseFontSize - i * 0.03)}
      color={i === 0 ? '#ffd700' : '#a6b8cf'} anchorX="center" anchorY="middle">
      {t(stage.name)}
    </Text>)}
  </group>
  );
};
