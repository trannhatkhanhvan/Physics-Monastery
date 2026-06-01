"use client";

import { useEffect, useMemo, useState } from "react";

const COLOR_MODES = [
    { id: "signed_log", label: "Signed Log" },
    { id: "row_signed_log", label: "Row Signed Log" },
    { id: "small_values", label: "Small Values" },
    { id: "zero_windows", label: "Zero Windows" },
    { id: "valuation", label: "Prime Valuation" },
    { id: "mod", label: "Mod" },
];

const FIRST_TEN_PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29];

const DEFAULT_MODULUS = 10;

function ConstantSymbol({ item, place = "menu" }) {
    if (item?.symbolImage) {
        return (
            <span className={`constant-symbol constant-symbol-${place}`}>
                <img
                    src={item.symbolImage}
                    alt={item.symbol || item.title || ""}
                    className="constant-symbol-img"
                />
            </span>
        );
    }

    return item?.symbol || item?.title || "";
}

function isMissing(value) {
    return value === null || value === undefined;
}

function normalizeIntegerString(value) {
    if (isMissing(value)) {
        return "";
    }

    let text = String(value);

    if (text.startsWith("+")) {
        text = text.slice(1);
    }

    return text;
}

function signOf(value) {
    const text = normalizeIntegerString(value);

    if (text === "" || text === "0") {
        return 0;
    }

    if (text.startsWith("-")) {
        return -1;
    }

    return 1;
}

function absString(value) {
    let text = normalizeIntegerString(value);

    if (text.startsWith("-")) {
        text = text.slice(1);
    }

    text = text.replace(/^0+/, "");

    if (text === "") {
        return "0";
    }

    return text;
}

function approximateLog10Abs(value) {
    const absolute = absString(value);

    if (absolute === "0") {
        return 0;
    }

    const prefixLength = Math.min(15, absolute.length);
    const prefix = absolute.slice(0, prefixLength);
    const prefixNumber = Number(prefix);

    return absolute.length - prefixLength + Math.log10(prefixNumber);
}

function shortenValue(value, maxLength = 4) {
    if (isMissing(value)) {
        return "";
    }

    const text = String(value);

    if (text.length <= maxLength) {
        return text;
    }

    return text.slice(0, maxLength - 1) + "…";
}

function hexToRgb(hexColor) {
    const clean = hexColor.replace("#", "");

    return {
        r: parseInt(clean.slice(0, 2), 16),
        g: parseInt(clean.slice(2, 4), 16),
        b: parseInt(clean.slice(4, 6), 16),
    };
}

function rgbToHex(r, g, b) {
    const rr = Math.round(r).toString(16).padStart(2, "0");
    const gg = Math.round(g).toString(16).padStart(2, "0");
    const bb = Math.round(b).toString(16).padStart(2, "0");

    return `#${rr}${gg}${bb}`;
}

function blendColors(hexA, hexB, t) {
    const clamped = Math.max(0, Math.min(1, t));
    const a = hexToRgb(hexA);
    const b = hexToRgb(hexB);

    return rgbToHex(
        a.r + (b.r - a.r) * clamped,
        a.g + (b.g - a.g) * clamped,
        a.b + (b.b - a.b) * clamped
    );
}

function textColorForBackground(hexColor) {
    const { r, g, b } = hexToRgb(hexColor);
    const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

    if (brightness >= 160) {
        return "#111111";
    }

    return "#ffffff";
}

function isCyanLikeBackground(color) {
    if (!color || !color.startsWith("#")) {
        return false;
    }

    const { r, g, b } = hexToRgb(color);

    return g >= 120 && b >= 120 && g > r * 1.2 && b > r * 1.2;
}

function safeBigInt(value) {
    if (isMissing(value)) {
        return null;
    }

    return BigInt(String(value));
}

function positiveModulo(value, modulus) {
    const bigValue = safeBigInt(value);
    const bigModulus = BigInt(modulus);

    if (bigValue === null) {
        return 0;
    }

    const residue = ((bigValue % bigModulus) + bigModulus) % bigModulus;

    return Number(residue);
}

function valuation(value, prime) {
    if (isMissing(value)) {
        return 0;
    }

    let bigValue = safeBigInt(value);

    if (bigValue === 0n) {
        return 0;
    }

    if (bigValue < 0n) {
        bigValue = -bigValue;
    }

    const bigPrime = BigInt(prime);
    let count = 0;

    while (bigValue % bigPrime === 0n) {
        count += 1;
        bigValue = bigValue / bigPrime;
    }

    return count;
}

function collectAllValues(wallData) {
    if (!wallData || !wallData.rows) {
        return [];
    }

    const values = [];

    wallData.rows.forEach((row) => {
        row.values.forEach((value) => {
            if (!isMissing(value)) {
                values.push(value);
            }
        });
    });

    return values;
}

function computeGlobalLogScale(wallData) {
    const values = collectAllValues(wallData);
    let maxLog = 1;

    values.forEach((value) => {
        if (String(value) !== "0") {
            maxLog = Math.max(maxLog, approximateLog10Abs(value));
        }
    });

    return maxLog;
}

function computeRowLogScales(wallData) {
    const scales = {};

    if (!wallData || !wallData.rows) {
        return scales;
    }

    wallData.rows.forEach((row) => {
        let maxLog = 1;

        row.values.forEach((value) => {
            if (!isMissing(value) && String(value) !== "0") {
                maxLog = Math.max(maxLog, approximateLog10Abs(value));
            }
        });

        scales[row.row] = maxLog;
    });

    return scales;
}

function computeValuationScale(wallData, prime) {
    const values = collectAllValues(wallData);
    let maxValuation = 1;

    values.forEach((value) => {
        if (String(value) !== "0") {
            maxValuation = Math.max(maxValuation, valuation(value, prime));
        }
    });

    return maxValuation;
}

function signedLogColor(value, scale) {
    if (isMissing(value)) {
        return { background: "#0d0d0d", color: "#333333" };
    }

    if (String(value) === "0") {
        return { background: "#f4f4f4", color: "#111111" };
    }

    const sign = signOf(value);
    const amount = approximateLog10Abs(value) / Math.max(scale, 1);
    const clamped = Math.max(0, Math.min(1, amount));

    let background;

    if (sign > 0) {
        background = blendColors("#0b1220", "#4cc9f0", clamped);
    } else {
        background = blendColors("#200b0b", "#ff6b6b", clamped);
    }

    return {
        background,
        color: textColorForBackground(background),
    };
}

function cellColor(value, rowNumber, colorMode, scales, prime, modulus) {
    if (isMissing(value)) {
        return { background: "#0d0d0d", color: "#333333" };
    }

    const text = String(value);

    if (colorMode === "signed_log") {
        return signedLogColor(value, scales.globalLog);
    }

    if (colorMode === "row_signed_log") {
        return signedLogColor(value, scales.rowLogs[rowNumber] || scales.globalLog);
    }

    if (colorMode === "small_values") {
        const smallPalette = {
            "-2": { background: "#7a0019", color: "#ffffff" },
            "-1": { background: "#ff3b3b", color: "#ffffff" },
            "0": { background: "#f4f4f4", color: "#111111" },
            "1": { background: "#2f80ed", color: "#ffffff" },
            "2": { background: "#56ccf2", color: "#111111" },
        };

        if (smallPalette[text]) {
            return smallPalette[text];
        }

        return signedLogColor(value, scales.globalLog);
    }

    if (colorMode === "zero_windows") {
        if (text === "0") {
            return { background: "#f4f4f4", color: "#111111" };
        }

        return { background: "#070707", color: "#333333" };
    }

    if (colorMode === "valuation") {
        if (text === "0") {
            return { background: "#f4f4f4", color: "#111111" };
        }

        const v = valuation(value, prime);
        const amount = v / Math.max(scales.valuation, 1);
        const background = blendColors("#111111", "#ffd166", amount);

        return {
            background,
            color: textColorForBackground(background),
        };
    }

    if (colorMode === "mod") {
        const residue = positiveModulo(value, modulus);
        const hue = Math.round((360 * residue) / modulus);

        return {
            background: `hsl(${hue}, 78%, 58%)`,
            color: residue <= 2 ? "#111111" : "#ffffff",
        };
    }

    return signedLogColor(value, scales.globalLog);
}

export default function NumberWallsPage() {
    const [indexItems, setIndexItems] = useState([]);
    const [selectedId, setSelectedId] = useState("");
    const [wallData, setWallData] = useState(null);
    const [colorMode, setColorMode] = useState("signed_log");
    const [prime, setPrime] = useState(2);
    const [modulus, setModulus] = useState(DEFAULT_MODULUS);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadIndex() {
            const response = await fetch(`/number-walls/data/index.json?time=${Date.now()}`, {
    cache: "no-store",
});
            const items = await response.json();

            setIndexItems(items);

            if (items.length > 0) {
                setSelectedId(items[0].id);
            }
        }

        loadIndex();
    }, []);

    useEffect(() => {
        async function loadWall() {
            if (!selectedId || indexItems.length === 0) {
                return;
            }

            setLoading(true);

            const item = indexItems.find((entry) => entry.id === selectedId);

            if (!item) {
                setLoading(false);
                return;
            }

            const response = await fetch(`/number-walls/data/${item.filename}`);
            const data = await response.json();

            setWallData(data);
            setLoading(false);
        }

        loadWall();
    }, [selectedId, indexItems]);

    const scales = useMemo(() => {
        return {
            globalLog: computeGlobalLogScale(wallData),
            rowLogs: computeRowLogScales(wallData),
            valuation: computeValuationScale(wallData, prime),
        };
    }, [wallData, prime]);

    const famousSequences = indexItems.filter((item) => item.category === "famous-sequences");
    const constants = indexItems.filter((item) => item.category === "constants");

    return (
        <main className="number-walls-page">
            <style>{`
                .number-walls-page {
                    min-height: 100vh;
                    background: #101010;
                    color: #eeeeee;
                    font-family: Menlo, Monaco, Consolas, monospace;
                    padding: 24px;
                    box-sizing: border-box;
                }

                .number-walls-title {
                    margin: 0 0 8px 0;
                    font-size: 30px;
                    font-weight: 500;
                }

                .number-walls-intro {
    max-width: none;
    margin: 0 0 24px 0;
    color: #bbbbbb;
    font-size: var(--intro-font-size);
    line-height: 1.5;
}

                .number-walls-layout {
                    display: grid;
                    grid-template-columns: 200px minmax(0, 1fr);
                    column-gap: 20px;
                    align-items: start;
                }

                .number-walls-sidebar {
                    background: #171717;
                    border: 1px solid #303030;
                    padding: 14px;
                    box-sizing: border-box;
                    max-height: calc(100vh - 120px);
                    overflow-y: auto;
                }

                .sidebar-heading {
                    margin: 14px 0 8px 0;
                    color: #ffd166;
                    font-size: 14px;
                    font-weight: 700;
                }

                .sidebar-heading:first-child {
                    margin-top: 0;
                }

                .sequence-button {
                    display: block;
                    width: 100%;
                    margin: 0 0 6px 0;
                    padding: 8px 9px;
                    background: #222222;
                    color: #eeeeee;
                    border: 1px solid #444444;
                    text-align: left;
                    font-family: Menlo, Monaco, Consolas, monospace;
                    font-size: 13px;
                    cursor: pointer;
                }

                .sequence-button:hover {
                    background: #303030;
                }

                .sequence-button.active {
                    background: #334b5f;
                    border-color: #75c7ff;
                    color: #ffffff;
                }

                .number-walls-main {
                    min-width: 0;
                }

                .control-panel {
                    background: #171717;
                    border: 1px solid #303030;
                    padding: 14px;
                    margin-bottom: 16px;
                    box-sizing: border-box;
                }

                .control-row {
                    margin-bottom: 12px;
                }

                .control-row:last-child {
                    margin-bottom: 0;
                }

                .control-label {
                    display: inline-block;
                    width: 130px;
                    color: #aaaaaa;
                    font-size: 13px;
                }

                .control-select {
                    background: #222222;
                    color: #eeeeee;
                    border: 1px solid #555555;
                    padding: 6px 8px;
                    font-family: Menlo, Monaco, Consolas, monospace;
                    font-size: 13px;
                }

                .wall-title {
                    margin: 0 0 6px 0;
                    font-size: 22px;
                    font-weight: 500;
                }

                .wall-description {
                    margin: 0 0 12px 0;
                    color: #bbbbbb;
                    font-size: 13px;
                    line-height: 1.45;
                }

                .wall-frame {
                    overflow: auto;
                    max-width: calc(100vw - 360px);
                    max-height: calc(100vh - 310px);
                    border: 1px solid #303030;
                    background: #080808;
                }

                .wall-table {
                    border-collapse: collapse;
                }

                .row-label {
                    position: sticky;
                    left: 0;
                    z-index: 2;
                    min-width: 50px;
                    height: 28px;
                    text-align: right;
                    padding-right: 8px;
                    color: #aaaaaa;
                    background: #181818;
                    border: 1px solid #2b2b2b;
                    font-size: 13px;
                }

                .wall-cell {
                    width: 28px;
                    min-width: 28px;
                    height: 28px;
                    border: 1px solid #2b2b2b;
                    text-align: center;
                    vertical-align: middle;
                    padding: 0;
                    font-size: 10px;
                    line-height: 1.05;
                    font-weight: 700;
                    overflow: hidden;
                }

                .cell-inner {
                    width: 100%;
                    height: 100%;
                    display: table;
                }

                .cell-text {
                    display: table-cell;
                    vertical-align: middle;
                    text-align: center;
                }

                .empty-note {
                    color: #888888;
                    font-size: 13px;
                    line-height: 1.5;
                }
                
                .number-walls-page,
.number-walls-page button,
.number-walls-page select,
.number-walls-page option {
    font-family: "Times New Roman", Times, serif;
}

.number-walls-page {
    --title-font-size: 30px;
    --intro-font-size: 16px;
    --sidebar-heading-font-size: 18px;
    --button-font-size: 16px;
    --control-font-size: 13px;
    --wall-title-font-size: 22px;
    --description-font-size: 13px;
    --row-label-font-size: 13px;
    --cell-font-size: 10px;
    --empty-note-font-size: 13px;
}

.number-walls-title {
    font-size: var(--title-font-size);
}

.number-walls-intro {
    font-size: var(--intro-font-size);
}

.sidebar-heading {
    font-size: var(--sidebar-heading-font-size);
}

.sequence-button {
    font-size: var(--button-font-size);
}

.control-label,
.control-select {
    font-size: var(--control-font-size);
}

.wall-title {
    font-size: var(--wall-title-font-size);
}

.wall-description {
    font-size: var(--description-font-size);
}

.row-label {
    font-size: var(--row-label-font-size);
}

.wall-cell {
    font-size: var(--cell-font-size);
}

.empty-note {
    font-size: var(--empty-note-font-size);
}

.constant-symbol {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    width: 100%;
    height: 46px;
}

.constant-symbol-menu {
    height: 46px;
}

.constant-symbol-img {
    width: auto;
    height: auto;
    max-width: none;
    max-height: none;
    display: block;
    transform: scale(1.5);
    transform-origin: center;
}
            `}</style>

            <h1 className="number-walls-title">Number Walls</h1>

            <p className="number-walls-intro">
                Select a sequence, then choose a coloring mode. The entry row contains 100 terms.
                Prime valuation colors each square by how many times the selected prime divides the wall entry.
            </p>

            <div className="number-walls-layout">
                <aside className="number-walls-sidebar">
                    <div className="sidebar-heading">Famous Sequences</div>

                    {famousSequences.map((item) => (
                        <button
                            key={item.id}
                            className={selectedId === item.id ? "sequence-button active" : "sequence-button"}
                            onClick={() => setSelectedId(item.id)}
                        >
                            {item.title}
                        </button>
                    ))}

                    <div className="sidebar-heading">Constants</div>

                    {constants.length === 0 ? (
                        <p className="empty-note">
                            Constants will appear here after we add their JSON files.
                        </p>
                    ) : (
                        constants.map((item) => (
                            <button
                                key={item.id}
                                className={selectedId === item.id ? "sequence-button active" : "sequence-button"}
                                onClick={() => setSelectedId(item.id)}
                            >
                                <ConstantSymbol item={item} />
                            </button>
                        ))
                    )}
                </aside>

                <section className="number-walls-main">
                    <div className="control-panel">
                        <div className="control-row">
                            <span className="control-label">Color mode</span>
                            <select
                                className="control-select"
                                value={colorMode}
                                onChange={(event) => setColorMode(event.target.value)}
                            >
                                {COLOR_MODES.map((mode) => (
                                    <option key={mode.id} value={mode.id}>
                                        {mode.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {colorMode === "valuation" && (
                            <div className="control-row">
                                <span className="control-label">Prime</span>
                                <select
                                    className="control-select"
                                    value={prime}
                                    onChange={(event) => setPrime(Number(event.target.value))}
                                >
                                    {FIRST_TEN_PRIMES.map((p) => (
                                        <option key={p} value={p}>
                                            {p}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {colorMode === "mod" && (
                            <div className="control-row">
                                <span className="control-label">Modulus</span>
                                <select
                                    className="control-select"
                                    value={modulus}
                                    onChange={(event) => setModulus(Number(event.target.value))}
                                >
                                    {[2, 3, 4, 5, 7, 8, 10, 11, 12].map((m) => (
                                        <option key={m} value={m}>
                                            {m}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {loading || !wallData ? (
                        <p className="empty-note">Loading number wall...</p>
                    ) : (
                        <>
                            <h2 className="wall-title">{wallData.title}</h2>
                            <p className="wall-description">{wallData.description}</p>

                            <div className="wall-frame">
                                <table className="wall-table">
                                    <tbody>
                                        {wallData.rows.map((row) => (
                                            <tr key={row.row}>
                                                <td className="row-label">{row.row}</td>

                                                {row.values.map((value, index) => {
                                                    const colors = cellColor(
                                                        value,
                                                        row.row,
                                                        colorMode,
                                                        scales,
                                                        prime,
                                                        modulus
                                                    );

                                                    return (
                                                        <td
                                                            key={`${row.row}-${index}`}
                                                            className="wall-cell"
                                                            style={{
                                                                background: colors.background,
                                                                color: isCyanLikeBackground(colors.background) ? "#ffffff" : colors.color,
textShadow: isCyanLikeBackground(colors.background) ? "0 0 2px #000000" : "none",
                                                            }}
                                                            title={isMissing(value) ? "" : String(value)}
                                                        >
                                                            <div className="cell-inner">
                                                                <span className="cell-text">
                                                                    {shortenValue(value)}
                                                                </span>
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </section>
            </div>
        </main>
    );
}