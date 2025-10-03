use std::borrow::Cow;
use bevy::asset::{Assets, RenderAssetUsages};
use bevy::image::Image;
use bevy::prelude::{Commands, DirectAssetAccessExt, FromWorld, Handle, Res, ResMut, Resource, World};
use bevy::render::extract_resource::ExtractResource;
use bevy::render::render_asset::RenderAssets;
use bevy::render::render_graph;
use bevy::render::render_graph::{NodeRunError, RenderGraphContext, RenderLabel};
use bevy::render::render_resource::{BindGroup, BindGroupEntries, BindGroupLayout, BindGroupLayoutEntries, CachedComputePipelineId, CachedPipelineState, ComputePassDescriptor, ComputePipelineDescriptor, Extent3d, PipelineCache, ShaderStages, StorageTextureAccess, TextureDimension, TextureFormat, TextureUsages};
use bevy::render::render_resource::binding_types::texture_storage_2d;
use bevy::render::renderer::{RenderContext, RenderDevice};
use bevy::render::texture::GpuImage;

const SHADER_PATH : &str = "shaders/map_generator.wgsl";

#[derive(Resource, Clone, ExtractResource)]
pub struct MapImage {
    tex: Handle<Image>
}

pub fn terrain_setup(mut commands: Commands, mut images: ResMut<Assets<Image>>) {
    let mut image = Image::new_fill(
        Extent3d {
            width: 128,
            height: 128,
            depth_or_array_layers: 1
        },
        TextureDimension::D2,
        &[0, 0, 0, 255],
        TextureFormat::R32Float,
        RenderAssetUsages::RENDER_WORLD,
    );
    image.texture_descriptor.usage =
        TextureUsages::COPY_DST | TextureUsages::STORAGE_BINDING | TextureUsages::TEXTURE_BINDING;

    let image = images.add((image.clone()));

    commands.insert_resource(MapImage{
        tex: image
    });
}

#[derive(Resource)]
pub struct TerrainPipeline {
    texture_bind_group_layout: BindGroupLayout,
    draw_map_pipeline: CachedComputePipelineId,
}

impl FromWorld for TerrainPipeline {
    fn from_world(world: &mut World) -> Self {
        let render_device = world.resource::<RenderDevice>();
        let texture_bind_group_layout = render_device.create_bind_group_layout(
            "MapImage",
            &BindGroupLayoutEntries::sequential(
                ShaderStages::COMPUTE,
                (
                    texture_storage_2d(TextureFormat::R32Float, StorageTextureAccess::WriteOnly),
                ),
            )
        );

        let shader = world.load_asset(SHADER_PATH);
        let pipeline_cache = world.resource::<PipelineCache>();
        let draw_map_pipeline = pipeline_cache.queue_compute_pipeline(ComputePipelineDescriptor {
            label: None,
            layout: vec![texture_bind_group_layout.clone()],
            push_constant_ranges: Vec::new(),
            shader: shader.clone(),
            shader_defs: vec![],
            entry_point: Cow::from("draw_map"),
            zero_initialize_workgroup_memory: false,
        });

        TerrainPipeline {
            texture_bind_group_layout,
            draw_map_pipeline
        }
    }
}

#[derive(Resource)]
struct MapImageBindGroups([BindGroup; 1]);

pub fn prepare_bind_group(
    mut commands: Commands,
    pipeline: Res<TerrainPipeline>,
    gpu_images: Res<RenderAssets<GpuImage>>,
    map_image: Res<MapImage>,
    render_device: Res<RenderDevice>
) {
    let view = gpu_images.get(&map_image.tex).unwrap();
    let bind_group = render_device.create_bind_group(
        None,
        &pipeline.texture_bind_group_layout,
        &BindGroupEntries::single(&view.texture_view)
    );

    commands.insert_resource(MapImageBindGroups([bind_group]));
}

#[derive(Debug, Hash, PartialEq, Eq, Clone, RenderLabel)]
pub struct TerrainGenLabel;

enum TerrainGenState {
    Loading,
    DrawMap
}

pub struct TerrainGenNode {
    state : TerrainGenState
}

impl Default for TerrainGenNode {
    fn default() -> Self {
        Self {
            state: TerrainGenState::Loading
        }
    }
}


impl render_graph::Node for TerrainGenNode {
    fn update(&mut self, world: &mut World) {
        let pipeline = world.resource::<TerrainPipeline>();
        let pipeline_cache = world.resource::<PipelineCache>();

        match self.state {
            TerrainGenState::Loading => {
                match pipeline_cache.get_compute_pipeline_state(pipeline.draw_map_pipeline) {
                    CachedPipelineState::Queued => {}
                    CachedPipelineState::Creating(_) => {}
                    CachedPipelineState::Ok(_) => {
                        self.state = TerrainGenState::DrawMap;
                    }
                    CachedPipelineState::Err(err) => {
                        panic!("Failed to initialize {SHADER_PATH}: {err}");
                    }
                }
            }
            TerrainGenState::DrawMap => {
                println!("map done");
            }
        }
    }
    fn run<'w>(&self,
               graph: &mut RenderGraphContext,
               render_context: &mut RenderContext<'w>,
               world: &'w World) -> Result<(), NodeRunError> {
        let bind_groups = &world.resource::<MapImageBindGroups>().0;
        let pipeline_cache = world.resource::<PipelineCache>();
        let pipeline = world.resource::<TerrainPipeline>();

        let mut pass = render_context
            .command_encoder()
            .begin_compute_pass(&ComputePassDescriptor::default());

        match self.state {
            TerrainGenState::Loading => {}
            TerrainGenState::DrawMap => {
                let draw_pipeline = pipeline_cache
                    .get_compute_pipeline(pipeline.draw_map_pipeline)
                    .unwrap();

                pass.set_bind_group(0, &bind_groups[0], &[]);
                pass.set_pipeline(draw_pipeline);
                pass.dispatch_workgroups(8, 8, 1);
            }
        }

        Ok(())
    }
}