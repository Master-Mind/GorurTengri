
import Jolt from "jolt-physics";
import initJolt from "jolt-physics";
import * as THREE from "three";

export const jolt = await initJolt();
//avoid garbage collection by sending bad dogs to the void
export const NUM_OBJECT_LAYERS = 2;
export const LAYER_NON_MOVING = 0;
export const LAYER_MOVING = 1;
export const BP_LAYER_NON_MOVING = new jolt.BroadPhaseLayer(0);
export const BP_LAYER_MOVING = new jolt.BroadPhaseLayer(1);
export const NUM_BROAD_PHASE_LAYERS = 2;
export const HAMMER_SPACE = new jolt.RVec3(0, -100000, 0);

let settings = new jolt.JoltSettings();
//copy pasting from the example because I don't understand the filters quite yet
// Layer that objects can be in, determines which other objects it can collide with
// Typically you at least want to have 1 layer for moving bodies and 1 layer for static bodies, but you can have more
// layers if you want. E.g. you could have a layer for high detail collision (which is not used by the physics simulation
// but only if you do collision testing).
let objectFilter = new jolt.ObjectLayerPairFilterTable(NUM_OBJECT_LAYERS);
objectFilter.EnableCollision(LAYER_NON_MOVING, LAYER_MOVING);
objectFilter.EnableCollision(LAYER_MOVING, LAYER_MOVING);
// Each broadphase layer results in a separate bounding volume tree in the broad phase. You at least want to have
// a layer for non-moving and moving objects to avoid having to update a tree full of static objects every frame.
// You can have a 1-on-1 mapping between object layers and broadphase layers (like in this case) but if you have
// many object layers you'll be creating many broad phase trees, which is not efficient.
let bpInterface = new jolt.BroadPhaseLayerInterfaceTable(NUM_OBJECT_LAYERS, NUM_BROAD_PHASE_LAYERS);
bpInterface.MapObjectToBroadPhaseLayer(LAYER_NON_MOVING, BP_LAYER_NON_MOVING);
bpInterface.MapObjectToBroadPhaseLayer(LAYER_MOVING, BP_LAYER_MOVING);

settings.mObjectLayerPairFilter = objectFilter;
settings.mBroadPhaseLayerInterface = bpInterface;
settings.mObjectVsBroadPhaseLayerFilter = new jolt.ObjectVsBroadPhaseLayerFilterTable(settings.mBroadPhaseLayerInterface,
    NUM_BROAD_PHASE_LAYERS, 
    settings.mObjectLayerPairFilter,
    NUM_OBJECT_LAYERS);
export var joltworld = new jolt.JoltInterface(settings);

const objectLayerPairFilter = joltworld.GetObjectLayerPairFilter();
export const movingLayerFilter = new jolt.DefaultObjectLayerFilter(objectLayerPairFilter, LAYER_MOVING);

export const charBodyFilter = new jolt.BodyFilter();
export const charShapeFilter = new jolt.ShapeFilter();

export const bpFilter = new jolt.DefaultBroadPhaseLayerFilter(
                    joltworld.GetObjectVsBroadPhaseLayerFilter(), 
                    LAYER_MOVING
                );

//TODO: Figure out a better way of doing this than global vars once I know how to use jolt
export var phys = joltworld.GetPhysicsSystem();

export function JoltRVecTo3Vec(v : Jolt.RVec3) {
    return new THREE.Vector3(v.GetX(), v.GetY(), v.GetZ());
}

export function JoltVecTo3Vec(v : Jolt.Vec3) {
    return new THREE.Vector3(v.GetX(), v.GetY(), v.GetZ());
}

export function JoltQuatTo3Quat(q : Jolt.Quat) {
    return new THREE.Quaternion(q.GetX(), q.GetY(), q.GetZ(), q.GetW())
}