import { useTranslation } from 'react-i18next';
import { Text } from '@react-three/drei';
import { SPAWN_BOTTLES_CORDS } from '../../static/constants';
import { theme } from '../../static/theme';
export const RecipeStages = ({ stages = [], currentStage = 0, position = [-3, 1, 0], baseFontSize = theme.typography.recipeSize }) => {
  const { t } = useTranslation();
  return (
  <group position={position}>
    {stages.slice(currentStage, currentStage + 4).map((stage, i) => <group
      key={currentStage + i} position={[0, -i * 0.45, 0]}>
      <mesh position={[-1.25, 0, 0]} raycast={() => null}>
        <planeGeometry args={[.16, .16]} />
        <meshBasicMaterial color={SPAWN_BOTTLES_CORDS.find(item => item.id === stage.id)?.color || theme.colors.white} />
      </mesh><Text position={[-1.05, 0, 0]}
      font={theme.fonts.spatial || undefined}
      fontSize={Math.max(theme.typography.recipeMinSize, baseFontSize - i * theme.typography.recipeSizeStep)}
      color={i === 0 ? theme.colors.recipeCurrent : theme.colors.recipeUpcoming} anchorX="left" anchorY="middle">
      {t(stage.name)}
    </Text></group>)}
  </group>
  );
};
