use serde::Serialize;

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(untagged)]
pub enum OscArg {
    Int(i32),
    Float(f64),
    Text(String),
}

#[derive(Clone, Debug, PartialEq, Serialize)]
pub struct OscMessage {
    pub address: String,
    /// Numbers as they are; strings kept; true and false as 1 and 0.
    pub args: Vec<OscArg>,
}

/// Decodes an OSC 1.0 packet: one message, or a bundle of messages (bundles may nest). Unknown argument types end the message.
/// None for a truncated packet; an empty list for one that is not OSC.
pub fn parse_osc(packet: &[u8]) -> Option<Vec<OscMessage>> {
    // a bundle header is 16 bytes, so a UDP datagram cannot nest deeper than this without being hostile
    parse(packet, 32)
}

fn parse(packet: &[u8], depth: u8) -> Option<Vec<OscMessage>> {
    if packet.starts_with(b"#bundle\0") {
        let mut messages = Vec::new();
        // 8 bytes of tag, 8 of time tag, then size-prefixed elements
        let mut at = 16;
        while at + 4 <= packet.len() {
            let size = usize::try_from(i32::from_be_bytes(read(packet, at)?)).ok()?;
            let end = (at + 4 + size).min(packet.len());
            messages.extend(parse(&packet[at + 4..end], depth.checked_sub(1)?)?);
            at += 4 + size;
        }
        return Some(messages);
    }
    let (address, next) = read_string(packet, 0)?;
    if !address.starts_with('/') || packet.get(next) != Some(&b',') {
        return Some(Vec::new());
    }
    let (tags, mut at) = read_string(packet, next)?;
    let mut args = Vec::new();
    for tag in tags.chars().skip(1) {
        match tag {
            'i' => {
                args.push(OscArg::Int(i32::from_be_bytes(read(packet, at)?)));
                at += 4;
            }
            'f' => {
                args.push(OscArg::Float(f32::from_be_bytes(read(packet, at)?).into()));
                at += 4;
            }
            'd' => {
                args.push(OscArg::Float(f64::from_be_bytes(read(packet, at)?)));
                at += 8;
            }
            's' => {
                let (text, next) = read_string(packet, at)?;
                args.push(OscArg::Text(text));
                at = next;
            }
            'T' => args.push(OscArg::Int(1)),
            'F' => args.push(OscArg::Int(0)),
            _ => break,
        }
    }
    Some(vec![OscMessage { address, args }])
}

fn read<const N: usize>(packet: &[u8], at: usize) -> Option<[u8; N]> {
    packet.get(at..at + N)?.try_into().ok()
}

/// The string at `at` and the offset after its null padding to a multiple of 4.
fn read_string(packet: &[u8], at: usize) -> Option<(String, usize)> {
    let length = packet.get(at..)?.iter().position(|&b| b == 0)?;
    Some((
        String::from_utf8_lossy(&packet[at..at + length]).into_owned(),
        at + ((length + 4) & !3),
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn pad(text: &str) -> Vec<u8> {
        let mut bytes = text.as_bytes().to_vec();
        bytes.resize(text.len() + 4 - text.len() % 4, 0);
        bytes
    }

    fn message(address: &str, tags: &str, args: &[&[u8]]) -> Vec<u8> {
        [pad(address), pad(&format!(",{tags}")), args.concat()].concat()
    }

    fn bundle(elements: &[Vec<u8>]) -> Vec<u8> {
        let mut packet = [pad("#bundle"), vec![0; 8]].concat();
        for element in elements {
            packet.extend((element.len() as i32).to_be_bytes());
            packet.extend(element);
        }
        packet
    }

    #[test]
    fn reads_ints_floats_doubles_strings_and_booleans() {
        let packet = message(
            "/xy",
            "ifdsTFi",
            &[
                &3i32.to_be_bytes(),
                &0.5f32.to_be_bytes(),
                &(-2.25f64).to_be_bytes(),
                &pad("hello"),
                &(-7i32).to_be_bytes(),
            ],
        );
        let args = vec![
            OscArg::Int(3),
            OscArg::Float(0.5),
            OscArg::Float(-2.25),
            OscArg::Text("hello".into()),
            OscArg::Int(1),
            OscArg::Int(0),
            OscArg::Int(-7),
        ];
        assert_eq!(
            parse_osc(&packet),
            Some(vec![OscMessage {
                address: "/xy".into(),
                args
            }])
        );
    }

    #[test]
    fn an_unknown_tag_ends_the_arguments() {
        let packet = message("/a", "ibi", &[&1i32.to_be_bytes(), &2i32.to_be_bytes()]);
        assert_eq!(parse_osc(&packet).unwrap()[0].args, [OscArg::Int(1)]);
    }

    #[test]
    fn unpacks_nested_bundles() {
        let packet = bundle(&[
            message("/a", "f", &[&1f32.to_be_bytes()]),
            bundle(&[message("/b", "i", &[&2i32.to_be_bytes()])]),
        ]);
        let addresses: Vec<String> = parse_osc(&packet)
            .unwrap()
            .into_iter()
            .map(|m| m.address)
            .collect();
        assert_eq!(addresses, ["/a", "/b"]);
    }

    #[test]
    fn rejects_what_is_not_osc_and_what_is_cut_short() {
        assert_eq!(parse_osc(&pad("hello")), Some(Vec::new()));
        assert_eq!(parse_osc(b"/abc"), None);
        assert_eq!(parse_osc(&message("/a", "i", &[&[0, 0]])), None);
        let negative_element_size = [bundle(&[]), (-4i32).to_be_bytes().to_vec()].concat();
        assert_eq!(parse_osc(&negative_element_size), None);
    }

    #[test]
    fn serializes_like_the_node_bridge() {
        let message = OscMessage {
            address: "/a".into(),
            args: vec![OscArg::Int(1), OscArg::Float(0.5), OscArg::Text("x".into())],
        };
        assert_eq!(
            serde_json::to_string(&message).unwrap(),
            r#"{"address":"/a","args":[1,0.5,"x"]}"#
        );
    }
}
