fn vtx_main(
    worldPosition: vec4f,
    localPosition: vec4f,
    samplesPerMeter: f32,
    heightTex: texture_2d<f32>,
    heightSampler: sampler,
    worldWidth: u32,
    texWorldWidth: f32,
    texOffset: vec2f,
    heightScale: f32,
    instance: mat4x4f,
    model: mat4x4f) -> vec4f {
    var tempPosition = (model * instance * localPosition).xyz;
    // use mesh spacing so neighbor samples correspond to adjacent vertices
    let step = 1.0 / max(samplesPerMeter, 1.0);
    var neighborA = tempPosition + vec3f(step, 0.0, 0.0);
    var neighborB = tempPosition + vec3f(0.0, 0.0, step);

    let uv = vec2f(tempPosition.xz + texOffset) / texWorldWidth;
    let uvA = vec2f(neighborA.xz + texOffset) / texWorldWidth;
    let uvB = vec2f(neighborB.xz + texOffset) / texWorldWidth;

    // use explicit bilinear sampling (works regardless of sampler filtering)
    tempPosition.y += (sampleHeightBilinear(heightTex, uv, 0) * heightScale);
    neighborA.y += sampleHeightBilinear(heightTex, uvA, 0) * heightScale;
    neighborB.y += sampleHeightBilinear(heightTex, uvB, 0) * heightScale;

    let toA = normalize(neighborA - tempPosition);
    let toB = normalize(neighborB - tempPosition);
    varyings.vNormal = -cross(toA, toB);

    return vec4f(localPosition.x, tempPosition.y, localPosition.z, 1.);
}
//NOTE: Threejs always tries to call the first whatever the fuck thingamawhatsit in a wgsl module ._.
//even if that whatever the fuck thingamawhatsit is a comment ._.
//yes, I found that out by typing a comment above that function up there ._.


fn get_height(uv: vec2f) -> f32 {
    return length(uv) * 1000;;
}

// bilinear sampler helper
fn sampleHeightBilinear(tex: texture_2d<f32>, uv: vec2f, level: i32) -> f32 {
    // get integer texture size
    let dims = textureDimensions(tex);
    let coord = uv * vec2f(f32(dims.x), f32(dims.y));
    let x = floor(coord.x);
    let y = floor(coord.y);
    let fx = fract(coord.x);
    let fy = fract(coord.y);

    // convert to integer coords for textureLoad
    let ix = i32(x);
    let iy = i32(y);

    let c00 = textureLoad(tex, vec2i(ix, iy), level).r;
    let c10 = textureLoad(tex, vec2i(ix + 1, iy), level).r;
    let c01 = textureLoad(tex, vec2i(ix, iy + 1), level).r;
    let c11 = textureLoad(tex, vec2i(ix + 1, iy + 1), level).r;

    let cx0 = mix(c00, c10, fx);
    let cx1 = mix(c01, c11, fx);
    return mix(cx0, cx1, fy);
}