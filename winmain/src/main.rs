use gamelib::app;


// Now that I've typed all this out I'm not sure if this is the right way to do multiplatform with bevy, 
// but there's probably a benefit to having slightly different codepaths since desktop and wasm are so different.
// More importantly, I've already typed it all out and I'm too lazy to untangle it
fn main() {
    app();
}
