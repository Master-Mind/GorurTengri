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
use bevy::prelude::{App, Camera3d, Commands, Cuboid, Mesh, Mesh3d, Meshable, Plane3d, ResMut, Transform};
use bevy::render::render_resource::{Extent3d, TextureDimension, TextureFormat};
use bevy::utils::default;

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

fn just_a_cube() {

}

fn just_a_cube_setup(mut commands: Commands,
                     mut meshes: ResMut<Assets<Mesh>>,
                     mut images: ResMut<Assets<Image>>,
                     mut materials: ResMut<Assets<StandardMaterial>>) {
    let mat = materials.add(StandardMaterial{
        base_color_texture: Some(images.add(uv_debug_texture())),
        ..default()
    });
    let cube = meshes.add(Cuboid::default());
    commands.spawn((Mesh3d(cube), MeshMaterial3d(mat.clone())));

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
    commands.spawn((
        Mesh3d(meshes.add(Plane3d::default().mesh().size(50.0, 50.0).subdivisions(10))),
        MeshMaterial3d(materials.add(Color::from(SILVER))),
    ));

    commands.spawn((
        Camera3d::default(),
        Transform::from_xyz(0.0, 7., 14.0).looking_at(Vec3::new(0., 1., 0.), Vec3::Y),
    ));

}

pub fn app() -> i32 {
    App::new()
        .add_systems(Startup, just_a_cube_setup)
        .add_systems(Update, just_a_cube)
        .add_plugins(DefaultPlugins)
        .run();
    0
}