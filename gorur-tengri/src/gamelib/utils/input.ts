import { jolt } from "../physics-general";
import * as THREE from "three";

export class AxisEvent {

}

export type AxisHandler = (v:THREE.Vector2)=>void;
export type PressHandler = ()=>void;

export class InputManager {
    constructor(canvas : HTMLCanvasElement){
        canvas.addEventListener('keyup', this.handleKeyUp.bind(this));
        canvas.addEventListener('keydown', this.handleKeyDown.bind(this));
        canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
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

        movementAxis.normalize();
        this.movementHandlers.forEach(handler => {
            handler(movementAxis);
        });

        //console.log(movementAxis);
        this.curMouseMove.normalize();
        let lookAxis = this.curMouseMove;
        
        this.lookHandlers.forEach(handler => {
            handler(lookAxis);
        });

        this.curMouseMove.set(0,0);

        if (this.curKeys.has('Escape') && !this.prevKeys.has('Escape')) {
            this.pauseHandlers.forEach((handler) => {
                handler();
            })
        }

        this.prevKeys = new Map(this.curKeys);
    }

    curMouseMove = new THREE.Vector2();
    curKeys = new Map<string, KeyboardEvent>();
    prevKeys = new Map<string, KeyboardEvent>();
    movementHandlers : AxisHandler[] = [];
    lookHandlers : AxisHandler[] = [];
    pauseHandlers : PressHandler[] = [];
}