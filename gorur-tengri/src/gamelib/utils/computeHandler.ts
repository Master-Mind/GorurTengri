export async function InitCompute() {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) { console.error("No GPU adapter found"); return; }
    const device = await adapter.requestDevice({});
    if (!device) { console.error("Failed to get GPU device"); return; }

    const workgroupSize = 256;
    const dispatchCount = 512; // total invocations = workgroupSize * dispatchCount
    const totalInvocations = workgroupSize * dispatchCount;
    const outBufferSize = totalInvocations * Uint32Array.BYTES_PER_ELEMENT;

    // storage buffer the shader will write into, and a host-readable buffer to copy results to
    const resultBuffer = device.createBuffer({
        size: outBufferSize,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    const readbackBuffer = device.createBuffer({
        size: outBufferSize,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });

    const shaderCode = `
@group(0) @binding(0) var<storage, read_write> outBuf: array<u32>;

@compute @workgroup_size(${workgroupSize})
fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
  let idx = gid.x;
  // perform a lot of integer operations to keep the shader busy for several seconds
  var v : u32 = idx + 1u;
  let ITER : u32 = 40000000u;
  var i : u32 = 0u;
  loop {
    if (i >= ITER) { break; }
    // simple LCG-style ops; cheap but many iterations
    v = v * 1664525u + 1013904223u;
    i = i + 1u;
  }
  outBuf[idx] = v;
}
`;

    const module = device.createShaderModule({ code: shaderCode });
    const pipeline = device.createComputePipeline({
        compute: {
            module: module,
            entryPoint: "main"
        },
        layout: "auto"
    });

    const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: resultBuffer } }],
    });

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(dispatchCount);
    pass.end();

    // copy results to a mappable buffer so mapAsync will wait for GPU completion
    encoder.copyBufferToBuffer(resultBuffer, 0, readbackBuffer, 0, outBufferSize);

    const start = performance.now();
    device.queue.submit([encoder.finish()]);

    await readbackBuffer.mapAsync(GPUMapMode.READ);
    const end = performance.now();

    const copyArray = new Uint32Array(readbackBuffer.getMappedRange().slice(0));
    readbackBuffer.unmap();

    console.log(`Got a new device: ${device}`);
    console.log(`Compute shader completed in ${(end - start).toFixed(2)} ms. Sample output[0]=${copyArray[0]}`);
}