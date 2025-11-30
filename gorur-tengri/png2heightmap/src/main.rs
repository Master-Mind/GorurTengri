use std::fs::{File, OpenOptions};
use std::io;
use std::io::{Read, Write};
use argh::FromArgs;
use image::{save_buffer_with_format, EncodableLayout, ExtendedColorType, ImageReader};
use xz2::read::{XzDecoder, XzEncoder};

#[derive(FromArgs)]
/// Converts the 16 bit pngs from the unreal heightmap tool (https://manticorp.github.io/unrealheightmap/index.html)
/// to a heightmap my webapp can use
/// Made in rust because it's fast and I'm trying to practice it more
struct PNG2Heightmap {
    /// input png
    #[argh(option)]
    input: String,

    /// output r32.xz
    #[argh(option, default = "String::from(\"../src/data/large/textures\")")]
    outputdir: String,

    /// whether to output an uncompressed stream
    #[argh(switch, short='u')]
    uncompressed: bool
}
fn main() {
    let args: PNG2Heightmap = argh::from_env();

    let image = match ImageReader::open(args.input.clone()) {
        Ok(image) => image,
        Err(e) => panic!("Couldn't read input file, {e}")
    };

    let decoded = match image.decode() {
        Ok(decoded) => decoded,
        Err(e) => panic!("Couldn't decode {0}: {e}", args.input.clone())
    };

    let mut luma = decoded.to_luma32f();

    if (args.uncompressed) {
        let mut outFile: File = OpenOptions::new().write(true).create(true).open(args.outputdir + "/output_test.r32").unwrap();

        println!("Wrote {0}x{1} image as {2} bytes", luma.width(), luma.height(), luma.as_bytes().len());
        outFile.write(luma.as_bytes()).unwrap();
    }
    else {
        let mut compressed = XzEncoder::new(luma.as_bytes(), 6);
        let mut outFile: File = OpenOptions::new().write(true).create(true).open(args.outputdir + "/output.r32.xz").unwrap();

        println!("Wrote {0} bytes", compressed.total_out());
        io::copy(&mut compressed, &mut outFile).unwrap();
        println!("Wrote {0} bytes", compressed.total_out());
    }
}
