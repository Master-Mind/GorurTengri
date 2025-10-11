import * as THREE from "three";
import { jolt, JoltQuatTo3Quat, JoltRVecTo3Vec, phys, LAYER_MOVING, LAYER_NON_MOVING, JoltVecTo3Vec, HAMMER_SPACE, BP_LAYER_MOVING, movingLayerFilter, charBodyFilter, charShapeFilter, joltworld, bpFilter } from "~/gamelib/physics-general";
import Jolt from "jolt-physics";
import { InputManager } from "../utils/input";

export class Player {
    constructor(width : number, height : number){
        let settings = new jolt.CharacterVirtualSettings();
        settings.mShape = new jolt.CapsuleShape(1, 0.3);
        settings.mSupportingVolume = new jolt.Plane(jolt.Vec3.prototype.sAxisY(), -1);
        this.character = new jolt.CharacterVirtual(settings, HAMMER_SPACE, new jolt.Quat(), phys);

        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        this.updateSettings = new jolt.ExtendedUpdateSettings();
    }

    init(inputMan : InputManager, pos = new jolt.RVec3(), scale = new jolt.Vec3(1,1,1)) {
        this.character.SetPosition(pos);
        this.character.SetRotation(jolt.Quat.prototype.sRotation(jolt.Vec3.prototype.sAxisY(), this.yaw));

        this.camera.position.copy(JoltRVecTo3Vec(pos));
        inputMan.subToMovement(this.handleMovement.bind(this));
        inputMan.subToLook(this.handleLook.bind(this));
    }

    updateView(width : number, height : number) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }

    handleMovement(v : THREE.Vector2) {
        this.curmove = v;
    }

    handleLook(v : THREE.Vector2) {
        this.curlook.set(v.x, v.y);
       //console.log(this.curlook)
    }

    update(dt : number) {
        let rotmove = this.character.GetRotation().MulVec3(new jolt.Vec3(this.curmove.x, 0, -this.curmove.y));
        this.character.SetLinearVelocity(new jolt.Vec3(rotmove.GetX() * this.moveSpeed, -9, rotmove.GetZ() * this.moveSpeed));
        this.character.ExtendedUpdate(dt,
             this.character.GetUp(), 
             this.updateSettings,
             bpFilter, 
             movingLayerFilter, 
             charBodyFilter, 
             charShapeFilter, 
             joltworld.GetTempAllocator());
        
        this.yaw -= this.curlook.x * dt * this.turnSpeed;
        let newpitch = this.pitch - this.curlook.y * dt * this.turnSpeed;
        this.pitch = Math.min(Math.max(newpitch, -Math.PI / 2), Math.PI / 2);
        this.character.SetRotation(jolt.Quat.prototype.sRotation(jolt.Vec3.prototype.sAxisY(), this.yaw));
        this.camera.position.copy(JoltRVecTo3Vec(this.character.GetPosition()));
        this.camera.setRotationFromQuaternion(JoltQuatTo3Quat(this.character.GetRotation()));
        this.camera.rotateX(this.pitch);
        this.curmove.set(0,0);
        this.curlook.set(0,0);
    }

    deinit(scene : THREE.Scene) {
    }

    destroy() {
        jolt.destroy(this.character);
    }

    camera: THREE.PerspectiveCamera;
    character : Jolt.CharacterVirtual;
    updateSettings: Jolt.ExtendedUpdateSettings;
    curmove = new THREE.Vector2();
    curlook = new THREE.Vector2();
    turnSpeed = 10;
    moveSpeed = 10;
    //tried getting the rotation from the character but it didn't work
    //radians
    yaw = Math.PI;
    pitch = 0;
}