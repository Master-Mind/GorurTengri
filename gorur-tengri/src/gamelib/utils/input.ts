import { jolt } from "../physics-general";
import * as THREE from "three";

class TouchWrapper {
    constructor(start : THREE.Vector2) {
        this.start = start;
        this.cur = new THREE.Vector2(start.x, start.y);
    }

    start :THREE.Vector2;
    cur : THREE.Vector2;
    ended = false;
}

export type AxisHandler = (v:THREE.Vector2)=>void;
export type PressHandler = ()=>void;

export class InputManager {
    constructor(canvas : HTMLCanvasElement){
        window.addEventListener('keyup', this.handleKeyUp.bind(this));
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        window.addEventListener('mousemove', this.handleMouseMove.bind(this));
        window.addEventListener('gamepadconnected', this.onGamepadConnected.bind(this));
        window.addEventListener('gamepadconnected', this.onGamepadConnected.bind(this));
        canvas.addEventListener('touchstart', this.onTouchStart.bind(this));
        canvas.addEventListener('touchmove', this.onTouchUpdate.bind(this));
        canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
        canvas.addEventListener('touchcancel', this.onTouchEnd.bind(this));
        this.pickAController();
    }

    onTouchStart(event : TouchEvent) {
        for(let i = 0; i < event.changedTouches.length; ++i) {
            let touch = event.changedTouches.item(i);
            console.log(`Touch started at {${touch?.pageX}, ${touch?.pageY}}`);

            if (touch && !this.curTouches.has(touch.identifier)) {
                this.curTouches.set(touch.identifier, new TouchWrapper(new THREE.Vector2(touch.pageX, touch.pageY)));
            }
        }
    }

    onTouchUpdate(event : TouchEvent) {
        //console.log(`Touch updated on ${event.target}`);
        for(let i = 0; i < event.changedTouches.length; ++i) {
            let touch = event.changedTouches.item(i);

            if (touch && this.curTouches.has(touch.identifier)) {
                //console.log(`moving becuase of touch {${touch?.pageX}, ${touch?.pageY}}`);
                //console.log(`1 ${this.curTouches.get(touch.identifier)?.cur.x} ${this.curTouches.get(touch.identifier)?.start.x}`);
                this.curTouches.get(touch.identifier)?.cur.set(touch.pageX, touch.pageY);
                let temp = this.curTouches.get(touch.identifier);
                console.log(`moving becuase of touch {${temp?.cur.x}, ${temp?.cur.y}} - {${temp?.start.x}, ${temp?.start.y}}`);

                //console.log(`2 ${this.curTouches.get(touch.identifier)?.cur.x} ${this.curTouches.get(touch.identifier)?.start.x}`);
            }
        }
    }

    onTouchEnd(event : TouchEvent) {
        //console.log(`Touch ended on ${event.target}`);
        for(let i = 0; i < event.changedTouches.length; ++i) {
            let touch = event.changedTouches.item(i);

            if (touch) {
                const tw = this.curTouches.get(touch.identifier);
                if (tw) {
                    tw.ended = true;
                }
            }
        }
    }

    onGamepadConnected(event : GamepadEvent) {
        this.curGamepadIDX = event.gamepad.index;
        console.log(`Gamepad ${event.gamepad.id} connected with idx ${this.curGamepadIDX}`);
    }

    onGamepadDisconnected(event : GamepadEvent) {
        console.log(`Gamepad ${event.gamepad.id} disconnected`); //doesn't seem to get called?
        if (this.curGamepadIDX == event.gamepad.index) {
            this.pickAController();
        }
    }

    pickAController() {
        this.curGamepadIDX = -1;
        navigator.getGamepads().forEach(pad => {
            if (pad) {
                this.curGamepadIDX = pad.index;
            }
        });
    }

    handleMouseMove(event : MouseEvent) {
        this.curMouseMove.x += event.movementX;
        this.curMouseMove.y += event.movementY;
    }

    handleKeyDown(event : KeyboardEvent) {
        //console.log(event);
        this.curKeys.set(event.key, event);
    }

    handleKeyUp(event : KeyboardEvent) {
        this.curKeys.delete(event.key);
    }

    subToMovement(handler : AxisHandler) {
        this.movementHandlers.push(handler);
    }

    subToLook(handler : AxisHandler) {
        this.lookHandlers.push(handler);
    }

    subToPause(handler : PressHandler) {
        this.pauseHandlers.push(handler);
    }

    dispatch() {
        let movementAxis = new THREE.Vector2();
        //console.log(movementAxis);
        let lookAxis = this.curMouseMove;
        const ratio = window.innerWidth / window.innerHeight;

        //touch controls
        this.curTouches.forEach(touch => {
            //left side of screen, movement related
            if (touch.start.x < window.innerWidth / 2) {
                movementAxis.set((touch.cur.x - touch.start.x) / (window.innerWidth * 0.1 * ratio), -(touch.cur.y - touch.start.y) / (window.innerWidth * 0.1 * ratio));
                //console.log(`moving becuase of touch {${touch.cur.x}, ${touch.cur.y}} - {${touch.start.x}, ${touch.start.y}} = {${movementAxis.x}, ${movementAxis.y}}`);
            }
            //right side of screen, look related
            else {
                lookAxis.set((touch.cur.x - touch.start.x) / (window.innerWidth * ratio), (touch.cur.y - touch.start.y) / (window.innerWidth * ratio));
                //console.log(`moving becuase of touch {${touch.cur.x}, ${touch.cur.y}} - {${touch.start.x}, ${touch.start.y}} = {${movementAxis.x}, ${movementAxis.y}}`);
            }
        });

        for (const [id, touch] of this.curTouches.entries()) {
            if (touch.ended) {
                this.curTouches.delete(id);
            }
        }

        //keyboard controls
        if (this.curKeys.has('w'))
        {
            movementAxis.y += 1;
        }
        if (this.curKeys.has('s'))
        {
            movementAxis.y += -1;
        }
        if (this.curKeys.has('a'))
        {
            movementAxis.x += -1;
        }
        if (this.curKeys.has('d'))
        {
            movementAxis.x += 1;
        }

        if (this.curKeys.has('Escape') && !this.prevKeys.has('Escape')) {
            this.pauseHandlers.forEach((handler) => {
                handler();
            })
        }

        this.curMouseMove.normalize();

        //gamepad controls
        let pad = navigator.getGamepads()[this.curGamepadIDX];
        //console.log(`${this.curGamepadIDX} ${pad}`)

        if (this.curGamepadIDX >= 0 && pad) {
            const deadzone = 0.1;
            //console.log(`0: ${pad.axes[0]} 1: ${pad.axes[1]} 2: ${pad.axes[2]} 3: ${pad.axes[3]} 4: ${pad.axes[4]} 5: ${pad.axes[5]}`);
            movementAxis.x += Math.abs(pad.axes[0]) > deadzone ? pad.axes[0] : 0;
            movementAxis.y -= Math.abs(pad.axes[1]) > deadzone ? pad.axes[1] : 0;
            lookAxis.x += Math.abs(pad.axes[2]) > deadzone ? pad.axes[2] : 0;
            lookAxis.y += Math.abs(pad.axes[3]) > deadzone ? pad.axes[3] : 0;
        }

        movementAxis.clampLength(0, 1);
        this.movementHandlers.forEach(handler => {
            handler(movementAxis);
        });
        
        lookAxis.clampLength(0, 1);
        this.lookHandlers.forEach(handler => {
            handler(lookAxis);
        });
        this.curMouseMove.set(0,0);


        this.prevKeys = new Map(this.curKeys);
    }

    curTouches = new Map<number, TouchWrapper>();
    curMouseMove = new THREE.Vector2();
    curKeys = new Map<string, KeyboardEvent>();
    prevKeys = new Map<string, KeyboardEvent>();
    movementHandlers : AxisHandler[] = [];
    lookHandlers : AxisHandler[] = [];
    pauseHandlers : PressHandler[] = [];
    curGamepadIDX = -1;
}