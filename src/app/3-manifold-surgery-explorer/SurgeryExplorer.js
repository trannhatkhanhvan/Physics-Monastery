"use client";

import { useState } from "react";

import SurgeryComplementViewer
  from "./viewers/SurgeryComplementViewer";

import styles from "./SurgeryExplorer.module.css";


const MANIFOLD_DISPLAY = Object.freeze({
  m004: Object.freeze({
    title: "Figure-eight knot complement",
    shortName: "4₁",
    cuspCount: 1,
  }),

  m003: Object.freeze({
    title: "Figure-eight sister",
    shortName: "sister",
    cuspCount: 1,
  }),

  m129: Object.freeze({
    title: "Whitehead link complement",
    shortName: "5²₁",
    cuspCount: 2,
  }),
});


export default function SurgeryExplorer() {
  const [
    manifoldStateId,
    setManifoldStateId,
  ] = useState("m004");

  /*
   * One canonical viewer readout.
   *
   * null = ordinary idle state:
   *
   *   manifold identity
   *   interaction cue
   *
   * During surgery or a viewer warning, the active message
   * temporarily replaces that idle content.
   */
  const [
    activityReadoutLines,
    setActivityReadoutLines,
  ] = useState(null);

  const display =
    MANIFOLD_DISPLAY[
      manifoldStateId
    ] ??
    MANIFOLD_DISPLAY.m004;

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.eyebrow}>
          3-MANIFOLD SURGERY EXPLORER
        </div>

      </header>

      <div className={styles.viewerShell}>
        <SurgeryComplementViewer
          manifoldStateId={manifoldStateId}
          onManifoldStateChange={
            setManifoldStateId
          }
          onActivityReadoutChange={
            setActivityReadoutLines
          }
        />

        <div
          className={styles.stateReadout}
          role="status"
          aria-live="polite"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "2px",
            maxWidth: "620px",
          }}
        >
          {
            Array.isArray(
              activityReadoutLines
            ) &&
            activityReadoutLines.length > 0
              ? (
                  activityReadoutLines.map(
                    (
                      line,
                      index
                    ) => (
                      <span
                        key={
                          `${line}-${index}`
                        }
                      >
                        {line}
                      </span>
                    )
                  )
                )
              : (
                  <>
                    <span>
                      <span>
                        {display.shortName}
                      </span>

                      <span
                        className={
                          styles.stateDivider
                        }
                      >
                        {" · "}
                      </span>

                      <span>
                        {manifoldStateId}
                      </span>

                      <span
                        className={
                          styles.stateDivider
                        }
                      >
                        {" · "}
                      </span>

                      <span>
                        {display.cuspCount}{" "}
                        {
                          display.cuspCount === 1
                            ? "cusp"
                            : "cusps"
                        }
                      </span>
                    </span>

                    <span
                      style={{
                        fontSize: "0.82em",
                        opacity: 0.68,
                      }}
                    >
                      drag to rotate · scroll to zoom
                    </span>
                  </>
                )
          }
        </div>
      </div>
    </main>
  );
}
