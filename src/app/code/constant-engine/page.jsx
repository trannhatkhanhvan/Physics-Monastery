import fs from "fs";
import path from "path";
import LayoutWrapper from "@/components/LayoutWrapper";
import "../../globals.css";

export const dynamic = "force-dynamic";

const INPUT_PARAMETER_DISPLAY_DIGITS = 15;

function formatInputParameterValue(value, digitLimit = INPUT_PARAMETER_DISPLAY_DIGITS) {
    const text = String(value || "");

    return text.replace(/[+-]?(?:\d+\.\d+|\d+|\.\d+)(?:[eE][+-]?\d+)?/g, (match) => {
        const exponentMatch = match.match(/([eE][+-]?\d+)$/);
        const exponent = exponentMatch ? exponentMatch[1] : "";
        const body = exponent ? match.slice(0, -exponent.length) : match;

        const sign = body.startsWith("-") || body.startsWith("+") ? body[0] : "";
        const unsigned = sign ? body.slice(1) : body;

        const dotIndex = unsigned.indexOf(".");
        const digits = unsigned.replace(/\./g, "");

        if (digits.length <= digitLimit) {
            return match;
        }

        const trimmedDigits = digits.slice(0, digitLimit);

        let rebuilt;

        if (dotIndex === -1) {
            rebuilt = trimmedDigits;
        } else {
            const integerDigitCount = unsigned.slice(0, dotIndex).length;

            if (integerDigitCount >= digitLimit) {
                rebuilt = trimmedDigits;
            } else {
                const beforeDecimal = trimmedDigits.slice(0, integerDigitCount) || "0";
                const afterDecimal = trimmedDigits.slice(integerDigitCount);
                rebuilt = `${beforeDecimal}.${afterDecimal}`;
            }
        }

        return `${sign}${rebuilt}…${exponent}`;
    });
}

export default function ConstantEnginePage() {
    const codePath = path.join(
        process.cwd(),
        "public/code/constant-engine/build_all.py"
    );

    const evaluatorPath = path.join(
        process.cwd(),
        "public/code/constant-engine/evaluator.py"
    );

    const recipesPath = path.join(
        process.cwd(),
        "public/code/constant-engine/constants.yaml"
    );

    const symbolsPath = path.join(
        process.cwd(),
        "public/code/constant-engine/symbols.csv"
    );

    const outputPath = path.join(
        process.cwd(),
        "public/code/constant-engine/latest-output.txt"
    );

    const code = fs.readFileSync(codePath, "utf8");
    const evaluatorCode = fs.readFileSync(evaluatorPath, "utf8");
    const recipesYaml = fs.readFileSync(recipesPath, "utf8");
    const symbolsCsv = fs.readFileSync(symbolsPath, "utf8");

    const latestOutput = fs.existsSync(outputPath)
        ? fs.readFileSync(outputPath, "utf8")
        : "No output file has been generated yet. Run the Constant Engine first.";

    const symbolRows = symbolsCsv
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(1)
        .map((line) => {
            const [token, name, value, dimension] = line.split(",");
            return {
                token: token || "",
                name: name || "",
                value: formatInputParameterValue(value || ""),
                rawValue: value || "",
                dimension: dimension || "",
            };
        });

    return (
        <LayoutWrapper>
            <div style={backgroundStyle} />

            <div
                className="symbol-overlay"
                style={{
                    left: 0,
                    width: "100vw",
                }}
            />

            <div
                className="hyperbolic-partition-content"
                style={{
                    fontFamily: '"Times New Roman", Times, serif',
                }}
            >
                <div className="legend-title">constant engine</div>

                <p className="equation-description">
                    The Constant Engine is a reproducible computational implementation of the Transform Dictionary. It combines a finite set of geometric and algebraic inputs according to two constructive rules—the hyperbolic partition equation and the binomial constructor—to produce and evaluate proposed closed-form expressions for all 288 constants of Nature. Each result is compared directly with the corresponding CODATA 2022 value. It therefore provides a direct computational test of the central claim of this project: that all 288 constants of Nature can be constructed as a coherent, mutually constrained system within a common geometric framework.
                </p>

                <div style={{ height: "1.5rem" }} />

                <div style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.75rem",
                    justifyContent: "center",
                    marginBottom: "2rem"
                }}>
                    <a
                        href="/code/constant-engine/build_all.py"
                        download
                        style={buttonStyle}
                    >
                        Download Code
                    </a>

                    <a
                        href="/code/constant-engine/evaluator.py"
                        download
                        style={buttonStyle}
                    >
                        Download Evaluator
                    </a>

                    <a
                        href="/code/constant-engine/constants.yaml"
                        download
                        style={buttonStyle}
                    >
                        Download 288 Recipes
                    </a>

                    <a
                        href="/code/constant-engine/symbols.csv"
                        download
                        style={buttonStyle}
                    >
                        Download Input Parameters
                    </a>

                    <a
                        href="/code/constant-engine/latest-output.txt"
                        download
                        style={buttonStyle}
                    >
                        Download Latest Output
                    </a>

                    <a
                        href="/code/constant-engine/build_all.py"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={buttonStyle}
                    >
                        Open Raw Code
                    </a>
                </div>

                <details style={panelStyle}>
                    <summary style={summaryStyle}>Build Script</summary>

                    <pre style={codeBoxStyle}>
                        <code>{code}</code>
                    </pre>
                </details>

                <details style={panelStyle}>
                    <summary style={summaryStyle}>Evaluator</summary>

                    <pre style={codeBoxStyle}>
                        <code>{evaluatorCode}</code>
                    </pre>
                </details>

                <details style={panelStyle}>
                    <summary style={summaryStyle}>288 Constant Recipes</summary>

                    <pre style={codeBoxStyle}>
                        <code>{recipesYaml}</code>
                    </pre>
                </details>

                <details style={panelStyle}>
                    <summary style={summaryStyle}>Input Parameters</summary>

                    <div style={innerPanelStyle}>
                        <p>
                            These are the numerical symbols used by the Constant
                            Engine. Each row gives the token used in the code,
                            its name or meaning, its assigned value, and its
                            dimensional type.
                        </p>

                        <div style={tableWrapStyle}>
                            <table style={tableStyle}>
                                <thead>
                                    <tr>
                                        <th style={thStyle}>Token</th>
                                        <th style={thStyle}>Name / meaning</th>
                                        <th style={thStyle}>Value</th>
                                        <th style={thStyle}>Dimension</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {symbolRows.map((row, index) => (
                                        <tr key={`${row.token}-${index}`}>
                                            <td style={tdTokenStyle}>{row.token}</td>
                                            <td style={tdNameStyle}>{row.name}</td>
                                            <td style={tdValueStyle} title={row.rawValue}>{row.value}</td>
                                            <td style={tdStyle}>{row.dimension}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </details>

                <details style={panelStyle}>
                    <summary style={summaryStyle}>Latest Output</summary>

                    <div style={innerPanelStyle}>
                        <p>
                            This is the latest output generated by the Constant
                            Engine.
                        </p>

                        <pre style={codeBoxStyle}>
                            <code>{latestOutput}</code>
                        </pre>
                    </div>
                </details>

                <details style={panelStyle}>
                    <summary style={summaryStyle}>Run Locally</summary>

                    <div style={innerPanelStyle}>
                        <p>
                            To run the Constant Engine locally, use:
                        </p>

                        <pre style={smallCodeBoxStyle}>
                            <code>{`source /Users/thadroberts/manim-venv/bin/activate
cd /Users/thadroberts/physics-monastery-site
python constant_engine/src/build_all.py > public/code/constant-engine/latest-output.txt 2>&1`}</code>
                        </pre>

                        <p>
                            Then refresh this page and open Latest Output.
                        </p>
                    </div>
                </details>
            </div>
        </LayoutWrapper>
    );
}

const backgroundStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundImage: "url('/physics_monastery_background.jpg')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundAttachment: "fixed",
    zIndex: -1,
};

const buttonStyle = {
    display: "inline-block",
    padding: "0.55rem 0.9rem",
    border: "1px solid rgba(255,255,255,0.45)",
    borderRadius: "8px",
    color: "white",
    textDecoration: "none",
    fontFamily: '"Times New Roman", Times, serif',
    background: "rgba(0,0,0,0.35)",
};

const panelStyle = {
    marginBottom: "1rem",
    border: "1px solid rgba(255,255,255,0.28)",
    borderRadius: "10px",
    background: "rgba(0,0,0,0.38)",
    overflow: "hidden",
};

const summaryStyle = {
    cursor: "pointer",
    padding: "0.8rem 1rem",
    fontFamily: '"Times New Roman", Times, serif',
    fontSize: "18px",
};

const innerPanelStyle = {
    padding: "0 1rem 1rem 1rem",
    fontFamily: '"Times New Roman", Times, serif',
    fontSize: "16px",
    lineHeight: "1.6",
};

const codeBoxStyle = {
    maxHeight: "520px",
    overflowY: "auto",
    overflowX: "auto",
    whiteSpace: "pre",
    padding: "1rem",
    margin: 0,
    background: "rgba(0,0,0,0.72)",
    color: "white",
    fontSize: "13px",
    lineHeight: "1.45",
};

const smallCodeBoxStyle = {
    overflowX: "auto",
    whiteSpace: "pre",
    padding: "0.8rem",
    background: "rgba(0,0,0,0.72)",
    color: "white",
    fontSize: "13px",
    borderRadius: "8px",
};

const tableWrapStyle = {
    maxHeight: "520px",
    overflow: "auto",
    border: "1px solid rgba(255,255,255,0.22)",
    borderRadius: "8px",
    background: "rgba(0,0,0,0.55)",
};

const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    fontFamily: '"Times New Roman", Times, serif',
    fontSize: "15px",
};

const thStyle = {
    position: "sticky",
    top: 0,
    background: "rgba(0,0,0,0.9)",
    color: "white",
    textAlign: "left",
    padding: "0.55rem 0.7rem",
    borderBottom: "1px solid rgba(255,255,255,0.25)",
};

const tdStyle = {
    padding: "0.45rem 0.7rem",
    borderBottom: "1px solid rgba(255,255,255,0.12)",
    verticalAlign: "top",
};

const tdTokenStyle = {
    ...tdStyle,
    whiteSpace: "nowrap",
};

const tdNameStyle = {
    ...tdStyle,
    minWidth: "220px",
};

const tdValueStyle = {
    ...tdStyle,
    whiteSpace: "nowrap",
    fontFamily: "Menlo, Monaco, Consolas, monospace",
    fontSize: "13px",
};
