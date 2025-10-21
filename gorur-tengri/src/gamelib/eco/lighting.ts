import * as THREE from "three/webgpu";
import { SkyMesh } from "three/examples/jsm/objects/SkyMesh.js";

export function InitLighting(scene : THREE.Scene) {
    const sky = new SkyMesh();
    sky.scale.setScalar( 450000 );

    const phi = THREE.MathUtils.degToRad( -45 );
    const theta = THREE.MathUtils.degToRad( 180 );
    const sunPosition = new THREE.Vector3().setFromSphericalCoords( 1, phi, theta );
    const sun = new THREE.DirectionalLight();
    sun.translateX(sunPosition.x);
    sun.translateY(sunPosition.y);
    sun.translateZ(sunPosition.z);
    scene.add(sun);

    sky.sunPosition.value = sunPosition;

    scene.add( sky );

    const light = new THREE.HemisphereLight( 0xffffbb, 0x080820, 1 );
    scene.add( light );
}