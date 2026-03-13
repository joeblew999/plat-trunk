//! observe-tauri — desktop + mobile shell for lib/observe demos.
//!
//! Desktop: opens demo1 (:3333) and demo2 (:3334) side-by-side, runs bun workers locally.
//! Mobile:  opens demo1 as a single window, pointing at OBSERVE_BASE_URL (deployed CF worker).

mod commands;

use commands::Workers;
use std::collections::HashMap;
use std::sync::Mutex;
use tauri_specta::{collect_commands, Builder};

pub fn run() {
    let builder = Builder::<tauri::Wry>::new().commands(collect_commands![
        commands::list_workers,
        commands::start_worker,
        commands::stop_worker,
        commands::ping_worker,
        commands::native_scrub,
        commands::native_sample,
        commands::native_version,
    ]);

    // Generate TypeScript bindings at dev-build time
    #[cfg(debug_assertions)]
    builder
        .export(
            specta_typescript::Typescript::default(),
            "../src/bindings.ts",
        )
        .expect("failed to generate bindings.ts");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(Workers(Mutex::new(HashMap::new())))
        .invoke_handler(builder.invoke_handler())
        .setup(|app| {
            let base = commands::base_url();

            #[cfg(desktop)]
            {
                // Two side-by-side windows — demo1 left, demo2 right
                tauri::WebviewWindowBuilder::new(
                    app,
                    "demo1",
                    tauri::WebviewUrl::External(
                        format!("{}:3333", base).parse().unwrap(),
                    ),
                )
                .title("lib/observe — demo1")
                .inner_size(960.0, 700.0)
                .build()?;

                tauri::WebviewWindowBuilder::new(
                    app,
                    "demo2",
                    tauri::WebviewUrl::External(
                        format!("{}:3334", base).parse().unwrap(),
                    ),
                )
                .title("lib/observe — demo2")
                .inner_size(960.0, 700.0)
                .position(980.0, 0.0)
                .build()?;
            }

            #[cfg(mobile)]
            {
                // Single window on mobile — point at deployed CF worker
                tauri::WebviewWindowBuilder::new(
                    app,
                    "main",
                    tauri::WebviewUrl::External(
                        format!("{}:3333", base).parse().unwrap(),
                    ),
                )
                .title("observe")
                .build()?;
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
