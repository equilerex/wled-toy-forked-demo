mod bridge;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .manage(bridge::Bridges::default())
        .invoke_handler(tauri::generate_handler![
            bridge::bridge_open,
            bridge::bridge_config,
            bridge::bridge_frame,
            bridge::bridge_close
        ])
        .run(tauri::generate_context!())
        .expect("error while running WLEDtoy");
}
