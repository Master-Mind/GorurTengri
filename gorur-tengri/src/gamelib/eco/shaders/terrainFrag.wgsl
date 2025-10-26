fn frag_main(
    vNormal: vec3f) -> vec4f {

    //var texPos = uv;
    //var texCoord = vec2u(u32(texPos.x * worldWidth), u32(texPos.y * worldWidth));
    //var height = textureLoad(readTex, texCoord);

    if (vNormal.y > 0.8) {
        return vec4f(1, 1, 1, 1);
    }
    else {
        return vec4f(0.5, 0.5, 0.5, 1);
    }
}