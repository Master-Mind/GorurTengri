use bevy::app::{App, Startup, Plugin};
use bevy::prelude::IntoScheduleConfigs;
use bevy::render::extract_resource::ExtractResourcePlugin;
use crate::eco::terrain::{prepare_bind_group, terrain_setup, MapImage, TerrainGenLabel, TerrainPipeline, TerrainGenNode};
use bevy::render::{Render, RenderApp, RenderSet};
use bevy::render::render_graph::RenderGraph;

pub struct EcoPlugin;

impl Plugin for EcoPlugin {
    fn build(&self, app: &mut App) {
        app.add_systems(Startup, terrain_setup);
        app.add_plugins(ExtractResourcePlugin::<MapImage>::default());

        let render_app = app.sub_app_mut(RenderApp);

        render_app.add_systems(Render, prepare_bind_group.in_set(RenderSet::PrepareBindGroups));

        let mut render_graph = render_app.world_mut().resource_mut::<RenderGraph>();
        render_graph.add_node(TerrainGenLabel, TerrainGenNode::default());
    }

    fn finish(&self, app: &mut App) {
        let render_app = app.sub_app_mut(RenderApp);
        render_app.init_resource::<TerrainPipeline>();
    }
}
