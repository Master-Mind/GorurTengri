fn genTerrainMesh( writeBuff: ptr<storage, array<vec4f>, read_write>, 
    idxBuff: ptr<storage, array<u32>, read_write>, 
    index: u32, 
    worldWidth: u32,
    samplesPerMeter: f32) -> void {
    let buffWidth = u32(f32(worldWidth) * samplesPerMeter);
    let x = index % buffWidth;
    let y = index / buffWidth;

    writeBuff[index] = vec4f(f32(x) / samplesPerMeter, 
        0, 
        f32(y) / samplesPerMeter,
        1);
    
    // Don't generate quads for the last row/column (no vertices below/right)
    if (x >= buffWidth - 1 || y >= buffWidth - 1) {
        return;
    }
    
    let top_left_idx = x + buffWidth * y;
    let bottom_left_idx = x + buffWidth * (y + 1);
    let top_right_idx = x + 1 + buffWidth * y;
    let bottom_right_idx = x + 1 + buffWidth * (y + 1);

    let idxidx = index * 6;

    //triangle 1
    idxBuff[idxidx] = top_left_idx;
    idxBuff[idxidx + 1] = bottom_left_idx;
    idxBuff[idxidx + 2] = top_right_idx;

    //triangle 2
    idxBuff[idxidx + 3] = top_right_idx;
    idxBuff[idxidx + 4] = bottom_left_idx;
    idxBuff[idxidx + 5] = bottom_right_idx;
}