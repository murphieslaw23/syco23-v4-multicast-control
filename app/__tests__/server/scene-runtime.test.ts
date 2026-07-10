import { describe, expect, it } from 'vitest'
import { compileSceneFilterComplex, compileSceneFiltergraph, renderSceneSvg, validateScene } from '../../server/scene/scene-runtime'
import type { SceneGraph } from '../../types'

const scene: SceneGraph = {
  width: 1280,
  height: 720,
  background: '#000000',
  layers: [
    { id:'panel', type:'box', x:40, y:500, width:1200, height:160, zIndex:1, color:'#111111', opacity:.9 },
    { id:'title', type:'metadata', metadataField:'title', x:70, y:560, zIndex:2, color:'#ffffff', fontSize:46 },
    { id:'clock', type:'clock', x:70, y:620, zIndex:3, color:'#ff0000', fontSize:28 },
  ],
}

describe('scene runtime', () => {
  it('validates and renders deterministic SVG previews', () => {
    expect(validateScene(scene)).toEqual(scene)
    const svg=renderSceneSvg(scene,{title:'SYSTEM CORRUPT'})
    expect(svg).toContain('SYSTEM CORRUPT')
    expect(svg).toContain('width="1280"')
  })
  it('compiles scene layers into a real FFmpeg filtergraph', () => {
    const graph=compileSceneFiltergraph(scene,{title:'LIVE'})
    expect(graph).toContain('scale=1280:720')
    expect(graph).toContain('drawbox=')
    expect(graph).toContain("drawtext=text='LIVE'")
  })
  it('compiles managed image assets into an overlay graph', () => {
    const assetScene={...scene,layers:[...scene.layers,{id:'logo',type:'asset' as const,assetId:'asset-1',x:1000,y:40,width:200,height:100,zIndex:4}]}
    const result=compileSceneFilterComplex(assetScene,{}, {'asset-1':'/data/assets/logo.png'})
    expect(result.graph).toContain("movie='/data/assets/logo.png'")
    expect(result.graph).toContain('overlay=x=1000:y=40')
  })
  it('rejects duplicate layer identifiers', () => {
    expect(() => validateScene({...scene,layers:[scene.layers[0],scene.layers[0]]})).toThrow(/unique/)
  })
})
