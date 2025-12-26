fn frag_main(
    vNormal: vec3f) -> vec4f {

    //var texPos = uv;
    //var texCoord = vec2u(u32(texPos.x * worldWidth), u32(texPos.y * worldWidth));
    //var height = textureLoad(readTex, texCoord);

    let shade = round(vNormal.y - 0.1) + 0.3;

    return vec4f(shade, shade, shade, 1);
}