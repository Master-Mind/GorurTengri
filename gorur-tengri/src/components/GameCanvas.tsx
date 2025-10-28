import Jolt from "jolt-physics";
import { onMount, createSignal, createEffect, onCleanup, Show } from "solid-js";
import * as THREE from "three/webgpu";
import { PhysiBox } from "~/gamelib/objects";
import { joltworld, jolt } from "~/gamelib/physics-general";
import { Player } from "~/gamelib/characters/player";
import { randFloatSpread } from "three/src/math/MathUtils.js";
import { InputManager } from "~/gamelib/utils/input";
import PerfStats from "./PerfStats";
import PauseScreen from "./PauseScreen";
import { InitLighting } from "~/gamelib/eco/lighting";
import { CleanupTerrain, InitTerrain } from "~/gamelib/eco/terrrain";

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
    const staticbox = new PhysiBox(true);
    let animationFrameId = 0;
    let renderer : THREE.WebGPURenderer;
    let scene :THREE.Scene;

    onMount(() => {
        window.addEventListener('resize', resizeHandler);        
        console.log("mounted");
        scene = new THREE.Scene();

        renderer = new THREE.WebGPURenderer({ canvas: canvasRef, antialias: true });
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
        player.init(inputman, new jolt.RVec3(0, 1, -10));

        createEffect(() => {
            renderer.setSize(rect().width, rect().height);
            player.updateView(rect().width, rect().height);
            console.log(`Changed resolution: ${rect().width} ${rect().height}`)
        });

        InitLighting(scene);
        InitTerrain(renderer, scene);

        for (let index = 0; index < 10; index++) {
            //const box = new PhysiBox(false);
            //boxes.push(box);
            //box.init(scene, new jolt.RVec3(randFloatSpread(5), randFloatSpread(5) + 5, randFloatSpread(5)));
        }

        staticbox.init(scene, new jolt.RVec3(0, -4, -10), new jolt.Vec3(1, 1, 1));

        let clock = new THREE.Clock();
        let fpsTimer = 0;

        async function animate() {
        //console.log("rendering")
            let realDT = Math.min(clock.getDelta(),  1 / 30);
            let dt = paused() ? 0 : realDT;
            animationFrameId = requestAnimationFrame(animate);
            joltworld.Step(dt, 1);

            inputman.dispatch();

            for (let index = 0; index < boxes.length; index++) {
                boxes[index].update();
            }
            player.update(dt);
            await renderer.renderAsync(scene, player.camera);

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

        staticbox.deinit(scene);
        staticbox.destroy();

        CleanupTerrain(scene);

        renderer.dispose();

        // remove window listener
        window.removeEventListener('resize', resizeHandler);

        // exit pointer lock if needed
        try { document.exitPointerLock(); } catch {}
        console.log("Cleaned up!");
    }

    //copy pasted page close event handlers from chatgpt
    //very "damn bitch you live like this" moment
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
         <PerfStats fps={fps()}/>
    </div>
}