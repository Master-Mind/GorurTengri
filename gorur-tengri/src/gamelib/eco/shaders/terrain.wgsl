fn vtx_main(position: vec4f, 
    offset: vec3f,
    normTex: texture_storage_2d<rgba8unorm, read>,
    samplesPerMeter: f32,
    heightTex: ptr<storage, array<f32>, read>,
    worldWidth: u32,
    heightScale: f32) -> vec4f {
    let texpos = (position.xz) * samplesPerMeter;
    let height = heightTex[u32(texpos.x) + u32(texpos.y * samplesPerMeter) * worldWidth];

    var newPosition = position.xyz;
    newPosition.y += height * heightScale;

    let uvf = texpos;
    varyings.vNormal = textureLoad(normTex, vec2u(u32(uvf.x), u32(uvf.y))).xyz;

    return vec4f(newPosition, 1.);
}
//NOTE: Threejs always tries to call the first whatever the fuck thingamawhatsit in a wgsl module ._.
//even if that whatever the fuck thingamawhatsit is a comment ._.
//yes, I found that out by typing a comment above that function up there ._.