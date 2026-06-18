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
# Header controls: formula + title together
# ============================================================

HEADER_TOP_BUFF = 0.50
HEADER_GAP = 0.55
HEADER_SHIFT_RIGHT = 0.00
HEADER_SHIFT_DOWN = 0.00


# ============================================================
# Title controls
# ============================================================

TITLE_TEXT_FONT = "Times New Roman"
TITLE_WORD_FONT_SIZE = 34
TITLE_MATH_FONT_SIZE = 40
TITLE_COLOR = WHITE
TITLE_PART_GAP = 0.12

TITLE_SHIFT_RIGHT = 0.00
TITLE_SHIFT_DOWN = 0.00


# ============================================================
# Formula controls
# Negative FORMULA_SHIFT_RIGHT moves formula left.
# Positive FORMULA_SHIFT_RIGHT moves formula right.
# ============================================================

FORMULA_FONT_SIZE = 40
FORMULA_COLOR = WHITE

FORMULA_SHIFT_RIGHT = -1.50
FORMULA_SHIFT_DOWN = 0.00


# ============================================================
# Axis label controls
# ============================================================

SHOW_COORDINATES = True

STANDARD_COORD_LABEL_FONT_SIZE = 18

PI_AXIS_LABEL_FONT_SIZE = 18
PI_X_LABEL_DOWN_BUFF = 0.10
PI_Y_LABEL_RIGHT_BUFF = 0.10

REAL_IMAG_LABEL_FONT_SIZE = 22
REAL_LABEL_BUFF = 0.12
IMAG_LABEL_BUFF = 0.12

REAL_LABEL_SHIFT_RIGHT = 0.00
REAL_LABEL_SHIFT_DOWN = 0.00

IMAG_LABEL_SHIFT_RIGHT = 0.00
IMAG_LABEL_SHIFT_DOWN = 0.00


# ============================================================
# Root path controls
# ============================================================

SHOW_PATHS = True
PATH_STROKE_WIDTH = 3
PATH_OPACITY = 0.45


# ============================================================
# Dot controls
# ============================================================

DOT_RADIUS = 0.07


# ============================================================
# Special target marker controls
# ============================================================

SHOW_SPECIAL_A_MARKERS = True

SPECIAL_RING_RADIUS = 0.12
SPECIAL_RING_COLOR = WHITE
SPECIAL_RING_STROKE_WIDTH = 2

SPECIAL_TEXT_FONT_SIZE = 20
SPECIAL_TEXT_BUFF = 0.18
SPECIAL_TEXT_SHIFT_RIGHT = 0.00
SPECIAL_TEXT_SHIFT_DOWN = 0.00


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

A_LABEL_SHIFT_RIGHT = 0.00
A_LABEL_SHIFT_DOWN = 0.00


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
    Gives a stable initial order:
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

    This keeps dot colors attached to continuous branches as much as possible.
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


def add_pi_axis_labels(plane):
    """
    Custom coordinate labels for a [-π, π] × [-π, π] complex plane.
    """
    labels = VGroup()

    x_labels = [
        (-np.pi, r"-\pi"),
        (-np.pi / 2, r"-\frac{\pi}{2}"),
        (np.pi / 2, r"\frac{\pi}{2}"),
        (np.pi, r"\pi"),
    ]

    y_labels = [
        (-np.pi, r"-\pi i"),
        (-np.pi / 2, r"-\frac{\pi}{2}i"),
        (np.pi / 2, r"\frac{\pi}{2}i"),
        (np.pi, r"\pi i"),
    ]

    for x, tex in x_labels:
        label = MathTex(
            tex,
            font_size=PI_AXIS_LABEL_FONT_SIZE,
            color=GREY_A,
        )
        label.next_to(
            plane.n2p(complex(x, 0)),
            DOWN,
            buff=PI_X_LABEL_DOWN_BUFF,
        )
        labels.add(label)

    for y, tex in y_labels:
        label = MathTex(
            tex,
            font_size=PI_AXIS_LABEL_FONT_SIZE,
            color=GREY_A,
        )
        label.next_to(
            plane.n2p(complex(0, y)),
            RIGHT,
            buff=PI_Y_LABEL_RIGHT_BUFF,
        )
        labels.add(label)

    return labels


# ============================================================
# Shared scene builder
# ============================================================

class RootMotionBase(Scene):
    root_function = None

    title_prefix_text = "Roots of"
    title_math_tex = r"T(x)"
    title_suffix_text = "as a varies"

    formula_tex = ""
    root_colors = [BLUE_C, GREEN_C, RED_C, YELLOW_C]

    # Leave as None for automatic bounds.
    # Override in a subclass for manual bounds.
    manual_bounds = None
    manual_step = None
    use_pi_labels = False

    def construct(self):
        if self.root_function is None:
            raise ValueError("root_function must be defined on subclass.")

        a_values = np.linspace(A_START, A_END, FRAME_COUNT)
        raw_roots = [self.root_function(a) for a in a_values]
        tracked = track_roots(raw_roots)
        root_count = tracked.shape[1]

        if self.manual_bounds is None:
            min_re, max_re, min_im, max_im = compute_complex_bounds(tracked)

            x_span = max_re - min_re
            y_span = max_im - min_im
            x_step = nice_step(x_span)
            y_step = nice_step(y_span)
        else:
            min_re, max_re, min_im, max_im = self.manual_bounds
            x_step = self.manual_step
            y_step = self.manual_step

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

        coordinate_labels = VGroup()

        if SHOW_COORDINATES:
            if self.use_pi_labels:
                coordinate_labels = add_pi_axis_labels(plane)
            else:
                plane.add_coordinates(font_size=STANDARD_COORD_LABEL_FONT_SIZE)

        title_prefix = Text(
            self.title_prefix_text,
            font=TITLE_TEXT_FONT,
            font_size=TITLE_WORD_FONT_SIZE,
            color=TITLE_COLOR,
        )

        title_math = MathTex(
            self.title_math_tex,
            font_size=TITLE_MATH_FONT_SIZE,
            color=TITLE_COLOR,
        )

        title_suffix = Text(
            self.title_suffix_text,
            font=TITLE_TEXT_FONT,
            font_size=TITLE_WORD_FONT_SIZE,
            color=TITLE_COLOR,
        )

        title = VGroup(title_prefix, title_math, title_suffix).arrange(
            RIGHT,
            buff=TITLE_PART_GAP,
        )

        formula = MathTex(
            self.formula_tex,
            font_size=FORMULA_FONT_SIZE,
            color=FORMULA_COLOR,
        )

        header = VGroup(formula, title).arrange(RIGHT, buff=HEADER_GAP)
        header.to_edge(UP, buff=HEADER_TOP_BUFF)

        header.shift(
            RIGHT * HEADER_SHIFT_RIGHT
            + DOWN * HEADER_SHIFT_DOWN
        )

        formula.shift(
            RIGHT * FORMULA_SHIFT_RIGHT
            + DOWN * FORMULA_SHIFT_DOWN
        )

        title.shift(
            RIGHT * TITLE_SHIFT_RIGHT
            + DOWN * TITLE_SHIFT_DOWN
        )

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
        real_label.shift(
            RIGHT * REAL_LABEL_SHIFT_RIGHT
            + DOWN * REAL_LABEL_SHIFT_DOWN
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
        imag_label.shift(
            RIGHT * IMAG_LABEL_SHIFT_RIGHT
            + DOWN * IMAG_LABEL_SHIFT_DOWN
        )

        frame_tracker = ValueTracker(0)

        def current_frame_value():
            return frame_tracker.get_value()

        def current_a():
            s = current_frame_value() / (FRAME_COUNT - 1)
            return A_START + s * (A_END - A_START)

        def current_roots():
            return interpolate_tracked_roots(tracked, current_frame_value())

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

        a_label = VGroup(a_label_text, a_number).arrange(
            RIGHT,
            buff=A_LABEL_GAP,
        )
        a_label.to_corner(A_LABEL_CORNER, buff=A_LABEL_CORNER_BUFF)
        a_label.shift(
            RIGHT * A_LABEL_SHIFT_RIGHT
            + DOWN * A_LABEL_SHIFT_DOWN
        )

        root_paths = VGroup()

        if SHOW_PATHS:
            for j in range(root_count):
                points = [plane.n2p(z) for z in tracked[:, j]]
                path = VMobject()
                path.set_points_smoothly(points)
                path.set_stroke(
                    self.root_colors[j % len(self.root_colors)],
                    width=PATH_STROKE_WIDTH,
                    opacity=PATH_OPACITY,
                )
                root_paths.add(path)

        dots = VGroup()

        for j in range(root_count):
            dot = Dot(
                radius=DOT_RADIUS,
                color=self.root_colors[j % len(self.root_colors)],
            )

            def make_updater(index):
                return lambda mob: mob.move_to(plane.n2p(current_roots()[index]))

            dot.add_updater(make_updater(j))
            dot.move_to(plane.n2p(tracked[0, j]))
            dots.add(dot)

        special_markers = VGroup()

        if SHOW_SPECIAL_A_MARKERS and A_START <= SPECIAL_A <= A_END:
            special_roots = sorted_initial_roots(self.root_function(SPECIAL_A))

            special_index = int(
                round(
                    (SPECIAL_A - A_START)
                    / (A_END - A_START)
                    * (FRAME_COUNT - 1)
                )
            )
            special_index = int(np.clip(special_index, 0, FRAME_COUNT - 1))
            tracked_special = tracked[special_index]

            matched_special = []
            remaining = list(special_roots)

            for z in tracked_special:
                best_i = min(
                    range(len(remaining)),
                    key=lambda i: abs(remaining[i] - z),
                )
                matched_special.append(remaining.pop(best_i))

            for z in matched_special:
                ring = Circle(
                    radius=SPECIAL_RING_RADIUS,
                    color=SPECIAL_RING_COLOR,
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
            special_text.shift(
                RIGHT * SPECIAL_TEXT_SHIFT_RIGHT
                + DOWN * SPECIAL_TEXT_SHIFT_DOWN
            )
            special_markers.add(special_text)

        self.add(plane, coordinate_labels, real_label, imag_label)
        self.add(header)
        self.add(root_paths)
        self.add(special_markers)
        self.add(dots, a_label)

        self.play(
            frame_tracker.animate.set_value(FRAME_COUNT - 1),
            run_time=RUN_TIME,
            rate_func=linear,
        )

        self.wait(1.0)


# ============================================================
# Scene 1: roots of T(x)
# ============================================================

class TRootMotion(RootMotionBase):
    root_function = staticmethod(roots_T)

    title_prefix_text = "Roots of"
    title_math_tex = r"T(x)"
    title_suffix_text = "as a varies"

    formula_tex = r"T(x)=x^4+2\pi x^2-2\pi a x+2\pi"
    root_colors = [BLUE_C, GREEN_C, RED_C, YELLOW_C]

    manual_bounds = (-5, 5, -4.5, 4.5)
    manual_step = 1
    use_pi_labels = False


# ============================================================
# Scene 2: roots of T'(x)
# ============================================================

class TPrimeRootMotion(RootMotionBase):
    root_function = staticmethod(roots_T_prime)

    title_prefix_text = "Roots of"
    title_math_tex = r"T^{\prime}(x)"
    title_suffix_text = "as a varies"

    formula_tex = r"T^{\prime}(x)=4x^3+4\pi x-2\pi a"
    root_colors = [BLUE_C, GREEN_C, RED_C]

    manual_bounds = (-np.pi, np.pi, -np.pi, np.pi)
    manual_step = np.pi / 2
    use_pi_labels = True
