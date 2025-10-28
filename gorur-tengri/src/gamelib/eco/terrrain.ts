import { mx_perlin_noise_float } from "three/src/nodes/materialx/lib/mx_noise.js";
import { attribute, transformNormalToView, vec3, varying,  wgslFn, storageTexture, instanceIndex, vec2, uint, storage, attributeArray } from "three/tsl";
import * as THREE from "three/webgpu";
import terrainWGSL from "./shaders/terrain.wgsl?raw";
import terrainFragWGSL from "./shaders/terrainFrag.wgsl?raw";
import genWGSL from "./shaders/genTerrainTex.wgsl?raw";
import genMeshWGSL from "./shaders/genTerrainMesh.wgsl?raw";
import heightWGSL from "./shaders/heightFunction.wgsl?raw";
import { jolt } from "../physics-general";
import { now } from "three/examples/jsm/libs/tween.module.js";
const heightFN = wgslFn(heightWGSL);
const buffFN = wgslFn(genMeshWGSL);
const computeFN = wgslFn(genWGSL, [heightFN]);

const patchWorldWidth = 256;
const heightScale = 64;

class terrainPatch {
    constructor(samplesPerMeter: number, 
        offset: THREE.Vector3){
        const bufferWidth = patchWorldWidth * samplesPerMeter;
        this.offset = offset;
        this.terrainTexture = new THREE.StorageBufferAttribute(bufferWidth * bufferWidth, 1);
        this.terrainTexture.name = 'terrainPatchTex';
        this.normalTexture = new THREE.StorageTexture(bufferWidth, bufferWidth);
        this.normalTexture.name = 'terrainPatchNormals';
        this.normalTexture.generateMipmaps = false;
        this.terrainTexBuf = storage(this.terrainTexture, 'float', bufferWidth * bufferWidth);
        this.writeNorm= storageTexture(this.normalTexture);
        this.readNorm = storageTexture(this.normalTexture);
        this.readNorm.setAccess(THREE.NodeAccess.READ_ONLY);
        this.samplesPerMeter = samplesPerMeter;

        this.comTex = computeFN({
            writeTex: this.terrainTexBuf,
            normTex: this.writeNorm,
            index: instanceIndex,
            offset: offset,
            worldWidth: patchWorldWidth,
            samplesPerMeter: samplesPerMeter,
            heightScale: heightScale
        }).compute(bufferWidth*bufferWidth);

        this.mesh = null;
        this.material = null;
    }

    async prepareHeightfield(renderer: THREE.WebGPURenderer) {
        await renderer.computeAsync(this.comTex);
    }

    async instantiate(renderer: THREE.WebGPURenderer,
            scene: THREE.Scene,
            geo: THREE.BufferGeometry) {
        this.material = new THREE.MeshStandardNodeMaterial();
        const vNormal = varying(vec3(), 'vNormal');
        //console.log(`Three took ${(now() - comptim)} to generate the heightmap`);
            

        //let buff = await renderer.getArrayBufferAsync(this.terrainTexture)
        //const floatArr = new Float16Array(buff);
        //console.log(`Three took ${(now() - comptim)} to retrieve the heightmap`);

        const vtxMain = wgslFn(terrainWGSL,[vNormal, heightFN]);

        // use the returned vec3 as the vertex position offset in the node graph
        this.material.positionNode = vtxMain({
            position: attribute( 'position' ),
            offset: this.offset,
            normTex: this.readNorm,
            samplesPerMeter: this.samplesPerMeter,
            heightTex: this.terrainTexBuf,
            worldWidth: patchWorldWidth,
            heightScale: heightScale
        });

        const fragMain = wgslFn(terrainFragWGSL);

        this.material.colorNode = fragMain({
            vNormal: vNormal
        });

        this.material.normalNode = transformNormalToView( vNormal );
        this.mesh = new THREE.Mesh(geo, this.material);
        this.mesh.position.set(this.offset.x, this.offset.y, this.offset.z);
        scene.add(this.mesh);

        //console.log("Terrain generated");
    }

    dispose(scene: THREE.Scene) {
        if (this.mesh)
        {
            scene.remove(this.mesh);
            this.material?.dispose();
        }
        this.comTex.dispose();
        this.terrainTexBuf.dispose();
        this.writeNorm.dispose();
        this.readNorm.dispose();

        this.normalTexture.dispose();
    }

    mesh: THREE.Mesh<THREE.BufferGeometry<THREE.NormalBufferAttributes, THREE.BufferGeometryEventMap>, THREE.MeshStandardNodeMaterial, THREE.Object3DEventMap> | null;
    material: THREE.MeshStandardNodeMaterial | null;

    samplesPerMeter: number;
    comTex: THREE.TSL.ShaderNodeObject<THREE.ComputeNode>;
    offset: THREE.Vector3;
    terrainTexture: THREE.StorageBufferAttribute;
    normalTexture: THREE.StorageTexture;
    terrainTexBuf: THREE.TSL.ShaderNodeObject<THREE.StorageBufferNode>;
    writeNorm: THREE.TSL.ShaderNodeObject<THREE.StorageTextureNode>;
    readNorm: THREE.TSL.ShaderNodeObject<THREE.StorageTextureNode>;
}

class terrainGeo {
    constructor(samplesPerMeter: number){
        const bufferWidth = patchWorldWidth * samplesPerMeter;
        this.samplesPerMeter = samplesPerMeter;
        const vertCount = bufferWidth * bufferWidth;
        const idxCount = vertCount * 6;
        const indices = new Int32Array(idxCount);
        this.terrainIndices = new THREE.IndirectStorageBufferAttribute(indices, 1);
        this.terrainIndices.name = 'terrainPatchIndices';
        this.terrainBuffer = new THREE.StorageBufferAttribute(vertCount, 4);
        this.terrainBuffer.name = 'terrainPatchBuff';
        this.terrainIndexBuf = storage(this.terrainIndices, 'uint', idxCount);
        this.terrainMeshBuf = storage(this.terrainBuffer, 'vec4', vertCount);
        
        //console.log(terrainIndices)
        //console.log(terrainIndexBuf)

        this.comMesh = buffFN({
            writeBuff: this.terrainMeshBuf,
            idxBuff: this.terrainIndexBuf,
            index: instanceIndex,
            worldWidth: patchWorldWidth,
            samplesPerMeter: samplesPerMeter
        }).compute(vertCount);
    }

    async instantiate(renderer: THREE.WebGPURenderer) {
        await renderer.computeAsync(this.comMesh);
        //console.log(`Three took ${(now() - comptim)} to generate the mesh`);
        let vertarr = await renderer.getArrayBufferAsync(this.terrainBuffer);
        let idxarr = await renderer.getArrayBufferAsync(this.terrainIndices);
        let verts = new Float32Array(vertarr);
        let indices = new Uint32Array(idxarr);

        //indices.forEach((v, i) => {
        //    if (v == 0) {
        //        console.log(`${i} / 6 = ${i / 6}, ${i % 6}`)
        //    }
        //});

        //console.log(indices);

        //const vecsToPrint = 10;
        //const offset = 0;
        
        //for(let i = 0; i < vecsToPrint; i++) {
        //    console.log(`Vec #${i}: 
        //        {${verts[i * 4 + offset]}, 
        //        ${verts[i * 4 + offset + 1]},
        //        ${verts[i* 4 + offset + 2]}}`);
        //    console.log(indices[i]);
        //}

        const buffAttr = new THREE.Float32BufferAttribute(verts, 4);
        //console.log(buffAttr)
        this.geo.setAttribute('position', buffAttr);
        this.geo.setIndex(new THREE.BufferAttribute(indices, 1));
        //console.log(`Three took ${(now() - geotim)} to retrieve the mesh`);
    }

    dispose() {
        this.geo.dispose();
        this.comMesh.dispose();
        this.terrainIndexBuf.dispose();
        this.terrainMeshBuf.dispose();

        this.terrainIndexBuf.dispose();
    }

    comMesh: THREE.ComputeNode;
    samplesPerMeter: number;
    geo = new THREE.BufferGeometry();
    terrainIndices: THREE.IndirectStorageBufferAttribute;
    terrainBuffer: THREE.StorageBufferAttribute;
    terrainIndexBuf: THREE.StorageBufferNode;
    terrainMeshBuf: THREE.StorageBufferNode;
}

let patchLODs: terrainGeo[] = [];
let patches: terrainPatch[] = [];

export function InitTerrain(renderer : THREE.WebGPURenderer, scene : THREE.Scene) {
    console.log("Generating terrain...");
    try {
        const terrainTim = now();
        const samplesPerMeter = 2;
        const bufferWidth = samplesPerMeter * patchWorldWidth;
        const patchWidth = 2;

        patchLODs.push(new terrainGeo(samplesPerMeter));

        for (let x = 0; x < patchWidth; x++)
        {
            for (let y = 0; y < patchWidth; y++)
            {
                const offset = new THREE.Vector3(x * (patchWorldWidth - 1), -50, y * (patchWorldWidth - 1));
                patches.push(new terrainPatch(samplesPerMeter, offset));
            }
        }

        let lodPromises: Promise<void>[] = [];
        let texPromises: Promise<void>[] = [];

        patchLODs.forEach((lod) => {
            lodPromises.push(lod.instantiate(renderer));
        });
        patches.forEach((patch) => {
            texPromises.push(patch.prepareHeightfield(renderer));
        });


        Promise.all(lodPromises).then(() => {
            Promise.all(texPromises).then(() => {
                patches.forEach((patch) => {
                    patch.instantiate(renderer, scene, patchLODs[0].geo);
                });

                console.log(`Terrain Generation took ${now() - terrainTim}`)
            });
        });
    } catch(err : any) {
        console.log(`Terrain gen failed with error: ${err.message}`);
    }
}

export function CalcPatchSize() : number {
    let ret = 0;

    patches.forEach((patch) => {
        let texwidth = patch.samplesPerMeter * patchWorldWidth;
        ret += texwidth * texwidth * (4 + 4);
    });

    return ret;
}

export function CalcGeoSize() : number {
    let ret = 0;

    patchLODs.forEach((lod) => {
        let buffwidth = lod.samplesPerMeter * patchWorldWidth;
        ret += buffwidth * buffwidth * (16 + 6 * 4);
    });

    return ret;
}

export function CleanupTerrain(scene: THREE.Scene) {
    patches.forEach((patch) => {
        patch.dispose(scene);
    });

    patchLODs.forEach((lod) => {
        lod.dispose();
    });
    
    patchLODs = [];
    patches = [];
}