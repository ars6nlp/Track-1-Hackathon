import trimesh
import numpy as np
import argparse
import sys
import os

def generate_noise(input_path):
    print(f"Loading {input_path}...")
    try:
        mesh = trimesh.load(input_path, force='mesh')
    except Exception as e:
        print(f"Error loading mesh: {e}")
        return

    # Calculate bounding box diagonal for scale
    bbox_extents = mesh.bounds[1] - mesh.bounds[0]
    bbox_diagonal = np.linalg.norm(bbox_extents)
    
    print(f"Bounding box diagonal: {bbox_diagonal:.2f} mm")
    
    # 0.8% - 1.2% of bounding box
    amplitude_percent = np.random.uniform(0.008, 0.012)
    amplitude = bbox_diagonal * amplitude_percent
    print(f"Applying Gaussian noise with amplitude: {amplitude:.4f} mm ({amplitude_percent*100:.2f}%)")
    
    # Get vertex normals
    normals = mesh.vertex_normals
    
    # Gaussian noise multiplier for each vertex
    noise = np.random.normal(loc=0.0, scale=1.0, size=(len(mesh.vertices), 1))
    
    # Apply displacement: V_new = V_old + N * (noise * amplitude)
    mesh.vertices += normals * (noise * amplitude)
    
    # Save the file only as .ply
    base, _ = os.path.splitext(input_path)
    output_path = f"{base}_noisy.ply"
    print(f"Saving to {output_path}...")
    mesh.export(output_path, file_type='ply')
    print("Done!")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python generate_noise.py <path_to_stl>")
        sys.exit(1)
    generate_noise(sys.argv[1])
