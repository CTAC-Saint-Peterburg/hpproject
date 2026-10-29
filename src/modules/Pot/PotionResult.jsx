import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useTranslation } from 'react-i18next';
import { potionTypes } from '../../static/themedConfigs';
import { theme } from '../../static/theme';

function PotionCylinder({ potion, quality }) {
  const bottle = useRef();
  const tier = ['basic', 'fine', 'masterwork'].indexOf(quality);
  const accent = [theme.colors.qualityBasic, theme.colors.qualityFine, theme.colors.qualityMasterwork][Math.max(0, tier)];
  useFrame((_, delta) => { if (bottle.current) bottle.current.rotation.y += delta * .45; });
  return <group ref={bottle} rotation={[.08, 0, -.08]}>
    <mesh><cylinderGeometry args={[.46, .46, 1.15, 24]} />
      <meshStandardMaterial color={potion.color} roughness={.22} metalness={.12} />
    </mesh>
    <mesh position={[0, .66, 0]}><cylinderGeometry args={[.28, .28, .17, 20]} />
      <meshStandardMaterial color={accent} roughness={.4} />
    </mesh>
    {Array.from({ length: Math.max(0, tier) + 1 }, (_, i) => <mesh key={i} position={[0, -.27 + i * .2, 0]}>
      <cylinderGeometry args={[.475, .475, .055, 24]} />
      <meshStandardMaterial color={accent} metalness={.45} roughness={.25} />
    </mesh>)}
  </group>;
}

export default function PotionResult({ potionId, quality = 'basic' }) {
  const { t } = useTranslation();
  const potion = potionTypes.find(item => item.id === potionId);
  if (!potion) return null;
  return <section className="potion-result">
    <div className="potion-result-preview" role="img" aria-label={t(potion.name)}>
      <Canvas camera={{ position: [0, .6, 3.5], fov: 42 }}>
        <ambientLight intensity={1.6} /><directionalLight position={[3, 4, 4]} intensity={3} />
        <PotionCylinder potion={potion} quality={quality} />
      </Canvas>
    </div>
    <strong>{t(potion.name)}</strong>
    <p>{t('result.potionQuality', { quality: t('potion.quality.' + quality) })}</p>
  </section>;
}
