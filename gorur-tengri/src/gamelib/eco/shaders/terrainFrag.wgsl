fn frag_main(
    vNormal: vec3f) -> vec4f {

    //var texPos = uv;
    //var texCoord = vec2u(u32(texPos.x * worldWidth), u32(texPos.y * worldWidth));
    //var height = textureLoad(readTex, texCoord);

    return vec4f(vNormal, 1);
}