fn genTerrainTex( writeTex: ptr<storage, array<f32>, read_write>, index: u32, width: u32) -> void {

    let x = index % width;
    let y = index / width;

    let uv = vec2u(x, y);

    let height = terrainElevation(vec2f(f32(x), f32(y)));

    writeTex[index] = height;
}