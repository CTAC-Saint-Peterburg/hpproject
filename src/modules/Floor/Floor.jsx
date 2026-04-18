export const Floor = () => {
  return (
    <mesh 
  position={[0, -1, 0]}  // На уровне земли
  rotation={[-Math.PI / 2, 0, 0]}  // Поворот в горизонталь
  receiveShadow  // Принимает тени от объектов сверху
>
  <planeGeometry args={[20, 20]} />  {/* Ширина 20, глубина 20 */}
  <meshStandardMaterial color="gray" />
</mesh>
  )
}
