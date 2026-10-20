#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;
use std::path::{Path, PathBuf};
use std::process::Command;

fn find_conf(profile: &str) -> Option<PathBuf> {
    let name = format!("{}.conf", profile);
    let dir = env::current_dir().ok()?;
    for p in [dir.join("vpn_configs").join(&name), dir.join("..").join("vpn_configs").join(&name)] {
        if p.exists() {
            return std::fs::canonicalize(p).ok();
        }
    }
    None
}

fn cleanup(wg: &str, profile: &str) {
    let svc = format!("AmneziaWGTunnel${}", profile);
    let _ = Command::new(wg).args(["/uninstalltunnelservice", profile]).output();
    let _ = Command::new("sc.exe").args(["stop", &svc]).output();
    let _ = Command::new("sc.exe").args(["delete", &svc]).output();
}

#[tauri::command]
fn toggle_vpn(profile: String, connect: bool) -> Result<String, String> {
    let wg = "C:\\Program Files\\AmneziaWG\\amneziawg.exe";
    if !Path::new(wg).exists() {
        return Err("AmneziaWG не найден в C:\\Program Files\\AmneziaWG".to_string());
    }
    if connect {
        let path = find_conf(&profile).ok_or("Файл .conf не найден в vpn_configs")?;
        cleanup(wg, &profile);
        let clean = path.to_string_lossy().replace("\\\\?\\", "");
        let out = Command::new(wg)
            .args(["/installtunnelservice", &clean])
            .output()
            .map_err(|e| e.to_string())?;
        if out.status.success() {
            Ok("Подключено".to_string())
        } else {
            cleanup(wg, &profile);
            Err(String::from_utf8_lossy(&out.stderr).to_string())
        }
    } else {
        cleanup(wg, &profile);
        Ok("Отключено".to_string())
    }
}

#[tauri::command]
fn launch_game(game: String) -> Result<String, String> {
    match game.as_str() {
        "Valorant" => {
            for d in ["C", "D", "E"] {
                let p = format!("{}:\\Riot Games\\Riot Client\\RiotClientServices.exe", d);
                if Path::new(&p).exists() {
                    Command::new(&p)
                        .args(["--launch-product=valorant", "--launch-patchline=live"])
                        .spawn()
                        .map_err(|e| e.to_string())?;
                    return Ok("Valorant запускается!".to_string());
                }
            }
            Err("Riot Client не найден на дисках C, D, E".to_string())
        }
        "Dota 2" => {
            let _ = Command::new("cmd").args(["/C", "start", "steam://rungameid/570"]).spawn();
            Ok("Запуск Dota 2...".to_string())
        }
        "Minecraft" => {
            let u = env::var("USERPROFILE").unwrap_or_default();
            for p in [
                "C:\\XboxGames\\Minecraft Launcher\\Content\\Minecraft.exe".to_string(),
                format!("{}\\AppData\\Roaming\\.minecraft\\TLauncher.exe", u),
            ] {
                if Path::new(&p).exists() {
                    let _ = Command::new(&p).spawn();
                    return Ok("Minecraft запущен!".to_string());
                }
            }
            Err("Лаунчер Minecraft не найден".to_string())
        }
        _ => Err("Неизвестная игра".to_string()),
    }
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // Создаем иконку в системном трее для десктопа
            #[cfg(desktop)]
            {
                use tauri::tray::TrayIconBuilder;
                
                TrayIconBuilder::new()
                    .icon(app.default_window_icon().unwrap().clone())
                    .tooltip("LagBreaker Pro")
                    .on_menu_event(|app, event| {
                        match event.id.as_ref() {
                            "quit" => {
                                app.exit(0);
                            }
                            _ => {}
                        }
                    })
                    .build(app)?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![toggle_vpn, launch_game])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}