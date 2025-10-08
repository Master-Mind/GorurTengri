import Jolt from "jolt-physics";
import { onMount, createSignal } from "solid-js";
import * as THREE from "three";
import { PhysiBox } from "~/gamelib/objects";
import { joltworld, jolt } from "~/gamelib/physics-general";
import { Sky } from 'three/addons/objects/Sky.js';
import { Player } from "~/gamelib/characters/player";
import { randFloatSpread } from "three/src/math/MathUtils.js";

export default function GameCanvas() {
    let canvasRef !: HTMLCanvasElement;
    const [fps, setFps] = createSignal(0);

    onMount(() => {
        
        console.log("mounted");
        const scene = new THREE.Scene();
        const width = window.innerWidth;
        const height = window.innerHeight;

        const renderer = new THREE.WebGLRenderer({ canvas: canvasRef, antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        
        let player = new Player(width, height);
        player.init(new jolt.RVec3(0, 1, -10));

        const sky = new Sky();
        sky.scale.setScalar( 450000 );

        const phi = THREE.MathUtils.degToRad( -45 );
        const theta = THREE.MathUtils.degToRad( 180 );
        const sunPosition = new THREE.Vector3().setFromSphericalCoords( 1, phi, theta );
        const sun = new THREE.DirectionalLight();
        sun.translateX(sunPosition.x);
        sun.translateY(sunPosition.y);
        sun.translateZ(sunPosition.z);
        scene.add(sun);

        sky.material.uniforms.sunPosition.value = sunPosition;

        scene.add( sky );

        const light = new THREE.HemisphereLight( 0xffffbb, 0x080820, 1 );
        scene.add( light );

        const boxes : PhysiBox[] = [
        ];

        for (let index = 0; index < 10; index++) {
            const box = new PhysiBox(false);
            boxes.push(box);
            box.init(scene, new jolt.RVec3(randFloatSpread(5), randFloatSpread(5) + 5, randFloatSpread(5)));
        }

        const staticbox = new PhysiBox(true);
        staticbox.init(scene, new jolt.RVec3(0, -4, 0), new jolt.Vec3(100, 1, 100));

        let clock = new THREE.Clock();
        let frameCount = 0;
        let lastTime = performance.now();

        function animate() {
            let dt = Math.min(clock.getDelta(),  1 / 30);
            requestAnimationFrame(animate);
            joltworld.Step(dt, 1);

            for (let index = 0; index < boxes.length; index++) {
                boxes[index].update();
            }
            player.update(dt);
            renderer.render(scene, player.camera);

            // Update FPS counter
            frameCount++;
            const currentTime = performance.now();
            if (currentTime >= lastTime + 1000) {
                setFps(Math.round((frameCount * 1000) / (currentTime - lastTime)));
                frameCount = 0;
                lastTime = currentTime;
            }
        }
        animate();
    });

    return <div style={{ position: "relative" }}>
         <canvas ref={canvasRef} width={600} height={600} />
         <div style={{
             position: "absolute",
             top: "10px",
             left: "10px",
             color: "white",
             "font-family": "monospace",
             "font-size": "16px",
             "text-shadow": "1px 1px 2px black",
             "background-color": "rgba(0, 0, 0, 0.5)",
             padding: "5px 10px",
             "border-radius": "5px"
         }}>
             FPS: {fps()}
         </div>
    </div>
}