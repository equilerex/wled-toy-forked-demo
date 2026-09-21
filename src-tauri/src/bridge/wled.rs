use std::time::Duration;

use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct Info {
    #[serde(default)]
    pub name: String,
    #[serde(rename = "ver")]
    pub version: String,
    pub leds: Leds,
}

#[derive(Debug, Deserialize)]
pub struct Leds {
    pub count: u32,
    pub fps: Option<f64>,
}

pub struct Client {
    agent: ureq::Agent,
    url: String,
}

impl Client {
    pub fn new(host: &str) -> Self {
        // 5 seconds is what wled-client, the Node bridge's HTTP client, allows
        let agent = ureq::Agent::config_builder()
            .timeout_global(Some(Duration::from_secs(5)))
            .build()
            .into();
        Self {
            agent,
            url: format!("http://{host}/json/info"),
        }
    }

    pub fn info(&self) -> Result<Info, String> {
        let info: Info = self
            .agent
            .get(&self.url)
            .call()
            .and_then(|mut response| response.body_mut().read_json())
            .map_err(|e| e.to_string())?;
        if info.version.is_empty() {
            return Err("no device info returned".into());
        }
        Ok(info)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{Read, Write};
    use std::net::TcpListener;

    fn serve_once(response: &'static str) -> String {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let host = listener.local_addr().unwrap().to_string();
        std::thread::spawn(move || {
            let (mut stream, _) = listener.accept().unwrap();
            let mut request = [0u8; 1024];
            let read = stream.read(&mut request).unwrap();
            assert!(request[..read].starts_with(b"GET /json/info HTTP/1.1\r\n"));
            stream.write_all(response.as_bytes()).unwrap();
        });
        host
    }

    #[test]
    fn reads_the_fields_the_app_shows_from_json_info() {
        let body = r#"{"ver":"0.15.0","vid":2412100,"leds":{"count":144,"pwr":312,"fps":41,"maxpwr":850},"name":"Shelf","udpport":21324}"#;
        let host = serve_once(Box::leak(format!("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}", body.len()).into_boxed_str()));
        let info = Client::new(&host).info().unwrap();
        assert_eq!(
            (
                info.name.as_str(),
                info.version.as_str(),
                info.leds.count,
                info.leds.fps
            ),
            ("Shelf", "0.15.0", 144, Some(41.0))
        );
    }

    #[test]
    fn a_reply_without_a_version_or_with_an_error_status_is_a_failure() {
        let host = serve_once("HTTP/1.1 200 OK\r\nContent-Length: 22\r\nConnection: close\r\n\r\n{\"leds\":{\"count\":10}}\n");
        assert!(Client::new(&host).info().is_err());
        let host =
            serve_once("HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n");
        assert!(Client::new(&host).info().is_err());
    }
}
