fn vtx_main(position: vec3f, 
    offset: vec3f,
    readTex: ptr<storage, array<f32>, read>,
    worldWidth: f32,
    vertsPerMeter: f32) -> vec4f {
    var newPosition = position;

    // PlaneGeometry is centered: x,z in [-worldWidth/2, +worldWidth/2]
    let local = getLocalVec(position, offset, worldWidth);

    let h = getHeight(local, readTex);
    newPosition.y = h * terrainHeight;
    var neighborA = position + vec3f(0.01, 0., 0.);
    var neighborB = position + vec3f(0., 0., 0.01);
    neighborA.y += getHeight(getLocalVec(neighborA, offset, worldWidth), readTex) * terrainHeight;
    neighborB.y += getHeight(getLocalVec(neighborB, offset, worldWidth), readTex) * terrainHeight;

    var toA = normalize(neighborA - newPosition);
    var toB = normalize(neighborB - newPosition);

    varyings.vNormal = -cross(toA, toB);

    return vec4f(newPosition, 1.);
}
//NOTE: Threejs always tries to call the first whatever the fuck thingamawhatsit in a wgsl module ._.
//even if that whatever the fuck thingamawhatsit is a comment ._.
//yes, I found that out by typing a comment above that function up there ._.
const terrainHeight = 50.;
fn getLocalVec(pos : vec3f, offset : vec3f, worldWidth: f32) -> vec2f{
    return pos.xz + offset.xz + vec2f(worldWidth * 0.5, worldWidth * 0.5);
}

fn getHeight(localCoord : vec2f, readTex: texture_storage_2d<rgba16float, read>) -> f32 {
    //getting bored of terrain stuff and I'm too lazy to figure out bilinear interpolation myself
    //thanks claude!
    // Get texture dimensions
    let texSize = textureDimensions(readTex);
    let texSizeF = vec2f(texSize);
    
    // Convert local coordinates to texture space
    let texCoord = localCoord; // Assuming localCoord is already in texture space
    
    // Get the four surrounding texel coordinates
    let x0 = floor(texCoord.x);
    let y0 = floor(texCoord.y);
    let x1 = x0 + 1.0;
    let y1 = y0 + 1.0;
    
    // Clamp coordinates to texture bounds
    let px0 = clamp(i32(x0), 0, i32(texSize.x) - 1);
    let py0 = clamp(i32(y0), 0, i32(texSize.y) - 1);
    let px1 = clamp(i32(x1), 0, i32(texSize.x) - 1);
    let py1 = clamp(i32(y1), 0, i32(texSize.y) - 1);
    
    // Sample the four corner texels (assuming height is stored in the red channel)
    let h00 = textureLoad(readTex, vec2i(px0, py0)).r;
    let h10 = textureLoad(readTex, vec2i(px1, py0)).r;
    let h01 = textureLoad(readTex, vec2i(px0, py1)).r;
    let h11 = textureLoad(readTex, vec2i(px1, py1)).r;
    
    // Calculate interpolation weights
    let fx = texCoord.x - x0;
    let fy = texCoord.y - y0;
    
    // Perform bilinear interpolation
    let h0 = mix(h00, h10, fx); // Interpolate along x for y=y0
    let h1 = mix(h01, h11, fx); // Interpolate along x for y=y1
    let height = mix(h0, h1, fy); // Interpolate along y
    
    return height;
}