use bevy::input::ButtonInput;
use bevy::input::mouse::MouseMotion;
use bevy::math::{Dir3, Quat, Vec3, Vec2};
use bevy::prelude::{Camera3d, Commands, Component, EventReader, KeyCode, Query, Res, Touches, Transform, Window, With, Without};
use bevy::window::PrimaryWindow;
use bevy_rapier3d::dynamics::RigidBody;
use bevy_rapier3d::geometry::Collider;
use bevy_rapier3d::na::{Vector3};
use bevy_tnua::control_helpers::{TnuaBlipReuseAvoidance, TnuaCrouchEnforcer};
use bevy_tnua::prelude::*;
use bevy_tnua::{TnuaGhostSensor, TnuaObstacleRadar};
use bevy_tnua::math::{float_consts};
use bevy_tnua_rapier3d::TnuaRapier3dSensorShape;
use bevy::input::gamepad::*;

#[derive(Component)]
pub struct FPSLook {
    pitch: f32, //couldn't figure out a clean way to extract pitch from the camera
    yaw: f32
}

pub fn player_update(primary_window_query: Query<&Window, With<PrimaryWindow>>,
                     mut mouse_motion: EventReader<MouseMotion>,
                     keyboard: Res<ButtonInput<KeyCode>>,
                     mut controller_query: Query<(
                         &mut TnuaController,
                         &Transform
                     ), Without<Camera3d>>,
                    mut camera_query: Query<&mut Transform, With<Camera3d>>,
                    mut look_query: Query<&mut FPSLook>,
                     gamepads: Query<&Gamepad>,
                    touches: Res<Touches>) {
    let mouse_sensitivity = 0.002;
    let gamepad_look_sensitivity = 0.04;
    let deadzone = 0.1; //there is a gamepad settings struct, but I don't know how to use it, TODO: ask how to use it

    let mut dyaw = 0.0;
    let mut dpitch = 0.0;
    let mut dir = Vec3::new(0.0,0.0, 0.0);
    let mut disable_mouse = false;//bevy treats touches like a mouse for some reason
    let win_width = primary_window_query.single().unwrap().width();
    let win_height = primary_window_query.single().unwrap().height();
    let ratio = win_width / win_height;

    //log::debug!("window size {0}, {1}", primary_window_query.single().unwrap().width(), primary_window_query.single().unwrap().height());

    //touch controls
    for touch in touches.iter() {
        if touch.start_position().x < win_width / 2.0 {
            //log::debug!("pos {0}", touch.position());
            //log::debug!("del {0}", touch.distance());
            //TODO: Find a better way to manage pixel density
            //left side of screen, movement related
            dir = Vec3::new(touch.distance().x / (win_width * 0.1 / ratio), 0.0, touch.distance().y / (win_height * 0.1 * ratio));
            //log::debug!("dir {0}", dir);
        }
        else {
            //right side of screen, look related
            dyaw = touch.distance().x / (win_width / ratio);
            dpitch = -touch.distance().y / (win_height * ratio);
        }

        disable_mouse = true;
    }

    //gamepad controls
    match gamepads.single() {
        Ok(pad) => {
            if let Some(left_stick_x) = pad.get(GamepadAxis::LeftStickX) && left_stick_x.abs() > deadzone {
                dir.x += left_stick_x;
            }
            if let Some(left_stick_y) = pad.get(GamepadAxis::LeftStickY)  && left_stick_y.abs() > deadzone {
                dir.z -= left_stick_y;
            }
            if let Some(right_stick_x) = pad.get(GamepadAxis::RightStickX)  && right_stick_x.abs() > deadzone {
                dyaw -= gamepad_look_sensitivity * right_stick_x;
            }
            if let Some(right_stick_y) = pad.get(GamepadAxis::RightStickY)  && right_stick_y.abs() > deadzone {
                dpitch += gamepad_look_sensitivity * right_stick_y;
            }
        },
        Err(_) => {}
    }

    //mouse and keyboard
    if !disable_mouse {
        let mouse_controls_orientation = primary_window_query
            .single()
            .is_ok_and(|w| {w.cursor_options.visible});
        let dmouse = if mouse_controls_orientation {
            mouse_motion.read().map(|mouse_motion| mouse_motion.delta).sum()
        } else {
            mouse_motion.clear();
            Vec2::ZERO
        };

        dyaw += -mouse_sensitivity * dmouse.x;
        dpitch += -mouse_sensitivity * dmouse.y;
    }

    if keyboard.any_pressed([KeyCode::KeyW, KeyCode::ArrowUp]) {
        dir.z += -1.0;
    }

    if keyboard.any_pressed([KeyCode::KeyS, KeyCode::ArrowDown]) {
        dir.z += 1.0;
    }

    if keyboard.any_pressed([KeyCode::KeyA, KeyCode::ArrowLeft]) {
        dir.x += -1.0;
    }

    if keyboard.any_pressed([KeyCode::KeyD, KeyCode::ArrowRight]) {
        dir.x += 1.0;
    }

    dir = dir.clamp_length_max(1.0);

    let mut look = look_query.single_mut().unwrap();
    look.yaw += dyaw;

    //she yawq on my quat till i rotate about the y axis
    let yawq = Quat::from_axis_angle(Vec3::Y, dyaw);

    for (mut controller, transform) in controller_query.iter_mut() {
        controller.basis(TnuaBuiltinWalk {
            desired_velocity: transform.rotation * dir * 20.0,
            max_slope: float_consts::FRAC_PI_4,
            float_height: 1.5,
            desired_forward: Some(yawq * transform.forward()),
            ..Default::default()
        });
    }

    for mut cam in camera_query.iter_mut() {
        look.pitch = (look.pitch + dpitch).clamp(-float_consts::FRAC_PI_2, float_consts::FRAC_PI_2);
        let pitchq = Quat::from_axis_angle(cam.right().as_vec3(), look.pitch);

        cam.rotation = pitchq;
    }
}

pub fn player_setup(commands: &mut Commands){
    let radius = 0.5;
    let height = 1.5;
    let collider = Collider::capsule_y(radius, height);

    commands.spawn((RigidBody::Dynamic,
        Transform::from_xyz(0.0, 20.0, 0.0),
                    collider.clone(),
    TnuaController::default(),
    TnuaObstacleRadar::new(radius * 2.0, height * 2.0),
    TnuaBlipReuseAvoidance::default(),
    TnuaRapier3dSensorShape(collider.clone()),
    TnuaCrouchEnforcer::new(height * Vec3::Y, |cmd| {
        cmd.insert(TnuaRapier3dSensorShape(Collider::cylinder(0.0, 0.5)));
    }),
    TnuaGhostSensor::default())).with_child((Transform::from_xyz(0.0, 0.0, 0.0),
                    Camera3d::default(),
                    FPSLook{pitch:0.0, yaw:0.0}));
}