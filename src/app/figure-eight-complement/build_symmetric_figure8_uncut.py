import numpy as np
import trimesh
from pathlib import Path

LAMBDA = 0.25
EPSILON = 0.16
RHO = 0.30
NU = 1024
NV = 160
TARGET_MAX_EXTENT = 100.0  # arbitrary uniform output scale


def centerline(t):
    A = EPSILON * np.sin(4.0 * t)
    u1 = LAMBDA * np.sin(t) - (1.0 - LAMBDA) * np.sin(3.0 * t)
    u2 = LAMBDA * np.cos(t) + (1.0 - LAMBDA) * np.cos(3.0 * t)
    u3 = 2.0 * np.sqrt(LAMBDA * (1.0 - LAMBDA)) * np.sin(2.0 * t)
    f = (1.0 - A * A) / (1.0 + A * A)
    return np.column_stack((f * u1, f * u2, f * u3, 2.0 * A / (1.0 + A * A)))


def periodic_tangents(p):
    d = np.roll(p, -1, axis=0) - np.roll(p, 1, axis=0)
    d -= np.sum(d * p, axis=1)[:, None] * p
    d /= np.linalg.norm(d, axis=1)[:, None]
    return d


def normal_frame(p):
    """Smooth orthonormal frame of the 2-plane normal to the curve inside S^3."""
    tau = periodic_tangents(p)
    axes = np.eye(4)

    # Initial normal.
    scores = []
    for a in axes:
        r = a - np.dot(a, p[0]) * p[0] - np.dot(a, tau[0]) * tau[0]
        scores.append(np.linalg.norm(r))
    n1 = axes[int(np.argmax(scores))]
    n1 = n1 - np.dot(n1, p[0]) * p[0] - np.dot(n1, tau[0]) * tau[0]
    n1 /= np.linalg.norm(n1)

    scores = []
    for a in axes:
        r = a - np.dot(a, p[0]) * p[0] - np.dot(a, tau[0]) * tau[0] - np.dot(a, n1) * n1
        scores.append(np.linalg.norm(r))
    n2 = axes[int(np.argmax(scores))]
    n2 = n2 - np.dot(n2, p[0]) * p[0] - np.dot(n2, tau[0]) * tau[0] - np.dot(n2, n1) * n1
    n2 /= np.linalg.norm(n2)

    N1 = np.empty_like(p)
    N2 = np.empty_like(p)
    N1[0], N2[0] = n1, n2

    # Discrete parallel transport by projection.
    for i in range(1, len(p)):
        v = N1[i - 1]
        v = v - np.dot(v, p[i]) * p[i] - np.dot(v, tau[i]) * tau[i]
        v /= np.linalg.norm(v)

        w = N2[i - 1]
        w = w - np.dot(w, p[i]) * p[i] - np.dot(w, tau[i]) * tau[i] - np.dot(w, v) * v
        w /= np.linalg.norm(w)
        N1[i], N2[i] = v, w

    # Measure closing holonomy and distribute it smoothly so the sampled mesh seam closes cleanly.
    v = N1[-1] - np.dot(N1[-1], p[0]) * p[0] - np.dot(N1[-1], tau[0]) * tau[0]
    v /= np.linalg.norm(v)
    phi = np.arctan2(np.dot(v, N2[0]), np.dot(v, N1[0]))

    for i in range(len(p)):
        a = -phi * i / len(p)
        c, s = np.cos(a), np.sin(a)
        v, w = N1[i].copy(), N2[i].copy()
        N1[i] = c * v + s * w
        N2[i] = -s * v + c * w

    return N1, N2


def stereographic_north(q):
    # North pole N=(0,0,0,1): S^3 -> R^3.
    return q[..., :3] / (1.0 - q[..., 3, None])


def build_mesh():
    t = np.linspace(0.0, 2.0 * np.pi, NU, endpoint=False)
    theta = np.linspace(0.0, 2.0 * np.pi, NV, endpoint=False)

    p = centerline(t)
    err = np.max(np.abs(np.sum(p * p, axis=1) - 1.0))
    if err > 1e-10:
        raise RuntimeError(f"centerline left S^3: max norm error {err}")

    n1, n2 = normal_frame(p)
    radial = (
        np.cos(theta)[None, :, None] * n1[:, None, :]
        + np.sin(theta)[None, :, None] * n2[:, None, :]
    )
    q = np.cos(RHO) * p[:, None, :] + np.sin(RHO) * radial

    # Every q is on S^3 by construction.
    qerr = np.max(np.abs(np.sum(q * q, axis=2) - 1.0))
    if qerr > 1e-9:
        raise RuntimeError(f"tube left S^3: max norm error {qerr}")

    xyz = stereographic_north(q)
    vertices = xyz.reshape(-1, 3)

    # Uniformly scale to a convenient 100-unit maximum extent and center it.
    mins, maxs = vertices.min(axis=0), vertices.max(axis=0)
    vertices -= (mins + maxs) / 2.0
    extent = np.ptp(vertices, axis=0).max()
    vertices *= TARGET_MAX_EXTENT / extent

    faces = np.empty((NU * NV * 2, 3), dtype=np.int64)
    k = 0
    for i in range(NU):
        ip = (i + 1) % NU
        for j in range(NV):
            jp = (j + 1) % NV
            a = i * NV + j
            b = ip * NV + j
            c = ip * NV + jp
            d = i * NV + jp
            faces[k] = (a, b, c); k += 1
            faces[k] = (a, c, d); k += 1

    mesh = trimesh.Trimesh(vertices=vertices, faces=faces, process=False)
    if mesh.volume < 0:
        mesh.invert()
    return mesh, err, qerr


if __name__ == '__main__':
    out = Path(__file__).resolve().parent / 'symmetric_figure8_uncut_rho0.30.obj'
    mesh, err, qerr = build_mesh()
    mesh.export(out)
    print(f'wrote {out}')
    print(f'vertices={len(mesh.vertices):,} faces={len(mesh.faces):,}')
    print(f'watertight={mesh.is_watertight} winding_consistent={mesh.is_winding_consistent} euler={mesh.euler_number}')
    print(f'bounds={mesh.bounds.tolist()}')
    print(f'centerline S3 max error={err:.3e}; tube S3 max error={qerr:.3e}')
    print(f'volume={mesh.volume:.6f}')
