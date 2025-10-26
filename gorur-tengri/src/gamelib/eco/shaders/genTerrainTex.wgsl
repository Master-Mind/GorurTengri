fn genTerrainTex( writeTex: ptr<storage, array<f32>, read_write>, 
    normTex: texture_storage_2d<rgba8unorm, write>, 
    index: u32, 
    offset: vec3f,
    worldWidth: u32,
    samplesPerMeter: f32,
    heightScale: f32) -> void {
    let buffWidth = u32(f32(worldWidth) * samplesPerMeter);

    let texX = index % buffWidth;
    let texY = index / buffWidth;

    let uv = vec2u(texX, texY);

    var worldPos = vec3f(f32(texX) / samplesPerMeter, 0, f32(texY) / samplesPerMeter) + offset;

    var neighborA = vec3f(worldPos.x + 0.01, 0, worldPos.z);
    var neighborB = vec3f(worldPos.x, 0, worldPos.z + 0.01);

    let height = terrainElevation(worldPos.xz);
    let heightA = heightScale * terrainElevation(neighborA.xz);
    let heightB = heightScale * terrainElevation(neighborB.xz);

    worldPos.y = height * heightScale;
    neighborA.y = heightA;
    neighborB.y = heightB;

    let toA = normalize(neighborA - worldPos);
    let toB = normalize(neighborB - worldPos);
    let norm = cross(toA, toB);

    textureStore(normTex, uv, vec4f(-norm, 1));

    writeTex[index] = height;
}