import Jolt from "jolt-physics";
import { onMount, createSignal, createEffect, onCleanup, Show } from "solid-js";
import * as THREE from "three/webgpu";
import { PhysiBox } from "~/gamelib/objects";
import { joltworld, jolt, JoltRVecTo3Vec } from "~/gamelib/physics-general";
import { Player } from "~/gamelib/characters/player";
import { randFloatSpread } from "three/src/math/MathUtils.js";
import { InputManager } from "~/gamelib/utils/input";
import PerfStats from "./PerfStats";
import PauseScreen from "./PauseScreen";
import { InitLighting } from "~/gamelib/eco/lighting";
import { CleanupTerrain, InitTerrain, TerrainUpdate } from "~/gamelib/eco/terrrain";
import { InitCompute } from "~/gamelib/utils/computeHandler";
import { redirect } from "@solidjs/router";
import WebGPUBackend from "three/src/renderers/webgpu/WebGPUBackend.js";
import { now } from "three/examples/jsm/libs/tween.module.js";
import { FontLoader, TextGeometry } from "three/examples/jsm/Addons.js";

const [rect, setRect] = createSignal({
  height: window.innerHeight,
  width: window.innerWidth
});

const [paused, setPaused] = createSignal(false);
const [playerPos, setPlayerPos] = createSignal(new THREE.Vector3);

const resizeHandler = (event : Event) => {
  setRect({ height: window.innerHeight, width: window.innerWidth });
};

export default function GameCanvas() {
    let canvasRef !: HTMLCanvasElement;
    
    function captureMouse() {
        //copy pasted from mdn
        const promise = canvasRef.requestPointerLock({
            unadjustedMovement: true,
        });

        if (!promise) {
            console.log("disabling mouse acceleration is not supported");
            return;
        }

        return promise
            .then(() => console.log("pointer is locked"))
            .catch((error) => {
            if (error.name === "NotSupportedError") {
                // Some platforms may not support unadjusted movement.
                // You can request again a regular pointer lock.
                return canvasRef.requestPointerLock();
            }
            });
    }

    const [fps, setFps] = createSignal(0);

    let player = new Player(rect().width, rect().height);
    const boxes : PhysiBox[] = [
    ];
    const staticbox1 = new PhysiBox(true);
    const staticbox2 = new PhysiBox(true);
    let animationFrameId = 0;
    let renderer : THREE.WebGPURenderer;
    let scene :THREE.Scene;

    onMount(async () => {
        window.addEventListener('resize', resizeHandler);        
        console.log("mounted");
        scene = new THREE.Scene();

        //TODO: Check for webgpu support and render an instruction component
        renderer = new THREE.WebGPURenderer({ canvas: canvasRef, antialias: true });
        let computeRenderer = new THREE.WebGPURenderer({canvas:undefined})
        await renderer.init();
        console.log(computeRenderer);

        //InitCompute();
        console.log("inited")
        renderer.setSize(rect().width, rect().height);
        renderer.setPixelRatio(window.devicePixelRatio);

        canvasRef.addEventListener('click', async () => {
            captureMouse();
        });
        
        let inputman = new InputManager(canvasRef);
        inputman.subToPause(()=>{
            document.exitPointerLock();
            setPaused(!paused());
        });

        player.init(inputman, new jolt.RVec3(0, 700, 90));
        staticbox1.init(scene, new jolt.RVec3(0, 698, 90), new jolt.Vec3(5, 1, 5));
        staticbox2.init(scene, new jolt.RVec3(2, 700, 92), new jolt.Vec3(0.5, 2, 0.5));

        //const loader = new FontLoader();
        //loader.loadAsync('TODO: Find a font').then((font) => {
        //    let text = new TextGeometry('About 2 meters', {
        //        font: font
        //    });
        //    text.computeBoundingBox();
        //    let textMesh = new THREE.Mesh(text);
        //    textMesh.position.set(0, 700, 92);
        //    scene.add(textMesh);
        //});

        scene.fog = new THREE.Fog('white', 100, 4000);

        createEffect(() => {
            renderer.setSize(rect().width, rect().height);
            player.updateView(rect().width, rect().height);
            console.log(`Changed resolution: ${rect().width} ${rect().height}`)
        });

        InitLighting(scene);
        InitTerrain(renderer, scene, JoltRVecTo3Vec(player.character.GetPosition()));
        console.log("moving on from terrain")

        for (let index = 0; index < 10; index++) {
            //const box = new PhysiBox(false);
            //boxes.push(box);
            //box.init(scene, new jolt.RVec3(randFloatSpread(5), randFloatSpread(5) + 5, randFloatSpread(5)));
        }

        let clock = new THREE.Clock();
        let fpsTimer = 0;
        let fpsSamples = 0;
        let logtims = false;

        async function animate() {
            let startTim = now();
            if (logtims) {
                console.log("rendering start");
            }
            let realDT = Math.min(clock.getDelta(),  1 / 30);
            let dt = paused() ? 0 : realDT;
            animationFrameId = requestAnimationFrame(animate);
            TerrainUpdate(player.camera.position, player.yaw, 100);
            joltworld.Step(dt, 1);

            
            if (logtims) {
                console.log(`Jolt step and setup took ${now() - startTim}`);
                startTim = now();
            }

            inputman.dispatch();
            
            if (logtims) {
                console.log(`Input took ${now() - startTim}`);
                startTim = now();
            }

            for (let index = 0; index < boxes.length; index++) {
                boxes[index].update();
            }

            if (logtims) {
                console.log(`box update took ${now() - startTim}`);
                startTim = now();
            }

            player.update(dt);

            if (logtims) {
                console.log(`player update took ${now() - startTim}`);
                startTim = now();
            }
            await renderer.renderAsync(scene, player.camera);

            if (logtims) {
                console.log(`render took ${now() - startTim}`);
                startTim = now();
            }

            fpsTimer += realDT;
            fpsSamples++;

            if (fpsSamples > 100)
            {
                // Update FPS counter
                setFps(Math.round(1 / (fpsTimer / fpsSamples)));
                fpsTimer = 0;
                fpsSamples = 0;
                logtims = false;
                setPlayerPos(player.camera.position.clone());
            }

            if (logtims) {
                console.log(`fps update took ${now() - startTim}`);
            }
        }
        animate();
    });

    function cleanup() {
        console.log("Cleaning up...");
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }

        player.deinit(scene);
        player.destroy();
        
        boxes.forEach((box) => {
            box.deinit(scene);
            box.destroy();
        });

        staticbox1.deinit(scene);
        staticbox1.destroy();
        staticbox2.deinit(scene);
        staticbox2.destroy();

        CleanupTerrain(scene);

        renderer.dispose();

        // remove window listener
        window.removeEventListener('resize', resizeHandler);

        // exit pointer lock if needed
        try { document.exitPointerLock(); } catch {}
        console.log("Cleaned up!");
    }

    //copy pasted page close event handlers from chatgpt
    //very "damn bitch you live like this" moment regarding my view of webdevs
    // register unload handlers for full-page refresh / tab close
        const cleanupOnUnload = (ev?: Event) => {
            // try to perform same cleanup synchronously
            try { cleanup(); } catch (e) { /* best-effort */ }
        };
        window.addEventListener('beforeunload', cleanupOnUnload, { capture: true });
        window.addEventListener('pagehide', cleanupOnUnload, { capture: true });
        // store so we can remove later
        (window as any).__game_cleanup_unload = cleanupOnUnload;

    onCleanup(cleanup);

    function onUnpause() {
        captureMouse()
        setPaused(false);
    }

    return <div >
         <canvas ref={canvasRef} width={rect().width} height={rect().height} tabIndex={1} style={{
            'cursor':paused() ? 'default' : 'none'
         }}/>
         <Show when={paused()}>
            <PauseScreen onUnpause={onUnpause}/>
         </Show>
         <PerfStats fps={fps()} renderer={renderer} playerPos={playerPos()}/>
    </div>
}