import React, {Suspense} from 'react';
import {Canvas} from '@react-three/fiber'
import {OrbitControls, Stars, useGLTF} from '@react-three/drei'
function Box() {
  return (
    <mesh rotation={[10, 10, 0]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="hotpink" />
    </mesh>
  )
}

function WaifuModel({model = "/WaifuModel/elysia_maid_honkai_impact.glb"})
{
    const {scene} = useGLTF(model);
    return (
        <primitive object={scene} scale ={1.5} position = {[0,-2.7,0]}>
        </primitive>
    )
}
useGLTF.preload('/WaifuModel/elysia_maid_honkai_impact.glb')

export default function WaifuScene() {
  return (
    <div className='w-full h-full'>
      <Canvas camera={{ position: [0, 0, 5] }}>
        {/* Ánh sáng là bắt buộc để thấy màu sắc */}
        <ambientLight intensity={0.1} />

        <directionalLight 
                position={[-5, 5, 5]} 
                intensity={1.5} 
                castShadow // Thêm shadow cho ánh sáng này
                shadow-mapSize-width={1024}
                shadow-mapSize-height={1024}
                />

        <pointLight color = "#ffe" intensity={5} distance={20} decay={2} position={[2, 2, 2]} />
        
        <directionalLight position={[0,0,5]} intensity = {1.5} castShadow shadow-mapSize-width = {1024} shadow-mapSize-height = {1024}>

        </directionalLight>
        {/* Vật thể test */}

        <Suspense fallback={null}>
        <WaifuModel></WaifuModel>
        </Suspense>
        
        {/* Cho phép xoay camera bằng chuột */}
        <OrbitControls />
        
        {/* Hiệu ứng nền cho lung linh */}
        <Stars />
      </Canvas>
    </div>
  )
}
