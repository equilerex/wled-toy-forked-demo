use serde::Deserialize;

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Protocol {
    #[default]
    Ddp,
    Dnrgb,
    Artnet,
    Sacn,
}

impl Protocol {
    pub fn parse(name: &str) -> Self {
        match name {
            "dnrgb" => Self::Dnrgb,
            "artnet" => Self::Artnet,
            "sacn" => Self::Sacn,
            _ => Self::Ddp,
        }
    }

    pub fn name(self) -> &'static str {
        match self {
            Self::Ddp => "ddp",
            Self::Dnrgb => "dnrgb",
            Self::Artnet => "artnet",
            Self::Sacn => "sacn",
        }
    }

    pub fn port(self) -> u16 {
        match self {
            Self::Ddp => 4048,
            Self::Dnrgb => 21324,
            Self::Artnet => 6454,
            Self::Sacn => 5568,
        }
    }
}

// a DMX universe has 512 slots; whole RGB pixels fill 510 of them
const DMX_BYTES: usize = 170 * 3;

pub fn build_ddp(rgb: &[u8], seq: u8) -> Vec<Vec<u8>> {
    let chunks = rgb.chunks(480 * 3);
    let last = chunks.len().saturating_sub(1);
    chunks
        .enumerate()
        .map(|(i, data)| {
            let mut pkt = Vec::with_capacity(10 + data.len());
            // version 1, push flag only on the final packet so WLED shows the frame once complete
            pkt.push(0x40 | u8::from(i == last));
            pkt.extend([seq & 0x0f, 0x01, 0x01]);
            pkt.extend(((i * 480 * 3) as u32).to_be_bytes());
            pkt.extend((data.len() as u16).to_be_bytes());
            pkt.extend(data);
            pkt
        })
        .collect()
}

pub fn build_dnrgb(rgb: &[u8]) -> Vec<Vec<u8>> {
    rgb.chunks(489 * 3)
        .enumerate()
        .map(|(i, data)| {
            let mut pkt = Vec::with_capacity(4 + data.len());
            // protocol 4 (DNRGB), then the seconds WLED waits before it returns to its own effect
            pkt.extend([4, 2]);
            pkt.extend(((i * 489) as u16).to_be_bytes());
            pkt.extend(data);
            pkt
        })
        .collect()
}

/// One ArtDmx packet per universe of 170 pixels, counting up from `universe` (a 15-bit port address).
pub fn build_artnet(rgb: &[u8], seq: u32, universe: u16) -> Vec<Vec<u8>> {
    rgb.chunks(DMX_BYTES)
        .enumerate()
        .map(|(i, data)| {
            let u = universe as usize + i;
            // DMX lengths are even
            let length = data.len() + data.len() % 2;
            let mut pkt = Vec::with_capacity(18 + length);
            pkt.extend(b"Art-Net\0");
            pkt.extend(0x5000u16.to_le_bytes());
            pkt.extend(14u16.to_be_bytes());
            // 0 would tell the receiver to ignore ordering
            pkt.push((seq % 255) as u8 + 1);
            pkt.push(0);
            pkt.push(u as u8);
            pkt.push((u >> 8) as u8 & 0x7f);
            pkt.extend((length as u16).to_be_bytes());
            pkt.extend(data);
            pkt.resize(18 + length, 0);
            pkt
        })
        .collect()
}

/// One E1.31 (streaming ACN) data packet per universe of 170 pixels. Universes start at 1. `cid` identifies this sender.
pub fn build_sacn(rgb: &[u8], seq: u32, universe: u16, cid: &[u8; 16]) -> Vec<Vec<u8>> {
    rgb.chunks(DMX_BYTES)
        .enumerate()
        .map(|(i, data)| {
            let total = 126 + data.len();
            let flags_and_length = |from: usize| (0x7000 | (total - from) as u16).to_be_bytes();
            let mut pkt = vec![0u8; total];
            // root layer
            pkt[0..2].copy_from_slice(&0x0010u16.to_be_bytes());
            pkt[4..13].copy_from_slice(b"ASC-E1.17");
            pkt[16..18].copy_from_slice(&flags_and_length(16));
            pkt[18..22].copy_from_slice(&4u32.to_be_bytes());
            pkt[22..38].copy_from_slice(cid);
            // framing layer
            pkt[38..40].copy_from_slice(&flags_and_length(38));
            pkt[40..44].copy_from_slice(&2u32.to_be_bytes());
            pkt[44..51].copy_from_slice(b"WLEDtoy");
            pkt[108] = 100;
            pkt[111] = seq as u8;
            pkt[113..115].copy_from_slice(&((universe.max(1) as usize + i) as u16).to_be_bytes());
            // DMP layer
            pkt[115..117].copy_from_slice(&flags_and_length(115));
            pkt[117] = 0x02;
            pkt[118] = 0xa1;
            pkt[121..123].copy_from_slice(&1u16.to_be_bytes());
            pkt[123..125].copy_from_slice(&(data.len() as u16 + 1).to_be_bytes());
            // pkt[125] is the DMX start code, 0 for dimmer data
            pkt[126..].copy_from_slice(data);
            pkt
        })
        .collect()
}

/// The UDP packets of one frame. `seq` is the per-connection frame counter that `next_seq` advances; each protocol folds it into its own sequence field.
pub fn build_frame(
    protocol: Protocol,
    rgb: &[u8],
    seq: u32,
    universe: u16,
    cid: &[u8; 16],
) -> Vec<Vec<u8>> {
    match protocol {
        Protocol::Ddp => build_ddp(rgb, (seq % 15) as u8 + 1),
        Protocol::Dnrgb => build_dnrgb(rgb),
        Protocol::Artnet => build_artnet(rgb, seq, universe),
        Protocol::Sacn => build_sacn(rgb, seq, universe, cid),
    }
}

// 3825 = 15 * 255: the DDP and Art-Net sequence fields both wrap cleanly here
pub fn next_seq(seq: u32) -> u32 {
    (seq + 1) % 3825
}

#[cfg(test)]
mod tests {
    use super::*;

    // the fixtures are built by the Node bridge: see bridge.fixtures.ts at the repository root
    macro_rules! golden {
        ($name:literal) => {
            unframe(include_bytes!(concat!(
                "../../tests/fixtures/",
                $name,
                ".bin"
            )))
        };
    }

    fn unframe(mut bytes: &[u8]) -> Vec<Vec<u8>> {
        let mut packets = Vec::new();
        while !bytes.is_empty() {
            let (length, rest) = bytes.split_at(4);
            let (packet, rest) =
                rest.split_at(u32::from_be_bytes(length.try_into().unwrap()) as usize);
            packets.push(packet.to_vec());
            bytes = rest;
        }
        packets
    }

    fn pixels(count: usize) -> Vec<u8> {
        (0..count * 3).map(|i| ((i * 7 + 3) % 256) as u8).collect()
    }

    const CID: [u8; 16] = [
        0xa0, 0xa1, 0xa2, 0xa3, 0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xab, 0xac, 0xad, 0xae,
        0xaf,
    ];

    #[test]
    fn ddp_chunks_at_480_pixels_and_pushes_with_the_last_packet_only() {
        let packets = build_ddp(&pixels(1200), 1);
        assert_eq!(packets, golden!("ddp_1200px"));
        assert_eq!(
            packets.iter().map(|p| p[0]).collect::<Vec<_>>(),
            [0x40, 0x40, 0x41]
        );
        assert_eq!(packets[2][4..8], 2880u32.to_be_bytes());

        assert_eq!(build_ddp(&pixels(500), 3), golden!("ddp_500px"));
    }

    #[test]
    fn ddp_frame_that_fills_its_last_packet_still_pushes() {
        let packets = build_ddp(&pixels(960), 15);
        assert_eq!(packets, golden!("ddp_960px"));
        assert_eq!(packets.len(), 2);
        assert_eq!(packets[1][0], 0x41);
    }

    #[test]
    fn dnrgb_addresses_each_packet_by_its_first_led() {
        let packets = build_dnrgb(&pixels(1000));
        assert_eq!(packets, golden!("dnrgb_1000px"));
        let starts: Vec<u16> = packets
            .iter()
            .map(|p| u16::from_be_bytes([p[2], p[3]]))
            .collect();
        assert_eq!(starts, [0, 489, 978]);
    }

    #[test]
    fn artnet_spans_universes_and_pads_odd_lengths() {
        assert_eq!(
            build_artnet(&pixels(400), 7, 300),
            golden!("artnet_400px_u300")
        );

        let across_the_low_byte = build_artnet(&pixels(171), 254, 255);
        assert_eq!(across_the_low_byte, golden!("artnet_171px_u255"));
        assert_eq!(across_the_low_byte[1][14..18], [0x00, 0x01, 0x00, 0x04]);
        assert_eq!(across_the_low_byte[1].len(), 18 + 4);

        assert_eq!(
            build_artnet(&pixels(341), 255, 32767),
            golden!("artnet_341px_u32767")
        );
    }

    #[test]
    fn sacn_spans_universes_starting_at_one() {
        let packets = build_sacn(&pixels(400), 300, 0, &CID);
        assert_eq!(packets, golden!("sacn_400px_u0"));
        let universes: Vec<u16> = packets
            .iter()
            .map(|p| u16::from_be_bytes([p[113], p[114]]))
            .collect();
        assert_eq!(universes, [1, 2, 3]);

        assert_eq!(
            build_sacn(&pixels(171), 255, 255, &CID),
            golden!("sacn_171px_u255")
        );
    }

    #[test]
    fn an_empty_frame_has_no_packets() {
        for protocol in [
            Protocol::Ddp,
            Protocol::Dnrgb,
            Protocol::Artnet,
            Protocol::Sacn,
        ] {
            assert!(build_frame(protocol, &[], 1, 0, &CID).is_empty());
        }
    }

    fn sequence(protocol: Protocol) -> Vec<Vec<u8>> {
        let mut packets = Vec::new();
        let mut seq = 1;
        for frame in 0..=3825u32 {
            if [0, 13, 14, 15, 253, 254, 255, 256, 3823, 3824, 3825].contains(&frame) {
                packets.extend(build_frame(
                    protocol,
                    &[frame as u8, 1, 2, 3, 4, 5],
                    seq,
                    4,
                    &CID,
                ));
            }
            seq = next_seq(seq);
        }
        packets
    }

    #[test]
    fn sequence_numbers_wrap_like_the_node_bridge() {
        assert_eq!(sequence(Protocol::Ddp), golden!("sequence_ddp"));
        assert_eq!(sequence(Protocol::Dnrgb), golden!("sequence_dnrgb"));
        assert_eq!(sequence(Protocol::Artnet), golden!("sequence_artnet"));
        assert_eq!(sequence(Protocol::Sacn), golden!("sequence_sacn"));

        let ddp: Vec<u8> = sequence(Protocol::Ddp).iter().map(|p| p[1]).collect();
        assert_eq!(ddp[..4], [2, 15, 1, 2]);
        let artnet: Vec<u8> = sequence(Protocol::Artnet).iter().map(|p| p[12]).collect();
        assert_eq!(artnet[4..8], [255, 1, 2, 3]);
        assert_eq!(artnet[8..], [255, 1, 2]);
    }
}
