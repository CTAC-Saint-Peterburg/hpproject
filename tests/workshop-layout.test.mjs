import test from 'node:test';
import assert from 'node:assert/strict';
import { PerspectiveCamera, Vector3, Raycaster, Matrix4, Mesh, MeshBasicMaterial, DoubleSide } from 'three';
import { potDepth, rackPoint, RACK_YAW, recipeBoardLayout, workshopEnemyPosition } from '../src/modules/Room/workshopLayout.js';
import { createWorkshopPropsGeometry } from '../src/modules/Room/workshopPropsGeometry.js';
import { ingredientFlightPose, ingredientFlightSeconds } from '../src/modules/Ingredients/ingredientAnimation.js';
import { projectIngredientPointer } from '../src/modules/Ingredients/ingredientPointer.js';
import { readFileSync } from 'node:fs';
const brewing=JSON.parse(readFileSync(new URL('../src/static/brewing.json',import.meta.url),'utf8'));
const ingredients=[[2,1,0],[4,1,0],[6,1,0],[2,3,0],[4,3,0],[6,3,0]];

test('closer cauldron, adaptive board and rack stay inside standard game frames',()=>{
  for(const height of [320,360,575,768,1080]) for(const aspect of [1.5,1.6,16/9,1.8]) for(const depth of [8.464,9.2]) {
    const camera=new PerspectiveCamera(60,aspect,.1,100);camera.position.z=depth;camera.updateMatrixWorld();
    assert.equal(depth-potDepth(depth),depth*.75);
    const board=recipeBoardLayout(depth,60,aspect,height);
    const points=ingredients.map(rackPoint);
    for(const dx of [-board.width/2,board.width/2]) for(const dy of [-board.height/2,board.height/2]) points.push([board.x+dx,board.y+dy,board.z]);
    for(const point of points) {
      const p=new Vector3(...point).project(camera);assert.ok(Math.abs(p.x)<.99&&Math.abs(p.y)<.99,`${height}/${aspect}: ${point}`);
    }
    assert.ok(board.x+board.width/2 < -1.3,'board does not cover the cauldron');
  }
});
test('pointer lands on the new cauldron plane and ingredient flight ends there',()=>{
  const camera=new PerspectiveCamera(60,16/9,.1,100);camera.position.z=8.464;camera.updateMatrixWorld();
  const z=potDepth(camera.position.z),out=new Vector3();
  assert.ok(projectIngredientPointer({x:0,y:0},camera,z,new Raycaster(),out));
  assert.ok(out.length()>0 && Math.hypot(out.x,out.y)<.001);assert.ok(Math.abs(out.z-z)<1e-9);
  for(const origin of ingredients.map(rackPoint)) {
    const end=ingredientFlightPose(origin,ingredientFlightSeconds(brewing.ingredientAnimation),brewing.ingredientAnimation,z);
    assert.deepEqual(end.position,[0,-.15,z]);
  }
});
test('rack does not hide ingredients and recipe does not hide arrived cube enemies',()=>{
  for(const height of [320,360,575,1080]) for(const aspect of [1.5,16/9]) {
    const camera=new PerspectiveCamera(60,aspect,.1,100);camera.position.z=8.464;camera.updateMatrixWorld();
    const viewHeight=2*camera.position.z*Math.tan(Math.PI/6),view={width:viewHeight*aspect,height:viewHeight};
    const b=recipeBoardLayout(camera.position.z,60,aspect,height);
    const rack=createWorkshopPropsGeometry({board:false});rack.translate(-4,0,0);rack.scale(.8,1,1);rack.applyMatrix4(new Matrix4().makeRotationY(RACK_YAW));rack.translate(3.8,0,1.2);
    const board=createWorkshopPropsGeometry({rack:false});board.translate(3.1,-.45,1.65);board.scale(b.width/4.7,b.height/2.3,1);board.translate(b.x,b.y,b.z);
    const material=new MeshBasicMaterial({side:DoubleSide});const meshes=[rack,board].map(g=>{const m=new Mesh(g,material);m.updateMatrixWorld();return m;});
    const points=ingredients.map(rackPoint);
    for(const side of [-1,1]) points.push(workshopEnemyPosition({type:'enemycold',bornAt:0,side},5000,camera,view));
    for(const point of points) {
      const p=new Vector3(...point),ray=new Raycaster(camera.position,p.clone().sub(camera.position).normalize());
      const hit=ray.intersectObjects(meshes)[0];assert.ok(!hit||hit.distance>camera.position.distanceTo(p),`furniture covers ${point}, ${height}/${aspect}`);
    }
    rack.dispose();board.dispose();material.dispose();
  }
});
