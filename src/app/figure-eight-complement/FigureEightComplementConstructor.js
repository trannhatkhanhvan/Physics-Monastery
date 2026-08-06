"use client";

import { useState } from "react";
import styles from "./FigureEightComplementConstructor.module.css";

function IntervalLesson() {
  const [identified, setIdentified] = useState(false);

  return (
    <section className={styles.lesson}>
      <div className={styles.copy}>
        <p className={styles.eyebrow}>Identification lesson 1</p>
        <h2>Build a circle from a line segment</h2>
        <p>
          The two endpoints begin as separate points. Identifying them means
          declaring that both endpoint locations represent one point.
        </p>
        <div className={styles.controls}>
          <button
            type="button"
            onClick={() => setIdentified(true)}
            disabled={identified}
          >
            Identify endpoints
          </button>
          <button
            type="button"
            className={styles.secondary}
            onClick={() => setIdentified(false)}
          >
            Reset
          </button>
        </div>
      </div>

      <div className={styles.visual}>
        <svg
          viewBox="0 0 720 430"
          role="img"
          aria-label="A line segment identified into a circle"
        >
          {identified ? (
            <>
              <circle
                cx="360"
                cy="210"
                r="135"
                className={styles.mainLine}
              />
              <circle
                cx="360"
                cy="75"
                r="8"
                className={styles.endpoint}
              />
              <text x="376" y="82" className={styles.svgText}>
                A
              </text>
              <text
                x="360"
                y="390"
                textAnchor="middle"
                className={styles.svgText}
              >
                The two endpoints now represent one point.
              </text>
            </>
          ) : (
            <>
              <line
                x1="120"
                y1="210"
                x2="600"
                y2="210"
                className={styles.mainLine}
              />
              <circle
                cx="120"
                cy="210"
                r="8"
                className={styles.endpoint}
              />
              <circle
                cx="600"
                cy="210"
                r="8"
                className={styles.endpoint}
              />
              <text x="112" y="185" className={styles.svgText}>
                A
              </text>
              <text x="592" y="185" className={styles.svgText}>
                A
              </text>
              <text
                x="360"
                y="390"
                textAnchor="middle"
                className={styles.svgText}
              >
                The endpoints are still separate.
              </text>
            </>
          )}
        </svg>
      </div>
    </section>
  );
}

function TorusPicture({ order }) {
  if (order.length === 0) {
    return (
      <svg
        viewBox="0 0 720 430"
        role="img"
        aria-label="A square with paired opposite edges"
      >
        <rect
          x="205"
          y="55"
          width="310"
          height="300"
          className={styles.surface}
        />
        <line
          x1="205"
          y1="55"
          x2="515"
          y2="55"
          className={styles.orangeSeam}
        />
        <line
          x1="205"
          y1="355"
          x2="515"
          y2="355"
          className={styles.orangeSeam}
        />
        <line
          x1="205"
          y1="55"
          x2="205"
          y2="355"
          className={styles.blueSeam}
        />
        <line
          x1="515"
          y1="55"
          x2="515"
          y2="355"
          className={styles.blueSeam}
        />
        <text
          x="360"
          y="400"
          textAnchor="middle"
          className={styles.svgText}
        >
          Square: no edge pairs identified
        </text>
      </svg>
    );
  }

  if (order.length === 1) {
    const firstColor =
      order[0] === "orange" ? styles.orangeStroke : styles.blueStroke;
    const remainingColor =
      order[0] === "orange" ? styles.blueStroke : styles.orangeStroke;

    return (
      <svg
        viewBox="0 0 720 430"
        role="img"
        aria-label="A cylinder after one edge identification"
      >
        <ellipse
          cx="360"
          cy="95"
          rx="145"
          ry="48"
          className={`${styles.surface} ${firstColor}`}
        />
        <line
          x1="215"
          y1="95"
          x2="215"
          y2="325"
          className={styles.sideLine}
        />
        <line
          x1="505"
          y1="95"
          x2="505"
          y2="325"
          className={styles.sideLine}
        />
        <ellipse
          cx="360"
          cy="325"
          rx="145"
          ry="48"
          className={`${styles.surface} ${remainingColor}`}
        />
        <text
          x="360"
          y="400"
          textAnchor="middle"
          className={styles.svgText}
        >
          Cylinder: one edge pair identified
        </text>
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 720 430"
      role="img"
      aria-label="A torus after both edge identifications"
    >
      <ellipse
        cx="360"
        cy="205"
        rx="205"
        ry="145"
        className={styles.torusBody}
      />
      <ellipse
        cx="360"
        cy="205"
        rx="82"
        ry="55"
        className={styles.torusHole}
      />
      <ellipse
        cx="360"
        cy="205"
        rx="205"
        ry="145"
        className={styles.orangeGuide}
      />
      <ellipse
        cx="360"
        cy="205"
        rx="82"
        ry="55"
        className={styles.blueGuide}
      />
      <text
        x="360"
        y="400"
        textAnchor="middle"
        className={styles.svgText}
      >
        Torus: both edge pairs identified
      </text>
    </svg>
  );
}

function TorusLesson() {
  const [order, setOrder] = useState([]);

  function identify(pair) {
    setOrder((currentOrder) =>
      currentOrder.includes(pair)
        ? currentOrder
        : [...currentOrder, pair]
    );
  }

  return (
    <section className={styles.lesson}>
      <div className={styles.copy}>
        <p className={styles.eyebrow}>Identification lesson 2</p>
        <h2>Build a torus from a square</h2>
        <p>
          Identify either pair of opposite edges first. The first pairing makes
          a cylinder. The remaining pairing closes the cylinder into a torus.
        </p>

        <div className={styles.controls}>
          <button
            type="button"
            className={styles.orangeButton}
            onClick={() => identify("orange")}
            disabled={order.includes("orange")}
          >
            Identify orange edges
          </button>

          <button
            type="button"
            className={styles.blueButton}
            onClick={() => identify("blue")}
            disabled={order.includes("blue")}
          >
            Identify blue edges
          </button>
        </div>

        <div className={styles.controls}>
          <button
            type="button"
            className={styles.secondary}
            onClick={() =>
              setOrder((currentOrder) => currentOrder.slice(0, -1))
            }
            disabled={order.length === 0}
          >
            Undo last
          </button>

          <button
            type="button"
            className={styles.secondary}
            onClick={() => setOrder([])}
          >
            Reset
          </button>
        </div>
      </div>

      <div className={styles.visual}>
        <TorusPicture order={order} />
      </div>
    </section>
  );
}

export default function FigureEightComplementConstructor() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Interactive geometry</p>
        <h1>Figure-Eight Complement Constructor</h1>
        <p>
          Begin with familiar quotient constructions. The next stage will use
          the same identification logic to truncate and glue the canonical pair
          of tetrahedra for the figure-eight knot complement.
        </p>
      </header>

      <IntervalLesson />
      <TorusLesson />

      <section className={styles.preview}>
        <p className={styles.eyebrow}>Next patch</p>
        <h2>Two tetrahedra and eight ideal vertices</h2>
        <p>
          We will add the rotatable tetrahedra and the truncation step next.
          The face-pairing stage will use verified figure-eight data rather than
          an invented pairing.
        </p>
      </section>
    </main>
  );
}
