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

        BACKGROUND_FILTER_OPACITY = 0.65   # try 0.45, 0.55, 0.65, 0.75

        # ------------------------------------------------------------
        # FONT / COLOR CONTROLS
        # ------------------------------------------------------------

        FONT = "Times New Roman"

        TEXT_COLOR = "#d8d1b8"   # warm muted white
        # TEXT_COLOR = WHITE     # use this instead if you want pure white

        TITLE_FONT_SIZE = 32
        NAME_FONT_SIZE = 32

        # ------------------------------------------------------------
        # POSITION CONTROLS
        # ------------------------------------------------------------

        TITLE_X = 0
        TITLE_Y = 2.55

        LEFT_COLUMN_LEFT_X = -4.4
        RIGHT_COLUMN_LEFT_X = 1.0

        NAMES_TOP_Y = 1.45

        INSTITUTION_GAP = 0.65
        LINE_SPACING = 0.18

        # ------------------------------------------------------------
        # ANIMATION CONTROLS
        # ------------------------------------------------------------

        TITLE_WRITE_TIME = 1.4
        BLOCK_WRITE_TIME = 6.0
        HOLD_TIME = 1.5

        # ------------------------------------------------------------
        # HELPERS
        # ------------------------------------------------------------

        def place_by_left_and_top(mobject, left_x, top_y):
            mobject.shift(RIGHT * (left_x - mobject.get_left()[0]))
            mobject.shift(UP * (top_y - mobject.get_top()[1]))

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
        # TITLE
        # ------------------------------------------------------------

        title = Text(
            "This research has been made possible by:",
            font=FONT,
            font_size=TITLE_FONT_SIZE,
            color=TEXT_COLOR,
        )
        title.move_to([TITLE_X, TITLE_Y, 0])

        # ------------------------------------------------------------
        # LEFT COLUMN
        # ------------------------------------------------------------

        left_names = [
            "Angela Arvizu",
            "Vanessa Moon",
            "Matthew Fox",
            "David Heggli",
            "Eschelon Azha",
            "Avi Rubin",
            "Wayne Eskridge",
        ]

        left_column = VGroup(*[
            Text(
                name,
                font=FONT,
                font_size=NAME_FONT_SIZE,
                color=TEXT_COLOR,
            )
            for name in left_names
        ])

        left_column.arrange(DOWN, aligned_edge=LEFT, buff=LINE_SPACING)
        place_by_left_and_top(left_column, LEFT_COLUMN_LEFT_X, NAMES_TOP_Y)

        # ------------------------------------------------------------
        # RIGHT COLUMN
        # ------------------------------------------------------------

        right_names = [
            "Kevin Sirios",
            "Mike Ritter",
            "Jerry Gardner",
            "Shauna Montgomery",
        ]

        right_column = VGroup(*[
            Text(
                name,
                font=FONT,
                font_size=NAME_FONT_SIZE,
                color=TEXT_COLOR,
            )
            for name in right_names
        ])

        right_column.arrange(DOWN, aligned_edge=LEFT, buff=LINE_SPACING)
        place_by_left_and_top(right_column, RIGHT_COLUMN_LEFT_X, NAMES_TOP_Y)

        # ------------------------------------------------------------
        # RIGHT BOTTOM CREDITS
        # ------------------------------------------------------------

        right_bottom_names = [
            "NIST/CODATA",
            "WolframAlpha",
        ]

        right_bottom = VGroup(*[
            Text(
                name,
                font=FONT,
                font_size=NAME_FONT_SIZE,
                color=TEXT_COLOR,
            )
            for name in right_bottom_names
        ])

        right_bottom.arrange(DOWN, aligned_edge=LEFT, buff=LINE_SPACING)

        right_bottom_top_y = right_column.get_bottom()[1] - INSTITUTION_GAP
        place_by_left_and_top(right_bottom, RIGHT_COLUMN_LEFT_X, right_bottom_top_y)

        # ------------------------------------------------------------
        # WRITE ORDER
        # left-to-right, then top-to-down
        # ------------------------------------------------------------

        names_write_order = VGroup(
            left_column[0], right_column[0],
            left_column[1], right_column[1],
            left_column[2], right_column[2],
            left_column[3], right_column[3],
            left_column[4],
            left_column[5],
            left_column[6],
            right_bottom[0],
            right_bottom[1],
        )

        # ------------------------------------------------------------
        # AUTO-FIT WHOLE PAGE
        # ------------------------------------------------------------

        all_content = Group(
            title,
            left_column,
            right_column,
            right_bottom,
        )

        MAX_CONTENT_WIDTH = 14.8
        MAX_CONTENT_HEIGHT = 7.8

        if all_content.width > MAX_CONTENT_WIDTH:
            all_content.scale_to_fit_width(MAX_CONTENT_WIDTH)

        if all_content.height > MAX_CONTENT_HEIGHT:
            all_content.scale_to_fit_height(MAX_CONTENT_HEIGHT)

        all_content.move_to([0, 0, 0])

        # ------------------------------------------------------------
        # ANIMATION
        # ------------------------------------------------------------

        self.play(Write(title), run_time=TITLE_WRITE_TIME)
        self.wait(0.3)

        self.play(
            Write(names_write_order),
            run_time=BLOCK_WRITE_TIME,
        )

        self.wait(HOLD_TIME)