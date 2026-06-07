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

        PATREON_LOGO_PATH = (
            "/Users/thadroberts/physics-monastery-site/public/images/patreon-logo_1.png"
        )

        # Save your background image somewhere on your Mac and point to it here
        BACKGROUND_IMAGE_PATH = "/Users/thadroberts/physics-monastery-site/public/physics_monastery_background.jpg"
        # ------------------------------------------------------------
        # BACKGROUND CONTROLS
        # ------------------------------------------------------------

        BACKGROUND_FILTER_OPACITY = 0.65   # try 0.25, 0.40, 0.55, etc.

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

        TEXT_COLOR = WHITE

        TITLE_FONT_SIZE = 36
        BODY_FONT_SIZE = 28

        # ------------------------------------------------------------
        # HEADER CONTROLS
        # ------------------------------------------------------------

        HEADER_X = 0.0
        HEADER_Y = 3.45

        LOGO_HEIGHT = 0.70
        LOGO_GAP = 0.35

        # ------------------------------------------------------------
        # PAGE POSITION CONTROLS
        # ------------------------------------------------------------

        LEFT_X = -6.35
        LEFT_TOP_Y = 2.35

        RIGHT_X = 1.00
        RIGHT_TOP_Y = 2.35

        # ------------------------------------------------------------
        # TABLE SPACING CONTROLS
        # ------------------------------------------------------------

        LEFT_NAME_COLUMN_WIDTH_CM = 3.25
        RIGHT_NAME_COLUMN_WIDTH_CM = 3.20

        ROW_HEIGHT = 1.08

        GAP_AFTER_NATURAL = 0.40
        GAP_AFTER_FRIAR = 0.35
        GAP_AFTER_ADVOCATE = 0.35

        # ------------------------------------------------------------
        # AUTO-FIT CONTROLS
        # ------------------------------------------------------------

        MAX_CONTENT_WIDTH = 15.2
        MAX_CONTENT_HEIGHT = 8.0

        CONTENT_X = 0
        CONTENT_Y = 0

        # ------------------------------------------------------------
        # ANIMATION CONTROLS
        # ------------------------------------------------------------

        HEADER_WRITE_TIME = 1.2
        LOGO_FADE_TIME = 0.5

        NATURAL_WRITE_TIME = 1.2
        FRIAR_WRITE_TIME = 0.8
        ADVOCATE_WRITE_TIME = 0.8
        VOLUNTEER_WRITE_TIME = 4.0

        HOLD_TIME = 1.0

        # ------------------------------------------------------------
        # HELPERS
        # ------------------------------------------------------------

        def place_left_top(mobject, left_x, top_y):
            mobject.shift(RIGHT * (left_x - mobject.get_left()[0]))
            mobject.shift(UP * (top_y - mobject.get_top()[1]))

        def make_table(rows, name_column_width_cm):
            latex_rows = []

            for name, role in rows:
                latex_rows.append(
                    rf"{name} & {role}"
                )

            table_tex = (
                rf"\renewcommand{{\arraystretch}}{{{ROW_HEIGHT}}}"
                rf"\begin{{tabular}}{{@{{}}p{{{name_column_width_cm}cm}}@{{}}l@{{}}}}"
                + r" \\ ".join(latex_rows)
                + r"\end{tabular}"
            )

            return Tex(
                table_tex,
                tex_template=tex_template,
                font_size=BODY_FONT_SIZE,
                color=TEXT_COLOR,
            )

        # ------------------------------------------------------------
        # BACKGROUND IMAGE
        # ------------------------------------------------------------

        background = ImageMobject(BACKGROUND_IMAGE_PATH)

        # Scale to fill the whole 16:9 frame
        background.scale_to_fit_width(config.frame_width)
        if background.height < config.frame_height:
            background.scale_to_fit_height(config.frame_height)

        background.move_to(ORIGIN)

        # Dark overlay / filter layer
        background_filter = Rectangle(
            width=config.frame_width,
            height=config.frame_height,
            stroke_width=0,
            fill_color=BLACK,
            fill_opacity=BACKGROUND_FILTER_OPACITY,
        )
        background_filter.move_to(ORIGIN)

        # Put background behind everything
        self.add(background)
        self.add(background_filter)

        # ------------------------------------------------------------
        # HEADER
        # ------------------------------------------------------------

        header_text = Tex(
            r"Patreon Supporters",
            tex_template=tex_template,
            font_size=TITLE_FONT_SIZE,
            color=TEXT_COLOR,
        )

        patreon_logo = ImageMobject(PATREON_LOGO_PATH)
        patreon_logo.scale_to_fit_height(LOGO_HEIGHT)

        header = Group(header_text, patreon_logo)
        header.arrange(RIGHT, buff=LOGO_GAP, aligned_edge=DOWN)
        header.move_to([HEADER_X, HEADER_Y, 0])

        # ------------------------------------------------------------
        # DATA TABLES
        # ------------------------------------------------------------

        natural_rows = [
            ("Tim Dodge", "Natural Philosopher"),
            ("Attie Retief", "Natural Philosopher"),
            ("Seth Lamancusa", "Natural Philosopher"),
        ]

        friar_rows = [
            ("Bráulio Oliveira", "Friar"),
            ("InvaderH", "Friar"),
        ]

        advocate_rows = [
            ("Mike Godzina", "Advocate"),
            ("L", "Advocate"),
        ]

        left_volunteer_rows = [
            ("Cully O'Meara", "Volunteer"),
            ("Joakim Pettersson", "Volunteer"),
            ("Duarte Cunha Leão", "Volunteer"),
            ("Rongomai Bailey", "Volunteer"),
            ("Yishai Mendelsohn", "Volunteer"),
            ("Harvey Summers", "Volunteer"),
            ("Tyler Weldon", "Volunteer"),
        ]

        right_volunteer_rows = [
            ("Michael Jacobson", "Volunteer"),
            ("Gregg Stadhams", "Volunteer"),
            ("Titanium Heart", "Volunteer"),
            ("Alex Shevchenko", "Volunteer"),
            ("Christoph Schiller", "Volunteer"),
            ("Joseph Mavor", "Volunteer"),
            ("James Rohan", "Volunteer"),
            ("Nikhil", "Volunteer"),
            ("Colleen", "Volunteer"),
            ("Chuck", "Volunteer"),
            ("bspidel", "Volunteer"),
            ("beads", "Volunteer"),
            ("Jim", "Volunteer"),
            ("Dan Girshovich", "Volunteer"),
            ("lmcc", "Volunteer"),
            ("Sarah-Stisnt", "Volunteer"),
        ]

        # ------------------------------------------------------------
        # BUILD LEFT SIDE GROUPS
        # ------------------------------------------------------------

        natural_group = make_table(
            natural_rows,
            LEFT_NAME_COLUMN_WIDTH_CM,
        )
        place_left_top(natural_group, LEFT_X, LEFT_TOP_Y)

        friar_group = make_table(
            friar_rows,
            LEFT_NAME_COLUMN_WIDTH_CM,
        )
        place_left_top(
            friar_group,
            LEFT_X,
            natural_group.get_bottom()[1] - GAP_AFTER_NATURAL,
        )

        advocate_group = make_table(
            advocate_rows,
            LEFT_NAME_COLUMN_WIDTH_CM,
        )
        place_left_top(
            advocate_group,
            LEFT_X,
            friar_group.get_bottom()[1] - GAP_AFTER_FRIAR,
        )

        left_volunteer_group = make_table(
            left_volunteer_rows,
            LEFT_NAME_COLUMN_WIDTH_CM,
        )
        place_left_top(
            left_volunteer_group,
            LEFT_X,
            advocate_group.get_bottom()[1] - GAP_AFTER_ADVOCATE,
        )

        # ------------------------------------------------------------
        # BUILD RIGHT SIDE VOLUNTEERS
        # ------------------------------------------------------------

        right_volunteer_group = make_table(
            right_volunteer_rows,
            RIGHT_NAME_COLUMN_WIDTH_CM,
        )
        place_left_top(right_volunteer_group, RIGHT_X, RIGHT_TOP_Y)

        all_volunteers = VGroup(
            left_volunteer_group,
            right_volunteer_group,
        )

        # ------------------------------------------------------------
        # AUTO-FIT WHOLE PAGE
        # ------------------------------------------------------------

        all_content = Group(
            header,
            natural_group,
            friar_group,
            advocate_group,
            left_volunteer_group,
            right_volunteer_group,
        )

        if all_content.width > MAX_CONTENT_WIDTH:
            all_content.scale_to_fit_width(MAX_CONTENT_WIDTH)

        if all_content.height > MAX_CONTENT_HEIGHT:
            all_content.scale_to_fit_height(MAX_CONTENT_HEIGHT)

        all_content.move_to([CONTENT_X, CONTENT_Y, 0])

        # ------------------------------------------------------------
        # ANIMATION ORDER
        # ------------------------------------------------------------

        self.play(Write(header_text), run_time=HEADER_WRITE_TIME)
        self.play(FadeIn(patreon_logo), run_time=LOGO_FADE_TIME)
        self.wait(0.25)

        self.play(Write(natural_group), run_time=NATURAL_WRITE_TIME)
        self.wait(0.12)

        self.play(Write(friar_group), run_time=FRIAR_WRITE_TIME)
        self.wait(0.12)

        self.play(Write(advocate_group), run_time=ADVOCATE_WRITE_TIME)
        self.wait(0.12)

        self.play(Write(all_volunteers), run_time=VOLUNTEER_WRITE_TIME)

        self.wait(HOLD_TIME)