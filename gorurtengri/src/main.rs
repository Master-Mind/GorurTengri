use std::f32::consts::PI;
use bevy::app::Update;
use bevy::app::Startup;
use bevy::asset::{Assets};
use bevy::color::Color;
use bevy::DefaultPlugins;
use bevy::pbr::{DirectionalLight, MeshMaterial3d, PointLight, StandardMaterial};
use bevy::pbr::LightEntity::Directional;
use bevy::prelude::{AmbientLight, App, Camera3d, ClearColor, Commands, Cuboid, Cylinder, Mesh, Mesh3d, PluginGroup, Quat, ResMut, TextFont, Transform, Vec3, Window, WindowPlugin};
use bevy::text::FontSmoothing;
use bevy::utils::default;
use bevy_atmosphere::prelude::AtmospherePlugin;
use bevy_rapier3d::dynamics::RigidBody;
use bevy_rapier3d::geometry::Collider;
use bevy_rapier3d::prelude::{NoUserData, RapierDebugRenderPlugin, RapierPhysicsPlugin};
use bevy_tnua::control_helpers::TnuaCrouchEnforcerPlugin;
use bevy_tnua::prelude::TnuaControllerPlugin;
use bevy_tnua_rapier3d::TnuaRapier3dPlugin;
use bevy_dev_tools::fps_overlay::{FpsOverlayConfig, FpsOverlayPlugin};
use rand::Rng;
use crate::characters::player::{player_setup, player_update};

mod characters;
mod eco;

fn game_setup(mut commands: Commands,
              mut meshes: ResMut<Assets<Mesh>>,
              mut materials: ResMut<Assets<StandardMaterial>>) {

    commands.spawn((
        DirectionalLight::default(),
        Transform::from_xyz(8.0, 16.0, 8.0).with_rotation(Quat::from_rotation_x(-PI / 4.)),
    ));

    // Static physics object with a collision shape
    commands.spawn((
        Collider::cylinder(0.1, 100.0),
        Mesh3d(meshes.add(Cylinder::new(100.0, 0.1))),
        MeshMaterial3d(materials.add(Color::WHITE)),
    ));

    let mut rng = rand::rng();
    let range = 10.0;

    // Dynamic physics object with a collision shape and initial angular velocity
    for _i in 0..10 {
        commands.spawn((
            RigidBody::Dynamic,
            Collider::cuboid(0.5, 0.5, 0.5),
            Mesh3d(meshes.add(Cuboid::from_length(1.0))),
            MeshMaterial3d(materials.add(Color::srgb_u8(124, 144, 255))),
            Transform::from_xyz(rng.random_range(-range..range), rng.random_range(0.0..range),rng.random_range(-range..range)),
        ));
    }

    player_setup(&mut commands);
    //debug camera, should be commented out most of the time
    //commands.spawn((
    //    Camera3d::default(),
    //    Transform::from_xyz(0.0, 70., 140.0).looking_at(Vec3::new(0., 1., 0.), Vec3::Y),
    //));
}

pub fn main() {
    //#[cfg(target_family = "wasm")]
    //wasm_logger::init(wasm_logger::Config::default());
    App::new()
        .add_plugins(DefaultPlugins.set(WindowPlugin {
            primary_window: Some(Window {
                canvas: Some("#bevy-canvas".into()),
                // On web, size follows the CSS size (100% x 100%)
                ..default()
            }),
            ..default()
        }))
        .insert_resource(ClearColor(Color::srgb_u8(135, 206, 235)))
        .add_plugins(AtmospherePlugin)
        .add_plugins(RapierPhysicsPlugin::<NoUserData>::default())
        .add_plugins(RapierDebugRenderPlugin::default())
        .add_plugins(TnuaRapier3dPlugin::default())
        .add_plugins(TnuaControllerPlugin::default())
        .add_plugins(TnuaCrouchEnforcerPlugin::default())
        .add_plugins(FpsOverlayPlugin{
            config: FpsOverlayConfig {
                text_config: TextFont {
                    // Here we define size of our overlay
                    font_size: 42.0,
                    // If we want, we can use a custom font
                    font: default(),
                    // We could also disable font smoothing,
                    font_smoothing: FontSmoothing::default(),
                    ..default()
                },
                // We can also change color of the overlay
                text_color: Color::srgb(1.0, 0.0, 0.0),
                // We can also set the refresh interval for the FPS counter
                refresh_interval: core::time::Duration::from_millis(100),
                enabled: true,
            },
        })
        .add_plugins(eco::eco::EcoPlugin)
        .add_systems(Startup, game_setup)
        .add_systems(Update, player_update)
        .run();
}