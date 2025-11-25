import { mx_perlin_noise_float } from "three/src/nodes/materialx/lib/mx_noise.js";
import { attribute, transformNormalToView, vec3, varying,  wgslFn, storageTexture, instanceIndex, vec2, uint, storage, attributeArray, texture, positionGeometry, positionLocal, positionWorld, buffer, modelWorldMatrix } from "three/tsl";
import * as THREE from "three/webgpu";
import terrainWGSL from "./shaders/terrain.wgsl?raw";
import terrainFragWGSL from "./shaders/terrainFrag.wgsl?raw";
import genWGSL from "./shaders/genTerrainTex.wgsl?raw";
import genMeshWGSL from "./shaders/genTerrainMesh.wgsl?raw";
import heightWGSL from "./shaders/heightFunction.wgsl?raw";
import { jolt } from "../physics-general";
import { now } from "three/examples/jsm/libs/tween.module.js";
import { HDRLoader, RGBELoader, UltraHDRLoader } from "three/examples/jsm/Addons.js";
const heightFN = wgslFn(heightWGSL);
const buffFN = wgslFn(genMeshWGSL);
const computeFN = wgslFn(genWGSL, [heightFN]);

const patchWorldWidth = 256;
const heightScale = 5000;
const lodSamplesPerMeter = [2, 1, 1 / 4, 1 / 8, 1 / 8];
const texilsPerMeter = 1 / 4;
let terrainParent = new THREE.Object3D();

class terrainPatch {
    constructor(samplesPerMeter: number, 
        offset: THREE.Vector3){
            this.offset = offset;
            this.samplesPerMeter = samplesPerMeter;
    }

    instantiate(scene : THREE.Scene,
        tex: terrainTex,
        geo: THREE.BufferGeometry
    ) {
        this.material = new THREE.MeshToonNodeMaterial();
        const vNormal = varying(vec3(), 'vNormal');
        //console.log(`Three took ${(now() - comptim)} to generate the heightmap`);
            

        //let buff = await renderer.getArrayBufferAsync(this.terrainTexture)
        //const floatArr = new Float16Array(buff);
        //console.log(`Three took ${(now() - comptim)} to retrieve the heightmap`);

        const vtxMain = wgslFn(terrainWGSL,[vNormal, heightFN]);

        //console.log(`vert{
        //    position: attribute( 'position' ),
        //    offset: ${this.offset},
        //    samplesPerMeter: ${this.samplesPerMeter},
        //    heightTex: ${tex.node},
        //    heightSampler: ${tex.node},
        //    worldWidth: ${patchWorldWidth},
        //    texWorldWidth: ${tex.worldWidth},
        //    heightScale: ${heightScale}
        //    }`)

        // use the returned vec3 as the vertex position offset in the node graph
        this.material.positionNode = vtxMain({
            worldPosition: positionWorld,
            localPosition: positionLocal,
            offset: this.offset,
            samplesPerMeter: this.samplesPerMeter,
            heightTex: tex.node,
            heightSampler: tex.node,
            worldWidth: patchWorldWidth,
            texWorldWidth: tex.worldWidth,
            heightScale: heightScale
        });

        const fragMain = wgslFn(terrainFragWGSL);

        this.material.colorNode = fragMain({
            vNormal: vNormal
        });

        this.material.normalNode = transformNormalToView( vNormal );
        this.mesh = new THREE.Mesh(geo, this.material);
        terrainParent.add(this.mesh)
        this.mesh.position.set(this.offset.x, this.offset.y, this.offset.z);
    }

    dispose() {
        if (this.material) {
            this.material.dispose();
        }
    }

    material: THREE.MeshToonNodeMaterial | null = null;
    mesh: THREE.Mesh | null = null;
    offset: THREE.Vector3;
    samplesPerMeter: number;
}

class terrainCluster {
    constructor(samplesPerMeter: number){
            this.samplesPerMeter = samplesPerMeter;
    }

    instantiate(tex: terrainTex,
        geo: THREE.BufferGeometry,
        mats: THREE.Matrix4[]
    ) {
        this.material = new THREE.MeshBasicNodeMaterial();
        const vNormal = varying(vec3(), 'vNormal');
        //console.log(`Three took ${(now() - comptim)} to generate the heightmap`);
            

        //let buff = await renderer.getArrayBufferAsync(this.terrainTexture)
        //const floatArr = new Float16Array(buff);
        //console.log(`Three took ${(now() - comptim)} to retrieve the heightmap`);

        const vtxMain = wgslFn(terrainWGSL,[vNormal, heightFN]);

        //console.log(`vert{
        //    position: attribute( 'position' ),
        //    offset: ${this.offset},
        //    samplesPerMeter: ${this.samplesPerMeter},
        //    heightTex: ${tex.node},
        //    heightSampler: ${tex.node},
        //    worldWidth: ${patchWorldWidth},
        //    texWorldWidth: ${tex.worldWidth},
        //    heightScale: ${heightScale}
        //    }`)

        const fragMain = wgslFn(terrainFragWGSL);

        this.material.colorNode = fragMain({
            vNormal: vNormal
        });

        this.material.normalNode = transformNormalToView( vNormal );
        this.mesh = new THREE.InstancedMesh(geo, this.material, mats.length);
        mats.forEach((mat, i) => {
            this.mesh?.setMatrixAt(i, mat);
        });
        this.mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);

        //thanks chatGPT
        // node that reads from InstancedMesh.instanceMatrix
        const instanceMatrixNode = buffer(
        this.mesh.instanceMatrix.array,  // Float32Array
                'mat4',
                this.mesh.count
            )
            .element(instanceIndex)  // pick the current instance
            .toMat4()
            .toVar();                // store as temp variable so it’s not re-evaluated

        // use the returned vec3 as the vertex position offset in the node graph
        this.material.positionNode = vtxMain({
            worldPosition: positionWorld,
            localPosition: positionLocal,
            samplesPerMeter: this.samplesPerMeter,
            heightTex: tex.node,
            heightSampler: tex.node,
            worldWidth: patchWorldWidth,
            texWorldWidth: tex.worldWidth,
            texOffset: tex.offset,
            heightScale: heightScale,
            instance: instanceMatrixNode,
            model: modelWorldMatrix
        });
        terrainParent.add(this.mesh);
    }

    dispose() {
        if (this.material) {
            this.material.dispose();
        }
    }

    material: THREE.MeshBasicNodeMaterial | null = null;
    mesh: THREE.InstancedMesh | null = null;
    samplesPerMeter: number;
}

class terrainTex {
    constructor(tex: THREE.Texture, offset: THREE.Vector2, worldWidth: number) {
        tex.magFilter = THREE.LinearFilter;
        tex.minFilter = THREE.LinearFilter;
        tex.needsUpdate = true;
        this.tex = tex;
        this.offset = offset;
        this.worldWidth = worldWidth;
        this.node = texture(this.tex);
    }

    dispose() {
        this.tex.dispose();
    }
    tex: THREE.Texture;
    node: THREE.TSL.ShaderNodeObject<THREE.TextureNode>;
    offset: THREE.Vector2;
    worldWidth: number;
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

    async instantiate(renderer : THREE.WebGPURenderer) {
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
        this.geo.boundingBox = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3(patchWorldWidth, heightScale, patchWorldWidth));
        this.geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(patchWorldWidth / 2, 0, patchWorldWidth / 2), heightScale)
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
let texes: terrainTex[] = [];

function getLODLevelFromEpicenter(epicenter : THREE.Vector3, offset : THREE.Vector3) : number {
    const dist = epicenter.distanceToSquared(offset);
    const dist1 = patchWorldWidth / 2;
    const dist2 = patchWorldWidth;
    const dist3 = patchWorldWidth * 2;
    const dist4 = patchWorldWidth * 4;

    if (dist < dist1 * dist1) {
        return 1;
    }
    if (dist < dist2 * dist2) {
        return 1;
    }
    if (dist < dist3 * dist3) {
        return 2;
    }
    if (dist < dist4 * dist4) {
        return 3;
    }

    return 4;
}

let meshes = new Array<terrainCluster>(9);
const gridsize = 8;
function SetParentPos(epicenter: THREE.Vector3) {
    terrainParent.position.set(Math.round(epicenter.x / gridsize) * gridsize,
     -50, 
     Math.round(epicenter.z / gridsize) * gridsize);
}

export function InitTerrain(renderer : THREE.WebGPURenderer, scene : THREE.Scene, epicenter : THREE.Vector3) {
    console.log("Generating terrain...");
    try {
        const terrainTim = now();
        SetParentPos(epicenter);
        scene.add(terrainParent);

        lodSamplesPerMeter.forEach((lod) => {
            patchLODs.push(new terrainGeo(lod));
        });

        let lodPromises: Promise<void>[] = [];
        let texPromises: Promise<THREE.Texture>[] = [];

        console.log(`Terrain Setup took ${now() - terrainTim}`);


        patchLODs.forEach((lod) => {
            lodPromises.push(lod.instantiate(renderer));
        });
        console.log(`Terrain LOD Promise Setup took ${now() - terrainTim}`);
        
        console.log(`Terrain Promise Setup took ${now() - terrainTim}`);

        const loader = new HDRLoader();
        loader.setDataType(THREE.HalfFloatType);
        
        texPromises.push(loader.loadAsync("src/data/large/textures/output.hdr"));

        let centerMat = new Array<THREE.Matrix4>(1);
        centerMat[0] = new THREE.Matrix4();
        centerMat[0].setPosition(-patchWorldWidth / 2, 0, -patchWorldWidth / 2);

        let matFunc = (dirx: number, diry: number) : Array<THREE.Matrix4> => {
        console.log(`Making patches: {${dirx}, ${diry}}`)
            let ret = new Array<THREE.Matrix4>(3);
            let mag = 1;
            for(let i = 0; i < 3; i++) {
                let width = patchWorldWidth * mag;
                ret[i] = new THREE.Matrix4();
                let x = -width / 2 + dirx * width;
                let z = -width / 2 + diry * width;
                ret[i].setPosition(x - dirx * mag - 1, 0, z - diry * mag - 1);
                console.log(`${x / patchWorldWidth}, 0, ${z / patchWorldWidth}`)
                ret[i].scale(new THREE.Vector3(mag, 1, mag));
                mag *= 3;
            }

            return ret;
        };

        let northMats = matFunc(0, 1);
        //-0.5,0,0.5
        //-1.5, 0, 1.5
        let northEastMats = matFunc(-1, 1);
        //console.log(`forward right corner angle:${Math.acos((new THREE.Vector3(1.5, 0, 1.5)).normalize().z)}`)
        //console.log(`forward corner angle:${Math.acos((new THREE.Vector3(-1.5, 0, 1.5)).normalize().z)}`)
        //console.log(`forward corner angle:${Math.PI / 4}`)
        let eastMats = matFunc(-1, 0);
        let southEastMats = matFunc(-1, -1);
        let southMats = matFunc(0, -1);
        //-0.5,0,-1.5
        //-1.5,0,-4.5
        //-4.5,0,-1.5
        let southWestMats = matFunc(1, -1);
        let westMats = matFunc(1, 0);
        let northWestMats = matFunc(1, 1);

        Promise.all(lodPromises).then(() => {
            console.log(`Terrain lod generation took ${now() - terrainTim}`);
            
            Promise.all(texPromises).then((textures) => {
                console.log(`Terrain texture loading took ${now() - terrainTim}`);
                console.log(`Loaded texture with depth ${textures[0].depth}, type ${textures[0].type}, and format ${textures[0].format}`)
                const texWorldWidth = textures[0].width / texilsPerMeter;
                
                texes.push(new terrainTex(textures[0], 
                    new THREE.Vector2(texWorldWidth / 2, texWorldWidth / 2),
                texWorldWidth));

                texes.forEach((tex) => {
                    let center = new terrainCluster(1);
                    center.instantiate(tex, patchLODs[1].geo, centerMat);
                    meshes[0] = center;

                    let north = new terrainCluster(1);
                    north.instantiate(tex, patchLODs[1].geo, northMats);
                    meshes[1] = north;
                    
                    let northEast = new terrainCluster(1);
                    northEast.instantiate(tex, patchLODs[1].geo, northEastMats);
                    meshes[2] = northEast;
                    
                    let east = new terrainCluster(1);
                    east.instantiate(tex, patchLODs[1].geo, eastMats);
                    meshes[3] = east;
                    
                    let southEast = new terrainCluster(1);
                    southEast.instantiate(tex, patchLODs[1].geo, southEastMats);
                    meshes[4] = southEast;
                    
                    let south = new terrainCluster(1);
                    south.instantiate(tex, patchLODs[1].geo, southMats);
                    meshes[5] = south;
                    
                    let southWest = new terrainCluster(1);
                    southWest.instantiate(tex, patchLODs[1].geo, southWestMats);
                    meshes[6] = southWest;
                    
                    let west = new terrainCluster(1);
                    west.instantiate(tex, patchLODs[1].geo, westMats);
                    meshes[7] = west;
                    
                    let northWest = new terrainCluster(1);
                    northWest.instantiate(tex, patchLODs[1].geo, northWestMats);
                    meshes[8] = northWest;
                });

                console.log(`Patch instantiation took ${now() - terrainTim}`);
            });
        });
    } catch(err : any) {
        console.log(`Terrain gen failed with error: ${err.message}`);
    }
}
const degreeToRadian = Math.PI / 180;
const radToDegree = 180 / Math.PI;

const northEastLeftAngle = Math.acos(-(new THREE.Vector3(0.5, 0, 1.5)).normalize().z);
const northEastRightAngle = Math.acos(-(new THREE.Vector3(1.5, 0,0.5)).normalize().z);
console.log(`north east range: [${northEastLeftAngle * radToDegree}, ${northEastRightAngle * radToDegree}]`);

const southEastLeftAngle = Math.acos(-(new THREE.Vector3(0.5, 0, -1.5)).normalize().z);
const southEastRightAngle = Math.acos(-(new THREE.Vector3(1.5, 0,-0.5)).normalize().z);
console.log(`south east range: ${(new THREE.Vector3(0.5, 0, -1.5)).normalize().z} [${southEastLeftAngle * radToDegree}, ${southEastRightAngle * radToDegree}]`);
const southWestLeftAngle = 2  * Math.PI - Math.acos(-(new THREE.Vector3(-0.5, 0, -1.5)).normalize().z);
const southWestRightAngle = 2  * Math.PI - Math.acos(-(new THREE.Vector3(-1.5, 0,-0.5)).normalize().z);
console.log(`south west range: [${southWestLeftAngle * radToDegree}, ${southWestRightAngle * radToDegree}]`);

const northWestLeftAngle =2  * Math.PI -  Math.acos(-(new THREE.Vector3(-0.5, 0, 1.5)).normalize().z);
const northWestRightAngle = 2  * Math.PI - Math.acos(-(new THREE.Vector3(-1.5, 0,0.5)).normalize().z);
console.log(`north west range: [${northWestRightAngle * radToDegree}, ${northWestLeftAngle * radToDegree}]`);

export function TerrainUpdate(epicenter: THREE.Vector3, angle: number, fov: number) {
    SetParentPos(epicenter);
    //buncha  precalculated math bs
    let leftFovLine = angle - fov * degreeToRadian / 2;
    if (leftFovLine < 0) {
        leftFovLine = 2 * Math.PI + leftFovLine;
    }
    let rightFovLine = (angle + fov * degreeToRadian / 2) % (2 * Math.PI);

    if (leftFovLine > rightFovLine) {
        const temp = leftFovLine;
        leftFovLine = rightFovLine;
        rightFovLine = temp;
    }

    const angleInRange = (left: number, right: number) => {
        return (leftFovLine > left && leftFovLine < right) ||
            (rightFovLine > left && rightFovLine < right) ||
            (left > leftFovLine && left < rightFovLine);
    };

    if (meshes[1] && meshes[1].mesh) {
        //console.log(`center=${angle * radToDegree},left=${leftFovLine * radToDegree},right=${rightFovLine * radToDegree}`)
        meshes[1].mesh.visible =  angleInRange(Math.PI - Math.PI / 4, Math.PI + Math.PI / 4);
    }

    if (meshes[2] && meshes[2].mesh) {
        meshes[2].mesh.visible =  angleInRange(northEastRightAngle, northEastLeftAngle);
    }

    if (meshes[3] && meshes[3].mesh) {
        meshes[3].mesh.visible =  angleInRange(Math.PI / 2 - Math.PI / 4, Math.PI / 2 + Math.PI / 4);
    }

    if (meshes[4] && meshes[4].mesh) {
        meshes[4].mesh.visible =  angleInRange(southEastRightAngle, southEastLeftAngle);
    }

    if (meshes[5] && meshes[5].mesh) {
        meshes[5].mesh.visible =  angleInRange(-Math.PI / 4, Math.PI / 4) || 
            angleInRange(2 * Math.PI - Math.PI / 4, 2 * Math.PI + Math.PI / 4);
    }

    if (meshes[6] && meshes[6].mesh) {
        meshes[6].mesh.visible =  angleInRange(southWestRightAngle, southWestLeftAngle);
    }

    if (meshes[7] && meshes[7].mesh) {
        meshes[7].mesh.visible =  angleInRange(1.5 * Math.PI - Math.PI / 4, 1.5 * Math.PI + Math.PI / 4);
    }

    if (meshes[8] && meshes[8].mesh) {
        meshes[8].mesh.visible =  angleInRange(northWestLeftAngle, northWestRightAngle);
    }
}

//thanks gpt for making better memory calc functions
export function CalcHeightfieldSize() : number {
    let bytes = 0;

    texes.forEach((t) => {
        const tex = t.tex;
        // get width/height from image if available (HDR loaders often put .image)
        const img = (tex as any).image ?? {};
        const width = img.width ?? (tex as any).width ?? 0;
        const height = img.height ?? (tex as any).height ?? 0;
        if (!width || !height) return;

        // components inferred from format
        let components = 4; // default RGBA
        switch (tex.format) {
            case (THREE.RedFormat as any): components = 1; break;
            case (THREE.RGBFormat as any): components = 3; break;
            case (THREE.RGBAFormat as any): components = 4; break;
            // add other formats you use as needed
            default: components = 4; break;
        }

        // bytes per channel inferred from type
        let bytesPerChannel = 4;
        switch (tex.type) {
            case THREE.UnsignedByteType: bytesPerChannel = 1; break;
            case (THREE.HalfFloatType as any): bytesPerChannel = 2; break;
            case THREE.FloatType: bytesPerChannel = 4; break;
            default: bytesPerChannel = 4; break;
        }

        let base = width * height * components * bytesPerChannel;

        // account for mipmaps if generated (approximate sum of mip levels = 4/3 * base)
        if (tex.generateMipmaps) {
            base = Math.round(base * 4 / 3);
        }

        // compressed formats would need special handling (not covered here)
        bytes += base;
    });

    return bytes;
}

export function CalcGeoSize() : number {
    let bytes = 0;

    patchLODs.forEach((lod) => {
        // deduce vertex count from the geometry or fallback to expected formula
        const bufferWidth = Math.round(lod.samplesPerMeter * patchWorldWidth);
        const vertCount = bufferWidth * bufferWidth;

        // geometry attributes (CPU-side typed arrays or GPU attributes)
        const geo = lod.geo;
        let vertexBytes = 0;
        const pos = geo.getAttribute('position') as THREE.BufferAttribute | undefined;
        if (pos && pos.array) {
            const elSize = (pos.array as any).BYTES_PER_ELEMENT ?? 4;
            vertexBytes = pos.count * pos.itemSize * elSize;
        } else {
            // fallback: assume vec4 position (4 floats)
            vertexBytes = vertCount * 4 * 4;
        }

        // index buffer
        let indexBytes = 0;
        if (geo.index && geo.index.array) {
            indexBytes = (geo.index.array as any).length * ((geo.index.array as any).BYTES_PER_ELEMENT ?? 4);
        } else {
            // fallback based on code that creates idxCount = vertCount * 6 with 32-bit ints
            indexBytes = vertCount * 6 * 4;
        }

        // include storage / compute buffers used by the generator if present
        // terrainBuffer was created as StorageBufferAttribute(vertCount, 4) -> vec4 float32 per vertex
        if (lod.terrainBuffer) {
            // storage buffer node references float32 vec4 elements
            try {
                const storageElements = (lod.terrainBuffer as any).count ?? vertCount;
                vertexBytes += storageElements * 4 * 4; // vec4 float32
            } catch { /* best-effort */ }
        }
        if (lod.terrainIndices) {
            try {
                // terrainIndices length is idxCount
                const idxCount = (lod.terrainIndices as any).array?.length ?? (vertCount * 6);
                indexBytes += idxCount * 4;
            } catch { }
        }

        // add an approximation of three.js BufferAttribute wrappers (CPU-side)
        const cpuCopyOverhead = vertexBytes * 1 + indexBytes * 1; // you can tweak (1x means we count cpu copies once)

        bytes += vertexBytes + indexBytes + cpuCopyOverhead;
    });

    return bytes;
}

export function CalcTris() : number {
    let ret = 0;

    meshes.forEach((mesh) => {
        if (mesh.mesh && mesh.mesh.visible) {
            ret += mesh.mesh.count * patchLODs[1].terrainIndices.count / 3;
        }
        
    });

    return ret;
}

export function CleanupTerrain(scene: THREE.Scene) {
    patches.forEach((patch) => {
        //patch.dispose(scene);
    });

    texes.forEach((tex) => {
        tex.dispose();
    })

    patchLODs.forEach((lod) => {
        lod.dispose();
    });

    meshes.forEach((mesh) => {
        if (mesh) {
            mesh.dispose();
        }
    })
    
    patchLODs = [];
    patches = [];
}