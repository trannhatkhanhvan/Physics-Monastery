from manim import *

config.background_color = BLACK
config.pixel_width = 1920
config.pixel_height = 1080
config.frame_width = 16
config.frame_height = 9


class PartitionRootsAnimation(Scene):
    def construct(self):
        # ------------------------------------------------------------
        # FILE PATHS
        # ------------------------------------------------------------

        BACKGROUND_IMAGE_PATH = (
            "/Users/thadroberts/physics-monastery-site/public/physics_monastery_background.jpg"
        )

        # ------------------------------------------------------------
        # BACKGROUND CONTROLS
        # ------------------------------------------------------------

        BACKGROUND_FILTER_OPACITY = 0.65

        # ------------------------------------------------------------
        # LATEX TEMPLATE: TIMES NEW ROMAN
        # ------------------------------------------------------------

        tex_template = TexTemplate(
            tex_compiler="xelatex",
            output_format=".xdv",
        )

        tex_template.add_to_preamble(
            r"""
            \usepackage{fontspec}
            \setmainfont{Times New Roman}
            """
        )

        # ------------------------------------------------------------
        # TEXT CONTROLS
        # ------------------------------------------------------------

        TEXT_COLOR = WHITE

        TEXT_X = 0
        TEXT_Y = 2.5

        TEXT_FONT_SIZE = 36

        WRITE_TIME = 1.6
        HOLD_TIME = 1.0

        # ------------------------------------------------------------
        # BACKGROUND IMAGE
        # ------------------------------------------------------------

        background = ImageMobject(BACKGROUND_IMAGE_PATH)

        background.scale_to_fit_width(config.frame_width)
        if background.height < config.frame_height:
            background.scale_to_fit_height(config.frame_height)

        background.move_to(ORIGIN)

        background_filter = Rectangle(
            width=config.frame_width,
            height=config.frame_height,
            stroke_width=0,
            fill_color=BLACK,
            fill_opacity=BACKGROUND_FILTER_OPACITY,
        )
        background_filter.move_to(ORIGIN)

        self.add(background)
        self.add(background_filter)

        # ------------------------------------------------------------
        # BRIDGE TEXT
        # ------------------------------------------------------------

        bridge_text = Tex(
            r"and by our",
            tex_template=tex_template,
            font_size=TEXT_FONT_SIZE,
            color=TEXT_COLOR,
        )

        bridge_text.move_to([TEXT_X, TEXT_Y, 0])

        # ------------------------------------------------------------
        # ANIMATION
        # ------------------------------------------------------------

        self.play(Write(bridge_text), run_time=WRITE_TIME)
        self.wait(HOLD_TIME)