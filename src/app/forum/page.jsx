"use client";

import React, { useMemo, useState } from "react";
import LayoutWrapper from "@/components/LayoutWrapper";
import "../globals.css";

const THREADS = [
  {
    id: "figure-eight-knot",
    title: "The Figure-eight Knot and the Hyperbolic Partition Equation",
    category: "Foundations",
    channel: "#public-research-forum",
    tags: ["hyperbolic geometry", "figure-eight knot", "partition equation"],
    excerpt:
      "A focused discussion on whether the quartic partition equation shares the algebraic skeleton of the figure-eight knot complement.",
    messages: 18,
    updated: "June 19, 2026",
    featured: true,
  },
  {
    id: "planck-boundaries",
    title: "Closed-form Candidates for the Five Planck Boundaries",
    category: "Constants of Nature",
    channel: "#public-book-discussion",
    tags: ["Planck units", "CODATA", "closed forms"],
    excerpt:
      "A thread on the five Planck boundaries, their digit strings, exponent structure, and possible hyperbolic closed forms.",
    messages: 24,
    updated: "June 18, 2026",
    featured: true,
  },
  {
    id: "imaginary-golden-ratio",
    title: "The Imaginary Golden Ratio as a Sixth-root Phase",
    category: "Mathematical Notes",
    channel: "#public-math-questions",
    tags: ["complex roots", "phase geometry", "notation"],
    excerpt:
      "A note on preserving the notation φᵢ = (1 + √3 i)/2 as the principal sixth-root phase.",
    messages: 9,
    updated: "June 14, 2026",
    featured: true,
  },
  {
    id: "number-walls",
    title: "Number Walls and Constant Digit Sequences",
    category: "Website Development",
    channel: "#public-site-feedback",
    tags: ["number walls", "sequences", "site tools"],
    excerpt:
      "Discussion about adding number-wall visualizations for constants, including the model speed of light digit sequence.",
    messages: 11,
    updated: "June 16, 2026",
    featured: false,
  },
  {
    id: "manuscript-chapter-review",
    title: "Chapter Review: Arithmetic Signatures of the Figure-eight Knot",
    category: "Manuscript Discussion",
    channel: "#public-book-discussion",
    tags: ["chapter review", "figure-eight knot", "arithmetic structure"],
    excerpt:
      "A placeholder thread for public-facing discussion of manuscript structure, terminology, and mathematical clarity.",
    messages: 15,
    updated: "June 12, 2026",
    featured: false,
  },
  {
    id: "general-questions",
    title: "Questions About the Physics Monastery Framework",
    category: "Questions",
    channel: "#public-questions",
    tags: ["questions", "orientation", "framework"],
    excerpt:
      "A public thread for careful questions about the basic ideas, notation, claims, and structure of the project.",
    messages: 7,
    updated: "June 10, 2026",
    featured: false,
  },
];

const CATEGORIES = [
  "All",
  "Foundations",
  "Constants of Nature",
  "Hyperbolic Geometry",
  "Mathematical Notes",
  "Manuscript Discussion",
  "Website Development",
  "Questions",
];

const RULES = [
  {
    title: "Read publicly",
    text:
      "Visitors may read selected public threads mirrored from the Physics Monastery Discord.",
  },
  {
    title: "Post in Discord",
    text:
      "New discussions and replies happen inside Discord, not directly on this website.",
  },
  {
    title: "Publish by approval",
    text:
      "Only approved channels or explicitly tagged threads should appear in this public archive.",
  },
];

export default function ForumPage() {
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredThreads = useMemo(() => {
    if (selectedCategory === "All") return THREADS;
    return THREADS.filter((thread) => thread.category === selectedCategory);
  }, [selectedCategory]);

  const featuredThreads = THREADS.filter((thread) => thread.featured);

  return (
    <LayoutWrapper>
      {/* Shared background overlay */}
      <div
        className="symbol-overlay"
        style={{
          left: 0,
          width: "100vw",
        }}
      />

      {/* Page content */}
      <div
        className="partition-content forum-content"
        style={{
          width: "min(1400px, calc(100vw - 220px))",
          maxWidth: "none",
        }}
      >
        <div className="forum-kicker">Public Reading Room</div>

        <div className="legend-title forum-title">public forum archive</div>

        <p className="equation-description forum-intro">
          Selected discussions from the Physics Monastery Discord are mirrored
          here as a public, read-only archive. To participate in the
          conversation, join the Discord.
        </p>

        <div className="forum-rule-grid">
          {RULES.map((rule) => (
            <div key={rule.title} className="forum-rule-card">
              <h2>{rule.title}</h2>
              <p>{rule.text}</p>
            </div>
          ))}
        </div>

        <section className="forum-section">
          <div className="forum-section-header">
            <h2>Current Research Threads</h2>
            <span>Featured public discussions</span>
          </div>

          <div className="forum-thread-grid">
            {featuredThreads.map((thread) => (
              <ThreadCard key={thread.id} thread={thread} />
            ))}
          </div>
        </section>

        <div className="forum-category-section">
          <h2>Archive Categories</h2>

          <div className="forum-category-row">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={
                  selectedCategory === category
                    ? "forum-category-button active"
                    : "forum-category-button"
                }
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <section className="forum-section">
          <div className="forum-section-header">
            <h2>
              {selectedCategory === "All"
                ? "Discussion Archive"
                : selectedCategory}
            </h2>

            <span>
              {filteredThreads.length} thread
              {filteredThreads.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="forum-thread-grid">
            {filteredThreads.map((thread) => (
              <ThreadCard key={thread.id} thread={thread} />
            ))}
          </div>
        </section>

        <div className="forum-dev-note">
          <strong>Development note:</strong> Discord sync is not connected yet.
          The threads shown here are placeholders for design and planning. Later,
          approved Discord forum threads will populate this archive
          automatically.
        </div>
      </div>

      <style jsx global>{`
        .main-content.forum-page {
          background-image: url("/physics_monastery_background.jpg") !important;
          background-size: cover !important;
          background-position: center !important;
          background-attachment: fixed !important;
          min-height: 100vh !important;
        }

        .forum-content {
          font-family: "Times New Roman", Times, serif;
          color: white;
          padding-top: 2.5rem;
          padding-bottom: 6rem;
        }

        .forum-kicker {
          text-align: center;
          color: #d8d1b8;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          font-size: 0.82rem;
          margin-bottom: 0.8rem;
        }

        .forum-title {
          margin-bottom: 1.4rem !important;
        }

        .forum-intro {
          max-width: 900px !important;
          margin: 0 auto 2.2rem !important;
          font-size: 1.1rem;
          text-align: center !important;
          text-indent: 0 !important;
          line-height: 1.55 !important;
        }

        .forum-rule-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1rem;
          max-width: 1100px;
          margin: 0 auto 3rem;
        }

        .forum-rule-card {
          border: 1px solid rgba(216, 209, 184, 0.22);
          background: rgba(255, 255, 255, 0.035);
          border-radius: 18px;
          padding: 1.2rem;
          min-height: 145px;
        }

        .forum-rule-card h2 {
          margin: 0 0 0.75rem;
          font-weight: 500;
          font-size: 1.1rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #d8d1b8;
        }

        .forum-rule-card p {
          margin: 0;
          color: rgba(244, 239, 225, 0.76);
          line-height: 1.55;
          font-size: 1rem;
        }

        .forum-category-section {
          max-width: 1100px;
          margin: 0 auto 3rem;
          border: 1px solid rgba(216, 209, 184, 0.18);
          background: rgba(255, 255, 255, 0.025);
          border-radius: 18px;
          padding: 1.2rem;
        }

        .forum-category-section h2 {
          margin: 0 0 0.75rem;
          font-weight: 500;
          font-size: 1.1rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #d8d1b8;
        }

        .forum-category-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.55rem;
        }

        .forum-category-button {
          cursor: pointer;
          color: rgba(244, 239, 225, 0.78);
          background: transparent;
          border: 1px solid rgba(216, 209, 184, 0.2);
          border-radius: 999px;
          padding: 0.62rem 0.9rem;
          font-family: "Times New Roman", Times, serif;
          font-size: 1rem;
        }

        .forum-category-button:hover {
          color: #ffcc00;
          border-color: rgba(255, 204, 0, 0.65);
        }

        .forum-category-button.active {
          color: #050505;
          background: #d8d1b8;
          border-color: #d8d1b8;
        }

        .forum-section {
          max-width: 1100px;
          margin: 0 auto 3rem;
        }

        .forum-section-header {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          align-items: baseline;
          margin-bottom: 1rem;
          border-bottom: 1px solid rgba(216, 209, 184, 0.16);
          padding-bottom: 0.75rem;
        }

        .forum-section-header h2 {
          margin: 0;
          font-size: 1.55rem;
          font-weight: 500;
          color: #f4efe1;
        }

        .forum-section-header span {
          color: rgba(244, 239, 225, 0.52);
          font-size: 0.95rem;
        }

        .forum-thread-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
        }

        .forum-thread-card {
          border: 1px solid rgba(216, 209, 184, 0.18);
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.052),
            rgba(255, 255, 255, 0.026)
          );
          border-radius: 22px;
          padding: 1.25rem;
          min-height: 245px;
          display: flex;
          flex-direction: column;
        }

        .forum-thread-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 0.6rem;
          align-items: center;
          color: rgba(244, 239, 225, 0.54);
          font-size: 0.9rem;
          margin-bottom: 0.85rem;
        }

        .forum-category-pill {
          color: #050505;
          background: #d8d1b8;
          border-radius: 999px;
          padding: 0.25rem 0.58rem;
          font-size: 0.82rem;
        }

        .forum-thread-card h3 {
          margin: 0;
          color: #f4efe1;
          font-size: 1.35rem;
          line-height: 1.25;
          font-weight: 500;
        }

        .forum-excerpt {
          color: rgba(244, 239, 225, 0.72);
          line-height: 1.6;
          margin: 0.85rem 0 1rem;
          font-size: 1.03rem;
        }

        .forum-tag-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
          margin-top: auto;
        }

        .forum-tag {
          border: 1px solid rgba(216, 209, 184, 0.18);
          color: rgba(244, 239, 225, 0.65);
          border-radius: 999px;
          padding: 0.28rem 0.58rem;
          font-size: 0.82rem;
        }

        .forum-card-footer {
          display: flex;
          flex-wrap: wrap;
          gap: 0.9rem;
          border-top: 1px solid rgba(216, 209, 184, 0.14);
          margin-top: 1rem;
          padding-top: 0.8rem;
          color: rgba(244, 239, 225, 0.52);
          font-size: 0.9rem;
        }

        .forum-dev-note {
          max-width: 1100px;
          margin: 0 auto;
          border-top: 1px solid rgba(216, 209, 184, 0.16);
          padding-top: 1rem;
          color: rgba(244, 239, 225, 0.55);
          font-size: 0.92rem;
          line-height: 1.5;
        }

        .forum-dev-note strong {
          color: rgba(244, 239, 225, 0.75);
          font-weight: normal;
        }

        @media (max-width: 1100px) {
          .forum-rule-grid {
            grid-template-columns: 1fr;
          }

          .forum-thread-grid {
            grid-template-columns: 1fr;
          }

          .forum-content {
            width: min(100% - 2rem, 900px) !important;
          }
        }

        @media (max-width: 700px) {
          .forum-section-header {
            display: grid;
            gap: 0.35rem;
          }

          .forum-intro {
            font-size: 1.02rem;
          }
        }
      `}</style>
    </LayoutWrapper>
  );
}

function ThreadCard({ thread }) {
  return (
    <article className="forum-thread-card">
      <div className="forum-thread-meta">
        <span className="forum-category-pill">{thread.category}</span>
        <span>{thread.channel}</span>
      </div>

      <h3>{thread.title}</h3>

      <p className="forum-excerpt">{thread.excerpt}</p>

      <div className="forum-tag-row">
        {thread.tags.map((tag) => (
          <span key={tag} className="forum-tag">
            {tag}
          </span>
        ))}
      </div>

      <div className="forum-card-footer">
        <span>{thread.messages} messages</span>
        <span>Updated {thread.updated}</span>
      </div>
    </article>
  );
}