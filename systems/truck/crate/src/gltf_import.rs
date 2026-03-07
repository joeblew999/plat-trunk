use monstertruck_meshing::prelude::*;
use monstertruck_modeling::{Point3, Vector3, Vector2, Matrix4, cgmath};
use monstertruck_mesh::{PolygonMesh, Faces, Attributes}; 

/// Parse GLTF/GLB bytes and return a list of PolygonMesh objects with their world transforms.
pub fn parse_gltf(data: &[u8]) -> Vec<(PolygonMesh, Matrix4)> {
    let mut meshes = Vec::new();
    
    // Parse the glTF
    let (doc, buffers, _) = match gltf::import_slice(data) {
        Ok(res) => res,
        Err(e) => {
            eprintln!("Failed to parse GLTF: {}", e);
            return Vec::new();
        }
    };

    for scene in doc.scenes() {
        for node in scene.nodes() {
            process_node(&node, &buffers, &Matrix4::identity(), &mut meshes);
        }
    }

    meshes
}

fn process_node(
    node: &gltf::Node, 
    buffers: &[gltf::buffer::Data], 
    parent_transform: &Matrix4,
    meshes: &mut Vec<(PolygonMesh, Matrix4)>
) {
    // Compute local transform
    let (t, r, s) = node.transform().decomposed();
    // cgmath::Matrix4::from_translation takes Vector3
    let translation = Matrix4::from_translation(cgmath::Vector3::new(t[0] as f64, t[1] as f64, t[2] as f64));
    
    let q = cgmath::Quaternion::new(r[3] as f64, r[0] as f64, r[1] as f64, r[2] as f64);
    let rotation: Matrix4 = q.into();
    
    // cgmath::Matrix4::from_nonuniform_scale takes x, y, z
    let scale = Matrix4::from_nonuniform_scale(s[0] as f64, s[1] as f64, s[2] as f64);
    
    let transform = parent_transform * translation * rotation * scale;

    if let Some(mesh) = node.mesh() {
        for primitive in mesh.primitives() {
            let reader = primitive.reader(|buffer| Some(&buffers[buffer.index()]));
            
            let mut positions = Vec::new();
            if let Some(iter) = reader.read_positions() {
                for p in iter {
                    positions.push(Point3::new(p[0] as f64, p[1] as f64, p[2] as f64));
                }
            }

            let mut indices = Vec::new();
            if let Some(iter) = reader.read_indices() {
                match iter {
                    gltf::mesh::util::ReadIndices::U8(i) => indices.extend(i.map(|x| x as usize)),
                    gltf::mesh::util::ReadIndices::U16(i) => indices.extend(i.map(|x| x as usize)),
                    gltf::mesh::util::ReadIndices::U32(i) => indices.extend(i.map(|x| x as usize)),
                }
            }

            // If no indices, assume sequential triangles
            if indices.is_empty() {
                for i in 0..positions.len() {
                    indices.push(i);
                }
            }

            let mut faces_vec = Vec::new();
            for chunk in indices.chunks(3) {
                if chunk.len() == 3 {
                    faces_vec.push([chunk[0], chunk[1], chunk[2]]);
                }
            }
            let faces = Faces::from_iter(faces_vec);

            // Normals (optional)
            let mut normals = Vec::new();
            if let Some(iter) = reader.read_normals() {
                normals = iter.map(|n| Vector3::new(n[0] as f64, n[1] as f64, n[2] as f64)).collect();
            }

            // UVs (optional)
            let uvs = vec![Vector2::new(0.0, 0.0); positions.len()];

            let attributes = (positions, uvs, normals);
            let polygon_mesh = PolygonMesh::new(attributes, faces);

            meshes.push((polygon_mesh, transform));
        }
    }

    for child in node.children() {
        process_node(&child, buffers, &transform, meshes);
    }
}
