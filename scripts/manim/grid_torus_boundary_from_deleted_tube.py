from manim import *
import numpy as np
import math

# ============================================================
# EXPLICIT CONTROLS
# ============================================================

BACKGROUND_COLOR = BLACK

TITLE_TEXT = "Deleting a tube from a 3D grid creates a torus boundary"
TITLE_SIZE = 30
LABEL_SIZE = 22
MAX_LABEL_WIDTH = 12.2
LABEL_Y = -3.35  # fixed vertical placement for all step labels

# Visible grid window. Finite window standing in for an infinite grid.
GRID_RADIUS = 8
GRID_SPACING = 0.30

GRID_DOT_RADIUS = 0.015
GRID_DOT_COLOR = GREY_B
GRID_DOT_OPACITY = 0.28

GRID_EDGE_COLOR = GREY_B
GRID_EDGE_OPACITY = 0.15
GRID_EDGE_STROKE = 0.75

# Circular tube geometry.
CORE_RADIUS = 1.80
TUBE_RADIUS = 0.42

# Interior points are removed.
# Boundary points are retained as a shell band near the torus surface.
INTERIOR_MARGIN = 0.12
BOUNDARY_SHELL_BAND = 0.12

CORE_COLOR = BLUE
CORE_STROKE = 5.0

SWEEP_CIRCLE_COLOR = WHITE
SWEEP_CIRCLE_STROKE = 4.0

BOUNDARY_POINT_COLOR = YELLOW
BOUNDARY_POINT_RADIUS = 0.040

OPEN_PORT_COLOR = ORANGE
OPEN_PORT_STROKE = 3.0
OPEN_PORT_LENGTH = 0.18

BOUNDARY_EDGE_COLOR = YELLOW
BOUNDARY_EDGE_STROKE = 2.0
BOUNDARY_EDGE_OPACITY = 0.86

TORUS_SURFACE_COLOR = RED_E
TORUS_SURFACE_OPACITY = 0.10

LOOP_AROUND_RING_COLOR = BLUE
LOOP_AROUND_TUBE_COLOR = YELLOW
LOOP_STROKE = 4.0

# Sweep animation.
SWEEP_STEPS = 36
SWEEP_STEP_RUN_TIME = 0.11

# Camera.
CAMERA_PHI = 62 * DEGREES
CAMERA_THETA = -48 * DEGREES
START_ZOOM = 1.00
ZOOM_IN = 1.62
AMBIENT_ROTATION_RATE = 0.08

# Camera framing
# During the close-up, focus near the initial sweep circle.
CLOSE_FRAME_CENTER = np.array([CORE_RADIUS * 0.95, 0.0, 0.0])
# During the wide shot, move frame center to the right so the torus appears left of center.
WIDE_FRAME_CENTER = np.array([2.00, 1.50, 0.0])

# Unwrap diagram.
UNWRAP_RECT_WIDTH = 4.60
UNWRAP_RECT_HEIGHT = 1.45
UNWRAP_GRID_COLS = 12
UNWRAP_GRID_ROWS = 4

UNWRAP_DOT_RADIUS = 0.027
UNWRAP_DOT_COLOR = YELLOW


class GridTorusBoundaryFromDeletedTube(ThreeDScene):
    def construct(self):
        self.camera.background_color = BACKGROUND_COLOR
        self.set_camera_orientation(
            phi=CAMERA_PHI,
            theta=CAMERA_THETA,
            zoom=START_ZOOM,
            frame_center=ORIGIN,
        )

        title = Text(TITLE_TEXT, font_size=TITLE_SIZE, color=WHITE)
        title.to_edge(UP, buff=0.18)
        self.add_fixed_in_frame_mobjects(title)
        self.play(FadeIn(title), run_time=0.7)

        # Build graph objects.
        all_dots, interior_dot_bins, boundary_dot_bins = self.make_grid_dots()
        all_edges, deleted_edge_bins = self.make_grid_edges()

        core_loop = self.make_core_loop()
        open_ports = self.make_open_ports()
        boundary_edges = self.make_boundary_edges()
        torus_surface = self.make_torus_surface()
        torus_loops = self.make_torus_direction_loops()

        boundary_dots_all = VGroup(*boundary_dot_bins)

        rotating_world = VGroup(
            all_dots,
            all_edges,
            boundary_dots_all,
            core_loop,
            torus_surface,
            open_ports,
            boundary_edges,
            torus_loops,
        )

        # ------------------------------------------------------------
        # 1. Show grid and circular core loop.
        # ------------------------------------------------------------
        label = self.fixed_label(
            "1. Start with a large 3D grid.\nDraw a circular loop inside it."
        )
        self.add_fixed_in_frame_mobjects(label)

        self.play(
            FadeIn(all_dots),
            Create(all_edges),
            FadeIn(label),
            run_time=1.4,
        )
        self.play(Create(core_loop), run_time=1.1)
        self.wait(0.45)

        # ------------------------------------------------------------
        # 2. Zoom in and draw orthogonal circle.
        # ------------------------------------------------------------
        self.play(FadeOut(label), run_time=0.25)
        label = self.fixed_label(
            "2. At one point on the loop,\ndraw an orthogonal circle."
        )
        self.add_fixed_in_frame_mobjects(label)

        theta_tracker = ValueTracker(0.0)
        sweep_circle = always_redraw(
            lambda: self.make_sweep_circle(theta_tracker.get_value())
        )

        self.move_camera(
            zoom=ZOOM_IN,
            frame_center=CLOSE_FRAME_CENTER,
            run_time=1.0,
        )
        self.play(FadeIn(label), Create(sweep_circle), run_time=0.9)
        self.wait(0.45)

        # ------------------------------------------------------------
        # 3. Sweep around loop.
        # Interior points and edges vanish as sweep reaches them.
        # Boundary shell points turn yellow and stay.
        # As the sweep proceeds, zoom back out and shift torus left of center.
        # ------------------------------------------------------------
        self.play(FadeOut(label), run_time=0.25)
        label = self.fixed_label(
            "3. Sweep the circle around the loop.\nInterior grid points are deleted."
        )
        self.add_fixed_in_frame_mobjects(label)

        self.play(FadeIn(label), run_time=0.25)

        for step in range(SWEEP_STEPS):
            next_theta = TAU * (step + 1) / SWEEP_STEPS
            alpha = (step + 1) / SWEEP_STEPS

            current_zoom = interpolate(ZOOM_IN, START_ZOOM, alpha)
            current_center = interpolate(
                CLOSE_FRAME_CENTER,
                WIDE_FRAME_CENTER,
                alpha,
            )

            added = [theta_tracker.animate.set_value(next_theta)]

            if len(interior_dot_bins[step]) > 0:
                added.append(FadeOut(interior_dot_bins[step], scale=0.55))

            if len(deleted_edge_bins[step]) > 0:
                added.append(FadeOut(deleted_edge_bins[step]))

            if len(boundary_dot_bins[step]) > 0:
                added.append(FadeIn(boundary_dot_bins[step]))

            self.move_camera(
                zoom=current_zoom,
                frame_center=current_center,
                run_time=SWEEP_STEP_RUN_TIME,
                added_anims=added,
                rate_func=linear,
            )

        self.wait(0.45)

        # ------------------------------------------------------------
        # 4. Show exterior grid and boundary shell.
        # ------------------------------------------------------------
        self.play(FadeOut(label), FadeOut(sweep_circle), run_time=0.35)
        label = self.fixed_label(
            "4. The outside grid remains.\nThe deleted tube leaves a boundary shell."
        )
        self.add_fixed_in_frame_mobjects(label)

        self.play(
            FadeIn(torus_surface),
            FadeIn(open_ports),
            FadeIn(boundary_edges),
            FadeIn(label),
            run_time=1.3,
        )
        self.wait(0.8)

        # ------------------------------------------------------------
        # 5. Show two torus directions.
        # ------------------------------------------------------------
        self.play(FadeOut(label), run_time=0.25)
        label = self.fixed_label(
            "5. The boundary shell has two loop directions:\naround the ring and around the tube."
        )
        self.add_fixed_in_frame_mobjects(label)

        self.play(Create(torus_loops), FadeIn(label), run_time=1.4)
        self.wait(0.9)

        # ------------------------------------------------------------
        # 6. Unwrap actual boundary-shell points.
        # ------------------------------------------------------------
        self.play(FadeOut(label), run_time=0.25)
        label = self.fixed_label(
            "6. Unwrap the boundary shell.\nOpposite edges identify: this is a torus boundary."
        )
        self.add_fixed_in_frame_mobjects(label)

        unwrap = self.make_unwrap_diagram()
        self.add_fixed_in_frame_mobjects(unwrap)

        self.play(
            FadeIn(label),
            FadeIn(unwrap),
            run_time=1.2,
        )
        self.wait(1.4)

        # ------------------------------------------------------------
        # 7. Final slow object rotation.
        # Rotate the grid/torus around its own center, not the camera frame.
        # This keeps it from drifting toward the unwrap map.
        # ------------------------------------------------------------
        self.play(
            Rotate(
                rotating_world,
                angle=55 * DEGREES,
                axis=OUT,
                about_point=ORIGIN,
            ),
            run_time=4.0,
            rate_func=smooth,
        )

        final_label = self.fixed_label(
            "Result: grid with a deleted tube,\nplus a surviving torus boundary interface."
        )
        self.add_fixed_in_frame_mobjects(final_label)
        self.play(FadeOut(label), FadeIn(final_label), run_time=0.8)
        self.wait(1.5)

    # ============================================================
    # FIXED FRAME HELPERS
    # ============================================================

    def fixed_label(self, text):
        label = Text(text, font_size=LABEL_SIZE, color=WHITE)
        if label.width > MAX_LABEL_WIDTH:
            label.set_width(MAX_LABEL_WIDTH)
        label.move_to(np.array([0.0, LABEL_Y, 0.0]))
        return label

    # ============================================================
    # GRID / CLASSIFICATION
    # ============================================================

    def coord_to_point(self, coord):
        x, y, z = coord
        return GRID_SPACING * np.array([x, y, z], dtype=float)

    def all_coords(self):
        n = GRID_RADIUS
        for x in range(-n, n + 1):
            for y in range(-n, n + 1):
                for z in range(-n, n + 1):
                    yield (x, y, z)

    def coord_set(self):
        return set(self.all_coords())

    def neighbor_dirs_positive(self):
        return [
            (1, 0, 0),
            (0, 1, 0),
            (0, 0, 1),
        ]

    def neighbor_dirs_all(self):
        return [
            (1, 0, 0),
            (-1, 0, 0),
            (0, 1, 0),
            (0, -1, 0),
            (0, 0, 1),
            (0, 0, -1),
        ]

    def add_coords(self, a, b):
        return (a[0] + b[0], a[1] + b[1], a[2] + b[2])

    def tube_distance(self, point):
        x, y, z = point
        radial = math.sqrt(x * x + y * y)
        return math.sqrt((radial - CORE_RADIUS) ** 2 + z * z)

    def core_angle(self, point):
        x, y, _ = point
        angle = math.atan2(y, x)
        if angle < 0:
            angle += TAU
        return angle

    def tube_angle(self, point):
        x, y, z = point
        radial = math.sqrt(x * x + y * y)
        phi = math.atan2(z, radial - CORE_RADIUS)
        if phi < 0:
            phi += TAU
        return phi

    def sweep_bin(self, point):
        angle = self.core_angle(point)
        index = int(SWEEP_STEPS * angle / TAU)
        return min(max(index, 0), SWEEP_STEPS - 1)

    def is_interior(self, coord):
        p = self.coord_to_point(coord)
        return self.tube_distance(p) < (TUBE_RADIUS - INTERIOR_MARGIN)

    def is_boundary_shell_point(self, coord):
        p = self.coord_to_point(coord)
        d = self.tube_distance(p)
        return abs(d - TUBE_RADIUS) <= BOUNDARY_SHELL_BAND

    def has_interior_neighbor(self, coord, coord_set):
        for d in self.neighbor_dirs_all():
            nb = self.add_coords(coord, d)
            if nb in coord_set and self.is_interior(nb):
                return True
        return False

    def is_boundary_interface_point(self, coord, coord_set=None):
        if coord_set is None:
            coord_set = self.coord_set()

        if self.is_interior(coord):
            return False

        return self.is_boundary_shell_point(coord) or self.has_interior_neighbor(coord, coord_set)

    def boundary_coords(self):
        coord_set = self.coord_set()
        coords = []
        for coord in self.all_coords():
            if self.is_boundary_interface_point(coord, coord_set):
                coords.append(coord)
        return coords

    # ============================================================
    # GRID OBJECTS
    # ============================================================

    def make_grid_dots(self):
        all_dots = VGroup()
        interior_bins = [VGroup() for _ in range(SWEEP_STEPS)]
        boundary_bins = [VGroup() for _ in range(SWEEP_STEPS)]

        coord_set = self.coord_set()

        for coord in self.all_coords():
            p = self.coord_to_point(coord)

            dot = Dot(
                point=p,
                radius=GRID_DOT_RADIUS,
                color=GRID_DOT_COLOR,
            )
            dot.set_opacity(GRID_DOT_OPACITY)
            all_dots.add(dot)

            if self.is_interior(coord):
                interior_bins[self.sweep_bin(p)].add(dot)

            if self.is_boundary_interface_point(coord, coord_set):
                bd = Dot(
                    point=p,
                    radius=BOUNDARY_POINT_RADIUS,
                    color=BOUNDARY_POINT_COLOR,
                )
                bd.set_opacity(0.98)
                boundary_bins[self.sweep_bin(p)].add(bd)

        return all_dots, interior_bins, boundary_bins

    def make_grid_edges(self):
        all_edges = VGroup()
        deleted_edge_bins = [VGroup() for _ in range(SWEEP_STEPS)]

        coord_set = self.coord_set()

        for a in self.all_coords():
            for d in self.neighbor_dirs_positive():
                b = self.add_coords(a, d)
                if b not in coord_set:
                    continue

                p = self.coord_to_point(a)
                q = self.coord_to_point(b)
                midpoint = 0.5 * (p + q)

                line = Line(
                    p,
                    q,
                    color=GRID_EDGE_COLOR,
                    stroke_width=GRID_EDGE_STROKE,
                )
                line.set_opacity(GRID_EDGE_OPACITY)
                all_edges.add(line)

                edge_goes_into_deleted_region = (
                    self.is_interior(a)
                    or self.is_interior(b)
                    or self.tube_distance(midpoint) < (TUBE_RADIUS - INTERIOR_MARGIN * 0.5)
                )

                if edge_goes_into_deleted_region:
                    deleted_edge_bins[self.sweep_bin(midpoint)].add(line)

        return all_edges, deleted_edge_bins

    # ============================================================
    # CORE LOOP / SWEEP CIRCLE / TORUS GUIDE
    # ============================================================

    def make_core_loop(self):
        curve = ParametricFunction(
            lambda t: np.array([
                CORE_RADIUS * math.cos(t),
                CORE_RADIUS * math.sin(t),
                0.0,
            ]),
            t_range=[0, TAU],
            color=CORE_COLOR,
        )
        curve.set_stroke(width=CORE_STROKE)
        return curve

    def cross_section_point(self, theta, phi):
        center = np.array([
            CORE_RADIUS * math.cos(theta),
            CORE_RADIUS * math.sin(theta),
            0.0,
        ])

        radial = np.array([
            math.cos(theta),
            math.sin(theta),
            0.0,
        ])

        vertical = np.array([0.0, 0.0, 1.0])

        return center + TUBE_RADIUS * (
            math.cos(phi) * radial + math.sin(phi) * vertical
        )

    def make_sweep_circle(self, theta):
        circle = ParametricFunction(
            lambda t: self.cross_section_point(theta, t),
            t_range=[0, TAU],
            color=SWEEP_CIRCLE_COLOR,
        )
        circle.set_stroke(width=SWEEP_CIRCLE_STROKE)
        return circle

    def torus_point(self, theta, phi):
        return self.cross_section_point(theta, phi)

    def make_torus_surface(self):
        surface = Surface(
            lambda u, v: self.torus_point(u, v),
            u_range=[0, TAU],
            v_range=[0, TAU],
            resolution=(40, 18),
        )
        surface.set_fill(
            color=TORUS_SURFACE_COLOR,
            opacity=TORUS_SURFACE_OPACITY,
        )
        surface.set_stroke(
            color=TORUS_SURFACE_COLOR,
            width=0.5,
            opacity=0.16,
        )
        return surface

    def make_torus_direction_loops(self):
        loops = VGroup()

        # Blue: around the main ring direction.
        for phi in [0.0, PI]:
            curve = ParametricFunction(
                lambda t, phi=phi: self.torus_point(t, phi),
                t_range=[0, TAU],
                color=LOOP_AROUND_RING_COLOR,
            )
            curve.set_stroke(width=LOOP_STROKE)
            loops.add(curve)

        # Yellow: around the tube direction.
        for theta in [0.0, PI / 2]:
            curve = ParametricFunction(
                lambda t, theta=theta: self.torus_point(theta, t),
                t_range=[0, TAU],
                color=LOOP_AROUND_TUBE_COLOR,
            )
            curve.set_stroke(width=LOOP_STROKE)
            loops.add(curve)

        return loops

    # ============================================================
    # BOUNDARY INTERFACE OBJECTS
    # ============================================================

    def make_boundary_edges(self):
        edges = VGroup()
        coord_set = self.coord_set()

        for a in self.all_coords():
            if not self.is_boundary_interface_point(a, coord_set):
                continue

            for d in self.neighbor_dirs_positive():
                b = self.add_coords(a, d)
                if b not in coord_set:
                    continue

                if not self.is_boundary_interface_point(b, coord_set):
                    continue

                line = Line(
                    self.coord_to_point(a),
                    self.coord_to_point(b),
                    color=BOUNDARY_EDGE_COLOR,
                    stroke_width=BOUNDARY_EDGE_STROKE,
                )
                line.set_opacity(BOUNDARY_EDGE_OPACITY)
                edges.add(line)

        return edges

    def make_open_ports(self):
        ports = VGroup()
        coord_set = self.coord_set()

        for outside in self.all_coords():
            if self.is_interior(outside):
                continue

            p = self.coord_to_point(outside)

            for d in self.neighbor_dirs_all():
                inside = self.add_coords(outside, d)

                if inside not in coord_set:
                    continue

                if not self.is_interior(inside):
                    continue

                q = self.coord_to_point(inside)
                direction = q - p
                norm = np.linalg.norm(direction)

                if norm == 0:
                    continue

                stub_end = p + OPEN_PORT_LENGTH * direction / norm

                stub = Line(
                    p,
                    stub_end,
                    color=OPEN_PORT_COLOR,
                    stroke_width=OPEN_PORT_STROKE,
                )
                ports.add(stub)

        return ports

    # ============================================================
    # UNWRAP DIAGRAM FROM ACTUAL BOUNDARY POINTS
    # ============================================================

    def make_unwrap_diagram(self):
        group = VGroup()

        rect = Rectangle(
            width=UNWRAP_RECT_WIDTH,
            height=UNWRAP_RECT_HEIGHT,
            color=YELLOW,
            stroke_width=2.5,
        )

        grid_lines = VGroup()

        for i in range(1, UNWRAP_GRID_COLS):
            x = -UNWRAP_RECT_WIDTH / 2 + i * UNWRAP_RECT_WIDTH / UNWRAP_GRID_COLS
            grid_lines.add(
                Line(
                    np.array([x, -UNWRAP_RECT_HEIGHT / 2, 0]),
                    np.array([x, UNWRAP_RECT_HEIGHT / 2, 0]),
                    color=GREY_B,
                    stroke_width=1,
                )
            )

        for j in range(1, UNWRAP_GRID_ROWS):
            y = -UNWRAP_RECT_HEIGHT / 2 + j * UNWRAP_RECT_HEIGHT / UNWRAP_GRID_ROWS
            grid_lines.add(
                Line(
                    np.array([-UNWRAP_RECT_WIDTH / 2, y, 0]),
                    np.array([UNWRAP_RECT_WIDTH / 2, y, 0]),
                    color=GREY_B,
                    stroke_width=1,
                )
            )

        title = Text("Unwrapped boundary", font_size=17, color=WHITE)
        title.next_to(rect, UP, buff=0.38)

        # Actual shell points placed by torus coordinates:
        # theta = around the big ring
        # phi   = around the small tube
        unwrap_points = VGroup()

        for coord in self.boundary_coords():
            p3 = self.coord_to_point(coord)
            theta = self.core_angle(p3)
            phi = self.tube_angle(p3)

            x = -UNWRAP_RECT_WIDTH / 2 + UNWRAP_RECT_WIDTH * theta / TAU
            y = -UNWRAP_RECT_HEIGHT / 2 + UNWRAP_RECT_HEIGHT * phi / TAU

            dot = Dot(
                point=np.array([x, y, 0.0]),
                radius=UNWRAP_DOT_RADIUS,
                color=UNWRAP_DOT_COLOR,
            )
            dot.set_opacity(0.95)
            unwrap_points.add(dot)

        # Opposite-edge identification indicators.
        left_arrow = Arrow(
            np.array([-UNWRAP_RECT_WIDTH / 2 - 0.48, 0.18, 0]),
            np.array([-UNWRAP_RECT_WIDTH / 2 - 0.06, 0.18, 0]),
            buff=0,
            color=BLUE,
            stroke_width=3,
        )
        right_arrow = Arrow(
            np.array([UNWRAP_RECT_WIDTH / 2 + 0.48, 0.18, 0]),
            np.array([UNWRAP_RECT_WIDTH / 2 + 0.06, 0.18, 0]),
            buff=0,
            color=BLUE,
            stroke_width=3,
        )

        lr_text = Text("left = right", font_size=14, color=BLUE)
        lr_text.next_to(rect, DOWN, buff=0.33)
        lr_text.shift(LEFT * 0.78)

        top_arrow = Arrow(
            np.array([0.72, UNWRAP_RECT_HEIGHT / 2 + 0.30, 0]),
            np.array([0.72, UNWRAP_RECT_HEIGHT / 2 + 0.06, 0]),
            buff=0,
            color=YELLOW,
            stroke_width=3,
        )
        bottom_arrow = Arrow(
            np.array([0.72, -UNWRAP_RECT_HEIGHT / 2 - 0.30, 0]),
            np.array([0.72, -UNWRAP_RECT_HEIGHT / 2 - 0.06, 0]),
            buff=0,
            color=YELLOW,
            stroke_width=3,
        )

        ud_text = Text("up = down", font_size=14, color=YELLOW)
        ud_text.next_to(rect, RIGHT, buff=0.50)
        ud_text.shift(UP * 0.34)

        boundary_label = Text(
            "actual shell points",
            font_size=13,
            color=YELLOW,
        )
        boundary_label.next_to(rect, DOWN, buff=0.33)
        boundary_label.shift(RIGHT * 0.92)

        group.add(
            rect,
            grid_lines,
            unwrap_points,
            title,
            left_arrow,
            right_arrow,
            lr_text,
            top_arrow,
            bottom_arrow,
            ud_text,
            boundary_label,
        )

        group.to_corner(UR, buff=0.28)
        group.shift(DOWN * 2.00)

        return group