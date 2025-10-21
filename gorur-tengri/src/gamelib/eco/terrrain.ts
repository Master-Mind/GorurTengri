import { mx_perlin_noise_float } from "three/src/nodes/materialx/lib/mx_noise.js";
import { attribute, transformNormalToView, vec3, varying,  wgslFn, storageTexture, instanceIndex, vec2, uint, storage, attributeArray } from "three/tsl";
import * as THREE from "three/webgpu";
import terrainWGSL from "./shaders/terrain.wgsl?raw";
import terrainFragWGSL from "./shaders/terrainFrag.wgsl?raw";
import genWGSL from "./shaders/genTerrainTex.wgsl?raw";
import heightWGSL from "./shaders/heightFunction.wgsl?raw";
import { jolt } from "../physics-general";

export function InitTerrain(renderer : THREE.WebGPURenderer, scene : THREE.Scene) {
    console.log("Generating terrain...");
    try {
        const material = new THREE.MeshStandardNodeMaterial();
        const vNormal = varying(vec3(), 'vNormal');
        const worldWidth = 128;
        const vertsPerMeter = 4;
        const texelsPerMeter = 1;
        const textureWidth = worldWidth * texelsPerMeter;
        const offset = new THREE.Vector3(0, -20, 5);

        const geometry = new THREE.PlaneGeometry( worldWidth * 1, worldWidth * 1, 
            worldWidth * vertsPerMeter, worldWidth * vertsPerMeter );
        geometry.rotateX(-Math.PI / 2);
        let terrainTexture = new THREE.StorageBufferAttribute(worldWidth * worldWidth, 2);
        terrainTexture.name = 'terrainPatch';
        geometry.setAttribute('terrainTex', terrainTexture);
        const heightFN = wgslFn(heightWGSL);
        const computeFN = wgslFn(genWGSL, [heightFN]);
        const terrainBuf = storage(terrainTexture, 'float', worldWidth * worldWidth);
        let com = computeFN({
            writeTex: terrainBuf,
            index: instanceIndex,
            width: textureWidth
        }).compute(textureWidth*textureWidth);
        renderer.computeAsync(com).then(() => {
            renderer.getArrayBufferAsync(terrainTexture).then((buff) => {
                const floatArr = new Float32Array(buff);
                console.log(floatArr);
            });
        });

        // register a callable WGSL function that takes vec3 and returns vec3
        const vtxMain = wgslFn(terrainWGSL,[vNormal, heightFN]);

        // use the returned vec3 as the vertex position offset in the node graph
        material.positionNode = vtxMain({
            position: attribute( 'position' ),
            offset: offset,
            readTex: terrainBuf,
            worldWidth: worldWidth,
            vertsPerMeter: vertsPerMeter
        });

        const fragMain = wgslFn(terrainFragWGSL, [vNormal]);

        material.colorNode = fragMain({
            uv: attribute('uv'),
            readTex: terrainBuf,
            worldWidth: worldWidth,
            vNormal: vNormal
        });

        material.normalNode = transformNormalToView( vNormal );

        const terrain = new THREE.Mesh(geometry, material);
        terrain.receiveShadow = true;
        terrain.castShadow = true;
        terrain.position.set(offset.x, offset.y, offset.z);
        scene.add(terrain);
        console.log("Terrain generated");
    } catch(err : any) {
        console.log(`Terrain gen failed with error: ${err.message}`);
    }
}