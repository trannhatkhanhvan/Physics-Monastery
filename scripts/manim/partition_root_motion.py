from itertools import permutations
import numpy as np
from manim import *


# ============================================================
# Adjustable parameters
# ============================================================

SPECIAL_A = 11.791761367470536

A_START = -SPECIAL_A
A_END = SPECIAL_A

FRAME_COUNT = 480
RUN_TIME = 14

config.background_color = BLACK
config.frame_width = 16
config.frame_height = 9


# ============================================================
# Main scene layout controls
# ============================================================

PLANE_X_LENGTH = 12.6
PLANE_Y_LENGTH = 7.05

PLANE_EDGE = DOWN
PLANE_EDGE_BUFF = 0.32
PLANE_SHIFT_RIGHT = 0.00
PLANE_SHIFT_DOWN = 0.00


# ============================================================
# Header controls
# ============================================================

HEADER_TOP_BUFF = 0.35
HEADER_GAP = 0.55
HEADER_SHIFT_RIGHT = 0.00
HEADER_SHIFT_DOWN = 0.00

TITLE_TEXT_FONT = "Times New Roman"
TITLE_FONT_SIZE = 34
TITLE_COLOR = WHITE

FORMULA_FONT_SIZE = 30
FORMULA_COLOR = WHITE
FORMULA_LINE_GAP = 0.12


# ============================================================
# Axis label controls
# ============================================================

SHOW_COORDINATES = True
STANDARD_COORD_LABEL_FONT_SIZE = 18

REAL_IMAG_LABEL_FONT_SIZE = 22
REAL_LABEL_BUFF = 0.12
IMAG_LABEL_BUFF = 0.12


# ============================================================
# Root path controls
# ============================================================

SHOW_PATHS = True
PATH_STROKE_WIDTH = 3
PATH_OPACITY = 0.45


# ============================================================
# Dot / marker controls
# ============================================================

T_DOT_RADIUS = 0.07
T_PRIME_MARKER_SCALE = 0.12

T_COLORS = [BLUE_C, GREEN_C, RED_C, YELLOW_C]
T_PRIME_COLORS = [PURPLE_C, TEAL_C, ORANGE]


# ============================================================
# Legend controls
# ============================================================

LEGEND_FONT_SIZE = 24
LEGEND_RIGHT_BUFF = 0.35
LEGEND_TOP_BUFF = 1.45
LEGEND_ROW_GAP = 0.15
LEGEND_SYMBOL_GAP = 0.12


# ============================================================
# Special target marker controls
# ============================================================

SHOW_SPECIAL_A_MARKERS = True

SPECIAL_RING_RADIUS = 0.12
SPECIAL_RING_STROKE_WIDTH = 2

SPECIAL_TEXT_FONT_SIZE = 20
SPECIAL_TEXT_BUFF = 0.18


# ============================================================
# Current a label controls
# ============================================================

A_LABEL_FONT_SIZE = 28
A_LABEL_DECIMAL_PLACES = 4
A_LABEL_CORNER = UR
A_LABEL_CORNER_BUFF = 0.35
A_LABEL_GAP = 0.08

A_LABEL_TEXT_COLOR = WHITE
A_LABEL_NUMBER_COLOR = YELLOW


# ============================================================
# Manual bounds
# Leave None for automatic bounds.
# ============================================================

MANUAL_BOUNDS = (-5, 5, -4.5, 4.5)
MANUAL_STEP = 1


# ============================================================
# Polynomial definitions
# ============================================================

def roots_T(a: float) -> np.ndarray:
    """
    Roots of:
        T(x) = x^4 + 2πx^2 - 2πa x + 2π
    """
    coeffs = [
        1.0,
        0.0,
        2.0 * np.pi,
        -2.0 * np.pi * a,
        2.0 * np.pi,
    ]
    return np.roots(coeffs)


def roots_T_prime(a: float) -> np.ndarray:
    """
    Roots of:
        T'(x) = 4x^3 + 4πx - 2πa
    """
    coeffs = [
        4.0,
        0.0,
        4.0 * np.pi,
        -2.0 * np.pi * a,
    ]
    return np.roots(coeffs)


# ============================================================
# Root tracking
# ============================================================

def sorted_initial_roots(roots: np.ndarray) -> np.ndarray:
    """
    Stable initial order:
    first by real part, then by imaginary part.
    """
    return np.array(
        sorted(roots, key=lambda z: (z.real, z.imag)),
        dtype=complex,
    )


def track_roots(root_rows: list[np.ndarray]) -> np.ndarray:
    """
    Tracks roots frame-by-frame by choosing the permutation that minimizes
    motion from the previous frame.

    This keeps dot colors attached to continuous branches.
    """
    tracked = [sorted_initial_roots(root_rows[0])]

    for roots in root_rows[1:]:
        previous = tracked[-1]
        best = None
        best_cost = float("inf")

        for perm in permutations(range(len(roots))):
            candidate = roots[list(perm)]
            cost = np.sum(np.abs(candidate - previous))

            if cost < best_cost:
                best_cost = cost
                best = candidate

        tracked.append(np.array(best, dtype=complex))

    return np.array(tracked)


def interpolate_tracked_roots(
    tracked: np.ndarray,
    frame_value: float,
) -> np.ndarray:
    """
    Linear interpolation between precomputed root frames.
    """
    max_index = len(tracked) - 1
    frame_value = float(np.clip(frame_value, 0, max_index))

    lo = int(np.floor(frame_value))
    hi = min(lo + 1, max_index)
    t = frame_value - lo

    return (1.0 - t) * tracked[lo] + t * tracked[hi]


# ============================================================
# Plot scaling
# ============================================================

def nice_step(span: float) -> float:
    if span <= 6:
        return 1
    if span <= 12:
        return 2
    if span <= 25:
        return 5
    return 10


def compute_complex_bounds(tracked: np.ndarray):
    all_roots = tracked.reshape(-1)

    min_re = np.min(all_roots.real)
    max_re = np.max(all_roots.real)
    min_im = np.min(all_roots.imag)
    max_im = np.max(all_roots.imag)

    re_span = max_re - min_re
    im_span = max_im - min_im

    margin = 0.15 * max(re_span, im_span, 1.0)

    min_re -= margin
    max_re += margin
    min_im -= margin
    max_im += margin

    target_ratio = PLANE_X_LENGTH / PLANE_Y_LENGTH

    re_span = max_re - min_re
    im_span = max_im - min_im
    current_ratio = re_span / im_span

    if current_ratio < target_ratio:
        needed_re_span = target_ratio * im_span
        extra = needed_re_span - re_span
        min_re -= extra / 2
        max_re += extra / 2
    else:
        needed_im_span = re_span / target_ratio
        extra = needed_im_span - im_span
        min_im -= extra / 2
        max_im += extra / 2

    return min_re, max_re, min_im, max_im


# ============================================================
# Combined scene
# ============================================================

class TAndTPrimeRootMotion(Scene):
    def construct(self):
        # ----------------------------------------------------
        # Precompute roots for both T and T'
        # ----------------------------------------------------
        a_values = np.linspace(A_START, A_END, FRAME_COUNT)

        raw_T_roots = [
            roots_T(a)
            for a in a_values
        ]

        raw_T_prime_roots = [
            roots_T_prime(a)
            for a in a_values
        ]

        tracked_T = track_roots(raw_T_roots)
        tracked_T_prime = track_roots(raw_T_prime_roots)

        root_count_T = tracked_T.shape[1]
        root_count_T_prime = tracked_T_prime.shape[1]

        # ----------------------------------------------------
        # Shared complex plane bounds
        # ----------------------------------------------------
        if MANUAL_BOUNDS is None:
            combined_tracked = np.concatenate(
                [tracked_T, tracked_T_prime],
                axis=1,
            )

            min_re, max_re, min_im, max_im = compute_complex_bounds(combined_tracked)

            x_span = max_re - min_re
            y_span = max_im - min_im

            x_step = nice_step(x_span)
            y_step = nice_step(y_span)
        else:
            min_re, max_re, min_im, max_im = MANUAL_BOUNDS
            x_step = MANUAL_STEP
            y_step = MANUAL_STEP

        plane = ComplexPlane(
            x_range=[min_re, max_re, x_step],
            y_range=[min_im, max_im, y_step],
            x_length=PLANE_X_LENGTH,
            y_length=PLANE_Y_LENGTH,
            background_line_style={
                "stroke_color": GREY_B,
                "stroke_width": 1,
                "stroke_opacity": 0.35,
            },
            axis_config={
                "stroke_color": GREY_A,
                "stroke_width": 2,
            },
        )

        plane.to_edge(PLANE_EDGE, buff=PLANE_EDGE_BUFF)
        plane.shift(
            RIGHT * PLANE_SHIFT_RIGHT
            + DOWN * PLANE_SHIFT_DOWN
        )

        if SHOW_COORDINATES:
            plane.add_coordinates(font_size=STANDARD_COORD_LABEL_FONT_SIZE)

        real_label = Text(
            "Re",
            font=TITLE_TEXT_FONT,
            font_size=REAL_IMAG_LABEL_FONT_SIZE,
            color=GREY_A,
        )
        real_label.next_to(
            plane.x_axis.get_end(),
            RIGHT,
            buff=REAL_LABEL_BUFF,
        )

        imag_label = Text(
            "Im",
            font=TITLE_TEXT_FONT,
            font_size=REAL_IMAG_LABEL_FONT_SIZE,
            color=GREY_A,
        )
        imag_label.next_to(
            plane.y_axis.get_end(),
            UP,
            buff=IMAG_LABEL_BUFF,
        )

        # ----------------------------------------------------
        # Header
        # ----------------------------------------------------
        title = Text(
            "Roots of T(x) and T′(x) as a varies",
            font=TITLE_TEXT_FONT,
            font_size=TITLE_FONT_SIZE,
            color=TITLE_COLOR,
        )

        formula_T = MathTex(
            r"T(x)=x^4+2\pi x^2-2\pi a x+2\pi",
            font_size=FORMULA_FONT_SIZE,
            color=FORMULA_COLOR,
        )

        formula_T_prime = MathTex(
            r"T^{\prime}(x)=4x^3+4\pi x-2\pi a",
            font_size=FORMULA_FONT_SIZE,
            color=FORMULA_COLOR,
        )

        formulas = VGroup(
            formula_T,
            formula_T_prime,
        ).arrange(
            DOWN,
            aligned_edge=LEFT,
            buff=FORMULA_LINE_GAP,
        )

        header = VGroup(
            formulas,
            title,
        ).arrange(
            RIGHT,
            buff=HEADER_GAP,
        )

        header.to_edge(UP, buff=HEADER_TOP_BUFF)
        header.shift(
            RIGHT * HEADER_SHIFT_RIGHT
            + DOWN * HEADER_SHIFT_DOWN
        )

        # ----------------------------------------------------
        # Shared frame/a tracker
        # ----------------------------------------------------
        frame_tracker = ValueTracker(0)

        def current_frame_value():
            return frame_tracker.get_value()

        def current_a():
            s = current_frame_value() / (FRAME_COUNT - 1)
            return A_START + s * (A_END - A_START)

        def current_T_roots():
            return interpolate_tracked_roots(
                tracked_T,
                current_frame_value(),
            )

        def current_T_prime_roots():
            return interpolate_tracked_roots(
                tracked_T_prime,
                current_frame_value(),
            )

        # ----------------------------------------------------
        # Current a label
        # ----------------------------------------------------
        a_label_text = MathTex(
            r"a =",
            font_size=A_LABEL_FONT_SIZE,
            color=A_LABEL_TEXT_COLOR,
        )

        a_number = DecimalNumber(
            A_START,
            num_decimal_places=A_LABEL_DECIMAL_PLACES,
            font_size=A_LABEL_FONT_SIZE,
            color=A_LABEL_NUMBER_COLOR,
        )
        a_number.add_updater(lambda m: m.set_value(current_a()))

        a_label = VGroup(
            a_label_text,
            a_number,
        ).arrange(
            RIGHT,
            buff=A_LABEL_GAP,
        )

        a_label.to_corner(A_LABEL_CORNER, buff=A_LABEL_CORNER_BUFF)

        # ----------------------------------------------------
        # Root paths for T(x)
        # ----------------------------------------------------
        T_paths = VGroup()

        if SHOW_PATHS:
            for j in range(root_count_T):
                points = [
                    plane.n2p(z)
                    for z in tracked_T[:, j]
                ]

                path = VMobject()
                path.set_points_smoothly(points)
                path.set_stroke(
                    T_COLORS[j % len(T_COLORS)],
                    width=PATH_STROKE_WIDTH,
                    opacity=PATH_OPACITY,
                )

                T_paths.add(path)

        # ----------------------------------------------------
        # Root paths for T'(x)
        # ----------------------------------------------------
        T_prime_paths = VGroup()

        if SHOW_PATHS:
            for j in range(root_count_T_prime):
                points = [
                    plane.n2p(z)
                    for z in tracked_T_prime[:, j]
                ]

                path = VMobject()
                path.set_points_smoothly(points)
                path.set_stroke(
                    T_PRIME_COLORS[j % len(T_PRIME_COLORS)],
                    width=PATH_STROKE_WIDTH,
                    opacity=PATH_OPACITY,
                )

                T_prime_paths.add(path)

        # ----------------------------------------------------
        # Moving T(x) roots: dots
        # ----------------------------------------------------
        T_dots = VGroup()

        for j in range(root_count_T):
            dot = Dot(
                radius=T_DOT_RADIUS,
                color=T_COLORS[j % len(T_COLORS)],
            )

            def make_T_updater(index):
                return lambda mob: mob.move_to(
                    plane.n2p(current_T_roots()[index])
                )

            dot.add_updater(make_T_updater(j))
            dot.move_to(plane.n2p(tracked_T[0, j]))
            T_dots.add(dot)

        # ----------------------------------------------------
        # Moving T'(x) roots: triangles
        # ----------------------------------------------------
        T_prime_markers = VGroup()

        for j in range(root_count_T_prime):
            marker = Triangle(
                color=T_PRIME_COLORS[j % len(T_PRIME_COLORS)],
                fill_color=T_PRIME_COLORS[j % len(T_PRIME_COLORS)],
                fill_opacity=1.0,
                stroke_width=1,
            )
            marker.scale(T_PRIME_MARKER_SCALE)

            def make_T_prime_updater(index):
                return lambda mob: mob.move_to(
                    plane.n2p(current_T_prime_roots()[index])
                )

            marker.add_updater(make_T_prime_updater(j))
            marker.move_to(plane.n2p(tracked_T_prime[0, j]))
            T_prime_markers.add(marker)

        # ----------------------------------------------------
        # Special a markers
        # ----------------------------------------------------
        special_markers = VGroup()

        if SHOW_SPECIAL_A_MARKERS and A_START <= SPECIAL_A <= A_END:
            special_index = int(
                round(
                    (SPECIAL_A - A_START)
                    / (A_END - A_START)
                    * (FRAME_COUNT - 1)
                )
            )
            special_index = int(np.clip(special_index, 0, FRAME_COUNT - 1))

            special_T_roots = tracked_T[special_index]
            special_T_prime_roots = tracked_T_prime[special_index]

            for j, z in enumerate(special_T_roots):
                ring = Circle(
                    radius=SPECIAL_RING_RADIUS,
                    color=T_COLORS[j % len(T_COLORS)],
                    stroke_width=SPECIAL_RING_STROKE_WIDTH,
                )
                ring.move_to(plane.n2p(z))
                special_markers.add(ring)

            for j, z in enumerate(special_T_prime_roots):
                ring = Circle(
                    radius=SPECIAL_RING_RADIUS,
                    color=T_PRIME_COLORS[j % len(T_PRIME_COLORS)],
                    stroke_width=SPECIAL_RING_STROKE_WIDTH,
                )
                ring.move_to(plane.n2p(z))
                special_markers.add(ring)

            special_text = MathTex(
                rf"a^\ast = {SPECIAL_A:.6f}",
                font_size=SPECIAL_TEXT_FONT_SIZE,
                color=WHITE,
            )
            special_text.next_to(a_label, DOWN, buff=SPECIAL_TEXT_BUFF)
            special_markers.add(special_text)

        # ----------------------------------------------------
        # Legend
        # ----------------------------------------------------
        legend_T_dot = Dot(
            radius=T_DOT_RADIUS,
            color=T_COLORS[0],
        )

        legend_T_text = MathTex(
            r"T(x)",
            font_size=LEGEND_FONT_SIZE,
            color=WHITE,
        )

        legend_T = VGroup(
            legend_T_dot,
            legend_T_text,
        ).arrange(
            RIGHT,
            buff=LEGEND_SYMBOL_GAP,
        )

        legend_T_prime_marker = Triangle(
            color=T_PRIME_COLORS[0],
            fill_color=T_PRIME_COLORS[0],
            fill_opacity=1.0,
            stroke_width=1,
        ).scale(T_PRIME_MARKER_SCALE)

        legend_T_prime_text = MathTex(
            r"T^{\prime}(x)",
            font_size=LEGEND_FONT_SIZE,
            color=WHITE,
        )

        legend_T_prime = VGroup(
            legend_T_prime_marker,
            legend_T_prime_text,
        ).arrange(
            RIGHT,
            buff=LEGEND_SYMBOL_GAP,
        )

        legend = VGroup(
            legend_T,
            legend_T_prime,
        ).arrange(
            DOWN,
            aligned_edge=LEFT,
            buff=LEGEND_ROW_GAP,
        )

        legend.to_corner(UR, buff=LEGEND_RIGHT_BUFF)
        legend.shift(DOWN * LEGEND_TOP_BUFF)

        # ----------------------------------------------------
        # Add everything
        # ----------------------------------------------------
        self.add(
            plane,
            real_label,
            imag_label,
            header,
            T_paths,
            T_prime_paths,
            special_markers,
            T_dots,
            T_prime_markers,
            a_label,
            legend,
        )

        # ----------------------------------------------------
        # Animate a from A_START to A_END
        # ----------------------------------------------------
        self.play(
            frame_tracker.animate.set_value(FRAME_COUNT - 1),
            run_time=RUN_TIME,
            rate_func=linear,
        )

        self.wait(1.0)