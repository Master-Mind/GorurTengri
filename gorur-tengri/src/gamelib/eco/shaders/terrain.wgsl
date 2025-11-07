fn vtx_main(
    worldPosition: vec4f,
    localPosition: vec4f,
    offset: vec3f,
    samplesPerMeter: f32,
    heightTex: texture_2d<f32>,
    heightSampler: sampler,
    worldWidth: u32,
    texWorldWidth: f32,
    heightScale: f32) -> vec4f {
    var tempPosition = worldPosition.xyz;
    var neighborA = tempPosition + vec3f(0.01, 0, 0);
    var neighborB = tempPosition + vec3f(0, 0, 0.01);

    let uv = vec2f(tempPosition.xz) / texWorldWidth;
    let uvA = vec2f(neighborA.xz) / texWorldWidth;
    let uvB = vec2f(neighborB.xz) / texWorldWidth;

    tempPosition.y += (textureSampleLevel(heightTex, heightSampler, uv, 0).r * heightScale);
    neighborA.y += textureSampleLevel(heightTex, heightSampler, uvA, 0).r * heightScale;
    neighborB.y += textureSampleLevel(heightTex, heightSampler, uvB, 0).r * heightScale;

    let toA = normalize(neighborA - tempPosition);
    let toB = normalize(neighborB - tempPosition);
    varyings.vNormal = -cross(toA, toB);

    return vec4f(localPosition.x, tempPosition.y, localPosition.z, 1.);
}
//NOTE: Threejs always tries to call the first whatever the fuck thingamawhatsit in a wgsl module ._.
//even if that whatever the fuck thingamawhatsit is a comment ._.
//yes, I found that out by typing a comment above that function up there ._.