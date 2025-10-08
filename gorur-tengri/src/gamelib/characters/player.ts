import * as THREE from "three";
import { jolt, JoltQuatTo3Quat, JoltRVecTo3Vec, phys, LAYER_MOVING, LAYER_NON_MOVING, JoltVecTo3Vec, HAMMER_SPACE, BP_LAYER_MOVING, movingLayerFilter, charBodyFilter, charShapeFilter, joltworld, bpFilter } from "~/gamelib/physics-general";
import Jolt from "jolt-physics";

export class Player {
    constructor(width : number, height : number){
        let settings = new jolt.CharacterVirtualSettings();
        settings.mShape = new jolt.CapsuleShape(1, 0.3);
        settings.mSupportingVolume = new jolt.Plane(jolt.Vec3.prototype.sAxisY(), -1);
        this.character = new jolt.CharacterVirtual(settings, HAMMER_SPACE, new jolt.Quat(), phys);

        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        this.errored = false;
    }

    init(pos = new jolt.RVec3(), scale = new jolt.Vec3(1,1,1)) {
        this.character.SetPosition(pos);

        this.camera.position.copy(JoltRVecTo3Vec(pos));
    }

    update(dt : number) {
        this.character.Update(dt, new jolt.Vec3(0, -9, 0), bpFilter, movingLayerFilter, charBodyFilter, charShapeFilter, joltworld.GetTempAllocator());
        this.camera.position.copy(JoltRVecTo3Vec(this.character.GetPosition()));
        this.camera.lookAt(new THREE.Vector3())
    }

    deinit(scene : THREE.Scene) {
        
    }

    camera: THREE.PerspectiveCamera;
    character : Jolt.CharacterVirtual;
    errored : boolean;
}