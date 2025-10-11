import Jolt from "jolt-physics";
import { onMount, createSignal, createEffect, onCleanup, Show } from "solid-js";
import * as THREE from "three";
import { PhysiBox } from "~/gamelib/objects";
import { joltworld, jolt } from "~/gamelib/physics-general";
import { Sky } from 'three/addons/objects/Sky.js';
import { Player } from "~/gamelib/characters/player";
import { randFloatSpread } from "three/src/math/MathUtils.js";
import { InputManager } from "~/gamelib/utils/input";
import FPSCounter from "./FPSCounter";
import PauseScreen from "./PauseScreen";

const [rect, setRect] = createSignal({
  height: window.innerHeight,
  width: window.innerWidth
});

const [paused, setPaused] = createSignal(false);

const resizeHandler = (event : Event) => {
  setRect({ height: window.innerHeight, width: window.innerWidth });
};

export default function GameCanvas() {
    let canvasRef !: HTMLCanvasElement;
    const [fps, setFps] = createSignal(0);

    let player = new Player(rect().width, rect().height);
    const boxes : PhysiBox[] = [
    ];
    const staticbox = new PhysiBox(true);
    let animationFrameId = 0;
    let renderer : THREE.WebGLRenderer;
    let scene :THREE.Scene;

    onMount(() => {
        window.addEventListener('resize', resizeHandler);        
        console.log("mounted");
        scene = new THREE.Scene();

        renderer = new THREE.WebGLRenderer({ canvas: canvasRef, antialias: true });
        renderer.setSize(rect().width, rect().height);
        renderer.setPixelRatio(window.devicePixelRatio);
        
        let inputman = new InputManager(canvasRef);
        inputman.subToPause(()=>{setPaused(!paused())})
        player.init(inputman, new jolt.RVec3(0, 1, -10));

        createEffect(() => {
            renderer.setSize(rect().width, rect().height);
            player.updateView(rect().width, rect().height);
            console.log(`Changed resolution: ${rect().width} ${rect().height}`)
        })

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


        for (let index = 0; index < 10; index++) {
            const box = new PhysiBox(false);
            boxes.push(box);
            box.init(scene, new jolt.RVec3(randFloatSpread(5), randFloatSpread(5) + 5, randFloatSpread(5)));
        }

        staticbox.init(scene, new jolt.RVec3(0, -4, 0), new jolt.Vec3(100, 1, 100));

        let clock = new THREE.Clock();
        let fpsTimer = 0;

        function animate() {
            let realDT = Math.min(clock.getDelta(),  1 / 30);
            let dt = paused() ? 0 : realDT;
            animationFrameId = requestAnimationFrame(animate);
            joltworld.Step(dt, 1);

            inputman.dispatch();

            for (let index = 0; index < boxes.length; index++) {
                boxes[index].update();
            }
            player.update(dt);
            renderer.render(scene, player.camera);

            fpsTimer += realDT;

            if (fpsTimer >= 0.3)
            {
                fpsTimer = 0;
                // Update FPS counter
                setFps(Math.round(1 / realDT));
            }
        }
        animate();
    });

    onCleanup(()=> {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }

        player.deinit(scene);
        //player.destroy();
        
        boxes.forEach((box) => {
            box.deinit(scene);
            //box.destroy(); 
        });

        staticbox.deinit(scene);
        //staticbox.destroy();

        renderer.dispose();
    });

    function onUnpause() {
        setPaused(false);
    }

    return <div >
         <canvas ref={canvasRef} width={rect().width} height={rect().height} tabIndex={1} />
         <Show when={paused()}>
            <PauseScreen onUnpause={onUnpause}/>
         </Show>
         <FPSCounter fps={fps()}/>
    </div>
}