import * as THREE from "three";
import { jolt, JoltQuatTo3Quat, JoltRVecTo3Vec, phys, LAYER_MOVING, LAYER_NON_MOVING, JoltVecTo3Vec, HAMMER_SPACE } from "~/gamelib/physics-general";
import Jolt from "jolt-physics";

export class PhysiBox {
    constructor(isStatic : boolean){
        let box = new THREE.BoxGeometry(1, 1, 1);
        let mat = new THREE.MeshPhysicalMaterial();
        this.visibox = new THREE.Mesh(box, mat);
        
        let shape = new jolt.BoxShape(new jolt.Vec3(0.5, 0.5, 0.5));
        
        let creationSettings = new jolt.BodyCreationSettings(shape, 
            HAMMER_SPACE, 
            new jolt.Quat(0, 0, 0, 1), 
            isStatic ? jolt.EMotionType_Static : jolt.EMotionType_Dynamic, 
            isStatic ? LAYER_NON_MOVING : LAYER_MOVING);
        
        this.physibox = phys.GetBodyInterface().CreateBody(creationSettings);
    }

    init(scene : THREE.Scene, pos = new jolt.RVec3(), scale = new jolt.Vec3(0.5,0.5,0.5)) {
        phys.GetBodyInterface().AddBody(this.physibox.GetID(), jolt.EActivation_Activate);
        phys.GetBodyInterface().SetPosition(this.physibox.GetID(), pos, jolt.EActivation_Activate);
        phys.GetBodyInterface().SetShape(this.physibox.GetID(), new jolt.BoxShape(scale), true, jolt.EActivation_Activate);
        this.visibox.position.copy(JoltRVecTo3Vec(this.physibox.GetPosition()));
        this.visibox.quaternion.copy(JoltQuatTo3Quat(this.physibox.GetRotation()));
        this.visibox.scale.copy(JoltVecTo3Vec(scale.MulFloat(2)));

        scene.add(this.visibox);
    }

    update() {
        this.visibox.position.copy(JoltRVecTo3Vec(this.physibox.GetPosition()));
        this.visibox.quaternion.copy(JoltQuatTo3Quat(this.physibox.GetRotation()));
    }

    deinit(scene : THREE.Scene) {
        phys.GetBodyInterface().SetPosition(this.physibox.GetID(), HAMMER_SPACE, jolt.EActivation_Activate);
        phys.GetBodyInterface().RemoveBody(this.physibox.GetID());

        scene.remove(this.visibox);
    }

    destroy() {
        jolt.destroy(this.physibox);
    }


    visibox: THREE.Mesh;
    physibox: Jolt.Body;
}