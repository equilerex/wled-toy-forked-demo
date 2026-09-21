fn main() {
    // listing the commands makes each one a permission (allow-bridge-open, ...) that capabilities/default.json has to grant
    let manifest = tauri_build::AppManifest::new().commands(&[
        "bridge_open",
        "bridge_config",
        "bridge_frame",
        "bridge_close",
    ]);
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(manifest))
        .expect("failed to run tauri-build");
}
