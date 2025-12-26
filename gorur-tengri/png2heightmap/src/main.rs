use std::fs::{File, OpenOptions};
use std::{io, thread};
use std::io::Write;
use argh::FromArgs;
use flate2::Compression;
use image::{EncodableLayout, ImageReader};
use flate2::write::GzEncoder;
use image::imageops::blur;

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

    let luma = decoded.to_luma32f();

    blur(&luma, 10.0);

    if args.uncompressed {
        let mut out_file: File = OpenOptions::new().write(true).create(true).open(args.outputdir + "/output_test.r32").unwrap();

        println!("Wrote {0}x{1} image as {2} bytes", luma.width(), luma.height(), luma.as_bytes().len());
        out_file.write(luma.as_bytes()).unwrap();
    }
    else {
        let len = luma.as_bytes().len();
        println!("Total buffer size: {0}", len);
        let compress_and_write = |start:usize, end:usize, suffix:&str|{
            let mut compressed = GzEncoder::new(Vec::new(), Compression::default());
            compressed.write_all(&luma.as_bytes()[start..end]).unwrap();
            let mut out_file: File = OpenOptions::new()
                .write(true)
                .create(true)
                .truncate(true)
                .open(args.outputdir.clone() + "/output_" + suffix + ".r32.gz")
                .unwrap();
            let data = compressed.finish().unwrap();
            out_file.write_all(&data).unwrap();
            println!("Wrote {0} bytes ({1} uncompressed)", data.len(), end - start);
        };
        thread::scope(|s| {

            s.spawn(|| {
                compress_and_write(0, len / 4, "0");
            });
            s.spawn(|| {
                compress_and_write(len / 4, len / 2, "1");
            });
            s.spawn(|| {
                compress_and_write(len / 2, 3 * len / 4, "2");
            });
            s.spawn(|| {
                compress_and_write(3 * len / 4, len, "3");
            });
        });
    }
}
