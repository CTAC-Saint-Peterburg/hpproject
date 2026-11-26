import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { SPAWN_BOTTLES_CORDS } from '../../static/constants';
import { theme } from '../../static/theme';
import { brewingActions } from './brewingActions';
import { recipeBoardLayout } from '../Room/workshopLayout';
import { createWorkshopPropsGeometry } from '../Room/workshopPropsGeometry';

export const RecipeStages = ({ stages = [], currentStage = 0, temperature = 20, agitation = 0 }) => {
  const { t } = useTranslation(), { camera, size } = useThree();
  const {width,height,font,row,x,y,z}=recipeBoardLayout(camera.position.z,camera.fov,size.width/size.height,size.height);
  const geometry=useMemo(()=>{
    const result=createWorkshopPropsGeometry({rack:false});
    result.translate(3.1,-.45,1.65);result.scale(width/4.7,height/2.3,1);
    return result;
  },[width,height]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  const rows = [...brewingActions(stages[currentStage], temperature, agitation), ...stages.slice(currentStage, currentStage + 4)].slice(0, 4);
  return <group position={[x,y,z]}>
    <mesh geometry={geometry} raycast={()=>null}><meshStandardMaterial vertexColors roughness={1}/></mesh>
    {rows.map((stage,i)=><group key={currentStage+i} position={[0,height/2-.16-i*row,.1]}>
      {stage.id && <mesh position={[-width/2+.19,-font*.6,0]} raycast={()=>null}>
        <planeGeometry args={[font*.65,font*.65]}/><meshBasicMaterial color={SPAWN_BOTTLES_CORDS.find(item=>item.id===stage.id)?.color||theme.colors.white}/>
      </mesh>}
      <Text position={[-width/2+.4,0,0]} font={theme.fonts.spatial||undefined} fontSize={font}
        maxWidth={width-.62} lineHeight={1.15} anchorX="left" anchorY="top" raycast={()=>null}
        color={i===0?theme.colors.recipeCurrent:theme.colors.recipeUpcoming}>
        {stage.id?t(stage.name):stage.icon+' '+t(stage.name)}
      </Text>
    </group>)}
  </group>;
};
