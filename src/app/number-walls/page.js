"use client";

import { useEffect, useMemo, useState } from "react";
import LayoutWrapper from "../../components/LayoutWrapper";

const COLOR_MODES = [
    { id: "mod", label: "Mod" },
    { id: "valuation", label: "Prime Valuation" },
    { id: "signed_log", label: "Signed Log" },
    { id: "row_signed_log", label: "Row Signed Log" },
    { id: "small_values", label: "Small Values" },
    { id: "zero_windows", label: "Zero Windows" },

];

const FIRST_TEN_PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29];

const DEFAULT_MODULUS = 2;

const CUSTOM_SEQUENCE_ID = "custom-sequence";

function isPrimeNumber(value) {
    if (value < 2) {
        return false;
    }

    for (let divisor = 2; divisor * divisor <= value; divisor += 1) {
        if (value % divisor === 0) {
            return false;
        }
    }

    return true;
}

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

function customBareissDet(matrix) {
    const n = matrix.length;

    if (n === 0) {
        return 1n;
    }

    if (n === 1) {
        return matrix[0][0];
    }

    const a = matrix.map((row) => row.slice());
    let sign = 1n;
    let previousPivot = 1n;

    for (let k = 0; k < n - 1; k += 1) {
        if (a[k][k] === 0n) {
            let swapRow = null;

            for (let r = k + 1; r < n; r += 1) {
                if (a[r][k] !== 0n) {
                    swapRow = r;
                    break;
                }
            }

            if (swapRow === null) {
                return 0n;
            }

            const temp = a[k];
            a[k] = a[swapRow];
            a[swapRow] = temp;
            sign *= -1n;
        }

        const pivot = a[k][k];

        for (let i = k + 1; i < n; i += 1) {
            for (let j = k + 1; j < n; j += 1) {
                a[i][j] = (a[i][j] * pivot - a[i][k] * a[k][j]) / previousPivot;
            }
        }

        previousPivot = pivot;

        for (let i = k + 1; i < n; i += 1) {
            a[i][k] = 0n;
        }

        for (let j = k + 1; j < n; j += 1) {
            a[k][j] = 0n;
        }
    }

    return sign * a[n - 1][n - 1];
}

function customWallEntry(sequence, row, col) {
    if (row === -1) {
        return "1";
    }

    if (row === 0) {
        if (0 <= col && col < sequence.length) {
            return String(sequence[col]);
        }

        return null;
    }

    const leftNeeded = col - row;
    const rightNeeded = col + row;

    if (leftNeeded < 0 || rightNeeded >= sequence.length) {
        return null;
    }

    const matrix = [];

    for (let i = 0; i < row + 1; i += 1) {
        const matrixRow = [];

        for (let j = 0; j < row + 1; j += 1) {
            matrixRow.push(BigInt(sequence[col + i - j]));
        }

        matrix.push(matrixRow);
    }

    return String(customBareissDet(matrix));
}

function buildCustomWallData(customSequenceValues) {
    const trimmedValues = customSequenceValues.map((value) => String(value).trim());

    let usedLength = 0;

    for (let i = 0; i < trimmedValues.length; i += 1) {
        if (trimmedValues[i] === "" || trimmedValues[i] === "-") {
            break;
        }

        usedLength += 1;
    }

    const sequence = trimmedValues
        .slice(0, usedLength)
        .map((value) => value);

    const visibleWidth = 100;
    const visibleDepth = sequence.length > 0
    ? Math.max(1, Math.min(50, Math.floor((sequence.length - 1) / 2)))
    : 1;

    const rows = [];

    for (let rowNumber = -1; rowNumber <= visibleDepth; rowNumber += 1) {
        const values = [];

        for (let col = 0; col < visibleWidth; col += 1) {
            values.push(customWallEntry(sequence, rowNumber, col));
        }

        rows.push({
            row: rowNumber,
            values,
        });
    }

    return {
        id: CUSTOM_SEQUENCE_ID,
        title: "Custom Sequence",
        category: "custom",
        kind: "terms",
        description: sequence.length === 0
            ? "Enter up to 100 sequence entries. Each square can contain a whole number."
            : `Custom number wall built from ${sequence.length} entered term${sequence.length === 1 ? "" : "s"}.`,
        visibleWidth,
        visibleDepth,
        sequence: sequence.map((value) => String(value)),
        rows,
    };
}

function sanitizeSequenceCellValue(value) {
    const text = String(value);

    if (text === "") {
        return "";
    }

    if (text === "-") {
        return "-";
    }

    const cleaned = text.replace(/[^0-9-]/g, "");

    if (cleaned.startsWith("-")) {
        return `-${cleaned.slice(1).replace(/-/g, "")}`;
    }

    return cleaned.replace(/-/g, "");
}

function getContiguousCustomLength(customSequenceValues) {
    let usedLength = 0;

    for (let i = 0; i < customSequenceValues.length; i += 1) {
        const text = String(customSequenceValues[i] || "").trim();

        if (text === "" || text === "-") {
            break;
        }

        usedLength += 1;
    }

    return usedLength;
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
    const [colorMode, setColorMode] = useState("mod");
    const [prime, setPrime] = useState(2);
    const [modulus, setModulus] = useState(DEFAULT_MODULUS);
    const [isModMenuOpen, setIsModMenuOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [customSequenceValues, setCustomSequenceValues] = useState(
    Array.from({ length: 100 }, () => "")
);

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

            if (selectedId === CUSTOM_SEQUENCE_ID) {
    setWallData(buildCustomWallData(customSequenceValues));
    setLoading(false);
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
    }, [selectedId, indexItems, customSequenceValues]);

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
        <LayoutWrapper>
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
    display: flex;
    align-items: center;
    gap: 24px;
    flex-wrap: wrap;
}

.control-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 0;
}

.control-label {
    display: inline-block;
    color: #aaaaaa;
    font-size: var(--control-font-size);
    white-space: nowrap;
}

.control-select {
    background: #222222;
    color: #eeeeee;
    border: 1px solid #555555;
    padding: 6px 8px;
    font-size: var(--control-font-size);
}

.mod-dropdown {
    position: relative;
    display: inline-block;
}

.mod-dropdown-button {
    background: #222222;
    color: #eeeeee;
    border: 1px solid #555555;
    padding: 0;
    font-size: var(--control-font-size);
    font-family: "Times New Roman", Times, serif;
    cursor: pointer;
    width: 45px;
    height: 30px;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
}

.mod-dropdown-button:hover {
    background: #303030;
}

.mod-dropdown-menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    z-index: 50;
    width: 45px;
    max-height: 260px;
    overflow-y: auto;
    background: #171717;
    border: 1px solid #555555;
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.45);
}

.mod-dropdown-option {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 5px 0;
    background: #222222;
    color: #eeeeee;
    border: none;
    text-align: center;
    font-size: var(--control-font-size);
    font-family: "Times New Roman", Times, serif;
    cursor: pointer;
    box-sizing: border-box;
}

.mod-dropdown-option:hover {
    background: #303030;
}

.prime-modulus-option {
    background: #ffd166;
    color: #111111;
    font-weight: 700;
}

.prime-modulus-option:hover {
    background: #ffdf7a;
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
    --title-font-size: 16px;
    --intro-font-size: 13px;
    --sidebar-heading-font-size: 14px;
    --button-font-size: 13px;
    --control-font-size: 14px;
    --wall-title-font-size: 18px;
    --description-font-size: 14px;
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

.wall-title-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 0 0 6px 0;
}

.wall-title-row .wall-title {
    margin: 0;
}

.clear-custom-sequence-button {
    background: #222222;
    color: #eeeeee;
    border: 1px solid #555555;
    padding: 3px 10px;
    font-size: var(--control-font-size);
    font-family: "Times New Roman", Times, serif;
    cursor: pointer;
}

.clear-custom-sequence-button:hover {
    background: #303030;
    border-color: #75c7ff;
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

.constants-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 5px;
    width: 100%;
}

.constant-grid-button {
    height: 34px;
    padding: 0;
    margin: 0;
    background: #222222;
    color: #eeeeee;
    border: 1px solid #444444;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
}

.constant-grid-button:hover {
    background: #303030;
}

.constant-grid-button.active {
    background: #334b5f;
    border-color: #75c7ff;
}

.constant-symbol {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    width: 100%;
    height: 34px;
    overflow: visible;
}

.constant-symbol-menu {
    height: 34px;
}

.constant-symbol-img {
    width: auto;
    height: auto;
    max-width: none;
    max-height: none;
    display: block;
    transform: translateX(0px) translateY(0px) scale(1.00);
    transform-origin: center;
}

.custom-sequence-button {
    margin-top: 28px;
}

.wall-cell-input {
    width: 100%;
    height: 100%;
    border: none;
    outline: none;
    padding: 0;
    margin: 0;
    background: transparent;
    color: inherit;
    text-align: center;
    font-family: "Times New Roman", Times, serif;
    font-size: var(--cell-font-size);
    font-weight: 700;
    line-height: 1;
    box-sizing: border-box;
}

.wall-cell-input:focus {
    background: rgba(255, 255, 255, 0.08);
    box-shadow: inset 0 0 0 1px #75c7ff;
}

            `}</style>

            <h1 className="number-walls-title">Number Walls</h1>

            <p className="number-walls-intro">
                Select a sequence, geometric constant, or enter an custom sequence, then choose a coloring mode. The entry row contains up to 100 terms.
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

                    <div className="sidebar-heading">Geometric Constants</div>

                    {constants.length === 0 ? (
    <p className="empty-note">
        Constants will appear here after we add their JSON files.
    </p>
) : (
    <div className="constants-grid">
        {constants.map((item) => (
            <button
                key={item.id}
                className={selectedId === item.id ? "constant-grid-button active" : "constant-grid-button"}
                onClick={() => setSelectedId(item.id)}
            >
                <ConstantSymbol item={item} />
            </button>
        ))}
    </div>
)}

<button
    className={selectedId === CUSTOM_SEQUENCE_ID ? "sequence-button custom-sequence-button active" : "sequence-button custom-sequence-button"}
    onClick={() => setSelectedId(CUSTOM_SEQUENCE_ID)}
>
    Custom Sequence
</button>
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

        <div className="mod-dropdown">
            <button
                type="button"
                className="mod-dropdown-button"
                onClick={() => setIsModMenuOpen(!isModMenuOpen)}
            >
                {modulus}
            </button>

            {isModMenuOpen && (
                <div className="mod-dropdown-menu">
                    {Array.from({ length: 98 }, (_, index) => index + 2).map((m) => (
                        <button
                            key={m}
                            type="button"
                            className={
                                isPrimeNumber(m)
                                    ? "mod-dropdown-option prime-modulus-option"
                                    : "mod-dropdown-option"
                            }
                            onClick={() => {
                                setModulus(m);
                                setIsModMenuOpen(false);
                            }}
                        >
                            {m}
                        </button>
                    ))}
                </div>
            )}
        </div>
    </div>
)}
                    </div>

                    {loading || !wallData ? (
                        <p className="empty-note">Loading number wall...</p>
                    ) : (
                        <>
                            <div className="wall-title-row">
    <h2 className="wall-title">{wallData.title}</h2>

    {selectedId === CUSTOM_SEQUENCE_ID && (
        <button
            type="button"
            className="clear-custom-sequence-button"
            onClick={() => {
                setCustomSequenceValues(Array.from({ length: 100 }, () => ""));

                setTimeout(() => {
                    const firstCell = document.getElementById("custom-sequence-cell-0");

                    if (firstCell) {
                        firstCell.focus();
                    }
                }, 0);
            }}
        >
            Clear
        </button>
    )}
</div>

                            <p className="wall-description">{wallData.description}</p>

                            <div className="wall-frame">
                                <table className="wall-table">
                                    <tbody>
                                        {wallData.rows.map((row) => (
                                            <tr key={row.row}>
                                                <td className="row-label">{row.row}</td>

                                                {row.values.map((value, index) => {
    const isCustomEntryCell = selectedId === CUSTOM_SEQUENCE_ID && row.row === 0;
const customUsedLength = getContiguousCustomLength(customSequenceValues);

const displayValue = isCustomEntryCell
    ? (index <= customUsedLength ? customSequenceValues[index] : "")
    : value;

let colors = cellColor(
    displayValue,
    row.row,
    colorMode,
    scales,
    prime,
    modulus
);

if (
    selectedId === CUSTOM_SEQUENCE_ID &&
    row.row === 0 &&
    String(displayValue || "").trim() === ""
) {
    colors = {
        background: "#3a0909",
        color: "#ffffff",
    };
}

    return (
        <td
            key={`${row.row}-${index}`}
            className="wall-cell"
            style={{
                background: colors.background,
                color: isCyanLikeBackground(colors.background) ? "#ffffff" : colors.color,
                textShadow: isCyanLikeBackground(colors.background) ? "0 0 2px #000000" : "none",
            }}
            title={isMissing(displayValue) ? "" : String(displayValue)}
        >
            <div className="cell-inner">
                {isCustomEntryCell ? (
                    <input
                        id={`custom-sequence-cell-${index}`}
                        className="wall-cell-input"
                        value={displayValue || ""}
                        onChange={(event) => {
                            const nextValue = sanitizeSequenceCellValue(event.target.value);

                            setCustomSequenceValues((previous) => {
                                const updated = [...previous];
                                updated[index] = nextValue;
                                return updated;
                            });
                        }}
                        onKeyDown={(event) => {
                            if (event.key === "ArrowRight" || event.key === "Enter") {
                                event.preventDefault();
                                const next = document.getElementById(`custom-sequence-cell-${index + 1}`);

                                if (next) {
                                    next.focus();
                                }
                            }

                            if (event.key === "ArrowLeft") {
                                event.preventDefault();
                                const previous = document.getElementById(`custom-sequence-cell-${index - 1}`);

                                if (previous) {
                                    previous.focus();
                                }
                            }
                        }}
                    />
                ) : (
                    <span className="cell-text">
                        {shortenValue(value)}
                    </span>
                )}
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
    </LayoutWrapper>
    );
}