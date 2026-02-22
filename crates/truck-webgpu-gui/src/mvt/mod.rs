//! Mapbox Vector Tile (MVT) parser and geometry builder.
//! Handles decoding of PBF tiles and conversion to truck B-Rep solids.

use geozero::mvt::{Tile, Message};
use geozero::{GeozeroDatasource, GeomProcessor, PropertyProcessor, ColumnValue};
use truck_modeling::{Point3, Vector3, Solid, builder};
use std::io::Cursor;

/// Represents a single tile coordinate (Z/X/Y)
#[derive(Debug, Clone, Copy)]
pub struct TileCoord {
    pub z: u8,
    pub x: u32,
    pub y: u32,
}

struct MvtBuilder {
    solids: Vec<Solid>,
    offset: Point3,
    // Temporary state for current polygon
    current_ring: Vec<Point3>,
    rings: Vec<Vec<Point3>>,
}

impl GeomProcessor for MvtBuilder {
    fn xy(&mut self, x: f64, y: f64, _idx: usize) -> geozero::error::Result<()> {
        self.current_ring.push(Point3::new(x, y, 0.0));
        Ok(())
    }

    fn polygon_begin(&mut self, _tagged: bool, _size: usize, _idx: usize) -> geozero::error::Result<()> {
        self.rings.clear();
        Ok(())
    }

    fn linestring_begin(&mut self, _tagged: bool, _size: usize, _idx: usize) -> geozero::error::Result<()> {
        self.current_ring.clear();
        Ok(())
    }

    fn linestring_end(&mut self, _tagged: bool, _idx: usize) -> geozero::error::Result<()> {
        if !self.current_ring.is_empty() {
            self.rings.push(self.current_ring.clone());
        }
        Ok(())
    }

    fn polygon_end(&mut self, _tagged: bool, _idx: usize) -> geozero::error::Result<()> {
        if self.rings.is_empty() { return Ok(()); }

        // Create a truck Solid via tsweep
        let mut outer_pts = self.rings[0].clone();
        // Reverse winding to fix backface culling
        outer_pts.reverse();

        if outer_pts.len() < 3 { return Ok(()); }
        
        // Remove duplicate last point if it exists
        if (outer_pts[0].x - outer_pts.last().unwrap().x).abs() < 1e-6 && 
           (outer_pts[0].y - outer_pts.last().unwrap().y).abs() < 1e-6 {
            outer_pts.pop();
        }
        
        if outer_pts.len() < 3 { return Ok(()); }
        
        // MVT scale: default is 1 unit = 1 meter for simplified modeling
        let scale = 1.0;
        let mut vertices = Vec::new();
        for p in &outer_pts {
            // Map MVT (x,y) to Truck (x, z) for a ground-plane footprint
            vertices.push(builder::vertex(Point3::new(
                p.x * scale + self.offset.x,
                self.offset.y, // Ground height
                p.y * scale + self.offset.z
            )));
        }
        
        let mut edges = Vec::new();
        for i in 0..vertices.len() {
            let v0 = &vertices[i];
            let v1 = &vertices[(i + 1) % vertices.len()];
            edges.push(builder::line(v0, v1));
        }
        
        let wire = truck_modeling::Wire::from(edges);
        if let Ok(face) = builder::try_attach_plane(&[wire]) {
            // Default extrusion height of 10 units (meters) along the Y axis
            let solid = builder::tsweep(&face, Vector3::new(0.0, 10.0, 0.0));
            self.solids.push(solid);
        }

        Ok(())
    }
}

impl PropertyProcessor for MvtBuilder {
    fn property(&mut self, _i: usize, _key: &str, _value: &ColumnValue) -> geozero::error::Result<bool> {
        Ok(false)
    }
}

impl geozero::FeatureProcessor for MvtBuilder {}

/// Parse an MVT byte buffer and return a list of extruded solids.
/// 
/// * `data`: Raw protobuf bytes of the .mvt/.pbf file.
/// * `offset`: The 3D world position where the tile's top-left corner should be placed.
pub fn parse_mvt_tile(data: &[u8], offset: Point3) -> Vec<Solid> {
    let mut builder = MvtBuilder { 
        solids: Vec::new(), 
        offset,
        current_ring: Vec::new(),
        rings: Vec::new(),
    };
    let mut reader = Cursor::new(data);
    
    if let Ok(tile) = Tile::decode(&mut reader) {
        for mut layer in tile.layers {
            // Process building-related layers
            if layer.name == "building" || layer.name == "buildings" || layer.name == "landuse" {
                let _ = layer.process(&mut builder);
            }
        }
    }
    
    builder.solids
}
