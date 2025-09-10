use bevy::app::Update;
use bevy::app::Startup;
use bevy::asset::{Assets, RenderAssetUsages};
use bevy::color::Color;
use bevy::color::palettes::basic::SILVER;
use bevy::DefaultPlugins;
use bevy::gltf::GltfAssetLabel::Material;
use bevy::image::Image;
use bevy::math::Vec3;
use bevy::pbr::{MeshMaterial3d, PointLight, StandardMaterial};
use bevy::prelude::{App, Camera3d, Commands, Cuboid, Cylinder, Mesh, Mesh3d, Meshable, Plane3d, Res, ResMut, Transform};
use bevy::render::render_resource::{Extent3d, TextureDimension, TextureFormat};
use bevy::time::Time;
use bevy::utils::default;
use bevy_rapier3d::dynamics::RigidBody;
use bevy_rapier3d::geometry::Collider;
use bevy_rapier3d::prelude::{NoUserData, RapierDebugRenderPlugin, RapierPhysicsPlugin};
use rand::Rng;

/// Creates a colorful test pattern
fn uv_debug_texture() -> Image {
    const TEXTURE_SIZE: usize = 8;

    let mut palette: [u8; 32] = [
        255, 102, 159, 255, 255, 159, 102, 255, 236, 255, 102, 255, 121, 255, 102, 255, 102, 255,
        198, 255, 102, 198, 255, 255, 121, 102, 255, 255, 236, 102, 255, 255,
    ];

    let mut texture_data = [0; TEXTURE_SIZE * TEXTURE_SIZE * 4];
    for y in 0..TEXTURE_SIZE {
        let offset = TEXTURE_SIZE * y * 4;
        texture_data[offset..(offset + TEXTURE_SIZE * 4)].copy_from_slice(&palette);
        palette.rotate_right(4);
    }

    Image::new_fill(
        Extent3d {
            width: TEXTURE_SIZE as u32,
            height: TEXTURE_SIZE as u32,
            depth_or_array_layers: 1,
        },
        TextureDimension::D2,
        &texture_data,
        TextureFormat::Rgba8UnormSrgb,
        RenderAssetUsages::RENDER_WORLD,
    )
}

//fn just_a_cube(time: Res<Time>) {
//}

fn just_a_cube_setup(mut commands: Commands,
                     mut meshes: ResMut<Assets<Mesh>>,
                     mut images: ResMut<Assets<Image>>,
                     mut materials: ResMut<Assets<StandardMaterial>>) {
    println!("got here");
    let mat = materials.add(StandardMaterial{
        base_color_texture: Some(images.add(uv_debug_texture())),
        ..default()
    });
    //let cube = meshes.add(Cuboid::default());
    //commands.spawn((Mesh3d(cube), MeshMaterial3d(mat.clone())));

    commands.spawn((
        PointLight {
            shadows_enabled: true,
            intensity: 10_000_000.,
            range: 100.0,
            shadow_depth_bias: 0.2,
            ..default()
        },
        Transform::from_xyz(8.0, 16.0, 8.0),
    ));

    // ground plane
    //commands.spawn((
    //    Mesh3d(meshes.add(Plane3d::default().mesh().size(50.0, 50.0).subdivisions(10))),
    //    MeshMaterial3d(materials.add(Color::from(SILVER))),
    //));

    // Static physics object with a collision shape
    commands.spawn((
        Collider::cylinder(0.1, 4000.0),
        Mesh3d(meshes.add(Cylinder::new(4000.0, 0.1))),
        MeshMaterial3d(materials.add(Color::WHITE)),
    ));

    let mut rng = rand::rng();
    let range = 10.0;

    // Dynamic physics object with a collision shape and initial angular velocity
    for i in 0..1000 {
        commands.spawn((
            RigidBody::Dynamic,
            Collider::cuboid(0.5, 0.5, 0.5),
            Mesh3d(meshes.add(Cuboid::from_length(1.0))),
            MeshMaterial3d(materials.add(Color::srgb_u8(124, 144, 255))),
            Transform::from_xyz(rng.random_range(-range..range), rng.random_range(0.0..range),rng.random_range(-range..range)),
        ));
    }

    commands.spawn((
        Camera3d::default(),
        Transform::from_xyz(0.0, 70., 140.0).looking_at(Vec3::new(0., 1., 0.), Vec3::Y),
    ));

}

pub fn app() -> i32 {
    println!("got here main");
    App::new()
        .add_plugins((DefaultPlugins))
        .add_plugins(RapierPhysicsPlugin::<NoUserData>::default())
        .add_plugins(RapierDebugRenderPlugin::default())
        .add_systems(Startup, just_a_cube_setup)
        //.add_systems(Update, just_a_cube)
        .run();
    0
}