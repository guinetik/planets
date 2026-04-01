"""
Normalize all GLB models in public/models/ to:
  1. Centered at origin (body only, excluding rings)
  2. Scaled so the planet BODY bounding sphere radius = 1.0
     (rings extend beyond 1.0 and that is intentional)

Usage: python scripts/normalize_models.py
"""

import os
import sys
import numpy as np
import trimesh


MODELS_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'models')

# Node names that are rings — excluded from body bounds calculation
RING_NODE_NAMES = {'ring', 'pierscien'}


def is_ring_node(name: str) -> bool:
    return name.strip().lower() in RING_NODE_NAMES


def get_scene_bounds(scene, exclude_rings=False):
    """Compute bounding box from all geometry in scene, optionally excluding ring nodes."""
    all_min = np.array([np.inf, np.inf, np.inf])
    all_max = np.array([-np.inf, -np.inf, -np.inf])

    for name, geom in scene.geometry.items():
        if not hasattr(geom, 'vertices') or len(geom.vertices) == 0:
            continue

        if exclude_rings:
            # Check if this geometry belongs to a ring node
            try:
                keys = [k for k in scene.graph.nodes_geometry
                        if scene.graph[k][1] == name]
                if keys and any(is_ring_node(k) for k in keys):
                    continue
            except Exception:
                pass

        # Get the transform for this geometry node
        try:
            keys = [k for k in scene.graph.nodes_geometry
                    if scene.graph[k][1] == name]
            if keys:
                transform = scene.graph[keys[0]][0]
            else:
                transform = np.eye(4)
        except Exception:
            transform = np.eye(4)

        verts = np.array(geom.vertices)
        ones = np.ones((verts.shape[0], 1))
        verts_h = np.hstack([verts, ones])
        transformed = (transform @ verts_h.T).T[:, :3]

        all_min = np.minimum(all_min, transformed.min(axis=0))
        all_max = np.maximum(all_max, transformed.max(axis=0))

    return all_min, all_max


def normalize_glb(filepath: str) -> None:
    name = os.path.basename(filepath)
    print(f"  {name}...", end=" ", flush=True)

    scene = trimesh.load(filepath, force="scene")

    if not isinstance(scene, trimesh.Scene) or len(scene.geometry) == 0:
        print("SKIP (no geometry)")
        return

    # Use body-only bounds (exclude rings) for centering and scaling
    bmin, bmax = get_scene_bounds(scene, exclude_rings=True)

    if np.any(np.isinf(bmin)):
        # Fallback to full bounds if body-only returned nothing
        bmin, bmax = get_scene_bounds(scene, exclude_rings=False)

    if np.any(np.isinf(bmin)):
        print("SKIP (empty bounds)")
        return

    center = (bmin + bmax) / 2.0
    extents = bmax - bmin
    max_extent = np.max(extents)

    if max_extent < 1e-10:
        print("SKIP (degenerate)")
        return

    scale_factor = 2.0 / max_extent

    print(f"center=[{center[0]:.2f}, {center[1]:.2f}, {center[2]:.2f}] "
          f"extent={max_extent:.2f} scale={scale_factor:.4f}...", end=" ", flush=True)

    # Build combined transform: scale * translate_to_center
    T = trimesh.transformations.translation_matrix(-center)
    S = np.eye(4)
    S[0, 0] = S[1, 1] = S[2, 2] = scale_factor
    combined = S @ T

    scene.apply_transform(combined)

    # Verify body bounds
    new_min, new_max = get_scene_bounds(scene, exclude_rings=True)
    if np.any(np.isinf(new_min)):
        new_min, new_max = get_scene_bounds(scene, exclude_rings=False)
    new_extent = np.max(new_max - new_min)
    new_center = (new_min + new_max) / 2.0
    print(f"-> extent={new_extent:.3f} center=[{new_center[0]:.3f}, {new_center[1]:.3f}, {new_center[2]:.3f}]  OK")

    scene.export(filepath, file_type="glb")


def main():
    models_dir = os.path.normpath(MODELS_DIR)
    print(f"Normalizing GLB models in: {models_dir}\n")

    glb_files = sorted(f for f in os.listdir(models_dir) if f.endswith('.glb'))
    if not glb_files:
        print("No .glb files found!")
        sys.exit(1)

    print(f"Found {len(glb_files)} models:\n")

    for filename in glb_files:
        filepath = os.path.join(models_dir, filename)
        try:
            normalize_glb(filepath)
        except Exception as e:
            print(f"ERROR: {e}")

    print("\nDone.")


if __name__ == "__main__":
    main()
