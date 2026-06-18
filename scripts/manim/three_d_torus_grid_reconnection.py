from manim import *
import numpy as np

# ============================================================
# Scene controls
# ============================================================

BACKGROUND_COLOR = BLACK

TITLE_SIZE = 34
LABEL_SIZE = 24

U_COUNT = 12
V_COUNT = 8

FLAT_WIDTH = 5.5
FLAT_HEIGHT = 3.2

CYL_RADIUS = 0.9
CYL_LENGTH = 4.8

TORUS_MAJOR_RADIUS = 1.65
TORUS_MINOR_RADIUS = 0.55

GRID_COLOR = GREY_B
U_SEAM_COLOR = RED
V_SEAM_COLOR = BLUE
SURFACE_OPACITY = 0.18
GRID_STROKE = 2.0
SEAM_STROKE = 5.0

CAMERA_PHI = 65 * DEGREES
CAMERA_THETA = -45 * DEGREES


class ThreeDTorusGridReconnection(ThreeDScene):
    def construct(self):
        self.camera.background_color = BACKGROUND_COLOR
        self.set_camera_orientation(phi=CAMERA_PHI, theta=CAMERA_THETA)

        title = Text("Reconnect a grid into a torus surface", font_size=TITLE_SIZE)
        title.to_edge(UP)
        self.add_fixed_in_frame_mobjects(title)
        self.play(FadeIn(title), run_time=0.8)

        label = self.fixed_label("1. Start with a flat 2D grid living in 3D.")
        flat = self.make_flat_grid()
        self.play(FadeIn(label), Create(flat), run_time=1.5)
        self.wait(0.8)

        self.play(FadeOut(label), run_time=0.3)
        label = self.fixed_label("2. Connect left edge to right edge: the grid becomes a cylinder.")
        cylinder = self.make_cylinder_grid()
        self.add_fixed_in_frame_mobjects(label)
        self.play(FadeIn(label), Transform(flat, cylinder), run_time=2.2)
        self.wait(1.0)

        self.play(FadeOut(label), run_time=0.3)
        label = self.fixed_label("3. Connect the two circular ends: the cylinder becomes a torus.")
        torus = self.make_torus_grid()
        self.add_fixed_in_frame_mobjects(label)
        self.play(FadeIn(label), Transform(flat, torus), run_time=2.8)
        self.wait(1.2)

        self.play(FadeOut(label), run_time=0.3)
        label = self.fixed_label("Result: a visible torus surface T² made by changing grid connectivity.")
        self.add_fixed_in_frame_mobjects(label)
        self.play(FadeIn(label), run_time=0.6)

        self.begin_ambient_camera_rotation(rate=0.12)
        self.wait(5)
        self.stop_ambient_camera_rotation()

    # ============================================================
    # Fixed labels
    # ============================================================

    def fixed_label(self, text):
        label = Text(text, font_size=LABEL_SIZE, color=WHITE)
        label.to_edge(DOWN)
        return label

    # ============================================================
    # Parametric positions
    # ============================================================

    def flat_pos(self, u, v):
        x = (u - 0.5) * FLAT_WIDTH
        y = (v - 0.5) * FLAT_HEIGHT
        z = 0
        return np.array([x, y, z])

    def cylinder_pos(self, u, v):
        # u wraps around cylinder
        theta = TAU * u
        x = (v - 0.5) * CYL_LENGTH
        y = CYL_RADIUS * np.cos(theta)
        z = CYL_RADIUS * np.sin(theta)
        return np.array([x, y, z])

    def torus_pos(self, u, v):
        # u runs around the main donut direction
        # v runs around the tube direction
        theta = TAU * u
        phi = TAU * v

        R = TORUS_MAJOR_RADIUS
        r = TORUS_MINOR_RADIUS

        x = (R + r * np.cos(phi)) * np.cos(theta)
        y = (R + r * np.cos(phi)) * np.sin(theta)
        z = r * np.sin(phi)
        return np.array([x, y, z])

    # ============================================================
    # Grid builders
    # ============================================================

    def make_grid_from_position_function(self, pos_func):
        group = VGroup()

        # u-lines
        for j in range(V_COUNT + 1):
            v = j / V_COUNT
            points = [pos_func(i / U_COUNT, v) for i in range(U_COUNT + 1)]
            line = VMobject()
            line.set_points_smoothly(points)
            line.set_stroke(GRID_COLOR, width=GRID_STROKE)
            group.add(line)

        # v-lines
        for i in range(U_COUNT + 1):
            u = i / U_COUNT
            points = [pos_func(u, j / V_COUNT) for j in range(V_COUNT + 1)]
            line = VMobject()
            line.set_points_smoothly(points)
            line.set_stroke(GRID_COLOR, width=GRID_STROKE)
            group.add(line)

        # seam highlights
        group.add(self.make_seams(pos_func))
        return group

    def make_seams(self, pos_func):
        seams = VGroup()

        # left/right seam in u direction
        for u in [0, 1]:
            points = [pos_func(u, j / V_COUNT) for j in range(V_COUNT + 1)]
            seam = VMobject()
            seam.set_points_smoothly(points)
            seam.set_stroke(U_SEAM_COLOR, width=SEAM_STROKE)
            seams.add(seam)

        # top/bottom seam in v direction
        for v in [0, 1]:
            points = [pos_func(i / U_COUNT, v) for i in range(U_COUNT + 1)]
            seam = VMobject()
            seam.set_points_smoothly(points)
            seam.set_stroke(V_SEAM_COLOR, width=SEAM_STROKE)
            seams.add(seam)

        return seams

    def make_flat_grid(self):
        return self.make_grid_from_position_function(self.flat_pos)

    def make_cylinder_grid(self):
        return self.make_grid_from_position_function(self.cylinder_pos)

    def make_torus_grid(self):
        return self.make_grid_from_position_function(self.torus_pos)