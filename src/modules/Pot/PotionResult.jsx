import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useTranslation } from 'react-i18next';
import { potionTypes } from '../../static/themedConfigs';
import PotionModel from '../Potions/PotionModel';

function PotionPreview({ potion, quality }) {
  const bottle = useRef();
  useFrame((_, delta) => { if (bottle.current) bottle.current.rotation.y += delta * .45; });
  return <group ref={bottle} rotation={[.08, 0, -.08]}>
    <PotionModel potion={potion} quality={quality} position={[0, -.5, 0]} />
  </group>;
}

export default function PotionResult({ potionId, quality = 'basic' }) {
  const { t } = useTranslation();
  const potion = potionTypes.find(item => item.id === potionId);
  if (!potion) return null;
  return <section className="potion-result">
    <div className="potion-result-preview" role="img" aria-label={t(potion.name)}>
      <Canvas camera={{ position: [0, 0, 2.15], fov: 36 }} dpr={[1, 1.5]}>
        <ambientLight intensity={1.6} /><directionalLight position={[3, 4, 4]} intensity={3} />
        <PotionPreview potion={potion} quality={quality} />
      </Canvas>
    </div>
    <strong>{t(potion.name)}</strong>
    <p>{t('result.potionQuality', { quality: t('potion.quality.' + quality) })}</p>
  </section>;
}
