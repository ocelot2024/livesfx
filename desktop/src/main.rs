use axum::extract::State;
use axum::{
    Router,
    body::Body,
    extract::Path,
    http::{StatusCode, header},
    response::{IntoResponse, Response},
    routing::{get, post},
};
use include_dir::{Dir, include_dir};
use mime_guess::from_path;
use std::sync::{Arc, Mutex};
use tokio::sync::oneshot;
type ShutdownTx = Arc<Mutex<Option<oneshot::Sender<()>>>>;

static DIST: Dir<'_> = include_dir!("$CARGO_MANIFEST_DIR/dist");
#[tokio::main]
async fn main() {
    let (shutdown_tx, shutdown_rx) = oneshot::channel::<()>();
    let app = Router::new()
        .route("/", get(index))
        .route("/shutdown", post(shutdown))
        .route("/{*path}", get(asset))
        .with_state(std::sync::Arc::new(std::sync::Mutex::new(Some(
            shutdown_tx,
        ))));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    let url = format!("http://{}", addr);

    let _ = webbrowser::open(&url);
    println!("Listening on {}", url);
    axum::serve(listener, app)
        .with_graceful_shutdown(async {
            let _ = shutdown_rx.await;
        })
        .await
        .unwrap();
}

async fn index() -> impl IntoResponse {
    serve_file("index.html")
}
async fn shutdown(State(tx): State<ShutdownTx>) -> &'static str {
    let tx = tx.clone();

    tokio::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_secs(3)).await;

        if let Some(tx) = tx.lock().unwrap().take() {
            let _ = tx.send(());
        }
    });

    "shutting down"
}
async fn asset(Path(path): Path<String>) -> impl IntoResponse {
    serve_file(&path)
}

fn serve_file(path: &str) -> Response {
    match DIST.get_file(path) {
        Some(file) => {
            let mime = from_path(path).first_or_octet_stream();

            Response::builder()
                .status(StatusCode::OK)
                .header(header::CONTENT_TYPE, mime.as_ref())
                .body(Body::from(file.contents()))
                .unwrap()
        }
        None => {
            if let Some(index) = DIST.get_file("index.html") {
                Response::builder()
                    .status(StatusCode::OK)
                    .header(header::CONTENT_TYPE, "text/html")
                    .body(Body::from(index.contents()))
                    .unwrap()
            } else {
                Response::builder()
                    .status(StatusCode::NOT_FOUND)
                    .body(Body::from("404"))
                    .unwrap()
            }
        }
    }
}
