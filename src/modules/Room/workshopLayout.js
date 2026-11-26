import { enemyPosition } from '../../static/enemies.js';
// Shared world-space layout: picking, particles and flights use the same positions.
export const potDepth = cameraDepth => cameraDepth * .25;
export const RACK_YAW = -.16;
export function workshopEnemyPosition(enemy, now, camera, viewport) {
  const position=enemyPosition(enemy,now,viewport.width,viewport.height);
  if (enemy.type === 'enemyslime') {
    const z=potDepth(camera.position.z)+1;
    position[0]*=(camera.position.z-z)/(camera.position.z-position[2]);
    position[2]=z;
  }
  return position;
}
export function rackPoint([x,y,z]) {
  const localX=(x-4)*.8;
  return [3.8+localX*Math.cos(RACK_YAW)+z*Math.sin(RACK_YAW), y,
    1.2-localX*Math.sin(RACK_YAW)+z*Math.cos(RACK_YAW)];
}
export function recipeBoardLayout(cameraDepth, fov, aspect, pixelHeight) {
  const z=potDepth(cameraDepth), height=2*(cameraDepth-z)*Math.tan(fov*Math.PI/360);
  const pixel=height/Math.max(1,pixelHeight), viewWidth=height*aspect;
  const width=Math.max(2,Math.min(viewWidth*.48-1.45,Math.max(4.7,230*pixel)));
  const font=Math.max(.22,(pixelHeight<360?13:14)*pixel), row=Math.max(.48,font*2.4);
  const boardHeight=row*4+.32;
  return {width,height:boardHeight,font,row,x:-1.45-width/2,y:Math.max(.45,boardHeight/2-.85),z};
}
