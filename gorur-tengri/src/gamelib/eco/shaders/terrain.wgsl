fn vtx_main(
    worldPosition: vec4f,
    localPosition: vec4f,
    samplesPerMeter: f32,
    heightTex: texture_2d<f32>,
    worldWidth: u32,
    texWorldWidth: f32,
    texOffset: vec2f,
    heightScale: f32,
    instance: mat4x4f,
    model: mat4x4f
) -> vec4f {

    // Use worldPosition so this works for both instanced + non-instanced meshes.
    var tempPosition = (model * instance * localPosition).xyz;

    // use mesh spacing so neighbor samples correspond to adjacent vertices
    let step = 1.0 / max(samplesPerMeter, 1.0);
    var neighborA = tempPosition + vec3f(step, 0.0, 0.0);
    var neighborB = tempPosition + vec3f(0.0, 0.0, step);

    let uv  = vec2f(tempPosition.xz + texOffset) / texWorldWidth;
    let uvA = vec2f(neighborA.xz + texOffset) / texWorldWidth;
    let uvB = vec2f(neighborB.xz + texOffset) / texWorldWidth;

    // explicit bilinear sampling, clamped
    tempPosition.y += (sampleHeightBilinear(heightTex, uv)  * heightScale);
    neighborA.y    += (sampleHeightBilinear(heightTex, uvA) * heightScale);
    neighborB.y    += (sampleHeightBilinear(heightTex, uvB) * heightScale);

    let toA = normalize(neighborA - tempPosition);
    let toB = normalize(neighborB - tempPosition);
    varyings.vNormal = -cross(toA, toB);

    return vec4f(localPosition.x, tempPosition.y, localPosition.z, 1.);
}

// bilinear sampler helper (storage texture, read-only), clamped to edge
fn sampleHeightBilinear(tex: texture_2d<f32>, uvIn: vec2f) -> f32 {
    let dimsU = textureDimensions(tex);
    let dims = vec2f(f32(dimsU.x), f32(dimsU.y));

    // clamp uv to [0,1] and map to texel space [0, dims-1]
    let uv = clamp(uvIn, vec2f(0.0), vec2f(1.0));
    let coord = uv * (dims - vec2f(1.0));

    let x = floor(coord.x);
    let y = floor(coord.y);
    let fx = fract(coord.x);
    let fy = fract(coord.y);

    let ix0 = i32(x);
    let iy0 = i32(y);

    let maxX = i32(dimsU.x) - 1;
    let maxY = i32(dimsU.y) - 1;

    let ix1 = min(ix0 + 1, maxX);
    let iy1 = min(iy0 + 1, maxY);

    // storage textures don't have mip levels; textureLoad has no "level" param here
    let c00 = textureLoad(tex, vec2i(ix0, iy0), 0).x;
    let c10 = textureLoad(tex, vec2i(ix1, iy0), 0).x;
    let c01 = textureLoad(tex, vec2i(ix0, iy1), 0).x;
    let c11 = textureLoad(tex, vec2i(ix1, iy1), 0).x;

    let cx0 = mix(c00, c10, fx);
    let cx1 = mix(c01, c11, fx);
    return mix(cx0, cx1, fy);
}